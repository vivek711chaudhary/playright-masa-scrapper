const axios = require('axios');
const { logger, logStep } = require('../../utils/logger');
const config = require('../../utils/config');

class TwitterService {
  constructor() {
    this.baseUrl = 'https://api.twitter.com/2';
    this.bearerToken = config.twitter?.bearerToken;
    this.rateLimit = {
      remaining: 180,
      resetTime: Date.now() + 15 * 60 * 1000
    };
    
    // Log API key status at startup
    if (this.bearerToken) {
      logger.info('[TWITTER] Bearer token is configured');
    } else {
      logger.warn('[TWITTER] Bearer token is not configured');
    }
  }

  async searchTopic(topic, options = {}) {
    const { timeframe = '24h', limit = 10 } = options;
    
    // Check if bearer token is available
    if (!this.bearerToken) {
      logger.warn('[TWITTER] Missing bearer token in config');
      return {
        results: [],
        rateLimited: false,
        error: 'Missing bearer token'
      };
    }
    
    // Check if we're currently rate limited, but try anyway
    let isRateLimited = false;
    let resetTimeInfo = null;
    
    if (this.rateLimit.remaining <= 0) {
      const waitTime = Math.ceil((this.rateLimit.resetTime - Date.now()) / 1000);
      if (waitTime > 0) {
        isRateLimited = true;
        resetTimeInfo = new Date(this.rateLimit.resetTime).toISOString();
        logStep('TWITTER', `Potentially rate limited. Trying anyway. Reset at ${resetTimeInfo}`);
      } else {
        // Reset has occurred
        this.rateLimit.remaining = 180;
        this.rateLimit.resetTime = Date.now() + 15 * 60 * 1000;
      }
    }

    logStep('TWITTER', `Searching for topic: ${topic}`);
    
    try {
      // Construct query - simpler format to avoid 400 errors
      const query = encodeURIComponent(`${topic}`);
      
      const response = await axios.get(`${this.baseUrl}/tweets/search/recent`, {
        headers: {
          'Authorization': `Bearer ${this.bearerToken}`
        },
        params: {
          'query': query,
          'max_results': limit,
          'tweet.fields': 'created_at,public_metrics,author_id',
          'expansions': 'author_id',
          'user.fields': 'name,username,profile_image_url'
        },
        timeout: 15000 // Extended timeout
      });
      
      // Update rate limit info from headers
      if (response.headers['x-rate-limit-remaining']) {
        this.rateLimit.remaining = parseInt(response.headers['x-rate-limit-remaining']);
        logger.info(`[TWITTER] Rate limit remaining: ${this.rateLimit.remaining}`);
      }
      
      if (response.headers['x-rate-limit-reset']) {
        const resetTime = parseInt(response.headers['x-rate-limit-reset']) * 1000;
        this.rateLimit.resetTime = resetTime;
        logger.info(`[TWITTER] Rate limit resets at: ${new Date(resetTime).toISOString()}`);
      }

      const tweets = response.data.data || [];
      const users = response.data.includes?.users || [];

      logStep('TWITTER', `Found ${tweets} real tweets`);
      logStep('TWITTER', `Found ${users} real users`);
      
      // Map users by their ID for quick lookup
      const userMap = {};
      users.forEach(user => {
        userMap[user.id] = user;
      });
      
      logStep('TWITTER', `Found  real users ${userMap}`);
      // Enhance tweets with user data
      const enhancedTweets = tweets.map(tweet => {
        const user = userMap[tweet.author_id] || {};
        return {
          ...tweet,
          user
        };
      });

      logStep('TWITTER', `Found ${enhancedTweets} real tweets`);
      
      logStep('TWITTER', `Found ${enhancedTweets.length} tweets`);
      return {
        results: enhancedTweets, 
        rateLimited: false,
        resetTime: this.rateLimit.resetTime,
        remaining: this.rateLimit.remaining
      };
    } catch (error) {
      // Check if it's a rate limit error
      if (error.response && error.response.status === 429) {
        const resetTimeHeader = error.response.headers['x-rate-limit-reset'];
        if (resetTimeHeader) {
          const resetTime = parseInt(resetTimeHeader) * 1000;
          this.rateLimit.resetTime = resetTime;
        } else {
          this.rateLimit.resetTime = Date.now() + 15 * 60 * 1000;
        }
        this.rateLimit.remaining = 0;
        
        const resetTimeStr = new Date(this.rateLimit.resetTime).toISOString();
        logger.warn(`[TWITTER] Rate limited. Reset at ${resetTimeStr}`);
        
        return {
          results: [],
          rateLimited: true,
          resetTime: this.rateLimit.resetTime,
          error: 'Rate limit exceeded'
        };
      } else if (error.response && error.response.status === 400) {
        // Log detailed error for debugging the 400 error
        logger.error('[TWITTER] Bad request error', {
          status: error.response.status,
          data: error.response.data,
          query: topic
        });
        
        return {
          results: [],
          rateLimited: false,
          error: 'Bad request: ' + (error.response.data.errors ? 
                error.response.data.errors[0].message : 'Unknown error')
        };
      }
      
      logger.error('[TWITTER] Search error', {
        error: error.message,
        status: error.response?.status
      });
      
      return {
        results: [],
        rateLimited: isRateLimited,
        resetTime: isRateLimited ? this.rateLimit.resetTime : null,
        error: error.message
      };
    }
  }

  getTimeQuery(timeframe) {
    // Current time
    const now = new Date();
    
    // Calculate the start time based on the timeframe
    let startTime;
    
    switch (timeframe) {
      case '1h':
        startTime = new Date(now.getTime() - 1 * 60 * 60 * 1000);
        break;
      case '6h':
        startTime = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        break;
      case '12h':
        startTime = new Date(now.getTime() - 12 * 60 * 60 * 1000);
        break;
      case '24h':
      case '1d':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
    
    // Format to ISO string and trim to the format Twitter expects
    return startTime.toISOString().split('.')[0] + 'Z';
  }
}

module.exports = new TwitterService(); 