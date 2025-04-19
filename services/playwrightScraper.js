const { chromium } = require("playwright");
const { logStep } = require('../utils/logger');
const { SCRAPE_TIMEOUT, BROWSER_TIMEOUT } = require('../utils/config');

async function scrapeWithPlaywright(url) {
  const browser = await chromium.launch({ 
    headless: true,
    timeout: BROWSER_TIMEOUT
  });
  
  try {
    const page = await browser.newPage();
    logStep("SCRAPE", `Navigating to ${url}...`);
    
    await page.goto(url, { 
      waitUntil: "domcontentloaded",
      timeout: SCRAPE_TIMEOUT 
    });
    
    const pageContent = await page.evaluate(() => {
      return document.querySelector('article')?.innerText || document.body.innerText;
    });
    
    return pageContent;
  } finally {
    await browser.close();
  }
}

module.exports = { scrapeWithPlaywright }; 