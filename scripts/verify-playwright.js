#!/usr/bin/env node
const fs = require('fs');
const { execSync } = require('child_process');
const { logger } = require('../utils/logger');
const { exec } = require('child_process');
const path = require('path');
const { chromium } = require('playwright');

logger.info('Verifying Playwright installation...');

// Check environment
console.log('Current environment:');
console.log('- Node version:', process.version);
console.log('- Platform:', process.platform);
console.log('- Architecture:', process.arch);
console.log('- Running in Docker:', process.env.DOCKER_CONTAINER === 'true' ? 'Yes' : 'No');

// Check for browser paths in multiple locations
const possiblePaths = [
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  '/ms-playwright/chromium-1169/chrome-linux/chrome',
  '/root/.cache/ms-playwright/chromium-1169/chrome-linux/chrome'
];

// Try to find additional paths
try {
  const cacheDirs = ['/root/.cache', '/home/node/.cache', '/app/.cache'];
  for (const dir of cacheDirs) {
    if (fs.existsSync(dir)) {
      console.log(`Searching for browsers in ${dir}...`);
      const foundBrowsers = execSync(`find ${dir} -name chrome -type f -executable 2>/dev/null || echo ""`).toString().trim();
      if (foundBrowsers) {
        foundBrowsers.split('\n').forEach(browser => {
          if (browser && !possiblePaths.includes(browser)) {
            console.log(`Found additional browser path: ${browser}`);
            possiblePaths.push(browser);
          }
        });
      }
    }
  }
} catch (err) {
  console.warn('Error searching for additional browser paths:', err.message);
}

// Check all possible browser paths
let foundExecutablePath = null;
for (const execPath of possiblePaths) {
  if (execPath && fs.existsSync(execPath)) {
    console.log(`✅ Browser executable found at: ${execPath}`);
    foundExecutablePath = execPath;
    break;
  } else if (execPath) {
    console.warn(`⚠️ Browser executable not found at: ${execPath}`);
  }
}

if (foundExecutablePath) {
  console.log(`Using browser at: ${foundExecutablePath}`);
  // Set environment variable for other processes
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH = foundExecutablePath;
} else {
  console.warn('No browser executable found in the expected locations');
  console.log('Will try to use default Playwright installation');
}

// Check Playwright version
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
const playwrightVersion = packageJson.dependencies.playwright;
console.log('- Playwright version from package.json:', playwrightVersion);

// Try to get the installed version
try {
  const installedVersion = execSync('npx playwright --version').toString().trim();
  console.log('- Installed Playwright CLI version:', installedVersion);
} catch (err) {
  console.warn('- Failed to get installed Playwright version:', err.message);
}

// Check for browsers
console.log('\nChecking Playwright browsers:');
try {
  const browsers = execSync('ls -la /ms-playwright/ 2>/dev/null || echo "No browsers found in /ms-playwright"').toString().trim();
  console.log(browsers);
} catch (err) {
  console.warn('Failed to check browsers:', err.message);
}

// Try to install browsers if needed
if (process.env.INSTALL_BROWSERS === 'true') {
  console.log('\nAttempting to install Playwright browsers...');
  try {
    execSync('npx playwright install chromium', { stdio: 'inherit' });
    console.log('Successfully installed Chromium');
  } catch (err) {
    console.error('Failed to install browsers:', err.message);
  }
}

async function verifyPlaywright() {
  let browser = null;
  try {
    console.log('Attempting to launch browser...');
    
    const launchOptions = {
      headless: true
    };
    
    if (foundExecutablePath) {
      launchOptions.executablePath = foundExecutablePath;
      console.log(`Using executable path: ${foundExecutablePath}`);
    }
    
    if (process.env.PLAYWRIGHT_CHROMIUM_CHANNEL) {
      launchOptions.channel = process.env.PLAYWRIGHT_CHROMIUM_CHANNEL;
    }
    
    browser = await chromium.launch(launchOptions);
    
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('about:blank');
    
    console.log('✅ Playwright browser launched successfully!');
    
    // Get browser version
    const version = await browser.version();
    console.log(`Browser version: ${version}`);
    
    await browser.close();
    console.log('Browser closed');
    
    return true;
  } catch (error) {
    console.error('❌ Playwright verification failed:');
    console.error(error.message);
    
    if (browser) {
      await browser.close();
    }
    
    // Instead of exiting, we'll warn but continue
    console.log('⚠️ WARNING: Continuing startup despite Playwright verification failure.');
    console.log('The application will use HTTP fallback when attempting to scrape content.');
    
    return false;
  }
}

// Run verification
verifyPlaywright()
  .then(success => {
    if (success) {
      console.log('✅ Playwright verification completed successfully.');
    } else {
      console.log('⚠️ Playwright verification failed but continuing startup.');
    }
  })
  .catch(err => {
    console.error('❌ Unexpected error during verification:', err);
    console.log('⚠️ Continuing with startup despite errors.');
  });

logger.info('Playwright verification completed');