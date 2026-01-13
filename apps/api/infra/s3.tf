# S3 Bucket for storing screenshots and blob data

resource "aws_s3_bucket" "screenshots" {
  bucket = "${var.app_name}-screenshots-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name = "${var.app_name}-screenshots"
  }
}

# Block public access (we'll use presigned URLs)
resource "aws_s3_bucket_public_access_block" "screenshots" {
  bucket = aws_s3_bucket.screenshots.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Enable versioning (optional, for data safety)
resource "aws_s3_bucket_versioning" "screenshots" {
  bucket = aws_s3_bucket.screenshots.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Lifecycle rule to clean up old screenshots (optional)
resource "aws_s3_bucket_lifecycle_configuration" "screenshots" {
  bucket = aws_s3_bucket.screenshots.id

  rule {
    id     = "expire-old-screenshots"
    status = "Enabled"

    filter {
      prefix = ""  # Apply to all objects
    }

    expiration {
      days = 90  # Keep screenshots for 90 days
    }

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}

# CORS configuration (for browser uploads if needed)
resource "aws_s3_bucket_cors_configuration" "screenshots" {
  bucket = aws_s3_bucket.screenshots.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST"]
    allowed_origins = ["*"]  # Restrict to your domain in production
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# IAM policy for ECS tasks to access S3
resource "aws_iam_role_policy" "ecs_s3_access" {
  name = "${var.app_name}-s3-access"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.screenshots.arn,
          "${aws_s3_bucket.screenshots.arn}/*"
        ]
      }
    ]
  })
}
