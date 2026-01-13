# Data sources for VPC, subnet, and existing cluster lookups

# Get the default VPC
data "aws_vpc" "default" {
  default = true
}

# Get all available subnets in the default VPC
data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# Get availability zones for the region
data "aws_availability_zones" "available" {
  state = "available"
}

# Get current AWS account ID and region
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# Reference existing ECS cluster from API deployment
data "aws_ecs_cluster" "existing" {
  cluster_name = var.existing_cluster_name
}

# Reference existing Route53 zone
data "aws_route53_zone" "main" {
  name         = var.domain_name
  private_zone = false
}
