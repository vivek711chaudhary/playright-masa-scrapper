const express = require('express');
const { chromium } = require('playwright'); // or firefox, webkit
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

// Endpoint to interact with a webpage
app.post('/automate', async (req, res) => {
  const { url, instructions } = req.body;
  
  try {
    const browser = await chromium.launch({ 
      headless: true, 
      channel: process.env.PLAYWRIGHT_CHROMIUM_CHANNEL || undefined,
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined
    });
    
    try {
      const page = await browser.newPage();
      await page.goto(url);
      
      // Example: Extract text or take a screenshot based on AI instructions
      if (instructions === 'screenshot') {
        const screenshot = await page.screenshot({ fullPage: true });
        res.type('image/png').send(screenshot);
      } 
      else if (instructions === 'extract-text') {
        const text = await page.evaluate(() => document.body.innerText);
        res.json({ text });
      }
      // Add more actions (click, fill forms, etc.) as needed
    } finally {
      await browser.close();
    }
  } catch (playwrightError) {
    console.error("Playwright launch failed:", playwrightError.message);
    console.log("Trying fallback HTTP request...");
    
    // Fallback to simple HTTP request for text extraction
    if (instructions === 'extract-text') {
      try {
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        
        // Simple HTML to text conversion
        let text = response.data;
        text = text.replace(/<style([\s\S]*?)<\/style>/gi, '');
        text = text.replace(/<script([\s\S]*?)<\/script>/gi, '');
        text = text.replace(/<[^>]+>/gi, ' ');
        text = text.replace(/\s+/g, ' ');
        
        res.json({ text: text.trim(), fallback: true });
      } catch (httpError) {
        res.status(500).json({ 
          error: "Both Playwright and HTTP fallback failed",
          playwright_error: playwrightError.message,
          http_error: httpError.message
        });
      }
    } else {
      res.status(500).json({ 
        error: "Playwright failed and no fallback available for this operation",
        details: playwrightError.message
      });
    }
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    version: process.env.npm_package_version || 'unknown',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Playwright API running on http://localhost:${PORT}`));

