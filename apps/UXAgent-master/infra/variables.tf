# Variables for UXAgent ECS deployment

variable "app_name" {
  description = "Name of the application"
  type        = string
  default     = "uxagent"
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
  default     = 8000
}

variable "image_tag" {
  description = "Docker image tag to deploy"
  type        = string
  default     = "latest"
}

variable "cpu" {
  description = "CPU units for the task (1024 = 1 vCPU)"
  type        = number
  default     = 512  # More CPU for LLM processing
}

variable "memory" {
  description = "Memory for the task in MB"
  type        = number
  default     = 1024  # More memory for agent operations
}

variable "desired_count" {
  description = "Number of tasks to run"
  type        = number
  default     = 1
}

variable "health_check_path" {
  description = "Health check endpoint path"
  type        = string
  default     = "/progress"
}

# Environment variables for the container
variable "env_vars" {
  description = "Environment variables for the container"
  type        = map(string)
  default     = {}
  sensitive   = true
}

# Reference to existing API cluster
variable "existing_cluster_name" {
  description = "Name of the existing ECS cluster to join"
  type        = string
  default     = "ux-testing-api-cluster"
}

# Domain configuration
variable "domain_name" {
  description = "Root domain name (e.g., useswarm.co)"
  type        = string
  default     = "useswarm.co"
}

variable "uxagent_domain" {
  description = "Full domain for UXAgent (e.g., uxagent.useswarm.co)"
  type        = string
  default     = "uxagent.useswarm.co"
}

# BrowserBase credentials
variable "browserbase_api_key" {
  description = "BrowserBase API key"
  type        = string
  sensitive   = true
}

variable "browserbase_project_id" {
  description = "BrowserBase project ID"
  type        = string
  sensitive   = true
}

# LLM API Key
variable "gemini_api_key" {
  description = "Google Gemini API key"
  type        = string
  sensitive   = true
}

# Internal API Key for main API to call UXAgent
variable "internal_api_key" {
  description = "API key for authenticating requests from main API"
  type        = string
  sensitive   = true
}

# Main API configuration for callbacks
variable "main_api_url" {
  description = "URL of the main API for callbacks"
  type        = string
  default     = "https://api.useswarm.co"
}

variable "main_api_key" {
  description = "API key for UXAgent to call main API"
  type        = string
  sensitive   = true
}
