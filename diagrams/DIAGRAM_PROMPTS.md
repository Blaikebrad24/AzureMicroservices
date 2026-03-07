# Architecture Diagram Prompts

Use these prompts with eraser.io or Claude cowork to generate accurate flow/traffic diagrams for the Complete Azure Container App presentation.

---

## Diagram 1: Enterprise Network Topology (High-Level)

**Prompt:**

```
Create a network topology diagram showing three distinct network zones connected in sequence, with traffic flowing left to right. Use clear zone boundaries with labeled borders.

ZONE 1 - "Conexus Network (On-Premises)"
This is the corporate on-premises network. It contains:
- User workstations (Windows machines) — up to 27 users on the data/engineering team
- On-Premises OIDC Provider (corporate identity server for SSO authentication)
- JFrog Artifactory (package/artifact repository for Maven, npm/pnpm, PyPI, Docker images)
- Corporate Proxy Server — sits in front of JFrog, all outbound package manager traffic routes through this proxy. The proxy holds the company TLS/SSL CA certificate (.crt) that is trusted enterprise-wide. Package managers (pip, mvn, pnpm, docker) on developer machines must configure HTTP_PROXY/HTTPS_PROXY environment variables pointing to this proxy to reach JFrog.
- On-Premises DNS Server — resolves internal hostnames and custom domain names, including the custom domain that will point to the Azure Container App's Private Endpoint IP address.

Label this zone with a note: "All user devices and on-prem services reside here. No external internet traffic can reach this zone directly."

ZONE 2 - "Bastion Network (Intermediary / Transit)"
This is the intermediary network that bridges on-prem to Azure cloud. It contains:
- Private Endpoints (PE) for Azure resources. Each PE is a network interface with a private IP in this zone that maps to a specific Azure resource:
  - PE for Azure Container App (allows Conexus users to reach the application)
  - PE for Azure Container Registry (allows CI/CD to push/pull container images)
  - PE for Azure Storage Account — with sub-PEs for: Blob, Table, Queue, File
  - PE for Azure Cache for Redis
  - PE for Azure PostgreSQL Flexible Server (if applicable)
- DNS records or DNS forwarding rules that map Azure resource FQDNs to Private Endpoint IPs

Show arrows from Conexus to Bastion labeled "Traffic routed via Private Endpoints — no public internet traversal." The Bastion network enables private connectivity between on-prem and Azure.

ZONE 3 - "Azure Subscription VNet (10.0.0.0/16)"
This is the Azure cloud VNet containing:
- Subnet: Container Apps (10.0.0.0/21) — delegated to Microsoft.App/environments
  - Azure Container App Environment containing 8 container apps:
    - nginx-proxy (ingress controller, TLS termination, custom domain)
    - flask-oidc-proxy (OIDC authentication proxy)
    - blob-service (Spring Boot, Azure Blob operations)
    - reports-service (Spring Boot, async report generation)
    - data-service (Spring Boot, CRUD operations)
    - ops-service (Spring Boot, operations/monitoring)
    - frontend (Next.js 15, SSR dashboard)
    - [Keycloak NOT deployed in non-prod/prod — replaced by on-prem OIDC]
- Subnet: PostgreSQL (10.0.8.0/24) — delegated to Microsoft.DBforPostgreSQL/flexibleServers
  - Azure PostgreSQL Flexible Server (v16) with databases: data_service_db, reports_service_db, ops_service_db
- Subnet: Private Endpoints (10.0.9.0/24)
  - Azure Cache for Redis (Basic tier, TLS 1.2 minimum)
  - Azure Storage Account (Standard LRS, TLS 1.2) with blob containers: reports, uploads, exports
- Azure Container Registry (Standard SKU) — stores all container images
- Azure Key Vault — stores secrets (DB passwords, Redis keys, OIDC client secret, storage connection strings)
- Log Analytics Workspace — collects container app logs and metrics

Draw connection arrows:
1. Conexus User Workstation -> On-Prem DNS -> resolves custom domain -> Bastion PE for Container App -> nginx-proxy container app
2. Flask OIDC Proxy -> outbound through VNet -> Bastion -> Conexus -> On-Prem OIDC Provider (for token exchange, JWKS fetch)
3. Container Apps -> Private Endpoints in VNet -> Redis, PostgreSQL, Storage Account (all private, no public endpoints)
4. CI/CD -> Bastion PE for ACR -> push container images

Add a note: "All traffic between zones is private. No Azure resources have public endpoints. Custom DNS records on the on-prem DNS server resolve Azure resource domains to Bastion Private Endpoint IPs."
```

---

## Diagram 2: User Request Traffic Flow (End-to-End)

**Prompt:**

