# OIDC Authentication Flow

This document describes the OpenID Connect (OIDC) Authorization Code Flow implemented across the nginx reverse proxy, Flask OIDC proxy, and Keycloak identity provider.

---

## Architecture

```
                          ┌──────────────────────┐
                          │     User Browser      │
                          └──────────┬───────────┘
                                     │ HTTPS
                                     ▼
                          ┌──────────────────────┐
                          │   Nginx Reverse Proxy │
                          │   (TLS termination)   │
                          │                       │
                          │  Every request:       │
                          │  auth_request ────────┼──────┐
                          │                       │      │
                          │  On 401:              │      │
                          │  redirect to login    │      │
                          │                       │      │
                          │  On 200:              │      │
                          │  proxy to frontend    │      │
                          │  + set auth headers   │      │
                          └──────────┬───────────┘      │
                                     │                   │
                          ┌──────────▼───────────┐      │
                          │   Next.js Frontend    │      │
                          │   (port 3000)         │      │
                          │                       │      │
                          │  Reads:               │      │
                          │  X-Auth-User          │      │
                          │  X-Auth-Roles         │      │
                          │                       │      │
                          │  Server Actions call  │      │
                          │  backend services     │      │
                          └──────────────────────┘      │
                                                         │
                          ┌──────────────────────┐      │
                          │  Flask OIDC Proxy     │◄─────┘
                          │  (port 5000)          │  auth_request subrequest
                          │                       │
                          │  /auth/check          │  Session validation
                          │  /auth/login          │  Initiate OIDC flow
                          │  /auth/callback       │  Token exchange
                          │  /auth/logout         │  Session cleanup
                          │                       │
                          │  Sessions: Redis      │
                          └──────────┬───────────┘
                                     │ server-to-server
                                     ▼
                          ┌──────────────────────┐
                          │      Keycloak         │
                          │   (port 8080)         │
                          │                       │
                          │  Realm: app-realm     │
                          │  Client:              │
                          │   nginx-proxy-client  │
                          │                       │
                          │  Scopes:              │
                          │   openid, profile,    │
                          │   email, roles        │
                          └──────────────────────┘
```

---

## Successful Auth Flow

The following is a step-by-step trace of a successful login for `admin-user`.

### Step 1 -- Browser requests the application

```
GET https://localhost/
```

Nginx receives the request and triggers an `auth_request` subrequest to Flask before proxying to the frontend.

```nginx
location / {
    auth_request /auth/check;
    ...
}
```

### Step 2 -- Nginx auth subrequest (no session)

Nginx makes an **internal** subrequest to Flask:

```
GET http://flask-oidc-proxy:5000/auth/check
Cookie: (none -- first visit)
```

Flask checks for a session cookie (`oidc_session_id`). No cookie exists, so Flask returns **401**.

### Step 3 -- Nginx redirects to login

Nginx's `error_page 401` directive triggers a redirect:

```
HTTP/1.1 302 Moved Temporarily
Location: https://localhost/auth/login?redirect_uri=/
```

The browser follows this redirect.

### Step 4 -- Flask initiates OIDC Authorization Code Flow

```
GET https://localhost/auth/login?redirect_uri=/
```

Flask generates a random `state` parameter for CSRF protection, stores the `redirect_uri` in its pending state, and redirects the browser to Keycloak:

```
HTTP/1.1 302 Found
Location: http://localhost:8080/realms/app-realm/protocol/openid-connect/auth
    ?response_type=code
    &client_id=nginx-proxy-client
    &redirect_uri=https://localhost/auth/callback
    &scope=openid profile email
    &state=<random_state>
```

Key details:
- `response_type=code` -- Authorization Code Flow (not implicit)
- `redirect_uri` -- Where Keycloak sends the auth code back
- `scope=openid profile email` -- Standard OIDC scopes
- `state` -- CSRF protection token

### Step 5 -- User authenticates at Keycloak

The browser loads the Keycloak login page:

```
GET http://localhost:8080/realms/app-realm/protocol/openid-connect/auth?...
```

