# Outputs for the UXAgent infrastructure

output "alb_url" {
  description = "URL of the Application Load Balancer"
  value       = "http://${aws_lb.uxagent.dns_name}"
}

output "uxagent_url" {
  description = "HTTPS URL of UXAgent with custom domain"
  value       = "https://${var.uxagent_domain}"
}

output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = aws_lb.uxagent.dns_name
}

output "ecr_repository_url" {
  description = "URL of the ECR repository"
  value       = aws_ecr_repository.uxagent.repository_url
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster (shared with API)"
  value       = data.aws_ecs_cluster.existing.cluster_name
}

output "ecs_service_name" {
  description = "Name of the ECS service"
  value       = aws_ecs_service.uxagent.name
}

output "cloudwatch_log_group" {
  description = "CloudWatch log group name"
  value       = aws_cloudwatch_log_group.uxagent.name
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
    docker tag ${var.app_name}:latest ${aws_ecr_repository.uxagent.repository_url}:latest
    
    # Push the image
    docker push ${aws_ecr_repository.uxagent.repository_url}:latest
  EOT
}

output "update_service_command" {
  description = "Command to force a new deployment"
  value       = "aws ecs update-service --cluster ${data.aws_ecs_cluster.existing.cluster_name} --service ${aws_ecs_service.uxagent.name} --force-new-deployment"
}
