require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { logger, logStep } = require('./utils/logger');
const config = require('./utils/config');
const { handlePlaywrightEnhancement } = require('./routes/playwrightEnhancer');
const { handleMasaEnhancement } = require('./routes/masaEnhancer');
const topicRoutes = require('./routes/topicRoutes');

const app = express();
app.use(express.json());
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

  if (!tweets || !Array.isArray(tweets)) {
    return res.status(400).json({ error: "Expected array of tweets in request body" });
  }

  logStep("START", `Processing ${tweets.length} tweets with Playwright`);
  
  try {
    const enhancedTweets = await handlePlaywrightEnhancement(tweets, custom_instruction);
    
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
    timestamp: new Date().toISOString()
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

// Start server with a fixed port if config.port is undefined
const PORT = config.port || 3000;
app.listen(PORT, () => {
  logger.info(`Server listening on port ${PORT}`);
}); 