#!/bin/bash

# Colors for output formatting
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration settings (change these based on your needs)
PROJECT_ID="your-project-id"
REGION="us-central1"
SERVICE_NAME="mcp-playwright-service"
MEMORY="4Gi"
CPU="2"
CONCURRENCY="30"
TIMEOUT="600s"

# Print with color
print_color() {
  printf "${2}${1}${NC}\n"
}

# Print step header
print_step() {
  print_color "\n=== ${1} ===" "${BLUE}"
}

# Check for errors
check_error() {
  if [ $? -ne 0 ]; then
    print_color "ERROR: ${1}" "${RED}"
    exit 1
  fi
}

# Check if gcloud CLI is installed
if ! command -v gcloud &> /dev/null; then
  print_color "gcloud CLI not found. Please install it first: https://cloud.google.com/sdk/docs/install" "${RED}"
  exit 1
fi

# Check if user is authenticated with gcloud
print_step "Checking gcloud authentication"
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null | grep -q "@"; then
  print_color "You are not authenticated with gcloud. Please run 'gcloud auth login' first." "${RED}"
  exit 1
fi

# Ask for project ID confirmation or custom value
print_color "Current project ID setting: ${PROJECT_ID}" "${YELLOW}"
read -p "Press Enter to use this project ID or type a new one: " input_project_id
if [ -n "$input_project_id" ]; then
  PROJECT_ID=$input_project_id
fi

# Set project
print_step "Setting project to ${PROJECT_ID}"
gcloud config set project ${PROJECT_ID}
check_error "Failed to set project"

# Build the Docker image
print_step "Building Docker image"
print_color "Building image: gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest" "${GREEN}"
docker build -t gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest .
check_error "Docker build failed"

# Push the image to Google Container Registry
print_step "Pushing image to Google Container Registry"
docker push gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest
check_error "Failed to push Docker image"

# Deploy to Cloud Run
print_step "Deploying to Cloud Run"
print_color "Deploying service ${SERVICE_NAME} to region ${REGION}" "${GREEN}"
gcloud run deploy ${SERVICE_NAME} \
  --image gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest \
  --platform managed \
  --region ${REGION} \
  --memory ${MEMORY} \
  --cpu ${CPU} \
  --concurrency ${CONCURRENCY} \
  --timeout ${TIMEOUT} \
  --allow-unauthenticated
check_error "Deployment failed"

# Get the service URL
print_step "Deployment successful"
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --platform managed --region ${REGION} --format="value(status.url)")
check_error "Failed to get service URL"

# Print success message with endpoints
print_color "Deployment successful!" "${GREEN}"
print_color "Service URL: ${SERVICE_URL}" "${BLUE}"
print_color "MCP Endpoint: ${SERVICE_URL}/enhance-tweets-playwright" "${BLUE}"
print_color "MASA API Endpoint: ${SERVICE_URL}/enhance-tweets-masa" "${BLUE}"
print_color "Health Check: ${SERVICE_URL}/health" "${BLUE}"
print_color "\nYou can monitor the service in the Google Cloud Console:" "${GREEN}"
print_color "https://console.cloud.google.com/run/detail/${REGION}/${SERVICE_NAME}/metrics?project=${PROJECT_ID}" "${BLUE}"

print_color "\nMake this script executable with: chmod +x deploy-cloud-run.sh" "${YELLOW}" 