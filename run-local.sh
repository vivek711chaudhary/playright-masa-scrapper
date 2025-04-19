#!/bin/bash

# Stop any existing containers
echo "Stopping any existing playwright-mcp containers..."
docker stop playwright-mcp 2>/dev/null || true
docker rm playwright-mcp 2>/dev/null || true

# Build the container
echo "Building Docker container..."
docker build -t playwright-mcp .

# Run the container
echo "Running playwright-mcp container..."
docker run -d \
  --name playwright-mcp \
  -p 3000:3000 \
  --env-file .env \
  playwright-mcp

# Show logs
echo "Container started. Viewing logs..."
docker logs -f playwright-mcp 