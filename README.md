# Playwright Masa Scraper

A web content scraping and enhancement service that combines Playwright browser automation with the Masa API to provide enriched content from web sources.

## Overview

This project provides a Node.js server that can:

1. **Scrape web content** - Extract text content from web pages using Playwright browser automation
2. **Enhance content** - Augment text-based content (like tweets) with relevant web research
3. **Process content in batches** - Handle multiple content items in parallel efficiently

The server provides two main enhancement pathways:
- **Playwright-based enhancement** - Uses browser automation for web scraping
- **Masa-based enhancement** - Uses the Masa API for content enhancement

## Features

- **Browser Pool Management** - Efficiently manages browser instances for parallel processing
- **HTTP Fallback** - Automatically falls back to HTTP requests if browser automation fails
- **Content Research** - Finds relevant URLs based on input content
- **Content Enhancement** - Uses LLMs to intelligently integrate scraped information

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/playright-masa-scrapper.git

# Install dependencies
cd playright-masa-scrapper
npm install

# Run the server
npm start
```

## API Endpoints

### Enhance Tweets with Playwright

```
POST /enhance-tweets-playwright
```

**Request Body:**
```json
{
  "tweets": [
    {
      "Content": "Tweet content here",
      "Author": "Tweet author",
      "Date": "2023-01-01"
    }
  ],
  "custom_instruction": "Optional custom instructions for enhancement"
}
```

### Enhance Tweets with Masa

```
POST /enhance-tweets-masa
```

**Request Body:**
```json
{
  "tweets": [
    {
      "Content": "Tweet content here",
      "Author": "Tweet author",
      "Date": "2023-01-01"
    }
  ],
  "custom_instruction": "Optional custom instructions for enhancement"
}
```

### Health Check

```
GET /health
```

## Deployment

### Local Development

```bash
# Run the local development server
./run-local-dev.sh
```

### Docker Deployment

```bash
# Build and run with Docker
docker build -t playright-masa-scrapper .
docker run -p 3000:3000 playright-masa-scrapper
```

### Cloud Run Deployment

```bash
# Deploy to Google Cloud Run
./deploy-cloud-run.sh
```

### Deployed Instance

The service is currently deployed and accessible at:
```
https://playwright-mcp-nttc25y22a-uc.a.run.app
```

You can check the service health with:
```
curl https://playwright-mcp-nttc25y22a-uc.a.run.app/health
```

## Configuration

Configure the server by setting environment variables or updating the `env.yaml` file:

```yaml
PORT: 3000
NODE_ENV: development
BROWSER_POOL_SIZE: 3
```

## Technology Stack

- **Node.js** - Server runtime
- **Express** - Web framework
- **Playwright** - Browser automation
- **Together AI** - LLM integration for content enhancement
- **MCP SDK** - Model Context Protocol SDK

## License

Apache-2.0
