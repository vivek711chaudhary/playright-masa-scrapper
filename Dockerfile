FROM node:18-slim

# Install dependencies for Playwright
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxcb1 \
    libxkbcommon0 \
    libx11-6 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    libatspi2.0-0 \
    wget \
    gnupg \
    bash \
    net-tools \
    curl \
    procps \
    fonts-noto-color-emoji \
    && rm -rf /var/lib/apt/lists/*

# Verify bash is available
RUN bash --version

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Install Playwright browsers
RUN npx playwright install --with-deps chromium

# Find and store the browser path for use at runtime
RUN BROWSER_PATH=$(find /root/.cache -name chrome -type f -executable | head -n 1 || echo "") && \
    echo "Found browser at: $BROWSER_PATH" && \
    echo "$BROWSER_PATH" > /app/chrome-path.txt

# Copy the rest of the application
COPY . .

# Set environment variables for timeouts with default values
ENV SCRAPE_TIMEOUT=20000
ENV BROWSER_TIMEOUT=60000
ENV INSTALL_BROWSERS=true
ENV DOCKER_CONTAINER=true
ENV PORT=3000

# Expose the port the app runs on
EXPOSE 3000

# Create a comprehensive startup script that includes debugging
RUN echo '#!/bin/bash' > /app/start.sh && \
    echo 'set -e' >> /app/start.sh && \
    echo 'export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=$(cat /app/chrome-path.txt)' >> /app/start.sh && \
    echo 'echo "========== ENVIRONMENT =========="' >> /app/start.sh && \
    echo 'echo "Node version: $(node -v)"' >> /app/start.sh && \
    echo 'echo "NPM version: $(npm -v)"' >> /app/start.sh && \
    echo 'echo "Using browser at: $PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH"' >> /app/start.sh && \
    echo 'echo "Starting server on port $PORT"' >> /app/start.sh && \
    echo 'echo "========== VERIFICATION =========="' >> /app/start.sh && \
    echo 'node scripts/verify-playwright.js' >> /app/start.sh && \
    echo 'echo "========== SERVER STARTUP =========="' >> /app/start.sh && \
    echo 'echo "Starting server at $(date)"' >> /app/start.sh && \
    echo 'netstat -tulpn || echo "Netstat not available"' >> /app/start.sh && \
    echo 'exec node server.js' >> /app/start.sh && \
    chmod +x /app/start.sh

# Command to run the application
CMD ["/app/start.sh"]