Keycloak renders a login form. The user enters:

```
Username: admin-user
Password: password
```

Keycloak validates credentials, creates a session, and redirects back with an authorization code:

```
HTTP/1.1 302 Found
Location: https://localhost/auth/callback
    ?state=<random_state>
    &session_state=<keycloak_session>
    &iss=http://localhost:8080/realms/app-realm
    &code=<authorization_code>
```

### Step 6 -- Flask exchanges code for tokens (server-to-server)

```
GET https://localhost/auth/callback?code=<authorization_code>&state=<random_state>
```

Flask receives the callback and performs these operations:

1. **Validates state** -- Ensures it matches the state from step 4 (CSRF protection)
2. **Exchanges code for tokens** -- Server-to-server POST to Keycloak's token endpoint:

```
POST http://keycloak:8080/realms/app-realm/protocol/openid-connect/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code=<authorization_code>
&redirect_uri=https://localhost/auth/callback
&client_id=nginx-proxy-client
&client_secret=changeme
```

Note: This uses the **internal** Docker URL (`http://keycloak:8080`) for server-to-server communication.

3. **Keycloak returns tokens:**

```json
{
  "access_token": "<JWT>",
  "id_token": "<JWT>",
  "refresh_token": "<opaque>",
  "token_type": "Bearer",
  "expires_in": 300,
  "refresh_expires_in": 1800
}
```

4. **Validates the ID token JWT:**

```python
# Fetches JWKS from http://keycloak:8080/realms/app-realm/protocol/openid-connect/certs
# Validates signature (RS256), issuer, audience, expiration
issuer = "http://localhost:8080/realms/app-realm"  # matches KC_HOSTNAME
audience = "nginx-proxy-client"
```

The issuer is validated against `KEYCLOAK_PUBLIC_URL` (not the internal URL) because Keycloak embeds its public hostname in the JWT `iss` claim.

5. **Extracts user identity from the ID token claims:**

```json
{
  "sub": "f0d268e2-...",
  "preferred_username": "admin-user",
  "email": "admin@example.com",
  "given_name": "Admin",
  "family_name": "User",
  "realm_roles": ["admin"]
}
```

6. **Creates a session in Redis** with a random session ID:

```
Key:   session:<random_uuid>
Value: {
  "user": "admin-user",
  "roles": ["admin"],
  "access_token": "<JWT>",
  "refresh_token": "<opaque>",
  "id_token": "<JWT>",
  "token_expiry": 1740000000
}
TTL: 1800 seconds (30 minutes)
```

7. **Sets a session cookie and redirects:**

```
HTTP/1.1 302 Found
Set-Cookie: oidc_session_id=<session_uuid>; Path=/; HttpOnly; Secure; SameSite=Lax
Location: https://localhost/
```

### Step 7 -- Authenticated request

The browser follows the redirect back to the application:

```
GET https://localhost/
Cookie: oidc_session_id=<session_uuid>
```

Nginx triggers the `auth_request` subrequest again:

```
GET http://flask-oidc-proxy:5000/auth/check
Cookie: oidc_session_id=<session_uuid>
```

This time Flask:
1. Finds the session cookie
2. Looks up the session in Redis
3. Checks that the access token hasn't expired (refreshes if needed)
4. Returns **200** with auth headers:

```
HTTP/1.1 200 OK
X-Auth-User: admin-user
X-Auth-Roles: admin
```

### Step 8 -- Nginx proxies to frontend

Nginx captures the auth headers from the subrequest response and forwards them to the frontend:

```nginx
auth_request_set $auth_user  $upstream_http_x_auth_user;
auth_request_set $auth_roles $upstream_http_x_auth_roles;

proxy_pass http://frontend:3000;
proxy_set_header X-Auth-User  $auth_user;
proxy_set_header X-Auth-Roles $auth_roles;
```

### Step 9 -- Frontend renders with user context

Next.js Server Components read the auth headers:

```typescript
// lib/auth.ts
const username = headersList.get("x-auth-user");   // "admin-user"
const rolesHeader = headersList.get("x-auth-roles"); // "admin"
```

