const express = require('express');
const { chromium } = require('playwright'); // or firefox, webkit
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// Endpoint to interact with a webpage
app.post('/automate', async (req, res) => {
  const { url, instructions } = req.body;
  const browser = await chromium.launch({ headless: false }); // Set headless: true for no UI
  const page = await browser.newPage();

  try {
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
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await browser.close();
  }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Playwright API running on http://localhost:${PORT}`));

