require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { logger, logStep } = require('./utils/logger');
const config = require('./utils/config');
const { handlePlaywrightEnhancement } = require('./routes/playwrightEnhancer');
const { handleMasaEnhancement } = require('./routes/masaEnhancer');
const topicRoutes = require('./routes/topicRoutes');
const { initBrowserPool } = require('./services/playwrightScraper');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(cors());

// Only use Morgan HTTP logging if HTTP_LOGGING is enabled
if (process.env.HTTP_LOGGING === 'true') {
  app.use(morgan('combined', { stream: logger.stream }));
}

// Routes
app.use('/api', topicRoutes);

// Playwright-based enhancement endpoint
app.post('/enhance-tweets-playwright', async (req, res) => {
  const { tweets, custom_instruction } = req.body;
  const startTime = Date.now();

  if (!tweets || !Array.isArray(tweets)) {
    return res.status(400).json({ error: "Expected array of tweets in request body" });
  }

  logStep("START", `Processing ${tweets.length} tweets with Playwright`);
  
  try {
    // Process tweets in parallel
    const enhancedTweets = await handlePlaywrightEnhancement(tweets, custom_instruction);
    
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    const avgTimePerTweet = processingTime / tweets.length;
    
    logStep("COMPLETE", `Successfully processed ${enhancedTweets.length} tweets in ${processingTime}ms (avg: ${avgTimePerTweet.toFixed(2)}ms per tweet)`);
    
    res.json({ 
      success: true,
      count: enhancedTweets.length,
      performance: {
        total_time_ms: processingTime,
        avg_time_per_tweet_ms: avgTimePerTweet,
        tweets_per_second: (tweets.length / (processingTime / 1000)).toFixed(2)
      },
      results: enhancedTweets 
    });
  } catch (error) {
    logger.error("Fatal error", error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// MASA-based enhancement endpoint
app.post('/enhance-tweets-masa', async (req, res) => {
  const { tweets, custom_instruction } = req.body;

  if (!tweets || !Array.isArray(tweets)) {
    return res.status(400).json({ error: "Expected array of tweets in request body" });
  }

  logStep("START", `Processing ${tweets.length} tweets with MASA`);
  
  try {
    const enhancedTweets = await handleMasaEnhancement(tweets, custom_instruction);
    
    logStep("COMPLETE", `Successfully processed ${enhancedTweets.length} tweets`);
    
    res.json({ 
      success: true,
      count: enhancedTweets.length,
      results: enhancedTweets 
    });
  } catch (error) {
    logger.error("Fatal error", error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Add this to your server.js
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 'default'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error' 
  });
});

// Use PORT environment variable (for Cloud Run) with fallback to config.port or 3000
const PORT = process.env.PORT || config.port || 3000;
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server listening on all interfaces at port ${PORT}`);
  
  // Pre-initialize the browser pool
  initBrowserPool()
    .then(() => logger.info('Browser pool initialized successfully'))
    .catch(err => {
      logger.error('Failed to initialize browser pool', err);
      logger.info('Server will continue to run and use HTTP fallback for scraping');
    });
}); 