```
Create a detailed sequence/flow diagram showing the complete lifecycle of an authenticated user's HTTP request from browser to data response. Use numbered steps and show both the request path (solid arrows) and response path (dashed arrows). Show container boundaries clearly.

Title: "End-to-End User Request Flow — Authenticated Page Load"

ACTORS AND COMPONENTS (left to right):
1. User Browser (on Conexus workstation)
2. On-Prem DNS
3. Bastion Network (Private Endpoint for Container App)
4. Nginx Proxy Container (port 443, TLS termination)
5. Flask OIDC Proxy Container (port 5000, Gunicorn)
6. Redis (Azure Cache for Redis, port 6380 TLS)
7. Next.js Frontend Container (port 3000, Node.js standalone server)
8. Spring Boot API Containers (blob-service, reports-service, data-service, ops-service — all port 8080)
9. Azure PostgreSQL (port 5432)
10. Azure Blob Storage

FLOW (assuming user is already authenticated with a valid session cookie):

Step 1: User browser sends HTTPS request to custom domain (e.g., https://app.internal.company.com/blobs)
Step 2: On-prem DNS resolves domain to Private Endpoint IP in Bastion network
Step 3: Traffic routes through Bastion PE to Azure Container App Environment
Step 4: Request arrives at Nginx Proxy container on port 443
Step 5: Nginx terminates TLS using server.crt/server.key (TLSv1.2/1.3)
Step 6: Nginx triggers internal auth_request subrequest to /auth/check
Step 7: Subrequest is proxied to Flask OIDC Proxy at http://flask-oidc-proxy:5000/auth/check
  - Nginx passes: X-Original-URI, X-Original-Method, Cookie headers
  - Nginx strips request body (proxy_pass_request_body off)
Step 8: Flask OIDC Proxy reads "oidc_session_id" cookie from the request
Step 9: Flask looks up session in Redis using key "oidc_session:{session_id}"
Step 10: Flask checks if access_token in session is expired (JWT exp claim check)
  - If expired: attempts token refresh with on-prem OIDC provider (outbound call through VNet -> Bastion -> Conexus -> OIDC)
  - If refresh fails: returns 401 to Nginx
Step 11: Flask returns 200 to Nginx with response headers:
  - X-Auth-User: "{username}" (e.g., "john.doe")
  - X-Auth-Roles: "{comma-separated roles}" (e.g., "admin,editor")
Step 12: Nginx captures X-Auth-User and X-Auth-Roles from subrequest response via auth_request_set directives
Step 13: Nginx proxies the original request to http://frontend:3000 with additional headers:
  - X-Auth-User, X-Auth-Roles (from auth subrequest)
  - X-Real-IP, X-Forwarded-For, X-Forwarded-Proto
  - Standard proxy headers for WebSocket support (Upgrade, Connection)
Step 14: Next.js frontend receives the request via server-side rendering
Step 15: Next.js reads X-Auth-User and X-Auth-Roles from request headers (src/lib/auth.ts)
Step 16: Next.js Server Action executes (e.g., listBlobsPaginated in blob-actions.ts)
Step 17: Server Action makes internal HTTP call to http://blob-service:8080/api/blobs?page=0&size=20
  - This is container-to-container traffic within the Container App Environment (private internal DNS)
  - fetch() with cache: "no-store" to bypass Next.js data cache
Step 18: blob-service receives API request, checks Redis cache first
Step 19: On cache miss, blob-service queries Azure Blob Storage via Private Endpoint
Step 20: blob-service writes result to Redis cache, returns JSON to Next.js
Step 21: Next.js renders the page with blob data (SSR), returns HTML to Nginx
Step 22: Nginx forwards response to user's browser through Bastion PE
Step 23: Browser renders the page

RESPONSE PATH (show as dashed lines):
Azure Blob Storage -> blob-service -> Redis (cache write) -> blob-service -> Next.js -> Nginx -> Bastion PE -> User Browser

Add callout boxes:
- At Nginx: "Security headers added: X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy. Gzip compression enabled for text/JSON."
- At Flask OIDC: "Session TTL: 30 minutes in Redis. Cookie: httponly, secure, SameSite=Lax"
- At Next.js: "Server Actions pattern — no API keys/URLs exposed to browser. All backend calls are server-side only."
- At Spring Boot APIs: "Cache-aside pattern: read Redis first, on miss query data source, write back to Redis"

Show a legend:
- Solid green arrow = Inbound request path
- Dashed blue arrow = Response path
- Red arrow = Auth subrequest (internal to Nginx)
- Orange arrow = Backend data fetching
```

---

## Diagram 3: OIDC Authentication Flow (Detailed)

**Prompt:**

