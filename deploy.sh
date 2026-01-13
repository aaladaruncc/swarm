#!/bin/bash
set -e

# Configuration
AWS_REGION="us-east-1"
AWS_ACCOUNT_ID="490863269891"
ECR_URL="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
CLUSTER_NAME="ux-testing-api-cluster"

# API Configuration
API_SERVICE_NAME="ux-testing-api-service"
API_IMAGE_NAME="ux-testing-api"
API_DOCKERFILE="apps/api/Dockerfile"
API_CONTEXT="."

# UXAgent Configuration
AGENT_SERVICE_NAME="uxagent-service"
AGENT_IMAGE_NAME="uxagent"
AGENT_DOCKERFILE="apps/UXAgent-master/Dockerfile"
AGENT_CONTEXT="apps/UXAgent-master"

# Helper function to authenticate
authenticate() {
    echo "🔐 Authenticating with AWS ECR..."
    aws ecr get-login-password --region "${AWS_REGION}" | docker login --username AWS --password-stdin "${ECR_URL}"
    echo "✅ Authenticated!"
}

# Helper function to deploy a service
deploy_service() {
    local SERVICE_NAME=$1
    local IMAGE_NAME=$2
    local DOCKERFILE=$3
    local CONTEXT=$4
    local ECS_SERVICE=$5

    echo "🚀 Deploying ${SERVICE_NAME}..."
    
    FULL_IMAGE_URL="${ECR_URL}/${IMAGE_NAME}:latest"

    echo "📦 Building Docker image..."
    # Build with --no-cache to ensure latest code is used
    docker build --no-cache --platform linux/amd64 -t "${IMAGE_NAME}" -f "${DOCKERFILE}" "${CONTEXT}"

    echo "🏷️ Tagging image..."
    docker tag "${IMAGE_NAME}:latest" "${FULL_IMAGE_URL}"

    echo "Dn Pushing image to ECR..."
    docker push "${FULL_IMAGE_URL}"

    echo "🔄 Updating ECS Service..."
    aws ecs update-service --cluster "${CLUSTER_NAME}" --service "${ECS_SERVICE}" --force-new-deployment > /dev/null

    echo "✅ ${SERVICE_NAME} deployment initiated!"
}

# Main script logic
if [ "$1" == "api" ]; then
    authenticate
    deploy_service "API" "${API_IMAGE_NAME}" "${API_DOCKERFILE}" "${API_CONTEXT}" "${API_SERVICE_NAME}"
elif [ "$1" == "agent" ]; then
    authenticate
    deploy_service "UXAgent" "${AGENT_IMAGE_NAME}" "${AGENT_DOCKERFILE}" "${AGENT_CONTEXT}" "${AGENT_SERVICE_NAME}"
elif [ "$1" == "all" ]; then
    authenticate
    deploy_service "API" "${API_IMAGE_NAME}" "${API_DOCKERFILE}" "${API_CONTEXT}" "${API_SERVICE_NAME}"
    echo "----------------------------------------"
    deploy_service "UXAgent" "${AGENT_IMAGE_NAME}" "${AGENT_DOCKERFILE}" "${AGENT_CONTEXT}" "${AGENT_SERVICE_NAME}"
else
    echo "Usage: ./deploy.sh [api|agent|all]"
    exit 1
fi

echo "🎉 Done!"
