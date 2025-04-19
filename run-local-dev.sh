#!/bin/bash

# Set development environment variables
export DEBUG=true
export HTTP_LOGGING=true
export LOG_LEVEL=info

# Install dependencies if needed
echo "Checking for dependencies..."
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Run the application
echo "Starting playwright-mcp in development mode..."
node server.js 