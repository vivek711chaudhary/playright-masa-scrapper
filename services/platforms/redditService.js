const axios = require('axios');
const { logger, logStep } = require('../../utils/logger');
const config = require('../../utils/config');

class RedditService {
  constructor() {
    this.baseUrl = 'https://www.reddit.com';
    this.clientId = config.reddit?.clientId;
    this.clientSecret = config.reddit?.clientSecret;
    this.accessToken = null;
    this.tokenExpiry = null;
    
    // Log API credentials status at startup
    if (this.clientId && this.clientSecret) {
      logger.info('[REDDIT] API credentials are configured');
    } else {
      logger.warn('[REDDIT] API credentials are not configured');
    }
  }

  async searchTopic(topic, options = {}) {
    const { timeframe = '24h', limit = 10 } = options;
    
    logStep('REDDIT', `Searching for topic: ${topic}`);
    
    try {
      // Use the public JSON API endpoint
      const response = await axios.get(`${this.baseUrl}/search.json`, {
        params: {
          q: topic,
          t: this.getTimeParam(timeframe),
          limit: limit,
          sort: 'relevance',
          include_over_18: 'off'
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MyApp/1.0; +https://mywebsite.com)'
        },
        timeout: 10000
      });
      
      // Make sure we have children in the response
      if (!response.data.data || !response.data.data.children) {
        logger.warn('[REDDIT] Unexpected response structure', {
          keys: Object.keys(response.data)
        });
        return [];
      }
      
      const posts = response.data.data.children;
      logStep('REDDIT', `Retrieved ${posts.length} items`);
      
      // Return the data property of each post for normalization
      return posts.map(post => {
        // Debug any structure issues
        if (!post.data || !post.data.id) {
          logger.warn('[REDDIT] Post has invalid structure', {
            postKeys: Object.keys(post)
          });
        }
        return post.data;
      }).filter(data => data && data.id);
    } catch (error) {
      logger.error('[ERROR] Reddit search failed:', {
        error: error.message,
        status: error.response?.status
      });
      
      if (error.response?.status === 403) {
        logger.error('[REDDIT] Access forbidden - User-Agent may be blocked');
      } else if (error.response?.status === 429) {
        logger.error('[REDDIT] Rate limit exceeded');
      }
      
      return [];
    }
  }

  getTimeParam(timeframe) {
    switch(timeframe) {
      case '1h':
      case '6h':
      case '12h':
      case '24h':
        return 'day';
      case '7d':
        return 'week';
      case '30d':
        return 'month';
      default:
        return 'day';
    }
  }
}

module.exports = new RedditService(); 