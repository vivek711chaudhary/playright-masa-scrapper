#!/bin/bash

# Configuration - modify these variables
PROJECT_ID=${PROJECT_ID:-"your-gcp-project-id"}
IMAGE_NAME=${IMAGE_NAME:-"playwright-mcp"}
REGION=${REGION:-"us-central1"}
SERVICE_NAME=${SERVICE_NAME:-"playwright-mcp"}
MEMORY=${MEMORY:-"2Gi"}
CPU=${CPU:-"1"}
CONCURRENCY=${CONCURRENCY:-"80"}
TIMEOUT=${TIMEOUT:-"300s"}
PORT=${PORT:-"3000"}

# Check if required tools are installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v gcloud &> /dev/null; then
    echo "❌ Google Cloud SDK is not installed. Please install it first."
    exit 1
fi

# Check if user is logged in to gcloud
if ! gcloud auth print-access-token &> /dev/null; then
    echo "❌ Not logged in to Google Cloud. Please run 'gcloud auth login' first."
    exit 1
fi

# Build the Docker image
echo "🔨 Building Docker image..."
docker build -t $IMAGE_NAME:latest .

# Tag the image for Google Container Registry
echo "🏷️ Tagging Docker image for Google Container Registry..."
docker tag $IMAGE_NAME:latest gcr.io/$PROJECT_ID/$IMAGE_NAME:latest

# Configure Docker to use gcloud as a credential helper
echo "🔑 Configuring Docker authentication..."
gcloud auth configure-docker --quiet

# Push the image to Google Container Registry
echo "⬆️ Pushing Docker image to Google Container Registry..."
docker push gcr.io/$PROJECT_ID/$IMAGE_NAME:latest

# Create a temporary file for environment variables
ENV_FILE=$(mktemp)
echo "Creating temporary environment variables file: $ENV_FILE"

# Add required environment variables
cat > $ENV_FILE << EOF
SCRAPE_TIMEOUT=20000
BROWSER_TIMEOUT=60000
INSTALL_BROWSERS=true
DOCKER_CONTAINER=true
PORT=$PORT
EOF

# Add any variables from .env that are not sensitive
if [ -f .env ]; then
  echo "Adding non-sensitive variables from .env..."
  grep -v "API_KEY\|SECRET\|TOKEN\|PASSWORD" .env >> $ENV_FILE || true
fi

# Show the variables being used (redacted)
echo "Environment variables for deployment (sensitive values redacted):"
cat $ENV_FILE | sed -E 's/(API_KEY|SECRET|TOKEN|PASSWORD)=.+/\1=*****/g'

# Deploy to Cloud Run
echo "🚀 Deploying to Google Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$IMAGE_NAME:latest \
  --platform managed \
  --region $REGION \
  --memory $MEMORY \
  --cpu $CPU \
  --concurrency $CONCURRENCY \
  --timeout $TIMEOUT \
  --env-vars-file $ENV_FILE \
  --port $PORT \
  --allow-unauthenticated

DEPLOY_STATUS=$?

# Clean up temporary file
rm $ENV_FILE

# Check deployment status
if [ $DEPLOY_STATUS -eq 0 ]; then
  echo "✅ Deployment completed successfully!"
  gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format="value(status.url)"
else
  echo "❌ Deployment failed. Check the logs for more information."
  exit 1
fi 