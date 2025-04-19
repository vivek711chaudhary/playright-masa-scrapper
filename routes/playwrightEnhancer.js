const { logStep, logError } = require('../utils/logger');
const { findRelevantUrl } = require('../services/urlFinder');
const { scrapeWithPlaywright } = require('../services/playwrightScraper');
const { enhanceContent } = require('../services/contentEnhancer');

async function handlePlaywrightEnhancement(tweets, custom_instruction) {
  const enhancedTweets = [];
  
  for (const [index, tweet] of tweets.entries()) {
    try {
      logStep("PROCESS", `Tweet ${index + 1}/${tweets.length}: ${tweet.Content.substring(0, 50)}...`);
      
      // Find relevant URL
      const { query, researchUrl } = await findRelevantUrl(tweet.Content);
      
      // Scrape content
      const pageContent = await scrapeWithPlaywright(researchUrl);
      
      // Enhance content
      const enhancedContent = await enhanceContent(tweet, pageContent, researchUrl, custom_instruction);
      
      enhancedTweets.push({
        original_tweet: tweet,
        research: {
          generated_query: query,
          source_url: researchUrl,
          page_content_length: pageContent.length
        },
        enhanced_version: enhancedContent,
        metadata: {
          processed_at: new Date().toISOString(),
          model: "Llama-4-Maverick"
        }
      });
      
    } catch (error) {
      logError("Tweet processing failed", error);
      enhancedTweets.push({
        original_tweet: tweet,
        error: "Processing failed",
        details: error.message
      });
    }
  }
  
  return enhancedTweets;
}

module.exports = { handlePlaywrightEnhancement }; 