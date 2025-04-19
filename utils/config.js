require('dotenv').config();

// Twitter API v2 keys
const TWITTER = {
  consumer_key: process.env.TWITTER_API_KEY,
  consumer_secret: process.env.TWITTER_API_SECRET,
  access_token: process.env.TWITTER_ACCESS_TOKEN,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
  bearer_token: process.env.TWITTER_BEARER_TOKEN
};

// Reddit OAuth keys
const REDDIT = {
  client_id: process.env.REDDIT_CLIENT_ID,
  client_secret: process.env.REDDIT_CLIENT_SECRET,
  username: process.env.REDDIT_USERNAME,
  password: process.env.REDDIT_PASSWORD
};

const config = {
  // Server configuration
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // API Keys
  togetherApiKey: process.env.TOGETHER_API_KEY,
  openAiApiKey: process.env.OPENAI_API_KEY,
  MASA_API_KEY: process.env.MASA_API_KEY,
  
  // Twitter API configuration
  twitter: {
    apiKey: process.env.TWITTER_API_KEY,
    apiSecret: process.env.TWITTER_API_SECRET,
    bearerToken: process.env.TWITTER_BEARER_TOKEN,
    rateLimit: {
      search: {
        requestsPerWindow: 180,  // Twitter v2 API allows 180 requests per 15-min window for app auth
        windowMs: 15 * 60 * 1000 // 15 minutes in milliseconds
      }
    }
  },
  
  // Reddit API configuration
  reddit: {
    clientId: process.env.REDDIT_CLIENT_ID,
    clientSecret: process.env.REDDIT_CLIENT_SECRET,
    username: process.env.REDDIT_USERNAME,
    password: process.env.REDDIT_PASSWORD
  },
  
  // News API configuration
  news: {
    apiKey: process.env.NEWS_API_KEY
  },
  
  // Rate limiting for our API
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: 100
  },
  
  // Cache settings
  cache: {
    ttl: 60 * 60 // 1 hour
  },

  // Scraping timeouts
  SCRAPE_TIMEOUT: 20000, // 20 seconds for page loading
  BROWSER_TIMEOUT: 60000  // 60 seconds for browser operations
};

module.exports = config;