const axios = require('axios');
const { logStep } = require('../utils/logger');
const { MASA_API_KEY } = require('../utils/config');

async function scrapeWithMasa(url) {
  logStep("SCRAPE", `Scraping ${url} with MASA API...`);
  
  try {
    console.log("Url is this : ",url)
    const response = await axios.post(
      'https://data.dev.masalabs.ai/api/v1/search/live/web/scrape',
      { 
        url,
        format: "text"
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      }
    );

    logStep("SCRAPE", `Successfully scraped ${response.data.content.length} characters`);
    
    return {
      content: response.data.content,
      metadata: response.data.metadata
    };
  } catch (error) {
    logStep("ERROR", `Failed to scrape ${url}: ${error.message}`);
    throw new Error(`MASA scraping failed: ${error.message}`);
  }
}

// Additional utility function for extracting search terms
async function extractSearchTerm(tweetContent) {
  logStep("EXTRACT", `Extracting search term from tweet...`);
  
  try {
    const response = await axios.post(
      'https://data.dev.masalabs.ai/api/v1/search/extraction',
      { userInput: tweetContent },
      {
        headers: {
          'Authorization': `Bearer ${MASA_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    logStep("EXTRACT", `Successfully extracted search term: ${response.data.searchTerm}`);
    return response.data.searchTerm;
  } catch (error) {
    logStep("ERROR", `Failed to extract search term: ${error.message}`);
    throw new Error(`Search term extraction failed: ${error.message}`);
  }
}

module.exports = { 
  scrapeWithMasa,
  extractSearchTerm
};