#!/bin/bash

# Color codes for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration - Modify these values as needed
PROJECT_ID="playwright-mcp"
REGION="us-central1"
SERVICE_NAME="playwright-mcp"
MEMORY="4Gi"
CPU="2"
CONCURRENCY="80"
TIMEOUT="300s"
MIN_INSTANCES="0"
MAX_INSTANCES="10"
PORT="3000"
SCRAPE_TIMEOUT="20000"
BROWSER_TIMEOUT="60000"
DOCKER_TAG="latest"

# Print banner
echo -e "${BLUE}==========================================${NC}"
echo -e "${GREEN}Playwright MCP - Cloud Run Deployment${NC}"
echo -e "${BLUE}==========================================${NC}"

# Check if gcloud CLI is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI is not installed. Please install it first.${NC}"
    echo "Visit: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
    echo -e "${YELLOW}You need to authenticate with Google Cloud${NC}"
    gcloud auth login
fi

# Set the project
echo -e "${BLUE}Setting project to: ${PROJECT_ID}${NC}"
gcloud config set project $PROJECT_ID

# Build the Docker image
echo -e "${BLUE}Building Docker image...${NC}"
docker build -t gcr.io/$PROJECT_ID/$SERVICE_NAME:$DOCKER_TAG .

# Push the image to Google Container Registry
echo -e "${BLUE}Pushing image to Google Container Registry...${NC}"
docker push gcr.io/$PROJECT_ID/$SERVICE_NAME:$DOCKER_TAG

# Deploy to Cloud Run
echo -e "${BLUE}Deploying to Cloud Run...${NC}"
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$SERVICE_NAME:$DOCKER_TAG \
  --platform managed \
  --region $REGION \
  --memory $MEMORY \
  --cpu $CPU \
  --concurrency $CONCURRENCY \
  --timeout $TIMEOUT \
  --min-instances $MIN_INSTANCES \
  --max-instances $MAX_INSTANCES \
  --port $PORT \
  --set-env-vars="SCRAPE_TIMEOUT=$SCRAPE_TIMEOUT,BROWSER_TIMEOUT=$BROWSER_TIMEOUT,DOCKER_CONTAINER=true" \
  --allow-unauthenticated

# Check deployment status
if [ $? -eq 0 ]; then
    echo -e "${GREEN}Deployment successful!${NC}"
    
    # Get the service URL
    SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format="value(status.url)")
    
    echo -e "${GREEN}Service URL: ${SERVICE_URL}${NC}"
    echo -e "${YELLOW}MCP Endpoint: ${SERVICE_URL}/enhance-tweets-playwright${NC}"
    echo -e "${YELLOW}API Endpoint: ${SERVICE_URL}/enhance-tweets-masa${NC}"
    echo -e "${YELLOW}Health Check: ${SERVICE_URL}/health${NC}"
    
    echo -e "${BLUE}==========================================${NC}"
    echo -e "${GREEN}Deployment Complete!${NC}"
    echo -e "${BLUE}==========================================${NC}"
else
    echo -e "${RED}Deployment failed. Please check the logs.${NC}"
    exit 1
fi 