#!/bin/bash
set -e

# Deploy script for UX Testing API to AWS ECS
# Run from the monorepo root: ./apps/api/deploy.sh

# Configuration
APP_NAME="ux-testing-api"
AWS_REGION="us-east-1"
AWS_ACCOUNT_ID="490863269891"
ECR_REPO="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${APP_NAME}"
CLUSTER_NAME="${APP_NAME}-cluster"
SERVICE_NAME="${APP_NAME}-service"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 Deploying ${APP_NAME} to AWS ECS...${NC}"

# Get the script's directory and navigate to monorepo root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${REPO_ROOT}"

echo -e "${GREEN}📁 Working from: ${REPO_ROOT}${NC}"

# Step 1: Login to ECR
echo -e "${YELLOW}🔐 Logging into ECR...${NC}"
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

# Step 2: Build the Docker image for AMD64 (Fargate)
echo -e "${YELLOW}🏗️  Building Docker image for linux/amd64...${NC}"
docker build --platform linux/amd64 -t ${APP_NAME} -f apps/api/Dockerfile .

# Step 3: Tag the image
echo -e "${YELLOW}🏷️  Tagging image...${NC}"
docker tag ${APP_NAME}:latest ${ECR_REPO}:latest

# Step 4: Push to ECR
echo -e "${YELLOW}📤 Pushing to ECR...${NC}"
docker push ${ECR_REPO}:latest

# Step 5: Force new ECS deployment
echo -e "${YELLOW}🔄 Triggering ECS deployment...${NC}"
aws ecs update-service \
  --region ${AWS_REGION} \
  --cluster ${CLUSTER_NAME} \
  --service ${SERVICE_NAME} \
  --force-new-deployment \
  --query 'service.deployments[0].{status:status,desiredCount:desiredCount,runningCount:runningCount}' \
  --output table

echo -e "${GREEN}✅ Deployment triggered successfully!${NC}"
echo -e "${YELLOW}⏳ Waiting for deployment to stabilize (this may take 2-3 minutes)...${NC}"

# Optional: Wait for service to stabilize
if [ "$1" == "--wait" ]; then
  aws ecs wait services-stable \
    --region ${AWS_REGION} \
    --cluster ${CLUSTER_NAME} \
    --services ${SERVICE_NAME}
  echo -e "${GREEN}✅ Deployment complete! Service is stable.${NC}"
else
  echo -e "${YELLOW}💡 Run with --wait flag to wait for deployment to complete${NC}"
fi

echo -e "${GREEN}🌐 API URL: https://api.useswarm.co${NC}"
