"""

OIDC Authorization Code Flow proxy for Nginx auth_request

 

Endpoints:

- /att/auth     (internal): Nginx calls this to check auth; returns 200 if authenticated with user headers, else 401

- /att/start    (public):   Initiates OIDC login by redirecting user to the provider's authorization endpoint

- /att/callback (public):   Handles provider redirect; exchanges code for tokens; fetches userinfo; stores session

- /             (public):   Simple status endpoint; shows current session

 

This implementation uses the provider discovery document to locate endpoints.

It validates the flow by exchanging the authorization code for tokens and calling /userinfo

with the access token to populate user details (no local JWT signature validation).

 

Environment variables required:

- OIDC_DISCOVERY_URL: provider discovery URL

- OIDC_CLIENT_ID:     client ID registered with provider

- OIDC_CLIENT_SECRET: client secret for confidential client

- REDIRECT_URI:       https://<gateway-fqdn>:8443/att/callback

- OIDC_SCOPE:         scopes to request (default: "openid profile email groups")

- SECRET_KEY:         Flask session secret

- ACR_VALUES:         optional string for requested AAL (e.g., "urn:att:aal2")

 

Nginx configuration expectations:

- location = /att/auth { internal; proxy_pass http://python-oidc-proxy:4180/att/auth; }

- location /att/      { proxy_pass  http://python-oidc-proxy:4180/att/; ... headers ... }

- location /prometheus/ { auth_request /att/auth; error_page 401 = /att/start; ... }

 

Quick tests

 

From gateway container:

    curl -s http://python-oidc-proxy:4180/att/auth → 401 (before login)

Browser:

    https://<gateway-fqdn>:8443/healthz → healthy

    https://<gateway-fqdn>:8443/prometheus/ → 401 → /att/start → IdP login → /att/callback → proxied Prometheus

Logs:

    docker logs python-oidc-proxy

    docker logs nginx-gateway

 

Confirm Nginx internal location uses exact path /att/auth and includes the path in proxy_pass:

proxy_pass http://python-oidc-proxy:4180/att/auth;

Ensure containers share the same Docker network and python-oidc-proxy resolves by name.

 

"""

 

import os, json, time, secrets, logging

from urllib.parse import urlencode

import requests as http_requests

from flask import Flask, request, redirect, session, jsonify, Response

 

logging.basicConfig(

    level=logging.DEBUG if os.environ.get("DEBUG") else logging.INFO,

    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",

)

 

logger = logging.getLogger("oidc-proxy")

 

app = Flask(__name__)

# Ensure trailing slashes don't cause 404s (important for Nginx auth_request)

app.url_map.strict_slashes = False

 

from werkzeug.middleware.proxy_fix import ProxyFix

app.wsgi_app = ProxyFix(

    app.wsgi_app,

    x_for=1,  # Trust X-Forwarded-For for client IP

    x_proto=1,  # Trust X-Forwarded-Proto for scheme (http/https)

    x_host=1,  # Trust X-Forwarded-Host for Host header

    x_port=1,  # Trust X-Forwarded-Port for port

)





app.secret_key = os.getenv("SECRET_KEY", secrets.token_hex(32))

app.config.update(

    SESSION_COOKIE_NAME="oidc_session",

    SESSION_COOKIE_HTTPONLY=True,

    SESSION_COOKIE_SAMESITE="Lax",

    SESSION_COOKIE_SECURE=os.environ.get("SESSION_COOKIE_SECURE", "true").lower() == "true",

    PERMANENT_SESSION_LIFETIME=3600,  # 1 hour session lifetime

)

 

# Configuration

DISCOVERY = os.environ["OIDC_DISCOVERY_URL"]

CLIENT_ID = os.environ["OIDC_CLIENT_ID"]

CLIENT_SECRET = os.environ["OIDC_CLIENT_SECRET"]

REDIRECT_URI = os.environ["REDIRECT_URI"]

SCOPE = os.environ.get("OIDC_SCOPE", "openid profile email groups")

ACR_VALUES = os.environ.get("ACR_VALUES")  # optional: e.g., "urn:att:aal2"

 

OIDC_CA_BUNDLE = os.environ.get("OIDC_CA_BUNDLE", "/etc/ssl/certs/ca-certificates.crt")

OIDC_VERIFY_SSL = os.environ.get("OIDC_VERIFY_SSL", "true").lower() == "true"

 

