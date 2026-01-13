# Variables for Hono API ECS deployment

variable "app_name" {
  description = "Name of the application"
  type        = string
  default     = "ux-testing-api"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
}

variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "us-east-1"
}

variable "container_port" {
  description = "Port the container listens on"
  type        = number
  default     = 8080
}

variable "image_tag" {
  description = "Docker image tag to deploy"
  type        = string
  default     = "latest"
}

variable "cpu" {
  description = "CPU units for the task (1024 = 1 vCPU)"
  type        = number
  default     = 256
}

variable "memory" {
  description = "Memory for the task in MB"
  type        = number
  default     = 512
}

variable "desired_count" {
  description = "Number of tasks to run"
  type        = number
  default     = 1
}

variable "health_check_path" {
  description = "Health check endpoint path"
  type        = string
  default     = "/health"
}

# Environment variables for the container
variable "env_vars" {
  description = "Environment variables for the container"
  type        = map(string)
  default     = {}
  sensitive   = true
}

# Domain configuration
variable "domain_name" {
  description = "Root domain name (e.g., useswarm.co)"
  type        = string
  default     = "useswarm.co"
}

variable "api_domain" {
  description = "Full domain for the API (e.g., api.useswarm.co)"
  type        = string
  default     = "api.useswarm.co"
}

# RDS PostgreSQL Configuration
variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t4g.micro"  # Free tier eligible, ~$12/mo
}

variable "db_allocated_storage" {
  description = "Allocated storage in GB"
  type        = number
  default     = 20
}

variable "db_max_allocated_storage" {
  description = "Max allocated storage for autoscaling in GB"
  type        = number
  default     = 100
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "ux_testing"
}

variable "db_username" {
  description = "Database master username"
  type        = string
  default     = "postgres"
}

variable "db_password" {
  description = "Database master password"
  type        = string
  sensitive   = true
}