```
Create a detailed sequence diagram showing the complete OIDC Authorization Code Flow for a user who is NOT yet authenticated (no session cookie). Show every HTTP request/response with method, path, status code, and key headers/parameters.

Title: "OIDC Authorization Code Flow — First-Time User Authentication"

PARTICIPANTS (show as vertical lifelines):
1. User Browser (Conexus workstation)
2. Nginx Proxy (Container App, port 443)
3. Flask OIDC Proxy (Container App, port 5000)
4. Redis (Azure Cache for Redis, session store)
5. On-Premises OIDC Provider (replaces Keycloak in production — accessed via Bastion -> Conexus)

Note at top: "In local development, the OIDC Provider is Keycloak (port 8080). In non-prod/prod Azure deployment, it is the corporate on-prem OIDC provider accessed through the VNet -> Bastion -> Conexus network path. The Flask OIDC Proxy uses two URL configurations: INTERNAL URL (server-to-server, used for token exchange and JWKS) and PUBLIC URL (browser-facing, used for redirect URLs the browser will follow)."

SEQUENCE:

1. Browser -> Nginx: GET https://app.internal.company.com/dashboard
   Headers: (no oidc_session_id cookie)

2. Nginx -> Flask OIDC: Internal subrequest: GET http://flask-oidc-proxy:5000/auth/check
   Headers: X-Original-URI=/dashboard, X-Original-Method=GET, Cookie=(empty)

3. Flask OIDC: Checks for "oidc_session_id" cookie — not found
4. Flask OIDC -> Nginx: Returns HTTP 401 (no session)

5. Nginx: error_page 401 = @login_redirect
   Nginx -> Browser: HTTP 302 Redirect to https://app.internal.company.com/auth/login?redirect_uri=/dashboard

6. Browser -> Nginx: GET /auth/login?redirect_uri=/dashboard
   (This route is NOT protected by auth_request — /auth/* paths bypass authentication)

7. Nginx -> Flask OIDC: Proxied to http://flask-oidc-proxy:5000/auth/login?redirect_uri=/dashboard

8. Flask OIDC: Generates cryptographic state parameter (secrets.token_urlsafe(32))
9. Flask OIDC -> Redis: Store state in Redis key "oidc_state:{state}" with value {"original_uri": "/dashboard"}, TTL=300 seconds (CSRF protection)

10. Flask OIDC -> Browser (via Nginx): HTTP 302 Redirect to:
    {OIDC_PUBLIC_URL}/realms/{realm}/protocol/openid-connect/auth?
      response_type=code&
      client_id=nginx-proxy-client&
      redirect_uri=https://app.internal.company.com/auth/callback&
      scope=openid profile email&
      state={state}
    Note: PUBLIC URL used here because the browser must follow this redirect

11. Browser -> On-Prem OIDC Provider: GET /realms/{realm}/protocol/openid-connect/auth?...
    (Browser resolves OIDC provider hostname via on-prem DNS — direct Conexus network, no Azure traversal needed)

12. OIDC Provider -> Browser: Returns login page (HTML form)

13. User enters credentials (username + password)
14. Browser -> OIDC Provider: POST credentials (form submission)

15. OIDC Provider: Validates credentials, checks user roles, generates authorization code
16. OIDC Provider -> Browser: HTTP 302 Redirect to:
    https://app.internal.company.com/auth/callback?code={authorization_code}&state={state}

17. Browser -> Nginx: GET /auth/callback?code={code}&state={state}
    (Again, /auth/* bypasses auth_request)

18. Nginx -> Flask OIDC: Proxied to http://flask-oidc-proxy:5000/auth/callback?code={code}&state={state}

19. Flask OIDC -> Redis: Retrieve and delete "oidc_state:{state}" (one-time use, CSRF validation)
    Uses Redis pipeline: GET + DELETE atomically
    If state not found or expired: return 400 "Invalid or expired state parameter"

20. Flask OIDC -> On-Prem OIDC Provider (SERVER-TO-SERVER):
    POST {OIDC_INTERNAL_URL}/realms/{realm}/protocol/openid-connect/token
    Body (form-encoded):
      grant_type=authorization_code&
      code={authorization_code}&
      redirect_uri=https://app.internal.company.com/auth/callback&
      client_id=nginx-proxy-client&
      client_secret={CLIENT_SECRET}
    Note: INTERNAL URL used — this is server-to-server. Traffic flows: Container App -> VNet -> Bastion -> Conexus -> OIDC Provider
    Timeout: 10 seconds

21. OIDC Provider -> Flask OIDC: Token response (JSON):
    {
      "access_token": "{JWT}",
      "id_token": "{JWT}",
      "refresh_token": "{opaque}",
      "token_type": "Bearer",
      "expires_in": 300
    }

22. Flask OIDC: Validate ID Token:
    a. Fetch JWKS from {OIDC_INTERNAL_URL}/realms/{realm}/protocol/openid-connect/certs (cached 5 min)
    b. Match signing key by "kid" header in JWT
    c. Verify signature (RS256), expiration, issuer, audience
    d. Extract claims: preferred_username, email, name, realm_roles

23. Flask OIDC: Generate session ID (secrets.token_urlsafe(32))
24. Flask OIDC -> Redis: Store session:
    Key: "oidc_session:{session_id}"
    Value: {
      "access_token": "...",
      "refresh_token": "...",
      "id_token": "...",
      "user": "john.doe",
      "email": "john.doe@company.com",
      "name": "John Doe",
      "roles": ["admin", "editor"]
    }
    TTL: 1800 seconds (30 minutes)

25. Flask OIDC -> Browser (via Nginx): HTTP 302 Redirect to /dashboard
    Set-Cookie: oidc_session_id={session_id}; HttpOnly; Secure; SameSite=Lax; Max-Age=1800

26. Browser -> Nginx: GET /dashboard
    Cookie: oidc_session_id={session_id}

27. Nginx -> Flask OIDC: auth_request GET /auth/check (with cookie)
28. Flask OIDC -> Redis: Lookup "oidc_session:{session_id}" -> found, valid
29. Flask OIDC -> Nginx: HTTP 200 with X-Auth-User=john.doe, X-Auth-Roles=admin,editor
30. Nginx -> Frontend: proxy_pass to http://frontend:3000/dashboard with auth headers
31. Frontend renders authenticated dashboard

LOGOUT FLOW (show as a separate section below):
1. Browser -> Nginx -> Flask OIDC: GET /auth/logout
2. Flask OIDC -> Redis: Retrieve id_token from session, then delete session
3. Flask OIDC -> Browser: HTTP 302 Redirect to {OIDC_PUBLIC_URL}/realms/{realm}/protocol/openid-connect/logout?
   client_id=nginx-proxy-client&
   post_logout_redirect_uri=https://app.internal.company.com&
   id_token_hint={id_token}
4. Browser -> OIDC Provider: Logout endpoint (clears OIDC provider session)
5. OIDC Provider -> Browser: Redirect to https://app.internal.company.com (post-logout redirect)
6. Browser -> Nginx: Unauthenticated request -> 401 -> login redirect (cycle restarts)

TOKEN REFRESH FLOW (show as a sidebar):
- When auth_request /auth/check finds an expired access_token:
  1. Flask checks JWT "exp" claim without signature verification
  2. If expired, sends POST to OIDC token endpoint with grant_type=refresh_token
  3. On success: updates session in Redis with new tokens
  4. On failure: deletes session, returns 401 (user must re-authenticate)

Add callout boxes:
- "CSRF Protection: The 'state' parameter is generated server-side, stored in Redis with 5-min TTL, and validated on callback. Prevents authorization code injection attacks."
- "Dual URL Pattern: Browser-facing redirects use PUBLIC URL (resolvable from Conexus). Server-to-server calls (token exchange, JWKS, userinfo) use INTERNAL URL (routed through VNet/Bastion to on-prem)."
- "Session Security: Cookie is HttpOnly (no JS access), Secure (HTTPS only), SameSite=Lax (CSRF mitigation). Session stored in Redis, not in the cookie itself."
```

---

## Diagram 4: Docker Container Architecture (Local Development)

**Prompt:**

