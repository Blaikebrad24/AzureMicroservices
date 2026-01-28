variable "project_name" {
  type = string
}

variable "resource_group_name" {
  type = string
}

variable "location" {
  type = string
}

variable "subnet_id" {
  type        = string
  description = "Subnet ID for the Container App Environment"
}

variable "tags" {
  type    = map(string)
  default = {}
}