def get_ssl_verify():

    """ Return verfiy parameter for request calls"""

    if not OIDC_VERIFY_SSL:

        logger.warning("SSL verification is disabled for OIDC provider requests!")

        return False

    if os.path.exists(OIDC_CA_BUNDLE):

        return OIDC_CA_BUNDLE

    logger.warning(f"Custom CA bundle specified but not found at {OIDC_CA_BUNDLE}, falling back to system defaults.")

    return True

 

# Simple in-memory cache of discovery document

_oidc_cache = {}

 

def get_provider():

    """Fetch and cache provider metadata from discovery document."""

    if not _oidc_cache or time.time() - _oidc_cache.get("ts", 0) > 3600:

        logger.info(f"Fetching OIDC discovery document from {DISCOVERY}")

        try:

            r = http_requests.get(DISCOVERY, timeout=10, verify=get_ssl_verify())

            r.raise_for_status()

        except http_requests.exceptions.SSLError as e:

            logger.error(

                "SSL error fetching discovery document. Your OIDC provider "

                "likely uses an internal CA. Set OIDC_CA_BUNDLE to the path "

                " of your CA certificate bundle. Error: %s", str(e)

            )

            raise

        except http_requests.exceptions.ConnectionError as e:

            logger.error(

                "Cannot reach OIDC discovery endpoint at %s. Check DNS "

                "resolution and network connectivity from the proxy container. "

                "Error: %s", DISCOVERY, str(e)

            )

            raise

        data = r.json()

        data["ts"] = time.time()

        _oidc_cache.clear()

        _oidc_cache.update(data)

        logger.info(

            "OIDC discovery loaded. authorization_endpoint=%s, token_endpoint=%s",

            data.get("authorization_endpoint"), data.get("token_endpoint")

        )

    return _oidc_cache

 

def is_authenticated() -> bool:

    """Return True if user session is established."""

    return bool(session.get("user"))

 

# =======================================================================

# Flask routes

# =======================================================================

@app.route("/health")

def health():

    """Health check endpoint."""

    return jsonify({"status": "healthy", "service": "oidc-proxy"}) , 200

 

@app.route("/att/auth", methods=["GET", "HEAD"])

def att_auth():

    """

    Internal endpoint for Nginx auth_request.

    - If authenticated: return 200 and include user identity in headers

    - If not authenticated: return 401 (Nginx will redirect to /att/start)

    """

    if is_authenticated():

        user = session.get("user", {})

        # Prepare empty response with required headers for Nginx to forward

        resp = Response(status=200)

        resp.headers["X-Auth-Request-User"] = user.get("name") or user.get("sub") or "unknown"

        resp.headers["X-Auth-Request-Email"] = user.get("email", "unknown@example.com")

        logger.debug(" Auth check PASSED for user: %s, email: %s", resp.headers["X-Auth-Request-User"], resp.headers["X-Auth-Request-Email"])

        return resp

    logger.debug("Auth check FAILED: no valid session")

    return Response(status=401)

 

@app.route("/att/start")

def att_start():

    """

    Initiate OIDC Authorization Code flow by redirecting user to provider's /authorize endpoint.

    Stores a CSRF mitigation state in session for validation at callback.

    """

    p = get_provider()

    state = secrets.token_urlsafe(32)

    session["state"] = state

    session.modified = True  # Ensure session is saved

 

    original_url = request.args.get("redirect_uri", "/prometheus/")

    session["post_auth_redirect"] = original_url

 

    params = {

        "client_id": CLIENT_ID,

        "response_type": "code",

        "scope": SCOPE,

        "redirect_uri": REDIRECT_URI,

        "state": state,

    }

    if ACR_VALUES:

        params["acr_values"] = ACR_VALUES

   

    auth_url = p["authorization_endpoint"] + "?" + urlencode(params)

    logger.info("Initiating OIDC login. State: %s..., Redirect: %s", state[:8], REDIRECT_URI)

 

    return redirect(auth_url, code=302)

 

@app.route("/att/callback")