The dashboard renders with:
- User identity: `admin-user`
- Roles: `admin`
- Admin navigation link: visible
- Upload button on blobs page: visible

---

## Dual-URL Pattern

A key challenge in containerized OIDC is that Keycloak has two URLs:

| Context | URL | Used For |
|---------|-----|----------|
| **Internal** | `http://keycloak:8080` | Server-to-server: token exchange, JWKS fetch, userinfo |
| **Public** | `http://localhost:8080` | Browser redirects, JWT `iss` claim validation |

```python
# config.py
KEYCLOAK_URL        = "http://keycloak:8080"      # Docker internal
KEYCLOAK_PUBLIC_URL = "http://localhost:8080"       # Browser-facing
```

Usage:
- `public_auth_url` -- Browser redirects to Keycloak login
- `token_url` -- Server-to-server token exchange (internal)
- `jwks_url` -- Server-to-server JWKS fetch (internal)
- `logout_url` -- Browser redirect for logout (public)
- **JWT issuer validation** -- Must use public URL (matches `iss` claim)

---

## Role-Based Access Control

Roles are propagated from Keycloak through the entire stack:

```
Keycloak realm roles (admin, editor, viewer)
    ↓  embedded in JWT via "roles" client scope
Flask extracts from ID token claims ("realm_roles")
    ↓  stored in Redis session
Flask returns via X-Auth-Roles header
    ↓  captured by nginx auth_request_set
Nginx forwards to frontend
    ↓  read by Next.js headers()
Frontend RoleGate component controls UI visibility
```

| Role | Dashboard | Blobs (view) | Upload | Admin Page |
|------|-----------|-------------|--------|------------|
| admin | Yes | Yes | Yes | Yes |
| editor | Yes | Yes | Yes | No |
| viewer | Yes | Yes | No | No |

---

## Test Users

| Username | Password | Role | Email |
|----------|----------|------|-------|
| `admin-user` | `password` | admin | admin@example.com |
| `editor-user` | `password` | editor | editor@example.com |
| `viewer-user` | `password` | viewer | viewer@example.com |

---

## Session Lifecycle

1. **Creation** -- After successful OIDC callback (step 6)
2. **Validation** -- Every request via `auth_request` subrequest (step 7)
3. **Token refresh** -- Flask auto-refreshes expired access tokens using the refresh token
4. **Expiration** -- Redis TTL of 30 minutes (SSO session idle timeout)
5. **Logout** -- `GET /auth/logout` clears Redis session and redirects to Keycloak logout

---

## Keycloak Client Configuration

| Setting | Value |
|---------|-------|
| Client ID | `nginx-proxy-client` |
| Client Type | Confidential (`publicClient: false`) |
| Client Secret | `changeme` |
| Standard Flow | Enabled (Authorization Code) |
| Direct Access Grants | Disabled |
| Redirect URIs | `https://localhost/*`, `https://localhost/auth/callback` |
| Web Origins | `https://localhost` |
| Default Scopes | `openid`, `profile`, `email`, `roles` |

---

## Key Files

| Component | File | Purpose |
|-----------|------|---------|
| Nginx config | `services/nginx-proxy/conf/conf.d/default.conf` | TLS, auth_request, routing |
| Flask entry | `services/flask-oidc-proxy/app/main.py` | /auth/* endpoints |
| Flask config | `services/flask-oidc-proxy/app/config.py` | Dual-URL pattern, scopes |
| OIDC handler | `services/flask-oidc-proxy/app/oidc_handler.py` | Auth URL, token exchange |
| Token validator | `services/flask-oidc-proxy/app/token_validator.py` | JWT validation, JWKS |
| Session manager | `services/flask-oidc-proxy/app/session_manager.py` | Redis session CRUD |
| Keycloak realm | `services/keycloak/realm/app-realm.json` | Realm, clients, users, scopes |
| Frontend auth | `services/frontend/src/lib/auth.ts` | Extract user from headers |
| Role gate | `services/frontend/src/components/role-gate.tsx` | RBAC UI component |