```
Create a container architecture diagram showing all Docker containers in the local development environment with their networking, dependencies, and data flows. Use a single bounded box for the Docker bridge network.

Title: "Local Development — Docker Compose Container Architecture"

NETWORK: "app-network" (Docker bridge network — all containers share this network and resolve each other by container name)

GROUP 1: INFRASTRUCTURE LAYER (show at bottom)
┌─────────────────────────────────────────────────────┐
│ postgres (postgres:16-alpine)                        │
│ Port: 5432 (published to host)                       │
│ Databases: keycloak_db, data_service_db,             │
│            reports_service_db, ops_service_db         │
│ Volume: postgres-data:/var/lib/postgresql/data        │
│ Init Scripts: database/init/01-init-databases.sql,    │
│   02-data-service-schema.sql,                         │
│   03-reports-service-schema.sql                       │
│ Health Check: pg_isready (10s interval, 5 retries)    │
├─────────────────────────────────────────────────────┤
│ redis (redis:7-alpine)                                │
│ Port: 6379 (published to host)                        │
│ Password auth enabled                                 │
│ Volume: redis-data:/data                              │
│ Dual purpose: session store + API cache               │
│ Health Check: redis-cli ping (10s interval)           │
├─────────────────────────────────────────────────────┤
│ azurite (mcr.microsoft.com/azure-storage/azurite)    │
│ Ports: 10000 (Blob), 10001 (Queue), 10002 (Table)   │
│ Volume: azurite-data:/data                            │
│ Emulates Azure Blob Storage for local development     │
│ Flag: --skipApiVersionCheck                           │
└─────────────────────────────────────────────────────┘

GROUP 2: IDENTITY LAYER (show above infrastructure)
┌─────────────────────────────────────────────────────┐
│ keycloak (quay.io/keycloak/keycloak:26.0)            │
│ Port: 8080 (published to host — browser must reach)  │
│ Mode: start-dev --import-realm                        │
│ Realm: app-realm with:                                │
│   - Client: nginx-proxy-client (confidential)        │
│   - Roles: admin, editor, viewer                      │
│   - Test Users: admin-user, editor-user, viewer-user │
│     (all password: "password")                        │
│ DB: jdbc:postgresql://postgres:5432/keycloak_db       │
│ depends_on: postgres (healthy)                        │
│                                                       │
│ NOTE: Keycloak is ONLY for local dev/demo.            │
│ In non-prod/prod, replaced by on-prem OIDC provider. │
└─────────────────────────────────────────────────────┘

GROUP 3: AUTH PROXY LAYER (show above identity)
┌─────────────────────────────────────────────────────┐
│ flask-oidc-proxy (python:3.12-slim + Gunicorn)       │
│ Internal Port: 5000 (NOT published to host)          │
│ Workers: 2 Gunicorn workers, 4 threads each          │
│ Endpoints:                                            │
│   GET /auth/check — Nginx auth_request subrequest    │
│   GET /auth/login — Initiates OIDC flow              │
│   GET /auth/callback — Handles OIDC redirect         │
│   GET /auth/logout — Clears session + OIDC logout    │
│   GET /auth/userinfo — Returns user info from session│
│ Connections:                                          │
│   -> redis:6379 (session storage, state storage)     │
│   -> keycloak:8080 (token exchange, JWKS — internal) │
│   -> localhost:8080 (browser redirects — public URL) │
│ depends_on: keycloak, redis                           │
├─────────────────────────────────────────────────────┤
│ nginx-proxy (nginx:1.27-alpine)                      │
│ Ports: 443 (HTTPS), 80 (HTTP->HTTPS redirect)       │
│ TLS: Self-signed certs (server.crt/server.key)       │
│ Volume: ./certs:/etc/nginx/certs:ro                  │
│ Upstreams:                                            │
│   frontend -> frontend:3000                          │
│   flask_oidc -> flask-oidc-proxy:5000                │
│ Routing:                                              │
│   /auth/check (internal) -> flask_oidc               │
│   /auth/* (unprotected) -> flask_oidc                │
│   /* (protected by auth_request) -> frontend         │
│ depends_on: flask-oidc-proxy, frontend               │
└─────────────────────────────────────────────────────┘

GROUP 4: BACKEND API LAYER (show in middle)
┌─────────────────────────────────────────────────────┐
│ blob-service (Spring Boot 3.3, Java 21, Maven)       │
│ Internal: 8080, Host: 8081                           │
│ Profile: local                                        │
│ -> azurite:10000 (Blob Storage via Azure SDK)        │
│ -> redis:6379 (cache metadata)                       │
│ Health: /actuator/health (30s start, 10s interval)   │
│ depends_on: azurite, redis                           │
├─────────────────────────────────────────────────────┤
│ reports-service (Spring Boot 3.3, Java 21, Maven)    │
│ Internal: 8080, Host: 8082                           │
│ Profile: local                                        │
│ -> postgres:5432/reports_service_db (JPA)            │
│ -> redis:6379 (cache report status)                  │
│ depends_on: postgres (healthy), redis (healthy)      │
├─────────────────────────────────────────────────────┤
│ data-service (Spring Boot 3.3, Java 21, Maven)       │
│ Internal: 8080, Host: 8083                           │
│ Profile: local                                        │
│ -> postgres:5432/data_service_db (JPA)               │
│ -> redis:6379 (cache-aside pattern)                  │
│ depends_on: postgres (healthy), redis (healthy)      │
├─────────────────────────────────────────────────────┤
│ ops-service (Spring Boot 3.3, Java 21, Maven)        │
│ Internal: 8080, Host: 8084                           │
│ Profile: local                                        │
│ -> postgres:5432/ops_service_db (JPA)                │
│ -> redis:6379 (cache)                                │
│ depends_on: postgres (healthy), redis (healthy)      │
├─────────────────────────────────────────────────────┤
│ seed-blobs (alpine:3.20 — one-shot)                  │
│ Runs seed-via-api.sh to populate Azurite via         │
│ blob-service REST API (curl POST multipart)          │
│ depends_on: blob-service (healthy)                   │
│ restart: "no"                                        │
└─────────────────────────────────────────────────────┘

GROUP 5: FRONTEND LAYER (show above backend)
┌─────────────────────────────────────────────────────┐
│ frontend (node:20-alpine, Next.js 15 standalone)     │
│ Internal Port: 3000, Host: 3000                      │
│ Package Manager: pnpm 9.15.0                         │
│ Server Actions (no client-side API calls):            │
│   -> blob-service:8080 (blob operations)             │
│   -> reports-service:8080 (report generation)        │
│   -> data-service:8080 (CRUD operations)             │
│   -> ops-service:8080 (operations data)              │
│   -> redis:6379 (read-only cache via ioredis)        │
│ Auth: Reads X-Auth-User, X-Auth-Roles headers       │
│       set by Nginx from Flask OIDC subrequest        │
│ depends_on: all backend services, redis              │
└─────────────────────────────────────────────────────┘

DEPENDENCY ARROWS (draw with direction):
- postgres <- keycloak, reports-service, data-service, ops-service
- redis <- flask-oidc-proxy, blob-service, reports-service, data-service, ops-service, frontend (read-only)
- azurite <- blob-service
- keycloak <- flask-oidc-proxy
- flask-oidc-proxy <- nginx-proxy
- frontend <- nginx-proxy
- blob-service <- seed-blobs, frontend
- reports-service <- frontend
- data-service <- frontend
- ops-service <- frontend

STARTUP ORDER (show as numbered sequence):
1. postgres, redis, azurite (infrastructure — start first, parallel)
2. keycloak (waits for postgres healthy)
3. flask-oidc-proxy (waits for keycloak + redis)
4. blob-service, reports-service, data-service, ops-service (wait for postgres/redis/azurite healthy)
5. seed-blobs (waits for blob-service healthy, runs once)
6. frontend (waits for all backend services + redis)
7. nginx-proxy (waits for flask-oidc-proxy + frontend)

Add note: "Published host ports (5432, 6379, 8080-8084, 3000) are for local debugging only. In production, only the Nginx ingress is externally reachable via Private Endpoint. The docker-compose.override.yml adds host port mappings for development convenience."
```

---

## Diagram 5: Azure Container App Deployment Architecture

**Prompt:**

