output "fqdn" {
  value = azurerm_container_app.main.ingress[0].fqdn
}

output "id" {
  value = azurerm_container_app.main.id
}

output "latest_revision_name" {
  value = azurerm_container_app.main.latest_revision_name
}
