# ECR Repository for UXAgent Docker images

resource "aws_ecr_repository" "uxagent" {
  name                 = var.app_name
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = {
    Name = var.app_name
  }
}

# Lifecycle policy to clean up old images
resource "aws_ecr_lifecycle_policy" "uxagent" {
  repository = aws_ecr_repository.uxagent.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 images"
        selection = {
          tagStatus     = "any"
          countType     = "imageCountMoreThan"
          countNumber   = 10
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}