```
Create an Azure cloud architecture diagram showing the production/non-prod deployment of the Container App within the enterprise network context. Show Azure resource types with their official Azure icons where possible.

Title: "Azure Container App — Non-Production Deployment Architecture"

AZURE SUBSCRIPTION (outer boundary):

  RESOURCE GROUP: "{project-name}-dev-rg"
  LOCATION: East US (or applicable region)
  ALL RESOURCES TAGGED: environment=dev, managed_by=terraform

  ┌── VNet: {project-name}-vnet (10.0.0.0/16) ──────────────────────────────┐
  │                                                                           │
  │  SUBNET: container-apps (10.0.0.0/21)                                    │
  │  Delegation: Microsoft.App/environments                                  │
  │  ┌─────────────────────────────────────────────────────────────────────┐ │
  │  │ CONTAINER APP ENVIRONMENT                                           │ │
  │  │ (Log Analytics Workspace attached — PerGB2018, 30-day retention)   │ │
  │  │                                                                     │ │
  │  │  ┌─── EXTERNAL INGRESS ─────────────────────────────────────────┐ │ │
  │  │  │ nginx-proxy (0.25 vCPU, 0.5Gi)                               │ │ │
  │  │  │ Custom domain: app.internal.company.com                       │ │ │
  │  │  │ TLS: Azure-managed certificate for custom domain              │ │ │
  │  │  │ This is the ONLY entry point for users                        │ │ │
  │  │  └──────────────────────────────────────────────────────────────┘ │ │
  │  │                                                                     │ │
  │  │  ┌─── INTERNAL INGRESS (VNet only) ─────────────────────────────┐ │ │
  │  │  │ flask-oidc-proxy (0.25 vCPU, 0.5Gi)                         │ │ │
  │  │  │ blob-service (0.5 vCPU, 1Gi)                                │ │ │
  │  │  │ reports-service (0.5 vCPU, 1Gi)                              │ │ │
  │  │  │ data-service (0.5 vCPU, 1Gi)                                │ │ │
  │  │  │ ops-service (0.5 vCPU, 1Gi)                                 │ │ │
  │  │  │ frontend (0.5 vCPU, 1Gi)                                    │ │ │
  │  │  │ All use internal Container App DNS for service-to-service    │ │ │
  │  │  │ e.g., http://blob-service (no port needed in Azure CA)      │ │ │
  │  │  └──────────────────────────────────────────────────────────────┘ │ │
  │  └─────────────────────────────────────────────────────────────────────┘ │
  │                                                                           │
  │  SUBNET: postgres (10.0.8.0/24)                                          │
  │  Delegation: Microsoft.DBforPostgreSQL/flexibleServers                   │
  │  ┌─────────────────────────────────────────────────────────────────────┐ │
  │  │ Azure PostgreSQL Flexible Server (v16, B_Standard_B1ms, 32GB)      │ │
  │  │ Private DNS: {project}.postgres.database.azure.com                  │ │
  │  │ Databases: data_service_db, reports_service_db, ops_service_db     │ │
  │  │ VNet integrated — no public endpoint                                │ │
  │  └─────────────────────────────────────────────────────────────────────┘ │
  │                                                                           │
  │  SUBNET: private-endpoints (10.0.9.0/24)                                │
  │  ┌─────────────────────────────────────────────────────────────────────┐ │
  │  │ Azure Cache for Redis (Basic C0, Redis 6, TLS 1.2 min)            │ │
  │  │ Private Endpoint — no public access                                 │ │
  │  │ Connection: rediss:// (TLS-enabled Redis protocol)                 │ │
  │  ├─────────────────────────────────────────────────────────────────────┤ │
  │  │ Azure Storage Account (Standard LRS, TLS 1.2)                      │ │
  │  │ Private Endpoint — no public access                                 │ │
  │  │ Blob Containers: reports, uploads, exports                          │ │
  │  └─────────────────────────────────────────────────────────────────────┘ │
  └───────────────────────────────────────────────────────────────────────────┘

  OUTSIDE VNet (but in subscription):
  ┌────────────────────────────────────────────┐
  │ Azure Container Registry (Standard SKU)     │
  │ Stores all 7 container images               │
  │ Admin auth enabled                          │
  │ Private Endpoint in Bastion network          │
  │ Images tagged: {service}:{git-sha}          │
  ├────────────────────────────────────────────┤
  │ Azure Key Vault                             │
  │ Secrets: postgres-password, redis-key,      │
  │   oidc-client-secret, storage-conn-string   │
  │ Managed Identity access from Container Apps │
  └────────────────────────────────────────────┘

EXTERNAL TO AZURE (show to the left):
  ┌── Bastion Network ──────────────────────────┐
  │ PE: Container App -> nginx-proxy ingress     │
  │ PE: ACR -> image pull                        │
  │ PE: Storage Account -> Blob/Table/Queue/File │
  │ PE: Redis -> cache access                    │
  │ PE: PostgreSQL (if applicable)               │
  └──────────────────────────────────────────────┘
        |
  ┌── Conexus Network (On-Prem) ────────────────┐
  │ User Workstations (27 users)                 │
  │ On-Prem OIDC Provider                        │
  │ On-Prem DNS Server                           │
  └──────────────────────────────────────────────┘

CONNECTION ARROWS with labels:
1. User -> Bastion PE -> nginx-proxy: "HTTPS user traffic"
2. flask-oidc-proxy -> Bastion -> Conexus -> OIDC Provider: "OIDC token exchange (outbound)"
3. blob-service -> PE -> Storage Account: "Blob CRUD via Azure SDK"
4. reports-service, data-service, ops-service -> PostgreSQL: "JDBC over VNet delegation"
5. All services -> PE -> Redis: "rediss:// (TLS) cache read/write"
6. Container Apps -> PE -> ACR: "Image pull at deployment"
7. Container Apps -> Key Vault: "Secret retrieval via Managed Identity"

MANAGED IDENTITY NOTES:
- Container Apps use system-assigned managed identity
- Identity has: ACR Pull, Key Vault Secret Reader, Storage Blob Data Contributor
- No passwords/connection strings in environment variables for Azure-native services
```

---

## Diagram 6: CI/CD Pipeline Flow

**Prompt:**

