# On-Premises Transferability Assessment

This document assesses what is required to deploy the Complete Azure Container App monorepo into an on-premises environment using JFrog Artifactory for artifact management and an internal OIDC provider (replacing Keycloak).

---

## What's Already Transferable (No Changes Needed)

These components work identically in any environment:

| Component | Why It's Portable |
|-----------|------------------|
| **Server Actions & API integration** | All frontend → backend calls go through internal Docker networking; no cloud-specific APIs |
| **OIDC `auth_request` flow** | Nginx + Flask proxy pattern is provider-agnostic — just swap URLs |
| **Redis caching pattern** | Standard Redis protocol, works with any Redis instance |
| **Frontend component architecture** | Next.js SSR with Server Actions — no cloud dependencies |
| **Spring Boot microservices** | Standard REST APIs with JPA/PostgreSQL — no Azure SDK usage |
| **Terraform module structure** | Modules are parameterized; swap Azure provider for on-prem equivalent or use Docker Compose directly |

---

## Configuration Changes for On-Prem Deployment

### 1. Docker Base Images → JFrog Docker Registry

All Dockerfiles pull base images from public registries. For air-gapped or policy-restricted environments, prefix with your JFrog Docker registry URL.

| Dockerfile | Current Base Image | On-Prem Change |
|------------|-------------------|----------------|
| `services/nginx-proxy/Dockerfile` | `nginx:1.27-alpine` | `jfrog.internal.com/docker/nginx:1.27-alpine` |
| `services/flask-oidc-proxy/Dockerfile` | `python:3.12-slim` | `jfrog.internal.com/docker/python:3.12-slim` |
| `services/blob-service/Dockerfile` | `eclipse-temurin:21-jdk` | `jfrog.internal.com/docker/eclipse-temurin:21-jdk` |
| `services/reports-service/Dockerfile` | `eclipse-temurin:21-jdk` | `jfrog.internal.com/docker/eclipse-temurin:21-jdk` |
| `services/data-service/Dockerfile` | `eclipse-temurin:21-jdk` | `jfrog.internal.com/docker/eclipse-temurin:21-jdk` |
| `services/frontend/Dockerfile` | `node:20-alpine` | `jfrog.internal.com/docker/node:20-alpine` |
| `docker-compose.yml` (Keycloak) | `quay.io/keycloak/keycloak:26.0` | `jfrog.internal.com/docker/keycloak/keycloak:26.0` |

**Implementation:** A simple `sed` command or Docker daemon mirror config can handle this globally.

### 2. Python Packages → JFrog PyPI Repository

**File:** `services/flask-oidc-proxy/Dockerfile`

```dockerfile
# Add before pip install
RUN pip config set global.index-url https://jfrog.internal.com/artifactory/api/pypi/pypi-remote/simple \
    && pip config set global.trusted-host jfrog.internal.com

# Existing pip install command works unchanged
RUN pip install --no-cache-dir -r requirements.txt
```

Alternatively, create a `pip.conf` and `COPY` it into the image.

### 3. npm Packages → JFrog npm Registry

**New file:** `services/frontend/.npmrc`

```ini
registry=https://jfrog.internal.com/artifactory/api/npm/npm-remote/
always-auth=true
//jfrog.internal.com/artifactory/api/npm/npm-remote/:_authToken=${NPM_TOKEN}
```

**Dockerfile change:** Ensure `.npmrc` is copied before `pnpm install`:

```dockerfile
COPY .npmrc ./
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
```

### 4. Maven Artifacts → JFrog Maven Repository

**New file:** `services/blob-service/settings.xml` (same for reports-service, data-service)

```xml
<settings>
  <mirrors>
    <mirror>
      <id>jfrog-maven</id>
      <mirrorOf>*</mirrorOf>
      <url>https://jfrog.internal.com/artifactory/maven-remote/</url>
    </mirror>
  </mirrors>
</settings>
```

**Dockerfile change for each Spring Boot service:**

```dockerfile
COPY settings.xml /root/.m2/settings.xml
RUN ./mvnw package -DskipTests
```

### 5. OIDC Provider → Internal Identity Provider

The Flask OIDC proxy (`services/flask-oidc-proxy/app/config.py`) reads **all** OIDC configuration from environment variables. No code changes are needed — only update the `docker-compose.yml` or deployment env vars.

#### Key Environment Variables

```yaml
# docker-compose.yml override for on-prem
flask-oidc-proxy:
  environment:
    KEYCLOAK_URL: "http://<internal-oidc-host>:<port>"
    KEYCLOAK_PUBLIC_URL: "https://<browser-facing-oidc-url>"
    KEYCLOAK_REALM: "<your-realm>"
    CLIENT_ID: "<your-client-id>"
    CLIENT_SECRET: "<your-secret>"
    REDIRECT_URI: "https://<your-app-fqdn>/auth/callback"
```

#### OIDC Provider Requirements

The Flask proxy expects a standard OpenID Connect provider that supports:

- **Discovery endpoint:** `/.well-known/openid-configuration`
- **Authorization Code Flow** with PKCE (optional)
- **Token endpoint** returning `access_token` and `id_token`
- **UserInfo endpoint** returning `preferred_username` and realm/client roles
- **RP-Initiated Logout** (optional, graceful fallback)

