#!/bin/bash

# Stop and remove any existing containers
echo "Cleaning up existing containers..."
docker stop playwright-mcp-test 2>/dev/null || true
docker rm playwright-mcp-test 2>/dev/null || true

# Build the Docker image
echo "Building Docker image..."
docker build -t playwright-mcp:latest .

# Run the container with the test environment
echo "Running Docker container for testing with port mapping..."
docker run --name playwright-mcp-test \
  -p 8080:3000 \
  --env-file .env \
  -d playwright-mcp:latest

echo "Container started. Waiting for startup..."
# Give more time for the server to fully start
sleep 15

# Check if the container is still running
CONTAINER_RUNNING=$(docker ps -q -f name=playwright-mcp-test)
if [ -z "$CONTAINER_RUNNING" ]; then
  echo "❌ Container stopped unexpectedly!"
  echo "Dumping container logs:"
  docker logs playwright-mcp-test
  exit 1
fi

# Display container logs to see startup progress
echo "Container logs:"
docker logs playwright-mcp-test

# Verify the server process is running in the container
echo "Checking if server process is running in the container..."
SERVER_PROCESS=$(docker exec playwright-mcp-test ps aux | grep node | grep server.js | grep -v grep)
if [ -z "$SERVER_PROCESS" ]; then
  echo "❌ Server process is not running inside the container!"
  echo "Possible issues with server initialization."
  exit 1
else
  echo "✅ Server process is running inside the container."
  echo "$SERVER_PROCESS"
fi

# Test the health endpoint with proper port mapping
echo "Testing health endpoint..."
MAX_RETRIES=5
for i in $(seq 1 $MAX_RETRIES); do
  HEALTH_STATUS=$(curl -s http://localhost:8080/health | grep -o '"status":"ok"' || echo "failed")
  
  if [[ $HEALTH_STATUS == '"status":"ok"' ]]; then
    echo "✅ Health check passed!"
    break
  else
    if [ $i -eq $MAX_RETRIES ]; then
      echo "❌ Health check failed after $MAX_RETRIES attempts!"
      echo "Detailed curl output:"
      curl -v http://localhost:8080/health
      echo "Dumping container logs:"
      docker logs playwright-mcp-test
      echo "Checking container networking:"
      docker exec playwright-mcp-test netstat -tulpn || echo "netstat not available"
      exit 1
    else
      echo "⚠️ Health check attempt $i failed, retrying in 5 seconds..."
      sleep 5
    fi
  fi
done

# Test a simple request to verify full server functionality
echo "Testing a simple API endpoint..."
curl -v http://localhost:8080/health

# Test the Playwright verification
echo "Checking container logs for Playwright verification..."
docker logs playwright-mcp-test | grep -A 5 "Playwright verification"

# Display browser path in the container
echo "Checking browser path in container..."
docker exec playwright-mcp-test bash -c "cat /app/chrome-path.txt"

echo "Local Docker container is running at http://localhost:8080"
echo "To stop the container, run: docker stop playwright-mcp-test"
echo "To view logs, run: docker logs playwright-mcp-test"
echo ""
echo "To push to Google Cloud Run, use these commands:"
echo "--------------------------------------------"
echo "export PROJECT_ID=your-gcp-project-id"
echo "export IMAGE_NAME=playwright-mcp"
echo "docker tag playwright-mcp:latest gcr.io/\$PROJECT_ID/\$IMAGE_NAME:latest"
echo "docker push gcr.io/\$PROJECT_ID/\$IMAGE_NAME:latest"
echo "gcloud run deploy playwright-mcp --image gcr.io/\$PROJECT_ID/\$IMAGE_NAME:latest --platform managed --region us-central1 --allow-unauthenticated" 