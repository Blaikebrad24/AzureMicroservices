resource "azurerm_redis_cache" "main" {
  name                = "${var.project_name}-redis"
  resource_group_name = var.resource_group_name
  location            = var.location
  capacity            = 0
  family              = "C"
  sku_name            = "Basic"
  minimum_tls_version = "1.2"
  redis_version       = "6"

  redis_configuration {}

  tags = var.tags
}

resource "azurerm_private_endpoint" "redis" {
  name                = "${var.project_name}-redis-pe"
  resource_group_name = var.resource_group_name
  location            = var.location
  subnet_id           = var.subnet_id

  private_service_connection {
    name                           = "${var.project_name}-redis-psc"
    private_connection_resource_id = azurerm_redis_cache.main.id
    is_manual_connection           = false
    subresource_names              = ["redisCache"]
  }

  tags = var.tags
}