Compatible providers: ADFS, Okta, PingFederate, Azure AD, ForgeRock, any OIDC-compliant provider.

#### Role Mapping

The proxy extracts roles from the token's `realm_access.roles` claim (Keycloak-specific). For other providers, update the role extraction in `services/flask-oidc-proxy/app/routes.py`:

```python
# Current (Keycloak):
roles = token_data.get("realm_access", {}).get("roles", [])

# ADFS/Azure AD:
roles = token_data.get("roles", [])

# Generic — map from groups claim:
roles = token_data.get("groups", [])
```

This is the **only code change** needed for OIDC provider swap.

### 6. SSL Certificates

**Current:** Self-signed certificates for `localhost` (generated by `scripts/generate-certs.sh`).

**On-prem:** Generate certificates for your internal FQDN:

```bash
# Update scripts/generate-certs.sh or provide your own certs
CERT_CN="dashboard.internal.company.com"
CERT_SAN="DNS:dashboard.internal.company.com,DNS:*.internal.company.com"
```

Place certs in `services/nginx-proxy/certs/` or mount via Docker volume.

### 7. PostgreSQL

**Current:** Docker Compose PostgreSQL container with default credentials.

**On-prem options:**
- Keep containerized PostgreSQL (recommended for isolated deployments)
- Point to existing PostgreSQL instance via environment variables:

```yaml
environment:
  SPRING_DATASOURCE_URL: "jdbc:postgresql://<pg-host>:5432/<db-name>"
  SPRING_DATASOURCE_USERNAME: "<username>"
  SPRING_DATASOURCE_PASSWORD: "<password>"
```

### 8. Redis

**Current:** Docker Compose Redis container.

**On-prem:** Same as PostgreSQL — keep containerized or point to existing:

```yaml
environment:
  SPRING_REDIS_HOST: "<redis-host>"
  SPRING_REDIS_PORT: "6379"
  SPRING_REDIS_PASSWORD: "<password>"
```

---

## Deployment Topology

```
┌──────────────────────────────────────────────────────┐
│                 On-Prem Docker Host                   │
│                                                       │
│  ┌─────────┐   ┌──────────┐   ┌──────────────────┐  │
│  │  nginx   │──▶│flask-oidc│──▶│ Internal OIDC    │  │
│  │  proxy   │   │  proxy   │   │ Provider (ADFS)  │  │
│  └────┬─────┘   └──────────┘   └──────────────────┘  │
│       │                                               │
│  ┌────┴─────────────────────────────────┐            │
│  │           Backend Services            │            │
│  │  ┌──────┐  ┌────────┐  ┌──────┐     │            │
│  │  │ blob │  │reports │  │ data │     │            │
│  │  └──┬───┘  └───┬────┘  └──┬───┘     │            │
│  │     │          │          │          │            │
│  │  ┌──┴──┐   ┌───┴───┐  ┌──┴──┐      │            │
│  │  │Azure│   │Postgre│  │Redis│      │            │
│  │  │ite  │   │  SQL   │  │     │      │            │
│  │  └─────┘   └───────┘  └─────┘      │            │
│  └──────────────────────────────────────┘            │
│                                                       │
│  Images pulled from: JFrog Artifactory               │
│  Packages sourced from: JFrog PyPI/npm/Maven mirrors │
└──────────────────────────────────────────────────────┘
```

---

## Migration Checklist

- [ ] Mirror all Docker base images to JFrog Docker registry
- [ ] Configure JFrog PyPI remote repository
- [ ] Configure JFrog npm remote repository
- [ ] Configure JFrog Maven remote repository
- [ ] Register application with internal OIDC provider
- [ ] Update role extraction logic if not using Keycloak (1 line change)
- [ ] Generate SSL certificates for internal FQDN
- [ ] Update `docker-compose.yml` environment variables
- [ ] Test OIDC flow end-to-end with internal provider
- [ ] Validate all services start and communicate correctly

---

## Estimated Effort

| Task | Effort |
|------|--------|
| JFrog registry setup & image mirroring | Low — standard JFrog remote repos |
| OIDC provider registration | Low — standard client registration |
| Role mapping adjustment | Minimal — 1 line in `routes.py` |
| SSL certificate generation | Low — standard cert process |
| Environment variable updates | Low — update docker-compose.yml |
| End-to-end testing | Medium — verify all flows work |

**Total:** The application is designed for portability. Most changes are configuration-only with one potential code change (OIDC role claim extraction).

---

## lua-resty-openidc Alternative

For environments where a separate Flask container is undesirable, the codebase includes a reference `lua-resty-openidc` implementation at:

```
services/nginx-proxy/conf/conf.d/lua-oidc.conf.disabled
```

This embeds OIDC directly in the Nginx/OpenResty layer, eliminating the Flask proxy container entirely. To use it:

1. Switch the nginx base image to `openresty/openresty:alpine`
2. Rename `lua-oidc.conf.disabled` → `lua-oidc.conf`
3. Remove or disable the Flask proxy service
4. Update OIDC environment variables in the OpenResty config

This approach reduces the container count by one and may be preferred in resource-constrained on-prem environments.
