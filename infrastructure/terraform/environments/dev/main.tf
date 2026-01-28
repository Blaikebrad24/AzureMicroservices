provider "azurerm" {
  features {}
}

locals {
  project_name = var.project_name
  tags = {
    environment = "dev"
    project     = var.project_name
    managed_by  = "terraform"
  }
}

# Networking
module "networking" {
  source              = "../../modules/networking"
  project_name        = local.project_name
  resource_group_name = "${local.project_name}-dev-rg"
  location            = var.location
  tags                = local.tags
}

# Container Registry
module "acr" {
  source              = "../../modules/acr"
  acr_name            = replace("${local.project_name}devacr", "-", "")
  resource_group_name = module.networking.resource_group_name
  location            = module.networking.location
  tags                = local.tags
}

# Container App Environment
module "container_app_env" {
  source              = "../../modules/container-app-environment"
  project_name        = "${local.project_name}-dev"
  resource_group_name = module.networking.resource_group_name
  location            = module.networking.location
  subnet_id           = module.networking.container_apps_subnet_id
  tags                = local.tags
}

# Postgres
module "postgres" {
  source              = "../../modules/postgres"
  project_name        = "${local.project_name}-dev"
  resource_group_name = module.networking.resource_group_name
  location            = module.networking.location
  subnet_id           = module.networking.postgres_subnet_id
  vnet_id             = module.networking.vnet_id
  admin_username      = var.postgres_admin_username
  admin_password      = var.postgres_admin_password
  tags                = local.tags
}

# Redis
module "redis" {
  source              = "../../modules/redis"
  project_name        = "${local.project_name}-dev"
  resource_group_name = module.networking.resource_group_name
  location            = module.networking.location
  subnet_id           = module.networking.private_endpoints_subnet_id
  tags                = local.tags
}

# Storage Account
module "storage" {
  source               = "../../modules/storage-account"
  storage_account_name = replace("${local.project_name}devsa", "-", "")
  resource_group_name  = module.networking.resource_group_name
  location             = module.networking.location
  tags                 = local.tags
}

# Key Vault
module "keyvault" {
  source              = "../../modules/keyvault"
  key_vault_name      = "${local.project_name}-dev-kv"
  resource_group_name = module.networking.resource_group_name
  location            = module.networking.location
  tags                = local.tags
}

# Container Apps (7 custom services)
module "nginx_proxy" {
  source              = "../../modules/container-app"
  app_name            = "nginx-proxy"
  resource_group_name = module.networking.resource_group_name
  environment_id      = module.container_app_env.id
  registry_server     = module.acr.login_server
  registry_username   = module.acr.admin_username
  registry_password   = module.acr.admin_password
  image_tag           = var.image_tag
  target_port         = 443
  external_ingress    = true
  cpu                 = 0.25
  memory              = "0.5Gi"
  tags                = local.tags
}

module "keycloak" {
  source              = "../../modules/container-app"
  app_name            = "keycloak"
  resource_group_name = module.networking.resource_group_name
  environment_id      = module.container_app_env.id
  registry_server     = module.acr.login_server
  registry_username   = module.acr.admin_username
  registry_password   = module.acr.admin_password
  image_tag           = var.image_tag
  target_port         = 8080
  external_ingress    = true
  cpu                 = 1.0
  memory              = "2Gi"
  env_vars = [
    { name = "KC_DB", value = "postgres" },
    { name = "KC_DB_URL", value = "jdbc:postgresql://${module.postgres.server_fqdn}:5432/keycloak_db" },
    { name = "KC_DB_USERNAME", value = var.postgres_admin_username },
    { name = "KC_HTTP_ENABLED", value = "true" },
    { name = "KC_HOSTNAME_STRICT_HTTPS", value = "false" },
  ]
  secrets = [
    { name = "db-password", value = var.postgres_admin_password },
    { name = "keycloak-admin-password", value = var.keycloak_admin_password },
  ]
  tags = local.tags
}

module "flask_oidc_proxy" {
  source              = "../../modules/container-app"
  app_name            = "flask-oidc-proxy"
  resource_group_name = module.networking.resource_group_name
  environment_id      = module.container_app_env.id
  registry_server     = module.acr.login_server
  registry_username   = module.acr.admin_username
  registry_password   = module.acr.admin_password
  image_tag           = var.image_tag
  target_port         = 5000
  external_ingress    = false
  cpu                 = 0.25
  memory              = "0.5Gi"
  tags                = local.tags
}

module "blob_service" {
  source              = "../../modules/container-app"
  app_name            = "blob-service"
  resource_group_name = module.networking.resource_group_name
  environment_id      = module.container_app_env.id
  registry_server     = module.acr.login_server
  registry_username   = module.acr.admin_username
  registry_password   = module.acr.admin_password
  image_tag           = var.image_tag
  target_port         = 8080
  external_ingress    = false
  cpu                 = 0.5
  memory              = "1Gi"
  env_vars = [
    { name = "SPRING_PROFILES_ACTIVE", value = "azure" },
  ]
  tags = local.tags
}

module "reports_service" {
  source              = "../../modules/container-app"
  app_name            = "reports-service"
  resource_group_name = module.networking.resource_group_name
  environment_id      = module.container_app_env.id
  registry_server     = module.acr.login_server
  registry_username   = module.acr.admin_username
  registry_password   = module.acr.admin_password
  image_tag           = var.image_tag
  target_port         = 8080
  external_ingress    = false
  cpu                 = 0.5
  memory              = "1Gi"
  env_vars = [
    { name = "SPRING_PROFILES_ACTIVE", value = "azure" },
    { name = "SPRING_DATASOURCE_URL", value = "jdbc:postgresql://${module.postgres.server_fqdn}:5432/reports_service_db" },
    { name = "SPRING_DATASOURCE_USERNAME", value = var.postgres_admin_username },
  ]
  secrets = [
    { name = "db-password", value = var.postgres_admin_password },
  ]
  tags = local.tags
}

module "data_service" {
  source              = "../../modules/container-app"
  app_name            = "data-service"
  resource_group_name = module.networking.resource_group_name
  environment_id      = module.container_app_env.id
  registry_server     = module.acr.login_server
  registry_username   = module.acr.admin_username
  registry_password   = module.acr.admin_password
  image_tag           = var.image_tag
  target_port         = 8080
  external_ingress    = false
  cpu                 = 0.5
  memory              = "1Gi"
  env_vars = [
    { name = "SPRING_PROFILES_ACTIVE", value = "azure" },
    { name = "SPRING_DATASOURCE_URL", value = "jdbc:postgresql://${module.postgres.server_fqdn}:5432/data_service_db" },
    { name = "SPRING_DATASOURCE_USERNAME", value = var.postgres_admin_username },
  ]
  secrets = [
    { name = "db-password", value = var.postgres_admin_password },
  ]
  tags = local.tags
}

module "frontend" {
  source              = "../../modules/container-app"
  app_name            = "frontend"
  resource_group_name = module.networking.resource_group_name
  environment_id      = module.container_app_env.id
  registry_server     = module.acr.login_server
  registry_username   = module.acr.admin_username
  registry_password   = module.acr.admin_password
  image_tag           = var.image_tag
  target_port         = 3000
  external_ingress    = false
  cpu                 = 0.5
  memory              = "1Gi"
  env_vars = [
    { name = "NODE_ENV", value = "production" },
    { name = "BLOB_SERVICE_URL", value = "http://blob-service" },
    { name = "REPORTS_SERVICE_URL", value = "http://reports-service" },
    { name = "DATA_SERVICE_URL", value = "http://data-service" },
  ]
  tags = local.tags
}
