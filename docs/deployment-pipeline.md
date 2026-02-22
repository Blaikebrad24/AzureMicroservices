# Deployment Pipeline

End-to-end guide for deploying the Complete Azure Container App from GitHub to Azure Container Apps via Terraform.

---

## 1. Prerequisites

- **Azure Subscription** with Contributor access
- **Azure CLI** (`az`) installed and authenticated
- **Terraform** >= 1.5 installed
- **GitHub repository** with Actions enabled
- **Service Principal** for GitHub Actions to authenticate with Azure

### Create the Service Principal

```bash
az ad sp create-for-rbac \
  --name "github-actions-completeapp" \
  --role Contributor \
  --scopes /subscriptions/<SUBSCRIPTION_ID> \
  --sdk-auth
```

Save the JSON output — this becomes the `AZURE_CREDENTIALS` secret.

---

## 2. GitHub Secrets Reference

Configure these in **Settings > Secrets and variables > Actions**:

| Secret | Description | Source |
|--------|-------------|--------|
| `AZURE_CREDENTIALS` | Service principal JSON (full `--sdk-auth` output) | `az ad sp create-for-rbac` |
| `ARM_CLIENT_ID` | Service principal app ID | From `AZURE_CREDENTIALS.clientId` |
| `ARM_CLIENT_SECRET` | Service principal password | From `AZURE_CREDENTIALS.clientSecret` |
| `ARM_SUBSCRIPTION_ID` | Azure subscription ID | From `AZURE_CREDENTIALS.subscriptionId` |
| `ARM_TENANT_ID` | Azure AD tenant ID | From `AZURE_CREDENTIALS.tenantId` |
| `ACR_LOGIN_SERVER` | ACR server URL | e.g. `completeappstagingacr.azurecr.io` |
| `ACR_USERNAME` | ACR admin username | ACR > Access keys |
| `ACR_PASSWORD` | ACR admin password | ACR > Access keys |
| `POSTGRES_ADMIN_PASSWORD` | PostgreSQL admin password | Your chosen password |
| `KEYCLOAK_ADMIN_PASSWORD` | Keycloak admin password | Your chosen password |

### Environment-Specific Secrets

GitHub Environments (`staging`, `production`) can override secrets. This allows different passwords or credentials per environment.

---

## 3. Terraform Remote State Setup

All environments store state in a shared Azure Storage Account.

### Create the state storage (one-time)

```bash
# Create resource group for Terraform state
az group create --name terraform-state-rg --location eastus

# Create storage account (name must be globally unique)
az storage account create \
  --name tfstatecompleteapp \
  --resource-group terraform-state-rg \
  --sku Standard_LRS \
  --encryption-services blob

# Create blob container
az storage container create \
  --name tfstate \
  --account-name tfstatecompleteapp
```

### State file keys by environment

| Environment | State Key |
|-------------|-----------|
| Dev | `dev.terraform.tfstate` |
| Staging | `staging.terraform.tfstate` |
| Production | `production.terraform.tfstate` |

---

## 4. CI Pipeline Flow

**Trigger:** Pull requests and pushes to `main` or `develop`

**File:** `.github/workflows/ci.yml`

```
┌──────────────┐
│ Path Filter  │  dorny/paths-filter detects which services changed
└──────┬───────┘
       │
       ├── Flask changed?     → pytest with coverage
       ├── Spring changed?    → mvn verify (matrix: blob, reports, data)
       ├── Frontend changed?  → pnpm lint + pnpm build
       ├── Terraform changed? → terraform init -backend=false + validate + fmt check
       │
       ▼
┌──────────────┐
│ Build Images │  docker build (no push) — validates all Dockerfiles compile
└──────────────┘
```

Only changed services are tested. Docker images are built but not pushed (validation only).

---

## 5. CD Staging Flow

**Trigger:** Push to `main` (automatic)

**File:** `.github/workflows/cd-staging.yml`

```
Push to main
    │
    ▼
┌──────────────────────┐
│ Build & Push to ACR  │  All 7 services built and tagged with SHA + latest
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Terraform Apply      │  infrastructure/terraform/environments/staging/
│ (staging env)        │  TF_VAR_image_tag = commit SHA
└──────────────────────┘
```

