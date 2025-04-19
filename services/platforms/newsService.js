const axios = require('axios');
const { logger, logStep } = require('../../utils/logger');
const config = require('../../utils/config');

class NewsService {
  constructor() {
    this.baseUrl = 'https://newsapi.org/v2';
    this.apiKey = config.news?.apiKey;
    
    // Log API key status at startup (don't log the actual key)
    if (this.apiKey) {
      logger.info('[NEWS] API key is configured');
    } else {
      logger.warn('[NEWS] API key is not configured');
    }
  }

  async searchTopic(topic, options = {}) {
    const { timeframe = '24h', limit = 10 } = options;
    
    logStep('NEWS', `Searching for topic: ${topic}`);
    
    // Check if API key is available
    if (!this.apiKey) {
      logger.warn('[NEWS] Missing API key in config');
      return [];
    }
    
    try {
      // Calculate the from date based on timeframe
      const fromDate = this.getFromDate(timeframe);
      
      const response = await axios.get(`${this.baseUrl}/everything`, {
        params: {
          q: topic,
          from: fromDate,
          sortBy: 'relevancy',
          pageSize: limit,
          language: 'en',
          apiKey: this.apiKey
        },
        // Add timeout
        timeout: 10000
      });
      
      const articles = response.data.articles || [];
      logStep('NEWS', `Found ${articles.length} articles`);
      
      // Calculate engagement metrics for each article
      const articlesWithEngagement = articles.map((article, index) => {
        // Add engagement metrics based on freshness and other criteria
        const engagementMetrics = this.calculateNewsEngagement(article, index);
        
        // Log each article's engagement calculation
        logger.info(`[NEWS] Article ${index + 1} engagement: ${JSON.stringify({
          title: article.title.substring(0, 30) + '...',
          publishedAt: article.publishedAt,
          source: article.source?.name,
          metrics: engagementMetrics
        })}`);
        
        return {
          ...article,
          engagement: engagementMetrics
        };
      });

      // Log a sample of the processed articles (not the entire array)
      if (articlesWithEngagement.length > 0) {
        logger.info(`[NEWS] Sample processed article: ${JSON.stringify({
          title: articlesWithEngagement[0].title,
          engagement: articlesWithEngagement[0].engagement
        })}`);
      }
      
      return articlesWithEngagement;
    } catch (error) {
      logger.error('[ERROR] News search failed:', {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      
      // Check for specific error types
      if (error.response?.status === 401) {
        logger.error('[NEWS] Invalid API key or unauthorized access');
      } else if (error.response?.status === 429) {
        logger.error('[NEWS] Rate limit exceeded');
      }
      
      return [];
    }
  }

  calculateNewsEngagement(article, index) {
    // Base engagement score
    let baseScore = 10;
    
    // Factor 1: Freshness - more recent articles get higher scores
    // Maximum bonus: 50 points for articles published within the last hour
    const publishedAt = new Date(article.publishedAt);
    const now = new Date();
    const hoursOld = (now - publishedAt) / (1000 * 60 * 60);
    
    // Log input data for debugging
    logger.info(`[NEWS] Calculating score for article ${index + 1}: "${article.title.substring(0, 30)}..."`);
    logger.info(`[NEWS] Published: ${publishedAt}, Current: ${now}, Hours old: ${hoursOld.toFixed(2)}`);
    
    let freshnessScore = 0;
    if (hoursOld <= 1) {
      freshnessScore = 50;
    } else if (hoursOld <= 6) {
      freshnessScore = 40;
    } else if (hoursOld <= 12) {
      freshnessScore = 30;
    } else if (hoursOld <= 24) {
      freshnessScore = 20;
    } else if (hoursOld <= 48) {
      freshnessScore = 10;
    } else {
      freshnessScore = 5;
    }
    
    // Factor 2: Content length (if available) - longer articles might be more substantial
    // Maximum bonus: 15 points
    let contentScore = 0;
    if (article.content) {
      const contentLength = article.content.length;
      contentScore = Math.min(15, Math.floor(contentLength / 500));
      logger.info(`[NEWS] Content length: ${contentLength}, Content score: ${contentScore}`);
    }
    
    // Factor 3: Source reputation (could be expanded with a reputation database)
    // For now, just give a bonus to known sources
    let sourceScore = 0;
    const majorSources = ['bbc-news', 'the-washington-post', 'the-wall-street-journal', 
                         'the-new-york-times', 'bloomberg', 'techcrunch', 'wired', 
                         'cnn', 'reuters', 'associated-press', 'business-insider'];
    
    if (article.source && majorSources.includes(article.source.id)) {
      sourceScore = 15;
      logger.info(`[NEWS] Major source detected: ${article.source.id}, Source score: ${sourceScore}`);
    } else {
      logger.info(`[NEWS] Source not in major list: ${article.source?.id || 'unknown'}`);
    }
    
    // Add a small random factor to ensure variety (1-5 points)
    const randomFactor = Math.floor(Math.random() * 5) + 1;
    
    // Calculate the total engagement score
    const totalScore = baseScore + freshnessScore + contentScore + sourceScore + randomFactor;
    
    // Convert to a format similar to social media engagement metrics
    // Map the score to appropriate like/share/comment values for consistency
    const likesValue = Math.floor(totalScore * 1.5);
    const sharesValue = Math.floor(totalScore / 3);
    const commentsValue = Math.floor(totalScore / 2);
    
    // Log detailed calculation
    logger.info(`[NEWS] Score calculation: baseScore(${baseScore}) + freshness(${freshnessScore}) + content(${contentScore}) + source(${sourceScore}) + random(${randomFactor}) = ${totalScore}`);
    logger.info(`[NEWS] Engagement metrics: likes=${likesValue}, shares=${sharesValue}, comments=${commentsValue}`);
    
    return {
      likes: likesValue,
      shares: sharesValue,
      comments: commentsValue,
      total: likesValue + sharesValue + commentsValue,
      freshness_score: freshnessScore,
      calculated: true
    };
  }

  getFromDate(timeframe) {
    const now = new Date();
    let fromDate;
    
    switch(timeframe) {
      case '1h':
        fromDate = new Date(now.getTime() - 1 * 60 * 60 * 1000);
        break;
      case '6h':
        fromDate = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        break;
      case '12h':
        fromDate = new Date(now.getTime() - 12 * 60 * 60 * 1000);
        break;
      case '24h':
        fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
    
    // Format to YYYY-MM-DD
    return fromDate.toISOString().split('T')[0];
  }
}

module.exports = new NewsService();
