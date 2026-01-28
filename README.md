# Complete Azure Container App | Mock Application | Content Driven Demonstration

A full-stack monorepo application with 10 Docker containers, orchestrated locally via Docker Compose and deployable to Azure Container Apps via Terraform and GitHub Actions CI/CD.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Services](#services)
- [Authentication Flow](#authentication-flow)
- [API Reference](#api-reference)
- [Infrastructure](#infrastructure)
- [CI/CD](#cicd)

---

## Overview

This application demonstrates a production-ready microservices architecture with:

- **Centralized Authentication**: Keycloak OIDC provider with role-based access control (Admin, Editor, Viewer)
- **Reverse Proxy**: Nginx with TLS termination and auth_request integration
- **Backend Microservices**: Three Spring Boot services for blob storage, reports, and general data CRUD
- **Modern Frontend**: Next.js 15 with App Router, Server Actions, and role-based UI rendering
- **Caching Layer**: Redis for session management and application caching
- **Cloud-Ready**: Terraform modules for Azure Container Apps deployment

---

## Architecture

```
                                    BROWSER
                                       |
                                       v
                    +------------------+------------------+
                    |           Nginx Proxy              |
                    |    (TLS termination, port 443)     |
                    +------------------+------------------+
                                       |
                         auth_request  |
                                       v
                    +------------------+------------------+
                    |        Flask OIDC Proxy            |
                    |   (Authorization Code Flow)        |
                    +------------------+------------------+
                                       |
                    +------------------+------------------+
                    |            Keycloak                |
                    |    (Identity Provider, OIDC)       |
                    +------------------+------------------+

                    After successful authentication:

                    +------------------+------------------+
                    |        Next.js Frontend            |
                    |   (Server Actions, Role-based UI)  |
                    +------------------+------------------+
                                       |
                                       v
          +----------------------------+----------------------------+
          |                            |                            |
          v                            v                            v
+------------------+      +------------------+      +------------------+
|   Blob Service   |      | Reports Service  |      |   Data Service   |
|  (Spring Boot)   |      |  (Spring Boot)   |      |  (Spring Boot)   |
+------------------+      +------------------+      +------------------+
          |                            |                            |
          v                            v                            v
+------------------+      +------------------+      +------------------+
|     Azurite      |      |    PostgreSQL    |      |    PostgreSQL    |
| (Blob Storage)   |      | (reports_svc_db) |      | (data_svc_db)    |
+------------------+      +------------------+      +------------------+
                                       |
                                       v
                          +------------------+
                          |      Redis       |
                          | (Cache/Sessions) |
                          +------------------+
```

### Request Flow

1. Browser requests `https://localhost`
2. Nginx receives request and makes `auth_request` subrequest to Flask OIDC Proxy
3. If no valid session, Flask returns 401 and Nginx redirects to `/auth/login`
4. Flask initiates OIDC Authorization Code Flow with Keycloak
5. User authenticates with Keycloak, which redirects back to `/auth/callback`
6. Flask exchanges auth code for tokens, validates ID token, creates Redis session
7. Subsequent requests include session cookie; Flask returns 200 with `X-Auth-User` and `X-Auth-Roles` headers
8. Nginx proxies to Next.js frontend with auth headers
9. Frontend uses Server Actions to call Spring Boot APIs internally

---

## Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| **Reverse Proxy** | Nginx | 1.27 |
| **Auth Proxy** | Python Flask + Gunicorn | 3.12 / 3.1.0 |
| **Identity Provider** | Keycloak | 26.0 |
| **Backend APIs** | Spring Boot | 3.3.5 |
| **Frontend** | Next.js (App Router) | 15.1.0 |
| **Database** | PostgreSQL | 16 |
| **Cache** | Redis | 7 |
| **Blob Storage** | Azurite (local) / Azure Blob (prod) | Latest |
| **Runtime** | Java (Temurin) | 21 |
| **Package Manager** | pnpm | 9.15+ |
| **IaC** | Terraform | 1.5+ |
| **CI/CD** | GitHub Actions | - |

---

## Project Structure

```
CompleteAzureApp/
├── .github/workflows/          # CI/CD pipelines
│   ├── ci.yml                  # PR/push validation
│   ├── cd-staging.yml          # Auto-deploy to staging
│   └── cd-production.yml       # Manual production deploy
│
├── database/init/              # PostgreSQL initialization
│   ├── 01-init-databases.sql   # Create databases
│   ├── 02-data-service-schema.sql
│   └── 03-reports-service-schema.sql
│
├── infrastructure/terraform/
│   ├── providers.tf
│   ├── environments/
│   │   └── dev/                # Development environment
│   └── modules/
│       ├── acr/                # Azure Container Registry
│       ├── container-app/      # Container App (reusable)
│       ├── container-app-environment/
│       ├── keyvault/
│       ├── networking/         # VNet, subnets, NSG
│       ├── postgres/           # Flexible Server
│       ├── redis/              # Azure Cache for Redis
│       └── storage-account/    # Blob Storage
│
├── scripts/
│   ├── generate-certs.sh       # Self-signed TLS certs
│   ├── seed-azurite.sh         # Seed blob containers
│   ├── setup-local.sh          # One-command local setup
│   └── wait-for-it.sh          # Container startup helper
│
├── services/
│   ├── blob-service/           # Spring Boot - Azure Blob ops
│   ├── data-service/           # Spring Boot - Postgres CRUD
│   ├── reports-service/        # Spring Boot - Report generation
│   ├── flask-oidc-proxy/       # Python - OIDC auth proxy
│   ├── frontend/               # Next.js 15 dashboard
│   ├── keycloak/               # Custom Keycloak with realm
│   └── nginx-proxy/            # Nginx reverse proxy
│
├── docker-compose.yml          # All 10 containers
├── docker-compose.override.yml # Local dev port mappings
├── .env.example                # Environment template
└── .gitignore
```

---

## Prerequisites

Before running the application locally, ensure you have:

| Requirement | Minimum Version | Check Command |
|-------------|-----------------|---------------|
| Docker | 24.0+ | `docker --version` |
| Docker Compose | 2.20+ | `docker compose version` |
| pnpm | 9.0+ | `pnpm --version` |
| OpenSSL | 3.0+ | `openssl version` |
| Node.js | 18+ | `node --version` |

### Optional (for Azure deployment)

| Requirement | Purpose |
|-------------|---------|
| Azure CLI | Azurite seeding, Azure deployment |
| Terraform | Infrastructure provisioning |
| GitHub CLI | PR/release management |

---

## Getting Started

### Quick Start (Recommended)

```bash
# Clone the repository
git clone <your-repo-url>
cd CompleteAzureApp

# Run the setup script (generates certs, creates .env, starts containers)
./scripts/setup-local.sh
```

### Manual Setup

1. **Copy environment file**
   ```bash
   cp .env.example .env
   ```

2. **Generate TLS certificates**
   ```bash
   ./scripts/generate-certs.sh
   ```

3. **Install frontend dependencies** (generates pnpm-lock.yaml if missing)
   ```bash
   cd services/frontend && pnpm install && cd ../..
   ```

4. **Start all containers**
   ```bash
   docker compose up --build -d
   ```

5. **Verify all services are running**
   ```bash
   docker compose ps
   ```

### Accessing the Application

| URL | Service | Notes |
|-----|---------|-------|
| https://localhost | Main Application | Accept self-signed cert warning |
| http://localhost:8080 | Keycloak Admin | admin / admin |

### Test Users

| Username | Password | Role | Permissions |
|----------|----------|------|-------------|
| admin-user | password | admin | Full access, admin panel |
| editor-user | password | editor | Create, edit, delete |
| viewer-user | password | viewer | Read-only access |

### Stopping the Application

```bash
# Stop all containers
docker compose down

# Stop and remove volumes (reset databases)
docker compose down -v
```

---

## Services

### Nginx Proxy (Port 443/80)

Reverse proxy handling TLS termination and authentication.

- **TLS**: Self-signed certificates for local development
- **Auth**: Uses `auth_request` directive to validate sessions via Flask proxy
- **Routing**: Proxies authenticated requests to frontend with `X-Auth-User` and `X-Auth-Roles` headers

### Flask OIDC Proxy (Internal Port 5000)

Python Flask application implementing OIDC Authorization Code Flow.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/check` | GET | Nginx auth_request subrequest |
| `/auth/login` | GET | Initiates OIDC flow |
| `/auth/callback` | GET | Handles OIDC callback |
| `/auth/logout` | GET | Clears session, redirects to Keycloak logout |
| `/auth/userinfo` | GET | Returns current user info |
| `/health` | GET | Health check |

### Keycloak (Port 8080)

Identity provider with pre-configured realm.

**Realm Configuration (`app-realm`):**
- **Clients**: `nginx-proxy-client` (confidential), `frontend-client` (public)
- **Roles**: admin, editor, viewer
- **Default Role**: viewer
- **Token Lifespan**: 5 minutes (access), 30 minutes (refresh)

### Blob Service (Internal Port 8080, External 8081)

Spring Boot service for Azure Blob Storage operations.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/blobs/containers` | GET | List all containers |
| `/api/blobs/{container}` | GET | List blobs in container |
| `/api/blobs/{container}` | POST | Upload file (multipart) |
| `/api/blobs/{container}/{blob}` | GET | Download blob |
| `/api/blobs/{container}/{blob}` | DELETE | Delete blob |
| `/api/blobs/{container}/{blob}/metadata` | GET | Get blob metadata |
| `/actuator/health` | GET | Health check |

### Reports Service (Internal Port 8080, External 8082)

Spring Boot service for asynchronous report generation.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/reports` | GET | List all reports |
| `/api/reports/{id}` | GET | Get report by ID |
| `/api/reports/generate` | POST | Generate new report (async) |
| `/actuator/health` | GET | Health check |

**Report Request Body:**
```json
{
  "name": "Monthly Sales Report",
  "type": "SALES",
  "parameters": {
    "month": "January",
    "year": "2026"
  }
}
```

### Data Service (Internal Port 8080, External 8083)

Spring Boot service for general data CRUD operations.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/data` | GET | List data (paginated) |
| `/api/data/{id}` | GET | Get by ID |
| `/api/data` | POST | Create entity |
| `/api/data/{id}` | PUT | Update entity |
| `/api/data/{id}` | DELETE | Delete entity |
| `/api/data/search` | GET | Search by name/category |
| `/actuator/health` | GET | Health check |

**Data Entity Schema:**
```json
{
  "name": "Entity Name",
  "description": "Optional description",
  "category": "Category",
  "metadata": {
    "key": "value"
  }
}
```

### Frontend (Internal Port 3000)

Next.js 15 application with App Router and Server Actions.

**Pages:**
| Route | Description | Required Role |
|-------|-------------|---------------|
| `/` | Dashboard overview | Any authenticated |
| `/blobs` | Blob storage browser | Any authenticated |
| `/reports` | Reports list | Any authenticated |
| `/data` | Data management | Any authenticated |
| `/admin` | Admin panel | admin only |

**Key Features:**
- Server Actions for API communication (no client-side API calls)
- Role-based UI rendering via `RoleGate` component
- Read-only Redis cache access for performance

---

## Authentication Flow

```
┌─────────┐     ┌───────┐     ┌───────────┐     ┌──────────┐
│ Browser │     │ Nginx │     │Flask Proxy│     │ Keycloak │
└────┬────┘     └───┬───┘     └─────┬─────┘     └────┬─────┘
     │              │               │                │
     │ GET /        │               │                │
     │─────────────>│               │                │
     │              │ auth_request  │                │
     │              │──────────────>│                │
     │              │               │                │
     │              │     401       │                │
     │              │<──────────────│                │
     │              │               │                │
     │   302 /auth/login            │                │
     │<─────────────│               │                │
     │              │               │                │
     │ GET /auth/login              │                │
     │─────────────────────────────>│                │
     │              │               │                │
     │   302 Keycloak authorize     │                │
     │<─────────────────────────────│                │
     │              │               │                │
     │ GET /realms/app-realm/protocol/openid-connect/auth
     │─────────────────────────────────────────────>│
     │              │               │                │
     │         Login Page           │                │
     │<─────────────────────────────────────────────│
     │              │               │                │
     │ POST credentials             │                │
     │─────────────────────────────────────────────>│
     │              │               │                │
     │   302 /auth/callback?code=xxx                │
     │<─────────────────────────────────────────────│
     │              │               │                │
     │ GET /auth/callback?code=xxx  │                │
     │─────────────────────────────>│                │
     │              │               │ POST /token    │
     │              │               │───────────────>│
     │              │               │  access_token  │
     │              │               │<───────────────│
     │              │               │                │
     │   302 / (Set-Cookie: session)│                │
     │<─────────────────────────────│                │
     │              │               │                │
     │ GET / (Cookie: session)      │                │
     │─────────────>│               │                │
     │              │ auth_request  │                │
     │              │──────────────>│                │
     │              │     200       │                │
     │              │ X-Auth-User   │                │
     │              │ X-Auth-Roles  │                │
     │              │<──────────────│                │
     │              │               │                │
     │              │ proxy_pass frontend            │
     │              │────────────────────────────>   │
     │              │               │                │
     │   Dashboard HTML             │                │
     │<─────────────│               │                │
```

---

## API Reference

### Health Checks

All Spring Boot services expose health endpoints:

```bash
# Blob Service
curl http://localhost:8081/actuator/health

# Reports Service
curl http://localhost:8082/actuator/health

# Data Service
curl http://localhost:8083/actuator/health
```

### Example API Calls

```bash
# Create a data entity
curl -X POST http://localhost:8083/api/data \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","category":"Example","description":"Test entity"}'

# Generate a report
curl -X POST http://localhost:8082/api/reports/generate \
  -H "Content-Type: application/json" \
  -d '{"name":"Q1 Report","type":"QUARTERLY","parameters":{"quarter":"Q1"}}'

# Upload a file
curl -X POST http://localhost:8081/api/blobs/uploads \
  -F "file=@/path/to/file.txt"

# List containers
curl http://localhost:8081/api/blobs/containers
```

---

## Infrastructure

### Terraform Modules

| Module | Resources Created |
|--------|-------------------|
| `networking` | Resource Group, VNet, Subnets, NSG |
| `acr` | Azure Container Registry |
| `container-app-environment` | Log Analytics, Container App Environment |
| `container-app` | Individual Container App (reusable) |
| `postgres` | PostgreSQL Flexible Server + Databases |
| `redis` | Azure Cache for Redis + Private Endpoint |
| `storage-account` | Storage Account + Blob Containers |
| `keyvault` | Key Vault + Secrets |

### Deploying to Azure

```bash
cd infrastructure/terraform/environments/dev

# Initialize Terraform
terraform init

# Review plan
terraform plan

# Apply
terraform apply
```

### Required Azure Resources

For production deployment, configure these secrets in GitHub:

| Secret | Description |
|--------|-------------|
| `AZURE_CREDENTIALS` | Service principal JSON |
| `ARM_CLIENT_ID` | Service principal client ID |
| `ARM_CLIENT_SECRET` | Service principal secret |
| `ARM_SUBSCRIPTION_ID` | Azure subscription ID |
| `ARM_TENANT_ID` | Azure AD tenant ID |
| `ACR_LOGIN_SERVER` | ACR login server URL |
| `POSTGRES_ADMIN_PASSWORD` | PostgreSQL admin password |
| `KEYCLOAK_ADMIN_PASSWORD` | Keycloak admin password |

---

## CI/CD

### Workflows

| Workflow | Trigger | Actions |
|----------|---------|---------|
| `ci.yml` | PR, push to main | Lint, test, build validation |
| `cd-staging.yml` | Push to main | Build images, push to ACR, deploy staging |
| `cd-production.yml` | Manual dispatch | Deploy specific image tag to production |

### Path-Filtered Builds

The CI pipeline uses path filtering to only build/test changed services:

```yaml
# Only runs if files in services/frontend/ changed
frontend:
  - 'services/frontend/**'
```

---

## Troubleshooting

### Common Issues

**Containers won't start**
```bash
# Check logs
docker compose logs <service-name>

# Rebuild specific service
docker compose up -d --build <service-name>
```

**Certificate errors in browser**
- The self-signed certificate will trigger warnings
- In Chrome: Click "Advanced" > "Proceed to localhost"
- In Firefox: Click "Advanced" > "Accept the Risk and Continue"

**Keycloak realm not loading**
```bash
# Check Keycloak logs
docker compose logs keycloak

# Verify realm file exists
ls services/keycloak/realm/app-realm.json
```

**Database connection issues**
```bash
# Verify PostgreSQL is healthy
docker compose exec postgres pg_isready

# Check databases exist
docker compose exec postgres psql -U postgres -c "\l"
```

**Redis connection issues**
```bash
# Test Redis connection
docker compose exec redis redis-cli -a redispassword ping
```

---

## License

MIT