```
Create a pipeline/workflow diagram showing the complete CI/CD process from code commit to production deployment. Show three GitHub Actions workflows with their triggers, jobs, and connections to Azure.

Title: "CI/CD Pipeline — GitHub Actions to Azure Container Apps"

TRIGGER SOURCES (left side):
- Pull Request to main/develop branch -> triggers CI
- Push/merge to main branch -> triggers CI + CD Staging
- Manual workflow_dispatch with image_tag input -> triggers CD Production

═══════════════════════════════════════════════════════════
WORKFLOW 1: CI Pipeline (ci.yml)
Trigger: PR or push to main/develop
═══════════════════════════════════════════════════════════

JOB 1: "detect-changes" (dorny/paths-filter@v3)
  Scans git diff to determine which services changed:
  - flask-oidc-proxy/** -> flask_changed=true
  - services/blob-service/** -> blob_changed=true
  - services/reports-service/** -> reports_changed=true
  - services/data-service/** -> data_changed=true
  - services/ops-service/** -> ops_changed=true
  - services/frontend/** -> frontend_changed=true
  - services/nginx-proxy/** -> nginx_changed=true
  - services/keycloak/** -> keycloak_changed=true
  - infrastructure/** -> infra_changed=true
  Note: "Path-filtered builds for monorepo efficiency — only test/build what changed"

JOB 2: "test-flask" (if flask_changed)
  Runner: ubuntu-latest
  - Setup Python 3.12
  - pip install -r requirements.txt
  - pytest with coverage
  - Working dir: services/flask-oidc-proxy

JOB 3: "test-spring" (if blob/reports/data/ops changed)
  Runner: ubuntu-latest
  - Setup Java 21 (Temurin)
  - Maven cache enabled
  - For each changed service: mvn verify -B
  Note: "In enterprise, Maven resolves dependencies from JFrog via corporate proxy"

JOB 4: "test-frontend" (if frontend_changed)
  Runner: ubuntu-latest
  - Setup Node 20 + pnpm 9
  - pnpm install (frozen lockfile)
  - pnpm lint
  - pnpm build
  Note: "In enterprise, pnpm resolves packages from JFrog npm registry via corporate proxy"

JOB 5: "validate-terraform" (if infra_changed)
  Runner: ubuntu-latest
  - terraform init -backend=false
  - terraform validate
  - terraform fmt -check

JOB 6: "build-images" (all services, always runs)
  Runner: ubuntu-latest
  - Docker buildx with GitHub Actions cache
  - Builds all 8 service images (no push — validation only)
  - Services: nginx-proxy, flask-oidc-proxy, keycloak, blob-service,
    reports-service, data-service, ops-service, frontend

═══════════════════════════════════════════════════════════
WORKFLOW 2: CD Staging (cd-staging.yml)
Trigger: Push to main branch (after PR merge)
═══════════════════════════════════════════════════════════

JOB 1: "build-and-push" (matrix: 7 services)
  Environment: staging
  Steps:
  1. azure/login@v2 (Service Principal auth: ARM_CLIENT_ID, ARM_CLIENT_SECRET, ARM_SUBSCRIPTION_ID, ARM_TENANT_ID)
  2. azure/docker-login@v2 (authenticate to ACR)
  3. Docker buildx build + push for each service:
     Tags: {ACR_LOGIN_SERVER}/{service}:{github.sha}
           {ACR_LOGIN_SERVER}/{service}:latest
     Cache: GitHub Actions cache (type=gha)
  Services: nginx-proxy, flask-oidc-proxy, keycloak, blob-service,
            reports-service, data-service, frontend

  Note: "In enterprise environment, Docker build requires:
  1. Company CA .crt mounted/trusted in build stage for JFrog TLS
  2. HTTP_PROXY/HTTPS_PROXY build args for corporate proxy
  3. JFrog configured as Docker registry mirror / Maven mirror / npm registry"

JOB 2: "deploy" (depends on build-and-push)
  Environment: staging (GitHub environment with protection rules)
  Working dir: infrastructure/terraform/environments/staging
  Steps:
  1. terraform init (backend: Azure Storage Account for state)
  2. terraform plan with variables:
     - TF_VAR_image_tag = github.sha
     - TF_VAR_postgres_admin_password (from GitHub Secrets)
     - TF_VAR_keycloak_admin_password (from GitHub Secrets)
  3. terraform apply -auto-approve
  Result: Container Apps updated to new image revision

═══════════════════════════════════════════════════════════
WORKFLOW 3: CD Production (cd-production.yml)
Trigger: Manual workflow_dispatch
Input: image_tag (the specific commit SHA to promote)
═══════════════════════════════════════════════════════════

JOB 1: "deploy"
  Environment: production (GitHub environment — may require manual approval)
  Working dir: infrastructure/terraform/environments/production
  Steps:
  1. terraform init
  2. terraform plan with TF_VAR_image_tag = inputs.image_tag
  3. terraform apply -auto-approve
  Note: "Promotes the exact same images tested in staging — no rebuild"

FLOW ARROWS (show the progression):
PR Created -> CI Pipeline (test + build) -> PR Approved + Merged
-> Push to main -> CD Staging (build, push to ACR, terraform apply staging)
-> Verify in staging -> Manual trigger CD Production (terraform apply production with same image tag)

AZURE RESOURCES TOUCHED:
- ACR: receives container images
- Container App Environment: container apps updated to new revision
- Terraform State: stored in Azure Storage Account (backend)

Add callout: "The Terraform state file is stored in an Azure Storage Account backend, ensuring team collaboration and state locking. Each environment (dev, staging, production) has its own state file."
```

---

## Diagram 7: Enterprise Docker Build Pipeline (JFrog, Proxy, TLS)

**Prompt:**

