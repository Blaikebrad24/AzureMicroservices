variable "project_name" {
  type    = string
  default = "completeapp"
}

variable "location" {
  type    = string
  default = "eastus"
}

variable "image_tag" {
  type    = string
  default = "latest"
}

variable "postgres_admin_username" {
  type    = string
  default = "appuser"
}

variable "postgres_admin_password" {
  type      = string
  sensitive = true
}

variable "keycloak_admin_password" {
  type      = string
  sensitive = true
  default   = "admin"
}
