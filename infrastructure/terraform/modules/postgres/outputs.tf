output "server_fqdn" {
  value = azurerm_postgresql_flexible_server.main.fqdn
}

output "server_id" {
  value = azurerm_postgresql_flexible_server.main.id
}

output "admin_username" {
  value = azurerm_postgresql_flexible_server.main.administrator_login
}