```
Create a detailed diagram showing the Docker container build process in the enterprise environment, highlighting how package managers authenticate with JFrog Artifactory through the corporate proxy, and how the company CA certificate is used.

Title: "Enterprise Container Build Process — Package Manager Authentication with JFrog via Corporate Proxy"

ENVIRONMENT CONTEXT:
- Build runs on: CI/CD runner (or developer's Windows workstation on Conexus)
- Corporate proxy server sits between all internal machines and JFrog
- Company-wide CA certificate (.crt) is required for TLS handshake with JFrog through the proxy
- The .crt is distributed enterprise-wide and trusted on the corporate proxy server

PACKAGE MANAGER FLOWS (show each as a separate swim lane):

─── FLOW A: Maven (Spring Boot services) ───
Dockerfile stage: maven:3.9-eclipse-temurin-21
1. COPY company-ca.crt /usr/local/share/ca-certificates/
2. RUN update-ca-certificates (trust company CA in Java/OS trust store)
3. Configure Maven settings.xml to use JFrog as mirror:
   <mirror>
     <url>https://jfrog.company.com/artifactory/maven-remote/</url>
   </mirror>
4. Set proxy in settings.xml or via env vars:
   HTTPS_PROXY=http://proxy.company.com:8080
5. mvn dependency:go-offline → resolves from JFrog via proxy
   Traffic: Docker build → Corporate Proxy → JFrog → Maven artifacts
6. mvn package -DskipTests → builds JAR
7. Multi-stage: copy JAR to eclipse-temurin:21-jre-alpine (runtime stage)

─── FLOW B: pip (Flask OIDC Proxy) ───
Dockerfile stage: python:3.12-slim
1. COPY company-ca.crt /usr/local/share/ca-certificates/
2. RUN update-ca-certificates
3. Configure pip to use JFrog PyPI:
   pip config set global.index-url https://jfrog.company.com/artifactory/api/pypi/pypi-remote/simple
   pip config set global.trusted-host jfrog.company.com
   OR: pip install --cert /path/to/company-ca.crt
4. Set proxy:
   ENV HTTPS_PROXY=http://proxy.company.com:8080
5. pip install -r requirements.txt → resolves from JFrog via proxy
   Traffic: Docker build → Corporate Proxy → JFrog → PyPI packages
   Packages: Flask, gunicorn, requests, PyJWT, cryptography, redis

─── FLOW C: pnpm (Next.js Frontend) ───
Dockerfile stage: node:20-alpine
1. COPY company-ca.crt /usr/local/share/ca-certificates/
2. RUN update-ca-certificates
3. Configure npm/pnpm to use JFrog npm registry:
   pnpm config set registry https://jfrog.company.com/artifactory/api/npm/npm-remote/
   OR: .npmrc file with registry=https://jfrog.company.com/...
4. Set NODE_EXTRA_CA_CERTS=/usr/local/share/ca-certificates/company-ca.crt
5. Set proxy:
   ENV HTTPS_PROXY=http://proxy.company.com:8080
6. pnpm install --frozen-lockfile → resolves from JFrog via proxy
   Traffic: Docker build → Corporate Proxy → JFrog → npm packages
7. pnpm build → Next.js standalone output
8. Multi-stage: copy .next/standalone to runtime node:20-alpine

─── FLOW D: Docker Base Images ───
Docker daemon configuration:
1. Docker daemon trusts company CA for registry TLS
2. Docker configured to use JFrog as registry mirror:
   /etc/docker/daemon.json:
   {
     "registry-mirrors": ["https://jfrog.company.com/artifactory/docker-remote/"],
     "insecure-registries": [],
     "proxies": { "https-proxy": "http://proxy.company.com:8080" }
   }
3. docker pull nginx:1.27-alpine → pulls from JFrog mirror
4. docker pull postgres:16-alpine → pulls from JFrog mirror
   Traffic: Docker daemon → Corporate Proxy → JFrog → Docker Hub (cached)

─── FLOW E: Docker Push to ACR ───
After build:
1. docker login {acr-name}.azurecr.io (credentials from Key Vault or CI secrets)
2. docker tag {service}:latest {acr-name}.azurecr.io/{service}:{git-sha}
3. docker push → traffic routes through proxy → Bastion PE → ACR
   Note: ACR has a Private Endpoint in the Bastion network

NETWORK DIAGRAM (show the build-time network path):

┌─────────────────────────────────────────────────────────────────┐
│ CI/CD Runner / Developer Workstation (Conexus Network)          │
│                                                                  │
│  Docker Build Context                                            │
│  ├── Dockerfile                                                  │
│  ├── company-ca.crt (mounted or COPY'd)                         │
│  ├── source code                                                 │
│  └── config files (settings.xml, .npmrc, pip.conf)              │
│                                                                  │
│  Environment Variables:                                          │
│  ├── HTTP_PROXY=http://proxy.company.com:8080                   │
│  ├── HTTPS_PROXY=http://proxy.company.com:8080                  │
│  ├── NO_PROXY=localhost,127.0.0.1,.company.com                  │
│  └── NODE_EXTRA_CA_CERTS=/path/to/company-ca.crt               │
└──────────────────────┬──────────────────────────────────────────┘
                       │ All outbound HTTPS traffic
                       ▼
┌──────────────────────────────────────────┐
│ Corporate Proxy Server                    │
│ Holds/trusts company CA certificate       │
│ Routes traffic to internal/external       │
│ destinations                              │
└──────────────────────┬───────────────────┘
                       │
            ┌──────────┼──────────┐
            ▼          ▼          ▼
    ┌───────────┐ ┌────────┐ ┌───────┐
    │ JFrog     │ │ ACR    │ │ Other │
    │ Artifactory│ │ (via   │ │ (npm, │
    │ (Maven,   │ │ Bastion│ │ PyPI) │
    │  npm,     │ │ PE)    │ │       │
    │  PyPI,    │ │        │ │       │
    │  Docker)  │ │        │ │       │
    └───────────┘ └────────┘ └───────┘

Add callout: "CRITICAL for enterprise builds: Without the company CA certificate trusted in the Docker build stage, ALL package manager operations (pip install, mvn dependency:resolve, pnpm install) will fail with SSL/TLS certificate verification errors when connecting through the corporate proxy to JFrog."

Add callout: "The multi-stage Docker builds are important: the company CA cert, proxy configs, and build tools are ONLY in the build stage. The final runtime image is clean — it contains only the application artifact and a minimal base image. No certificates, no build tools, no proxy configuration leak into production containers."
```

---

## Diagram 8: Data Flow and Caching Pattern

**Prompt:**