def att_callback():

    """

    Handle provider redirect: exchange code for tokens and fetch userinfo.

    On success, store minimal identity in session and redirect back to protected resource.

    """

    code = request.args.get("code")

    state = request.args.get("state")

    error = request.args.get("error")

 

    if error:

        error_desc = request.args.get("error_description", "No description")

        logger.error("OIDC provider returned error: %s - %s", error, error_desc)

        return jsonify({"error": "provider_error", "error_code": error, "error_description": error_desc}), 400

    if not code:

        logger.error("OIDC callback missing authorization code")

        return jsonify({"error": "missing_code"}), 400

   

    #  store state

    stored_state = session.get("state")

 

    if not state or not stored_state:

        logger.error(

            "State validation failed - missing values. "

            "returned_state present: %s, stored_state present: %s "

            " If stored_state is missing, the session cookie was lost between "

            " /att/start and /att/callback. Check: (1) ProxyFix is enabled ,"

            "(2) SESSION_COOKIE_SECURE marches your scheme "

            "(3) SESSION_COOKIE_SAMESITE allows the redirect "

            "(4) REDIRECT_URI uses https://",

            bool(state), bool(stored_state)

        )

        return jsonify({

            "error": "state missiong",

            "detail": "Session state was lost during OIDC redirect "

                      "This is typically cause by cookie/TLS configuration.",

            "debug": {

                "has_returned_state": bool(state),

                "has_stored_state": bool(stored_state),

                "request_scheme": request.scheme,

                "cookie_secure": app.config.get("SESSION_COOKIE_SECURE"),

                "forwarded_proto": request.headers.get("X-Forwarded-Proto"),

            }

        }), 400

   

    if state != stored_state:

        logger.error("State validation failed - mismatch. returned_state: %s..., stored_state: %s...", state[:8], stored_state[:8])

        return jsonify({"error": "state_mismatch"}), 400

   

    logger.info("State validation PASSED. Exchanging code for tokens.")

 

    p = get_provider()

    # Exchange code for tokens (confidential client in body)

    data = {

        "grant_type": "authorization_code",

        "code": code,

        "redirect_uri": REDIRECT_URI,

        "client_id": CLIENT_ID,

        "client_secret": CLIENT_SECRET,

    }

    try:

        r = http_requests.post(p["token_endpoint"], data=data, timeout=10, verify=get_ssl_verify())

    except http_requests.exceptions.SSLError as e:

        logger.error(

            "SSL error during token exchange with %s ."

            "Check OIDC_CA_BUNDLE configuration. Error: %s", p["token_endpoint"], str(e)

        )

        return jsonify({"error": "token_ssl_error", "detail": str(e)}), 502

 

    if r.status_code != 200:

        logger.error("Token exchange failed: %s - %s", r.status_code, r.text)

        return jsonify({

            "error": "token_exchange_failed",

            "status": r.status_code,

            "body": r.text

        }), 400

 

    token = r.json()

    access_token = token.get("access_token")

    id_token = token.get("id_token")

    logger.info(" Token exchange successful. Access token received: %s..., ID token received: %s...")

    # Fetch userinfo with access_token to populate identity

    user = {"id_token": id_token}

    if access_token and p.get("userinfo_endpoint"):

        try:

            ur = http_requests.get(p["userinfo_endpoint"], headers={"Authorization": f"Bearer {access_token}"}, timeout=10, verify=get_ssl_verify())

            if ur.status_code == 200:

                info = ur.json()

                # Common claims

                user.update({

                    "sub": info.get("sub"),

                    "email": info.get("email"),

                    "name": info.get("name") or (info.get("given_name") and info.get("family_name") and f"{info.get('given_name')} {info.get('family_name')}") or info.get("preferred_username"),

                    "groups": info.get("groups"),

                    "acr": info.get("acr"),

                })

                logger.info(" Userinfo fetched successfully for user: %s, email: %s", user.get("name") or user.get("sub"), user.get("email"))

            else:

                logger.error("Failed to fetch userinfo: %s - %s", ur.status_code, ur.text)

        except http_requests.exceptions.SSLError as e:

            logger.error("SSL error during userinfo fetch with %s . Check OIDC_CA_BUNDLE configuration. Error: %s", p["userinfo_endpoint"], str(e))

        except http_requests.exceptions.RequestException as e:

            logger.error("Request error during userinfo fetch with %s . Error: %s", p["userinfo_endpoint"], str(e))

 

    # ----- Establish the session -----

    session["user"] = user

    session.pop("state", None)

    session.modified = True  # Ensure session is saved

    session.permanent = True  # Use permanent session to apply lifetime

 

    # Redirect back to a protected resource (Prometheus) or root

    next_url = session.pop("post_auth_redirect", None) or request.args.get("next") or "/prometheus/"

    logger.info("Authentication successful for user: %s. Redirecting to: %s", user.get("name") or user.get("sub"), next_url)

    return redirect(next_url, code=302)

 

@app.route("/")

def root():

    """Simple status endpoint indicating authentication state."""

    return jsonify(session.get("user") or {"anon": True})