Steps:
1. Azure login via service principal
2. Docker login to ACR
3. Build all 7 service images in parallel (matrix strategy)
4. Push to ACR with tags: `<sha>` and `latest`
5. Terraform init + apply in staging directory
6. Container Apps pull new images via the SHA tag

---

## 6. CD Production Flow

**Trigger:** Manual dispatch (`workflow_dispatch`)

**File:** `.github/workflows/cd-production.yml`

```
Manual trigger (provide image_tag = commit SHA)
    │
    ▼
┌──────────────────────┐
│ Terraform Apply      │  infrastructure/terraform/environments/production/
│ (production env)     │  TF_VAR_image_tag = input SHA
└──────────────────────┘
```

Production does **not** rebuild images. It reuses images already pushed to ACR during the staging deploy. You provide the commit SHA of a staging-verified build.

To deploy:
1. Go to **Actions > CD - Production > Run workflow**
2. Enter the commit SHA (from a successful staging deploy)
3. The workflow runs Terraform apply with that image tag

---

## 7. Container App Architecture

### Service Discovery

Azure Container Apps within the same environment communicate via internal DNS. Each app is reachable at `http://<app-name>` (port 80 by default, Container Apps handles routing to the target port).

### Ingress Configuration

| Service | External? | Port | Notes |
|---------|-----------|------|-------|
| nginx-proxy | Yes | 443 | Public entry point, TLS termination |
| keycloak | Yes | 8080 | OIDC provider, needs browser access |
| flask-oidc-proxy | No | 5000 | Auth proxy, called by nginx `auth_request` |
| blob-service | No | 8080 | Internal API |
| reports-service | No | 8080 | Internal API |
| data-service | No | 8080 | Internal API |
| frontend | No | 3000 | SSR via nginx proxy |

### Request Flow

```
Browser → nginx-proxy (external)
    │
    ├── auth_request → flask-oidc-proxy → keycloak
    │
    ├── /api/blobs/*  → blob-service
    ├── /api/reports/* → reports-service
    ├── /api/data/*    → data-service
    └── /*             → frontend (Next.js SSR)
```

### Shared Resources

- **PostgreSQL Flexible Server**: Databases for keycloak, reports-service, data-service
- **Azure Cache for Redis**: Session storage (flask-oidc-proxy), caching (all Spring services)
- **Azure Storage Account**: Blob storage for blob-service
- **Azure Key Vault**: Secret management
- **Azure Container Registry**: Docker image registry

---

## 8. Troubleshooting

### Terraform init fails with "storage account not found"

The remote state storage account hasn't been created yet. Run the one-time setup commands from Section 3.

### Container App stuck in "Provisioning"

Check logs:
```bash
az containerapp logs show \
  --name <app-name> \
  --resource-group <rg-name> \
  --type system
```

Common causes:
- Image not found in ACR (wrong tag or ACR credentials)
- Health check failing (app not listening on configured port)
- Missing environment variables or secrets

### ACR authentication errors in GitHub Actions

Verify the `ACR_LOGIN_SERVER`, `ACR_USERNAME`, and `ACR_PASSWORD` secrets match your ACR instance:
```bash
az acr credential show --name <acr-name>
```

### Services can't connect to PostgreSQL or Redis

- Ensure private endpoints are provisioned (check Terraform outputs)
- Verify the VNet integration — Container App Environment must be in the same VNet
- Check that `SPRING_DATA_REDIS_SSL_ENABLED=true` is set (Azure Redis requires TLS)
- Confirm the `SPRING_DATASOURCE_PASSWORD` secret is mapped correctly

### Terraform plan shows unexpected destroys

This usually means a different state file is being used. Verify the `key` in `backend.tf` matches the expected environment:
- Dev: `dev.terraform.tfstate`
- Staging: `staging.terraform.tfstate`
- Production: `production.terraform.tfstate`

### Production deploy uses wrong image

Production doesn't build — it relies on images already in ACR. If the SHA you provided wasn't from a successful staging deploy, the images won't exist. Always use a SHA from a green staging run.