```
Create a data flow diagram showing how data moves between all services, with special emphasis on the Redis caching pattern (backend read/write, frontend read-only) and the different data stores each service uses.

Title: "Service Data Flow and Caching Architecture"

SERVICES AND THEIR DATA STORES:

┌─── Frontend (Next.js) ──────────────────────────────────────────────┐
│ READS from: Redis (via ioredis, read-only — getCachedValue,         │
│             getCachedHash)                                           │
│ CALLS: All 4 Spring Boot APIs via Server Actions (server-side HTTP) │
│ DOES NOT: Write to any database or cache                             │
│ DOES NOT: Make client-side API calls (all via "use server" actions)  │
│ Auth: Reads X-Auth-User + X-Auth-Roles from Nginx headers           │
└──────────────────────────────────────────────────────────────────────┘
         │                                    │ (read-only)
         │ Server Actions                     │
         │ (server-side fetch)                ▼
         │                              ┌──────────┐
         │                              │  Redis   │
         │                              │ (Cache)  │
         ▼                              └──────────┘
┌─── blob-service ────────────────────────────────────────────────────┐
│ DATA SOURCE: Azure Blob Storage (Azurite locally)                    │
│ Connection: Azure SDK BlobServiceClient                              │
│   Local: DefaultEndpointsProtocol=http;AccountName=devstoreaccount1  │
│          BlobEndpoint=http://azurite:10000/devstoreaccount1          │
│   Azure: Connection string from Key Vault (Private Endpoint)         │
│                                                                      │
│ CACHE PATTERN (write-through):                                       │
│   On list/get: Check Redis first → on miss, query Blob Storage →    │
│                write result to Redis with TTL → return to caller      │
│   On upload/delete: Perform operation → invalidate Redis cache       │
│                                                                      │
│ ENDPOINTS:                                                           │
│   GET  /api/blobs/containers         → list all containers           │
│   GET  /api/blobs/{container}        → list blobs in container       │
│   GET  /api/blobs/{container}/{blob} → download blob content         │
│   GET  /api/blobs/{container}/{blob}/metadata → blob metadata        │
│   POST /api/blobs/{container}        → upload blob (multipart)       │
│   DELETE /api/blobs/{container}/{blob} → delete blob                 │
│   GET  /api/blobs?page=&size=&sort=  → paginated blob listing        │
│                                                                      │
│ REDIS: Read + Write (cache metadata, invalidate on mutation)         │
└──────────────────────────────────────────────────────────────────────┘

┌─── reports-service ─────────────────────────────────────────────────┐
│ DATA SOURCE: PostgreSQL (reports_service_db)                         │
│ Connection: JDBC jdbc:postgresql://postgres:5432/reports_service_db  │
│ ORM: Spring Data JPA + Hibernate                                     │
│                                                                      │
│ PATTERN: Async report generation                                     │
│   1. POST /api/reports/generate → creates report record (PENDING)    │
│   2. Async thread processes report → status: PROCESSING → COMPLETED  │
│   3. GET /api/reports/{id}/status → returns current status           │
│   4. GET /api/reports/{id} → download completed report               │
│                                                                      │
│ Entity: Report (id, name, type, status, generatedAt)                 │
│ Status enum: PENDING → PROCESSING → COMPLETED | FAILED              │
│                                                                      │
│ REDIS: Read + Write (cache report statuses for quick polling)        │
└──────────────────────────────────────────────────────────────────────┘

┌─── data-service ────────────────────────────────────────────────────┐
│ DATA SOURCE: PostgreSQL (data_service_db)                            │
│ Connection: JDBC jdbc:postgresql://postgres:5432/data_service_db     │
│ ORM: Spring Data JPA + Hibernate                                     │
│                                                                      │
│ PATTERN: Cache-aside (lazy loading)                                  │
│   READ: Check Redis → on hit, return cached → on miss, query DB →  │
│          write to Redis with TTL → return                            │
│   WRITE: Write to DB → invalidate/update Redis entry                │
│                                                                      │
│ ENDPOINTS:                                                           │
│   GET    /api/data?page=&size=&search= → paginated list with search │
│   GET    /api/data/{id}                → single entity               │
│   POST   /api/data                     → create entity               │
│   PUT    /api/data/{id}                → update entity               │
│   DELETE /api/data/{id}                → delete entity               │
│                                                                      │
│ Entity: DataEntity (id, name, description, category, metadata,       │
│         createdAt, updatedAt)                                        │
│                                                                      │
│ REDIS: Read + Write (cache-aside pattern)                            │
└──────────────────────────────────────────────────────────────────────┘

┌─── ops-service ─────────────────────────────────────────────────────┐
│ DATA SOURCE: PostgreSQL (ops_service_db)                             │
│ Connection: JDBC jdbc:postgresql://postgres:5432/ops_service_db      │
│ ORM: Spring Data JPA + Hibernate                                     │
│                                                                      │
│ PURPOSE: Messaging board, shift calendar, operations tracking        │
│                                                                      │
│ REDIS: Read + Write (cache)                                          │
└──────────────────────────────────────────────────────────────────────┘

┌─── flask-oidc-proxy ────────────────────────────────────────────────┐
│ DATA IN REDIS (not a traditional data store):                        │
│   "oidc_session:{id}" → user session (tokens, roles, user info)     │
│     TTL: 1800s (30 min)                                              │
│   "oidc_state:{state}" → CSRF state for auth flow                   │
│     TTL: 300s (5 min), one-time use (GET + DELETE atomically)        │
│                                                                      │
│ REDIS: Read + Write (session management)                             │
└──────────────────────────────────────────────────────────────────────┘

REDIS KEY NAMESPACE DIAGRAM:
Show Redis as a central component with key prefixes:
  oidc_session:*   ← flask-oidc-proxy (R/W)
  oidc_state:*     ← flask-oidc-proxy (R/W, short-lived)
  blobs:*          ← blob-service (R/W), frontend (R)
  reports:*        ← reports-service (R/W), frontend (R)
  data:*           ← data-service (R/W), frontend (R)
  ops:*            ← ops-service (R/W), frontend (R)

REDIS ACCESS CONTROL SUMMARY (show as a matrix):
┌────────────────────┬───────┬───────┐
│ Service            │ Read  │ Write │
├────────────────────┼───────┼───────┤
│ flask-oidc-proxy   │  Yes  │  Yes  │ (sessions only)
│ blob-service       │  Yes  │  Yes  │ (blob cache)
│ reports-service    │  Yes  │  Yes  │ (report cache)
│ data-service       │  Yes  │  Yes  │ (data cache)
│ ops-service        │  Yes  │  Yes  │ (ops cache)
│ frontend           │  Yes  │  NO   │ (read-only via ioredis)
└────────────────────┴───────┴───────┘

CONNECTION PROTOCOL DIFFERENCES:
- Local dev: redis://:password@redis:6379 (plaintext)
- Azure:     rediss://:key@host:6380 (TLS-encrypted, port 6380)
- Local PostgreSQL: jdbc:postgresql://postgres:5432/{db} (plaintext)
- Azure PostgreSQL: jdbc:postgresql://{fqdn}:5432/{db}?sslmode=require (TLS)
- Local Blob: http://azurite:10000 (plaintext, Azurite emulator)
- Azure Blob: https://{account}.blob.core.windows.net (TLS, Private Endpoint)
```

---

## Presentation Tips

For the live demo, walk through these diagrams in this order:

1. **Diagram 1** (Network Topology) — Set the stage: "Here's our enterprise network context"
2. **Diagram 5** (Azure Architecture) — "Here's what we're deploying"
3. **Diagram 4** (Docker Compose) — "Here's how we develop and test locally"
4. **Diagram 3** (OIDC Flow) — "Here's how authentication works step by step"
5. **Diagram 2** (User Request Flow) — "Here's what happens on every page load"
6. **Diagram 8** (Data Flow) — "Here's how data moves between services"
7. **Diagram 7** (Build Pipeline) — "Here's how we handle enterprise build challenges"
8. **Diagram 6** (CI/CD) — "Here's how code gets to production"

Then do the live demo with docker-compose on your local machine showing the actual OIDC flow, blob operations, and dashboard.
