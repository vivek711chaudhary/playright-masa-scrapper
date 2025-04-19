#!/bin/bash

echo "Building Docker image..."
docker build -t playwright-mcp .

echo "Running Docker container..."
docker run -p 8080:8080 --env-file .env playwright-mcp 