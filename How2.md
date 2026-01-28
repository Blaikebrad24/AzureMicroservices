# How2.md - Azure Deployment Guide

This guide walks through deploying the Complete Azure Container App to a non-production Azure environment. Perfect for demonstrations, learning, or testing before production deployment.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Create Azure Free Account](#create-azure-free-account)
3. [Install Required Tools](#install-required-tools)
4. [Azure CLI Setup](#azure-cli-setup)
5. [Create Service Principal](#create-service-principal)
6. [Configure Terraform Backend](#configure-terraform-backend)
7. [Deploy Infrastructure](#deploy-infrastructure)
8. [Build and Push Docker Images](#build-and-push-docker-images)
9. [Deploy Container Apps](#deploy-container-apps)
10. [Verify Deployment](#verify-deployment)
11. [Cleanup Resources](#cleanup-resources)
12. [Cost Considerations](#cost-considerations)

---

## Prerequisites

Before starting, ensure you have:

- [ ] A valid email address for Azure account creation
- [ ] A credit/debit card (for verification, free tier won't charge)
- [ ] macOS, Linux, or Windows with WSL2
- [ ] Terminal/command line access

---

## Create Azure Free Account

### Step 1: Sign Up

1. Navigate to [https://azure.microsoft.com/free](https://azure.microsoft.com/free)
2. Click **"Start free"**
3. Sign in with a Microsoft account or create one
4. Complete the verification process (phone + card)

### What You Get (Free Tier)

| Resource | Free Allocation | Duration |
|----------|-----------------|----------|
| Azure Credits | $200 | 30 days |
| Container Apps | 2 million requests/month | 12 months |
| PostgreSQL Flexible | 750 hours B1ms | 12 months |
| Azure Cache for Redis | 250 MB C0 | 12 months |
| Storage Account | 5 GB LRS | 12 months |
| Container Registry | Basic tier | 12 months |

> **Note**: This demo uses resources that fit within the free tier, but always monitor your spending in the Azure Portal.

### Step 2: Verify Account

After signup, verify your account is active:

```bash
# You'll do this after installing Azure CLI
az account show
```

---

## Install Required Tools

### Azure CLI

**macOS (Homebrew)**
```bash
brew update && brew install azure-cli
```

**Linux (Ubuntu/Debian)**
```bash
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
```

**Windows (PowerShell)**
```powershell
winget install -e --id Microsoft.AzureCLI
```

**Verify installation:**
```bash
az --version
# Should show: azure-cli 2.x.x
```

### Terraform

**macOS (Homebrew)**
```bash
brew tap hashicorp/tap
brew install hashicorp/tap/terraform
```

**Linux**
```bash
wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install terraform
```

**Windows (Chocolatey)**
```powershell
choco install terraform
```

**Verify installation:**
```bash
terraform --version
# Should show: Terraform v1.5.x or higher
```

### Docker

Ensure Docker is installed and running:
```bash
docker --version
# Should show: Docker version 24.x.x or higher
```

---

## Azure CLI Setup

### Step 1: Login to Azure

```bash
az login
```

This opens a browser window. Sign in with your Azure account credentials.

### Step 2: Verify Subscription

```bash
# List subscriptions
az account list --output table

# Set default subscription (if you have multiple)
az account set --subscription "Your Subscription Name"

# Verify
az account show --output table
```

### Step 3: Register Resource Providers

Azure requires certain providers to be registered:

```bash
# Register required providers
az provider register --namespace Microsoft.App
az provider register --namespace Microsoft.ContainerRegistry
az provider register --namespace Microsoft.DBforPostgreSQL
az provider register --namespace Microsoft.Cache
az provider register --namespace Microsoft.Storage
az provider register --namespace Microsoft.KeyVault
az provider register --namespace Microsoft.OperationalInsights

# Check registration status (may take a few minutes)
az provider show --namespace Microsoft.App --query "registrationState"
```

---

## Create Service Principal

A service principal allows Terraform to authenticate with Azure.

### Step 1: Create the Service Principal

```bash
# Get your subscription ID
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

# Create service principal with Contributor role
az ad sp create-for-rbac \
  --name "terraform-azure-container-app" \
  --role Contributor \
  --scopes /subscriptions/$SUBSCRIPTION_ID \
  --sdk-auth
```

**Save the output!** You'll see JSON like this:

```json
{
  "clientId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "clientSecret": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "subscriptionId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "tenantId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "activeDirectoryEndpointUrl": "https://login.microsoftonline.com",
  "resourceManagerEndpointUrl": "https://management.azure.com/",
  ...
}
```

### Step 2: Export Environment Variables

Create a file called `azure-env.sh` (don't commit this!):

```bash
#!/bin/bash
export ARM_CLIENT_ID="<clientId from above>"
export ARM_CLIENT_SECRET="<clientSecret from above>"
export ARM_SUBSCRIPTION_ID="<subscriptionId from above>"
export ARM_TENANT_ID="<tenantId from above>"
```

Source it:
```bash
chmod +x azure-env.sh
source azure-env.sh
```

### Step 3: Verify Authentication

```bash
az login --service-principal \
  -u $ARM_CLIENT_ID \
  -p $ARM_CLIENT_SECRET \
  --tenant $ARM_TENANT_ID

az account show
```

---

## Configure Terraform Backend

For demo purposes, we'll use local state. For team environments, use Azure Storage backend.

### Option A: Local State (Demo/Learning)

The default configuration uses local state. No additional setup required.

### Option B: Azure Storage Backend (Recommended for Teams)

**Step 1: Create storage account for state**

```bash
# Variables
RESOURCE_GROUP="tfstate-rg"
STORAGE_ACCOUNT="tfstate$RANDOM"  # Must be globally unique
CONTAINER_NAME="tfstate"
LOCATION="eastus"

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create storage account
az storage account create \
  --name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Standard_LRS \
  --encryption-services blob

# Get storage account key
ACCOUNT_KEY=$(az storage account keys list \
  --resource-group $RESOURCE_GROUP \
  --account-name $STORAGE_ACCOUNT \
  --query '[0].value' -o tsv)

# Create blob container
az storage container create \
  --name $CONTAINER_NAME \
  --account-name $STORAGE_ACCOUNT \
  --account-key $ACCOUNT_KEY

# Output values (save these!)
echo "Storage Account: $STORAGE_ACCOUNT"
echo "Container: $CONTAINER_NAME"
echo "Resource Group: $RESOURCE_GROUP"
```

**Step 2: Update backend configuration**

Edit `infrastructure/terraform/environments/dev/backend.tf`:

```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "tfstate-rg"
    storage_account_name = "<your-storage-account>"
    container_name       = "tfstate"
    key                  = "dev.terraform.tfstate"
  }
}
```

---

## Deploy Infrastructure

### Step 1: Navigate to Environment Directory

```bash
cd infrastructure/terraform/environments/dev
```

### Step 2: Create terraform.tfvars

Create or update `terraform.tfvars`:

```hcl
project_name             = "azureapp"
location                 = "eastus"
image_tag                = "latest"
postgres_admin_password  = "YourSecurePassword123!"
keycloak_admin_password  = "YourKeycloakPassword123!"
```

> **Security Note**: In production, use Azure Key Vault for secrets, not tfvars files.

### Step 3: Initialize Terraform

```bash
terraform init
```

Expected output:
```
Terraform has been successfully initialized!
```

### Step 4: Review the Plan

```bash
terraform plan -out=tfplan
```

This shows what resources will be created:
- Resource Group
- Virtual Network with subnets
- Azure Container Registry
- Container App Environment
- PostgreSQL Flexible Server (3 databases)
- Azure Cache for Redis
- Storage Account
- Key Vault
- 7 Container Apps

### Step 5: Apply the Configuration

```bash
terraform apply tfplan
```

Type `yes` when prompted. This takes **15-25 minutes**.

### Step 6: Save Outputs

```bash
terraform output > deployment-outputs.txt
```

Key outputs you'll need:
- `acr_login_server`: Container registry URL
- `nginx_fqdn`: Public URL for the application
- `keycloak_fqdn`: Keycloak admin console URL

---

## Build and Push Docker Images

### Step 1: Login to Azure Container Registry

```bash
# Get ACR name from Terraform output
ACR_NAME=$(terraform output -raw acr_name)

# Login to ACR
az acr login --name $ACR_NAME
```

### Step 2: Build and Push Images

From the repository root:

```bash
# Get ACR login server
ACR_LOGIN_SERVER=$(terraform output -raw acr_login_server)

# Build and push each service
services=("nginx-proxy" "flask-oidc-proxy" "keycloak" "blob-service" "reports-service" "data-service" "frontend")

for service in "${services[@]}"; do
  echo "Building $service..."
  docker build -t $ACR_LOGIN_SERVER/$service:latest ./services/$service
  docker push $ACR_LOGIN_SERVER/$service:latest
done
```

### Step 3: Verify Images

```bash
az acr repository list --name $ACR_NAME --output table
```

---

## Deploy Container Apps

The Terraform configuration automatically deploys Container Apps when you apply. To update with new images:

### Option A: Re-run Terraform

```bash
cd infrastructure/terraform/environments/dev
terraform apply -var="image_tag=latest"
```

### Option B: Update via Azure CLI

```bash
# Get Container App Environment name
ENVIRONMENT=$(az containerapp env list --query "[0].name" -o tsv)
RESOURCE_GROUP="azureapp-dev-rg"

# Update a specific container app
az containerapp update \
  --name frontend \
  --resource-group $RESOURCE_GROUP \
  --image $ACR_LOGIN_SERVER/frontend:latest
```

---

## Verify Deployment

### Step 1: Check Container App Status

```bash
RESOURCE_GROUP="azureapp-dev-rg"

# List all container apps
az containerapp list \
  --resource-group $RESOURCE_GROUP \
  --output table

# Check specific app logs
az containerapp logs show \
  --name frontend \
  --resource-group $RESOURCE_GROUP \
  --follow
```

### Step 2: Access the Application

Get the public URLs:

```bash
# Nginx (main application)
NGINX_URL=$(az containerapp show \
  --name nginx-proxy \
  --resource-group $RESOURCE_GROUP \
  --query "properties.configuration.ingress.fqdn" -o tsv)
echo "Application URL: https://$NGINX_URL"

# Keycloak admin console
KEYCLOAK_URL=$(az containerapp show \
  --name keycloak \
  --resource-group $RESOURCE_GROUP \
  --query "properties.configuration.ingress.fqdn" -o tsv)
echo "Keycloak URL: https://$KEYCLOAK_URL"
```

### Step 3: Test Authentication Flow

1. Open the application URL in a browser
2. You should be redirected to Keycloak login
3. Login with test credentials:
   - Username: `admin-user`
   - Password: `password`
4. You should see the dashboard

### Step 4: Test Backend APIs

```bash
# These work only from within the Container App Environment (internal ingress)
# Use the frontend to verify backend connectivity
```

---

## Cleanup Resources

**Important**: To avoid charges, delete resources when done.

### Option A: Delete via Terraform (Recommended)

```bash
cd infrastructure/terraform/environments/dev
terraform destroy
```

Type `yes` when prompted.

### Option B: Delete Resource Group

```bash
# This deletes EVERYTHING in the resource group
az group delete --name azureapp-dev-rg --yes --no-wait

# Also delete the tfstate resource group if you created one
az group delete --name tfstate-rg --yes --no-wait
```

### Verify Deletion

```bash
az group list --output table
```

---

## Cost Considerations

### Free Tier Resources Used

| Resource | SKU | Estimated Cost |
|----------|-----|----------------|
| Container Apps | Consumption | Free (2M requests/month) |
| PostgreSQL | B_Standard_B1ms | Free (750 hours/month) |
| Redis | Basic C0 | Free (250 MB) |
| Container Registry | Basic | ~$5/month |
| Storage Account | Standard LRS | ~$0.02/GB/month |
| Log Analytics | Pay-as-you-go | ~$2.30/GB ingested |

### Staying Within Free Limits

1. **Don't run 24/7**: Scale to 0 when not demoing
2. **Use B1ms for PostgreSQL**: Smallest tier
3. **Use C0 for Redis**: Basic tier
4. **Delete when done**: Resources accrue costs even when idle

### Scaling Down

```bash
# Scale container apps to 0 replicas
for app in nginx-proxy flask-oidc-proxy keycloak blob-service reports-service data-service frontend; do
  az containerapp update \
    --name $app \
    --resource-group azureapp-dev-rg \
    --min-replicas 0 \
    --max-replicas 0
done
```

### Scaling Back Up

```bash
for app in nginx-proxy flask-oidc-proxy keycloak blob-service reports-service data-service frontend; do
  az containerapp update \
    --name $app \
    --resource-group azureapp-dev-rg \
    --min-replicas 1 \
    --max-replicas 3
done
```

---

## Troubleshooting

### Common Issues

**1. Terraform init fails**
```bash
# Clear cache and reinitialize
rm -rf .terraform .terraform.lock.hcl
terraform init
```

**2. Container App won't start**
```bash
# Check logs
az containerapp logs show \
  --name <app-name> \
  --resource-group azureapp-dev-rg \
  --tail 100

# Check revision status
az containerapp revision list \
  --name <app-name> \
  --resource-group azureapp-dev-rg \
  --output table
```

**3. Database connection errors**
```bash
# Verify PostgreSQL is running
az postgres flexible-server show \
  --name <server-name> \
  --resource-group azureapp-dev-rg

# Check firewall rules
az postgres flexible-server firewall-rule list \
  --name <server-name> \
  --resource-group azureapp-dev-rg
```

**4. Image pull errors**
```bash
# Verify ACR credentials
az acr login --name <acr-name>

# Check if image exists
az acr repository show-tags \
  --name <acr-name> \
  --repository <service-name>
```

**5. Keycloak realm not loading**
```bash
# Check Keycloak logs
az containerapp logs show \
  --name keycloak \
  --resource-group azureapp-dev-rg \
  --tail 200
```

---

## Next Steps

After successful deployment:

1. **Configure custom domain**: Add your own domain to Nginx Container App
2. **Enable SSL certificates**: Use Azure-managed certificates
3. **Set up monitoring**: Configure Azure Monitor alerts
4. **Implement CI/CD**: Configure GitHub Actions with your ACR credentials
5. **Production hardening**: Use managed identities, Key Vault references, and private endpoints

---

## Quick Reference

```bash
# Login to Azure
az login

# Set subscription
az account set --subscription "Your Subscription"

# Source environment variables
source azure-env.sh

# Deploy infrastructure
cd infrastructure/terraform/environments/dev
terraform init
terraform plan -out=tfplan
terraform apply tfplan

# Build and push images
ACR_LOGIN_SERVER=$(terraform output -raw acr_login_server)
docker build -t $ACR_LOGIN_SERVER/service:latest ./services/service
docker push $ACR_LOGIN_SERVER/service:latest

# Check deployment
az containerapp list -g azureapp-dev-rg -o table

# View logs
az containerapp logs show -n <app> -g azureapp-dev-rg --follow

# Cleanup
terraform destroy
```

---

*Happy deploying!*
