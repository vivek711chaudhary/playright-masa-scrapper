const { chromium } = require("playwright");
const { logStep, logError } = require('../utils/logger');
const { SCRAPE_TIMEOUT, BROWSER_TIMEOUT } = require('../utils/config');

// Browser pool management
let browserPool = null;
const MAX_BROWSERS = 5; // Maximum concurrent browser instances
const browserLocks = new Map(); // Track which browsers are in use

// Initialize the browser pool
async function initBrowserPool() {
  if (browserPool === null) {
    logStep("BROWSER", `Initializing browser pool with ${MAX_BROWSERS} instances`);
    browserPool = [];
    
    // Create browser instances
    for (let i = 0; i < MAX_BROWSERS; i++) {
      try {
        // Check if Playwright executable path is specified
        let options = { 
          headless: true,
          timeout: BROWSER_TIMEOUT
        };
        
        // Add channel option if specified
        if (process.env.PLAYWRIGHT_CHROMIUM_CHANNEL) {
          options.channel = process.env.PLAYWRIGHT_CHROMIUM_CHANNEL;
        }
        
        // Add executable path if specified
        if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) {
          options.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
        }
        
        const browser = await chromium.launch(options);
        browserPool.push(browser);
        browserLocks.set(i, false); // Mark as available
        logStep("BROWSER", `Browser ${i+1} launched successfully`);
      } catch (error) {
        logError(`Failed to launch browser ${i+1}`, error);
      }
    }
    
    // If we couldn't initialize any browsers, log a warning but continue
    if (browserPool.length === 0) {
      logError("Failed to initialize any browsers in the pool. Will use HTTP fallback for all requests.", 
        new Error("Browser initialization failed"));
    } else {
      logStep("BROWSER", `Browser pool initialized with ${browserPool.length} browsers`);
    }
  }
  return browserPool;
}

// Get an available browser from the pool
async function acquireBrowser() {
  await initBrowserPool();
  
  // Find an available browser
  const availableBrowserIndex = [...browserLocks.entries()]
    .find(([_, isLocked]) => !isLocked)?.[0];
  
  if (availableBrowserIndex !== undefined) {
    browserLocks.set(availableBrowserIndex, true); // Mark as in use
    return { browser: browserPool[availableBrowserIndex], index: availableBrowserIndex };
  }
  
  // If all browsers are in use, wait for one to become available
  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      const availableBrowserIndex = [...browserLocks.entries()]
        .find(([_, isLocked]) => !isLocked)?.[0];
      
      if (availableBrowserIndex !== undefined) {
        clearInterval(checkInterval);
        browserLocks.set(availableBrowserIndex, true); // Mark as in use
        resolve({ browser: browserPool[availableBrowserIndex], index: availableBrowserIndex });
      }
    }, 100);
  });
}

// Release a browser back to the pool
function releaseBrowser(index) {
  if (browserLocks.has(index)) {
    browserLocks.set(index, false); // Mark as available
  }
}

// Shutdown the browser pool
async function shutdownBrowserPool() {
  if (browserPool) {
    logStep("BROWSER", "Shutting down browser pool");
    await Promise.all(browserPool.map(browser => browser.close()));
    browserPool = null;
    browserLocks.clear();
  }
}

// Main scraping function
async function scrapeWithPlaywright(url) {
  let browserInfo = null;
  
  // Check if browser pool initialization failed
  if (browserPool === null || browserPool.length === 0) {
    return scrapeWithHttpFallback(url);
  }
  
  try {
    // Get a browser from the pool
    browserInfo = await acquireBrowser();
    const { browser, index } = browserInfo;
    
    logStep("SCRAPE", `Using browser ${index+1} to navigate to ${url}`);
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await page.goto(url, { 
      waitUntil: "domcontentloaded",
      timeout: SCRAPE_TIMEOUT 
    });
    
    const pageContent = await page.evaluate(() => {
      return document.querySelector('article')?.innerText || document.body.innerText;
    });
    
    await context.close();
    return pageContent;
  } catch (error) {
    logError(`Playwright scraping failed: ${error.message}`, error);
    
    // Fallback to HTTP request
    return scrapeWithHttpFallback(url);
  } finally {
    // Release the browser back to the pool
    if (browserInfo) {
      releaseBrowser(browserInfo.index);
    }
  }
}

// Extract HTTP fallback to separate function for better reusability
async function scrapeWithHttpFallback(url) {
  const axios = require('axios');
  try {
    logStep("SCRAPE", `Using HTTP fallback for ${url}`);
    const response = await axios.get(url, { 
      timeout: SCRAPE_TIMEOUT,
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
    
    return text.trim();
  } catch (httpError) {
    logError(`HTTP fallback request failed: ${httpError.message}`, httpError);
    throw new Error(`Failed to scrape with fallback: ${httpError.message}`);
  }
}

// Clean up on process exit
process.on('exit', shutdownBrowserPool);
process.on('SIGINT', async () => {
  await shutdownBrowserPool();
  process.exit(0);
});

module.exports = { 
  scrapeWithPlaywright,
  initBrowserPool,
  shutdownBrowserPool
}; 