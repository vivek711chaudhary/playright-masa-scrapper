require('dotenv').config(); 
const express = require('express');
const Together = require("together-ai");
const { chromium } = require("playwright");

const app = express();
app.use(express.json());

// Initialize Together AI
const together = new Together({ apiKey: process.env.TOGETHER_API_KEY });

// Color codes for console logs
const colors = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  red: "\x1b[31m"
};

function logStep(step, message) {
  console.log(`${colors.cyan}[${step}]${colors.reset} ${message}`);
}

function logError(message, error) {
  console.error(`${colors.red}[ERROR]${colors.reset} ${message}`, error);
}

// Add timeout configuration
const API_TIMEOUT = 30000; // 30 seconds for API calls
const SCRAPE_TIMEOUT = 15000; // 15 seconds for scraping

// Enhanced Processing Endpoint
app.post('/enhance-tweets', async (req, res) => {
  const { tweets, custom_instruction } = req.body;

  if (!tweets || !Array.isArray(tweets)) {
    return res.status(400).json({ error: "Expected array of tweets in request body" });
  }

  logStep("START", `Processing ${tweets.length} tweets`);

  try {
    const browser = await chromium.launch({ 
      headless: true,
      timeout: 60000 // 60 seconds for browser operations
    });
    const page = await browser.newPage();
    
    const enhancedTweets = [];
    
    for (const [index, tweet] of tweets.entries()) {
      try {
        logStep("PROCESS", `Tweet ${index + 1}/${tweets.length}: ${tweet.Content.substring(0, 50)}...`);

        // Step 1: Extract search query
        logStep("QUERY", "Generating search query...");
        const searchQuery = await together.chat.completions.create({
          messages: [{
            role: "system",
            content: "Create a detailed web search query from this tweet. Respond ONLY with the query:"
          }, { 
            role: "user", 
            content: tweet.Content 
          }],
          model: "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
          timeout: API_TIMEOUT
        });
        
        const query = searchQuery.choices[0].message.content;
        logStep("QUERY", `Generated query: "${query}"`);

        // Step 2: Get research URL
        logStep("URL", "Identifying research URL...");
        const urlResponse = await together.chat.completions.create({
          messages: [{
            role: "system",
            content: "Suggest ONE most relevant URL to research this. Respond ONLY with a valid URL:"
          }, { 
            role: "user", 
            content: query 
          }],
          model: "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
          temperature: 0.3,
          timeout: API_TIMEOUT
        });
        
        let researchUrl = urlResponse.choices[0].message.content;
        
        // Validate and clean URL
        if (!researchUrl.startsWith('http')) {
          researchUrl = 'https://' + researchUrl;
        }
        researchUrl = researchUrl.split(' ')[0]; // Take only the first part if multiple words
        logStep("URL", `Selected URL: ${researchUrl}`);

        // Step 3: Scrape the URL
        logStep("SCRAPE", `Navigating to ${researchUrl}...`);
        try {
          await page.goto(researchUrl, { 
            waitUntil: "domcontentloaded",
            timeout: SCRAPE_TIMEOUT 
          });
          
          const pageContent = await page.evaluate(() => {
            // Try to get article content first, fallback to body
            return document.querySelector('article')?.innerText || document.body.innerText;
          });
          logStep("SCRAPE", `Scraped ${pageContent.length} characters`);

          // Step 4: Generate enhancement with custom instruction
          logStep("ENHANCE", "Generating enhanced content...");
          const basePrompt = `Enhance this tweet with context from research. Include:
            1. Key factual insight (with source if possible)
            2. Current social sentiment about this topic
            3. Maintain the original author's tone
            4. Add relevant hashtags if applicable`;
            
          const finalPrompt = custom_instruction 
            ? `${basePrompt}\n\nAdditional Instructions: ${custom_instruction}`
            : basePrompt;

          const enhancement = await together.chat.completions.create({
            messages: [{
              role: "system",
              content: `${finalPrompt}\n\nOriginal Tweet: ${tweet.Content}`
            }, { 
              role: "user", 
              content: `Research Context from ${researchUrl}:\n${pageContent.substring(0, 5000)}` 
            }],
            model: "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
            timeout: API_TIMEOUT
          });
          
          const enhancedContent = enhancement.choices[0].message.content;
          logStep("ENHANCE", "Enhancement complete");

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

        } catch (scrapeError) {
          logError("Scraping failed", scrapeError);
          enhancedTweets.push({
            original_tweet: tweet,
            error: "Scraping failed",
            details: scrapeError.message,
            research_url: researchUrl
          });
        }

      } catch (tweetError) {
        logError("Tweet processing failed", tweetError);
        enhancedTweets.push({
          original_tweet: tweet,
          error: "Processing failed",
          details: tweetError.message
        });
      }
    }
    
    await browser.close();
    logStep("COMPLETE", `Successfully processed ${enhancedTweets.length} tweets`);
    
    res.json({ 
      success: true,
      count: enhancedTweets.length,
      results: enhancedTweets 
    });
    
  } catch (error) {
    logError("Fatal error", error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`${colors.green}[SERVER]${colors.reset} MCP API running on port ${PORT}`));