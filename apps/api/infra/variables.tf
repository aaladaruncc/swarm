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
  default     = 2
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
