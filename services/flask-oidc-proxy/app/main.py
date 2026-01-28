import logging
import secrets

from flask import Flask, request, redirect, jsonify, make_response

from .config import Config
from .oidc_handler import OIDCHandler
from .token_validator import TokenValidator
from .session_manager import SessionManager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

config = Config()
oidc_handler = OIDCHandler(config)
token_validator = TokenValidator(config)
session_manager = SessionManager(config.REDIS_URL)

app = Flask(__name__)
app.secret_key = config.SESSION_SECRET

SESSION_COOKIE_NAME = "oidc_session_id"


@app.route("/auth/check")
def auth_check():
    """
    Nginx auth_request subrequest endpoint.
    Returns 200 if the user has a valid session, 401 otherwise.
    On 200, sets X-Auth-User and X-Auth-Roles headers for Nginx to forward.
    """
    session_id = request.cookies.get(SESSION_COOKIE_NAME)
    if not session_id:
        return "", 401

    session_data = session_manager.get_session(session_id)
    if not session_data:
        return "", 401

    access_token = session_data.get("access_token")
    if not access_token:
        return "", 401

    # Check if access token is expired
    if token_validator.is_token_expired(access_token):
        # Try to refresh
        refresh_token = session_data.get("refresh_token")
        if not refresh_token:
            session_manager.delete_session(session_id)
            return "", 401

        try:
            tokens = oidc_handler.refresh_tokens(refresh_token)
            session_data["access_token"] = tokens["access_token"]
            session_data["refresh_token"] = tokens.get("refresh_token", refresh_token)
            if "id_token" in tokens:
                session_data["id_token"] = tokens["id_token"]
                id_claims = token_validator.validate_id_token(tokens["id_token"])
                session_data["user"] = id_claims.get("preferred_username", "")
                session_data["roles"] = id_claims.get("realm_roles", [])
            session_manager.store_session(session_id, session_data)
        except Exception:
            logger.exception("Token refresh failed")
            session_manager.delete_session(session_id)
            return "", 401

    # Build response with auth headers for Nginx
    response = make_response("", 200)
    response.headers["X-Auth-User"] = session_data.get("user", "")
    roles = session_data.get("roles", [])
    response.headers["X-Auth-Roles"] = ",".join(roles) if isinstance(roles, list) else str(roles)
    return response


@app.route("/auth/login")
def auth_login():
    """
    Initiates OIDC Authorization Code Flow.
    Redirects the browser to Keycloak's authorization endpoint.
    """
    # Store the original URL the user was trying to access
    original_uri = request.args.get("redirect_uri", "/")

    state = oidc_handler.generate_state()
    session_manager.store_state(state, {"original_uri": original_uri})

    authorization_url = oidc_handler.build_authorization_url(
        redirect_uri=config.REDIRECT_URI,
        state=state,
    )

    logger.info("Redirecting to Keycloak for authentication")
    return redirect(authorization_url)


@app.route("/auth/callback")
def auth_callback():
    """
    Handles Keycloak's redirect with authorization code.
    Exchanges code for tokens, creates session, redirects to original URL.
    """
    code = request.args.get("code")
    state = request.args.get("state")
    error = request.args.get("error")

    if error:
        logger.error("OIDC error: %s - %s", error, request.args.get("error_description"))
        return jsonify({"error": error, "description": request.args.get("error_description")}), 400

    if not code or not state:
        return jsonify({"error": "Missing code or state parameter"}), 400

    # Validate state (CSRF protection)
    state_data = session_manager.get_and_delete_state(state)
    if not state_data:
        return jsonify({"error": "Invalid or expired state parameter"}), 400

    original_uri = state_data.get("original_uri", "/")

    try:
        # Exchange authorization code for tokens
        tokens = oidc_handler.exchange_code_for_tokens(
            code=code,
            redirect_uri=config.REDIRECT_URI,
        )
    except Exception:
        logger.exception("Token exchange failed")
        return jsonify({"error": "Token exchange failed"}), 500

    # Validate the ID token
    try:
        id_claims = token_validator.validate_id_token(tokens["id_token"])
    except Exception:
        logger.exception("ID token validation failed")
        return jsonify({"error": "Token validation failed"}), 500

    # Create session
    session_id = secrets.token_urlsafe(32)
    session_data = {
        "access_token": tokens["access_token"],
        "refresh_token": tokens.get("refresh_token"),
        "id_token": tokens["id_token"],
        "user": id_claims.get("preferred_username", ""),
        "email": id_claims.get("email", ""),
        "name": id_claims.get("name", ""),
        "roles": id_claims.get("realm_roles", []),
    }
    session_manager.store_session(session_id, session_data)

    logger.info("User %s authenticated successfully", session_data["user"])

    # Set session cookie and redirect to original URL
    response = make_response(redirect(original_uri))
    response.set_cookie(
        SESSION_COOKIE_NAME,
        session_id,
        httponly=True,
        secure=True,
        samesite="Lax",
        max_age=1800,
    )
    return response


@app.route("/auth/logout")
def auth_logout():
    """
    Clears session and redirects to Keycloak logout endpoint.
    """
    session_id = request.cookies.get(SESSION_COOKIE_NAME)

    if session_id:
        session_data = session_manager.get_session(session_id)
        session_manager.delete_session(session_id)

    response = make_response(redirect(config.logout_url + "?redirect_uri=https://localhost"))
    response.delete_cookie(SESSION_COOKIE_NAME)
    return response


@app.route("/auth/userinfo")
def auth_userinfo():
    """
    Returns current user info and roles from the session.
    """
    session_id = request.cookies.get(SESSION_COOKIE_NAME)
    if not session_id:
        return jsonify({"error": "Not authenticated"}), 401

    session_data = session_manager.get_session(session_id)
    if not session_data:
        return jsonify({"error": "Session expired"}), 401

    return jsonify({
        "user": session_data.get("user"),
        "email": session_data.get("email"),
        "name": session_data.get("name"),
        "roles": session_data.get("roles", []),
    })


@app.route("/health")
def health():
    """Health check endpoint."""
    return jsonify({"status": "healthy"}), 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
