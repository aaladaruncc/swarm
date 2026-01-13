# Outputs for the Hono API infrastructure

output "alb_url" {
  description = "URL of the Application Load Balancer"
  value       = "http://${aws_lb.api.dns_name}"
}

output "api_url" {
  description = "HTTPS URL of the API with custom domain"
  value       = "https://${var.api_domain}"
}

output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = aws_lb.api.dns_name
}

output "ecr_repository_url" {
  description = "URL of the ECR repository"
  value       = aws_ecr_repository.api.repository_url
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.api.name
}

output "ecs_service_name" {
  description = "Name of the ECS service"
  value       = aws_ecs_service.api.name
}

output "cloudwatch_log_group" {
  description = "CloudWatch log group name"
  value       = aws_cloudwatch_log_group.api.name
}

# Useful commands output
output "docker_login_command" {
  description = "Command to authenticate Docker with ECR"
  value       = "aws ecr get-login-password --region ${data.aws_region.current.name} | docker login --username AWS --password-stdin ${data.aws_caller_identity.current.account_id}.dkr.ecr.${data.aws_region.current.name}.amazonaws.com"
}

output "docker_push_commands" {
  description = "Commands to build and push Docker image"
  value       = <<-EOT
    # Build the image
    docker build -t ${var.app_name} .
    
    # Tag the image
    docker tag ${var.app_name}:latest ${aws_ecr_repository.api.repository_url}:latest
    
    # Push the image
    docker push ${aws_ecr_repository.api.repository_url}:latest
  EOT
}

# RDS Outputs
output "rds_endpoint" {
  description = "RDS endpoint (host:port)"
  value       = aws_db_instance.main.endpoint
}

output "rds_host" {
  description = "RDS hostname"
  value       = aws_db_instance.main.address
}

output "database_url" {
  description = "PostgreSQL connection URL (add password manually)"
  value       = "postgresql://${var.db_username}:PASSWORD@${aws_db_instance.main.endpoint}/${var.db_name}"
  sensitive   = true
}

output "migration_command" {
  description = "Command to migrate from Neon to RDS"
  value       = <<-EOT
    # Export from Neon, import to RDS:
    pg_dump "$NEON_DATABASE_URL" --no-owner | psql "postgresql://${var.db_username}:YOUR_PASSWORD@${aws_db_instance.main.endpoint}/${var.db_name}"
  EOT
}

# S3 Outputs
output "s3_bucket_name" {
  description = "S3 bucket name for screenshots"
  value       = aws_s3_bucket.screenshots.id
}

output "s3_bucket_arn" {
  description = "S3 bucket ARN"
  value       = aws_s3_bucket.screenshots.arn
}
