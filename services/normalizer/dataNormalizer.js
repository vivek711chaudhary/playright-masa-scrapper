const { logger, logStep } = require('../../utils/logger');

class DataNormalizer {
  normalizeTwitterData(tweet) {
    try {
      if (!tweet || !tweet.id) {
        return null;
      }
      
      return {
        id: tweet.id,
        platform: 'twitter',
        content: tweet.text,
        timestamp: tweet.created_at,
        source_url: `https://twitter.com/i/web/status/${tweet.id}`,
        author: {
          id: tweet.user?.id,
          name: tweet.user?.name,
          username: tweet.user?.username,
          profile_url: tweet.user?.profile_image_url
        },
        engagement: {
          likes: tweet.public_metrics?.like_count || 0,
          shares: tweet.public_metrics?.retweet_count || 0,
          comments: tweet.public_metrics?.reply_count || 0
        }
      };
    } catch (error) {
      logger.error('[ERROR] Failed to normalize Twitter data:', error.message);
      return null;
    }
  }

  normalizeRedditData(post) {
    try {
      // Debug the structure of the post to see what's available
      if (!post) {
        logger.warn('[REDDIT] Post is undefined');
        return null;
      }
      
      // Check if we're dealing with the correct structure
      if (!post.id) {
        logger.warn('[REDDIT] Post structure is invalid, missing id', { 
          keys: Object.keys(post) 
        });
        
        // Try to adapt to different possible structures
        // For public API, the structure might be different
        if (post.data && post.data.id) {
          post = post.data;
        } else {
          return null;
        }
      }
      
      return {
        id: post.id,
        platform: 'reddit',
        content: post.title,
        full_content: post.selftext || '',
        timestamp: new Date(post.created_utc * 1000).toISOString(),
        source_url: `https://www.reddit.com${post.permalink}`,
        author: {
          id: post.author,
          name: post.author,
          username: post.author,
          profile_url: `https://www.reddit.com/user/${post.author}`
        },
        engagement: {
          likes: post.ups || 0,
          shares: 0, // Reddit doesn't have shares
          comments: post.num_comments || 0
        }
      };
    } catch (error) {
      logger.error('[ERROR] Failed to normalize Reddit data:', error.message);
      return null;
    }
  }

  normalizeNewsData(article) {
    try {
      if (!article || !article.url) {
        return null;
      }
      
      // Generate a unique ID from URL if none provided
      const id = article.id || Buffer.from(article.url).toString('base64');
      
      // Log the input article to debug
      logger.info(`[NORMALIZE NEWS] Processing article: ${article.title}`);
      
      // Check if we have engagement data from newsService
      if (article.engagement) {
        logger.info(`[NORMALIZE NEWS] Found engagement data: ${JSON.stringify(article.engagement)}`);
      } else {
        logger.warn(`[NORMALIZE NEWS] No engagement data found for article: ${article.title}`);
      }
      
      // Use the engagement metrics if they exist (added by newsService)
      // Or default to empty metrics if not available
      const engagement = article.engagement || {
        likes: 0,
        shares: 0,
        comments: 0
      };
      
      // Make sure we have numeric values
      const normalizedEngagement = {
        likes: Number(engagement.likes) || 0,
        shares: Number(engagement.shares) || 0,
        comments: Number(engagement.comments) || 0,
        total: Number(engagement.total) || 0,
        freshness_score: Number(engagement.freshness_score) || 0,
        calculated: Boolean(engagement.calculated) || false
      };
      
      // Log the normalized engagement metrics
      logger.info(`[NORMALIZE NEWS] Normalized engagement: ${JSON.stringify(normalizedEngagement)}`);
      
      const result = {
        id: id,
        platform: 'news',
        content: article.title,
        full_content: article.description || '',
        timestamp: article.publishedAt || new Date().toISOString(),
        source_url: article.url,
        author: {
          id: article.source?.id || 'unknown',
          name: article.source?.name || 'Unknown Source',
          username: article.author || 'Unknown Author',
          profile_url: article.source?.url || ''
        },
        engagement: normalizedEngagement,
        // Store additional metadata about how engagement was calculated
        engagement_metadata: {
          calculated: normalizedEngagement.calculated,
          freshness_score: normalizedEngagement.freshness_score
        }
      };
      
      // Log the final result
      logger.info(`[NORMALIZE NEWS] Normalized result for ${result.content.substring(0, 30)}...`);
      
      return result;
    } catch (error) {
      logger.error('[ERROR] Failed to normalize News data:', error.message);
      return null;
    }
  }
}

module.exports = new DataNormalizer(); 