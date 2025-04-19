const { chromium } = require("playwright");
const { logStep, logError } = require('../utils/logger');
const { SCRAPE_TIMEOUT, BROWSER_TIMEOUT } = require('../utils/config');
const { findRelevantUrl } = require('../services/urlFinder');
const { scrapeWithPlaywright } = require('../services/playwrightScraper');
const { enhanceContent } = require('../services/contentEnhancer');

/**
 * Enhanced tweet processing using browser connection pool and batched processing
 * @param {Array} tweets Array of tweets to process
 * @param {string} custom_instruction Custom instructions for enhancement
 * @returns {Array} Enhanced tweets with research data
 */
async function handlePlaywrightEnhancement(tweets, custom_instruction) {
  console.time('Total Enhancement Process');
  logStep("START", `Processing ${tweets.length} tweets in parallel`);
  
  try {
    // Process all tweets in parallel
    const enhancementPromises = tweets.map(async (tweet, index) => {
      console.time(`Tweet ${index + 1} Processing`);
      try {
        logStep("PROCESS", `Starting Tweet ${index + 1}/${tweets.length}: ${tweet.Content.substring(0, 50)}...`);
        
        // Step 1: Find relevant URL
        console.time(`Tweet ${index + 1} URL Finding`);
        const { query, researchUrl } = await findRelevantUrl(tweet.Content);
        console.timeEnd(`Tweet ${index + 1} URL Finding`);
        logStep("URL", `Tweet ${index + 1}: Found URL: ${researchUrl}`);
        
        // Step 2: Scrape content
        console.time(`Tweet ${index + 1} Scraping`);
        const pageContent = await scrapeWithPlaywright(researchUrl);
        console.timeEnd(`Tweet ${index + 1} Scraping`);
        logStep("SCRAPE", `Tweet ${index + 1}: Scraped ${pageContent.length} characters`);
        
        // Step 3: Enhance content
        console.time(`Tweet ${index + 1} Enhancement`);
        const enhancedContent = await enhanceContent(tweet, pageContent, researchUrl, custom_instruction);
        console.timeEnd(`Tweet ${index + 1} Enhancement`);
        logStep("ENHANCE", `Tweet ${index + 1}: Enhancement complete`);
        
        console.timeEnd(`Tweet ${index + 1} Processing`);
        
        return {
          original_tweet: tweet,
          research: {
            generated_query: query,
            source_url: researchUrl,
            page_content_length: pageContent.length
          },
          enhanced_version: enhancedContent,
          metadata: {
            processed_at: new Date().toISOString(),
            model: "Llama-4-Maverick",
            processing_time_ms: performance.now() // Add processing time
          }
        };
      } catch (error) {
        console.timeEnd(`Tweet ${index + 1} Processing`);
        logError(`Tweet ${index + 1} processing failed: ${error.message}`, error);
        
        return {
          original_tweet: tweet,
          error: "Processing failed",
          details: error.message,
          metadata: {
            processed_at: new Date().toISOString()
          }
        };
      }
    });
    
    // Wait for all enhancement processes to complete
    const results = await Promise.all(enhancementPromises);
    
    // Calculate stats
    const successCount = results.filter(r => !r.error).length;
    const errorCount = results.filter(r => r.error).length;
    
    console.timeEnd('Total Enhancement Process');
    logStep("COMPLETE", `Processed ${tweets.length} tweets - Success: ${successCount}, Errors: ${errorCount}`);
    
    return results;
  } catch (error) {
    console.timeEnd('Total Enhancement Process');
    logError("Critical error in parallel processing", error);
    throw error;
  }
}

module.exports = { handlePlaywrightEnhancement }; 