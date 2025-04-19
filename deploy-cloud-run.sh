#!/bin/bash

# Configuration
PROJECT_ID="your-gcp-project-id"  # Replace with your actual GCP project ID
REGION="us-central1"              # Change to your preferred region
SERVICE_NAME="playwright-mcp"
MIN_INSTANCES=0
MAX_INSTANCES=3
MEMORY="2Gi"
CPU="1"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "gcloud could not be found. Please install Google Cloud SDK first."
    exit 1
fi

# Build and push the container image
echo "Building and pushing container image to Google Container Registry..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICE_NAME

# Deploy to Cloud Run
echo "Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$SERVICE_NAME \
  --platform managed \
  --region $REGION \
  --memory $MEMORY \
  --cpu $CPU \
  --min-instances $MIN_INSTANCES \
  --max-instances $MAX_INSTANCES \
  --set-env-vars "DEBUG=false,HTTP_LOGGING=false" \
  --allow-unauthenticated

# Get the deployed service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)')

echo -e "\n\nDeployment completed!"
echo "Service URL: $SERVICE_URL"
echo "Test with: curl $SERVICE_URL/health" 