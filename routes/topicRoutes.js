const express = require('express');
const router = express.Router();
const twitterService = require('../services/platforms/twitterService');
const redditService = require('../services/platforms/redditService');
const newsService = require('../services/platforms/newsService');
const dataNormalizer = require('../services/normalizer/dataNormalizer');
const { logger, logStep } = require('../utils/logger');
const semanticSearch = require('../services/search/semanticSearch');
const { validateRequest } = require('../utils/validator');
const axios = require('axios');
const Validator = require('../utils/validator');
const config = require('../utils/config');

// At the top of the file, add a constant for the Prophet service URL
const PROPHET_SERVICE_URL = process.env.PROPHET_SERVICE_URL || 'http://34.45.252.228:8000';

router.get('/topic/:topic/latest', validateRequest, async (req, res) => {
  const { topic } = req.params;
  const { 
    timeframe = '24h', 
    limit = 10, 
    platforms = 'twitter,reddit,news' 
  } = req.query;

  logStep('TOPIC', `Fetching content for: ${topic}`);

  try {
    const enabledPlatforms = platforms.split(',');
    const results = { twitter: [], reddit: [], news: [] };
    const errors = [];
    const normalizedResults = [];
    const platformStatus = { twitter: 'success', reddit: 'success', news: 'success' };

    // Fetch data from all platforms concurrently
    await Promise.all(enabledPlatforms.map(async platform => {
      try {
        let data = [];
        switch (platform) {
          case 'twitter':
            const twitterResponse = await twitterService.searchTopic(topic, { timeframe, limit });
            if (twitterResponse.rateLimited) {
              platformStatus.twitter = 'rate_limited';
              errors.push({ 
                platform: 'twitter', 
                error: 'Rate limited', 
                resetTime: new Date(twitterResponse.resetTime).toISOString() 
              });
            } else if (twitterResponse.error) {
              platformStatus.twitter = 'error';
              errors.push({ 
                platform: 'twitter', 
                error: twitterResponse.error
              });
            } else {
              platformStatus.twitter = 'success';
            }
            results.twitter = twitterResponse.results || [];
            logStep('TWITTER', `Retrieved ${results.twitter.length} items`);
            break;
          case 'reddit':
            data = await redditService.searchTopic(topic, { timeframe, limit });
            results.reddit = data;
            logStep('REDDIT', `Retrieved ${data.length} items`);
            break;
          case 'news':
            data = await newsService.searchTopic(topic, { timeframe, limit });
            results.news = data;
            logStep('NEWS', `Retrieved ${data.length} items`);
            break;
        }
      } catch (error) {
        platformStatus[platform] = 'error';
        errors.push({ platform, error: error.message });
        logStep('ERROR', `${platform} fetch failed: ${error.message}`);
      }
    }));

    // Normalize data from each platform with better error handling
    if (results.twitter && results.twitter.length > 0) {
      try {
        const normalizedTwitter = results.twitter
          .map(tweet => {
            try {
              return dataNormalizer.normalizeTwitterData(tweet);
            } catch (error) {
              logger.error('[ERROR] Failed to normalize Twitter item:', error.message);
              return null;
            }
          })
          .filter(item => item !== null);
        normalizedResults.push(...normalizedTwitter);
      } catch (error) {
        logger.error('[ERROR] Failed to process Twitter results:', error.message);
      }
    }

    if (results.reddit && results.reddit.length > 0) {
      try {
        const normalizedReddit = results.reddit
          .map(post => {
            try {
              return dataNormalizer.normalizeRedditData(post);
            } catch (error) {
              logger.error('[ERROR] Failed to normalize Reddit item:', error.message);
              return null;
            }
          })
          .filter(item => item !== null);
        normalizedResults.push(...normalizedReddit);
      } catch (error) {
        logger.error('[ERROR] Failed to process Reddit results:', error.message);
      }
    }

    if (results.news && results.news.length > 0) {
      try {
        const normalizedNews = results.news
          .map(article => {
            try {
              return dataNormalizer.normalizeNewsData(article);
            } catch (error) {
              logger.error('[ERROR] Failed to normalize News item:', error.message);
              return null;
            }
          })
          .filter(item => item !== null);
        normalizedResults.push(...normalizedNews);
      } catch (error) {
        logger.error('[ERROR] Failed to process News results:', error.message);
      }
    }

    // Apply semantic ranking if query parameter is present
    if (req.query.q) {
      const rankedResults = await semanticSearch.rankByRelevance(req.query.q, normalizedResults);
      return res.json({ results: rankedResults });
    }

    // Sort by timestamp
    const sortedResults = normalizedResults.sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );

    const response = {
      success: normalizedResults.length > 0,
      total_results: sortedResults.length,
      stats: {
        by_platform: {
          twitter: results.twitter.length,
          reddit: results.reddit.length,
          news: results.news.length
        },
        platform_status: platformStatus
      },
      results: sortedResults
    };

    if (errors.length > 0) {
      response.errors = errors;
    }

    logStep('RESPONSE', `Sending ${sortedResults.length} normalized results`);

    // Calculate REAL engagement metrics with normalization
    let totalEngagement = 0;
    let engagementByPlatform = {
      twitter: 0,
      reddit: 0,
      news: 0
    };
    
    // Count items by platform for averaging
    let countByPlatform = {
      twitter: 0,
      reddit: 0,
      news: 0
    };

    // Loop through normalized results and calculate engagement
    normalizedResults.forEach(item => {
      const platform = item.platform;
      
      // Calculate weighted engagement with normalization by platform
      let weightMultiplier = 1;
      
      // Apply platform-specific weighting
      if (platform === 'twitter') {
        weightMultiplier = 1.2; // Twitter gets slightly higher weight
      } else if (platform === 'reddit') {
        weightMultiplier = 1.3; // Reddit gets higher weight (deeper engagement)
      } else if (platform === 'news') {
        weightMultiplier = 1.0; // News gets baseline weight
      }
      
      const itemEngagement = (
        item.engagement.likes + 
        (item.engagement.shares * 2) + 
        (item.engagement.comments * 1.5)
      ) * weightMultiplier;
      
      // Add to platform-specific engagement
      if (engagementByPlatform[platform] !== undefined) {
        engagementByPlatform[platform] += itemEngagement;
        countByPlatform[platform]++;
      }
    });
    
    // Calculate averages for each platform instead of totals
    Object.keys(engagementByPlatform).forEach(platform => {
      if (countByPlatform[platform] > 0) {
        engagementByPlatform[platform] = engagementByPlatform[platform] / countByPlatform[platform];
      }
    });
    
    // Calculate total engagement as average of platform averages (only for platforms with data)
    const platformsWithData = Object.keys(engagementByPlatform).filter(
      platform => countByPlatform[platform] > 0
    );
    
    if (platformsWithData.length > 0) {
      const sumOfAverages = platformsWithData.reduce(
        (sum, platform) => sum + engagementByPlatform[platform], 0
      );
      totalEngagement = sumOfAverages / platformsWithData.length;
    } else {
      totalEngagement = 1; // Default value if no data
    }

    // Add this: Send proper engagement data to Prophet
    try {
      logger.info(`Sending engagement data to Prophet service for topic: ${topic}`);
      
      // Convert topic to lowercase for consistent tracking
      const normalizedTopic = topic.toLowerCase();
      
      // Send overall engagement (using normalized average value)
      const webResponse = await axios.post(`${PROPHET_SERVICE_URL}/api/v1/store-engagement`, {
        topic: normalizedTopic,
        platform: 'web',
        timestamp: new Date().toISOString(),
        value: totalEngagement > 0 ? totalEngagement : 1, // Use at least 1 for new topics
        metadata: {
          total_results: normalizedResults.length,
          platform_status: platformStatus,
          engagement_by_platform: engagementByPlatform,
          platform_counts: countByPlatform,
          normalized: true
        }
      });
      
      logger.info(`[PROPHET] Web engagement response: ${JSON.stringify({
        status: webResponse.status,
        data: webResponse.data
      })}`);

      // Also store platform-specific engagement data (using normalized averages)
      for (const platform of Object.keys(engagementByPlatform)) {
        if (countByPlatform[platform] > 0) {
          // Calculate the actual value to store - ensure it's never zero if there's data
          let platformValue = Math.max(engagementByPlatform[platform], 0.1);
          
          // Apply multiplier of 10x to news platform for better scaling
          // Keep Reddit scores at their original higher values
          if (platform === 'news') {
            platformValue = platformValue * 10;
            logger.info(`[PROPHET] Applying 10x multiplier to news engagement: ${platformValue}`);
          } else if (platform === 'reddit') {
            // Preserve Reddit's original higher values
            platformValue = engagementByPlatform[platform];
            logger.info(`[PROPHET] Preserving Reddit's original engagement value: ${platformValue}`);
          }
          
          logger.info(`[PROPHET] Sending ${platform} engagement: ${platformValue}`);
          
          const platformResponse = await axios.post(`${PROPHET_SERVICE_URL}/api/v1/store-engagement`, {
            topic: normalizedTopic,
            platform: platform,
            timestamp: new Date().toISOString(),
            value: platformValue,
            metadata: {
              result_count: countByPlatform[platform],
              status: platformStatus[platform],
              normalized: true
            }
          });
          
          logger.info(`[PROPHET] ${platform} engagement response: ${JSON.stringify({
            status: platformResponse.status,
            data: platformResponse.data
          })}`);
        }
      }

      // Calculate news score but don't store individual items
      if (countByPlatform.news > 0) {
        const newsItems = normalizedResults.filter(r => r.platform === 'news');
        logger.info(`[PROPHET] Processing ${newsItems.length} news items for aggregate score`);
        
        // Calculate the total engagement for all news items
        const totalNewsEngagement = newsItems.reduce((total, item) => {
          const itemEngagement = 
            item.engagement.likes + 
            (item.engagement.shares * 2) + 
            (item.engagement.comments * 1.5);
          return total + itemEngagement;
        }, 0);
        
        // If we have news items but the average was zero, update the news platform value
        if (totalNewsEngagement > 0 && engagementByPlatform.news === 0) {
          const avgNewsEngagement = (totalNewsEngagement / newsItems.length) * 10; // Apply 10x multiplier
          
          logger.info(`[PROPHET] Correcting news engagement from 0 to ${avgNewsEngagement} (with 10x multiplier)`);
          
          const correctionResponse = await axios.post(`${PROPHET_SERVICE_URL}/api/v1/store-engagement`, {
            topic: normalizedTopic,
            platform: 'news',
            timestamp: new Date().toISOString(),
            value: avgNewsEngagement,
            metadata: {
              result_count: countByPlatform.news,
              status: platformStatus.news,
              normalized: true,
              corrected: true,
              multiplier: 10
            }
          });
          
          logger.info(`[PROPHET] News correction response: ${JSON.stringify({
            status: correctionResponse.status,
            data: correctionResponse.data
          })}`);
        }
      }

    } catch (error) {
      logger.error(`Failed to store in Prophet service`, {
        topic: topic,
        error: error.message,
        stack: error.stack
      });
    }

    res.json(response);

  } catch (error) {
    logger.error(`Error handling topic request`, {
      topic: topic,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Add this function to store engagement data
async function storeEngagementData(normalizedResults, topic) {
  try {
    for (const result of normalizedResults) {
      // Skip items with zero engagement
      if (!result.engagement || 
          (result.engagement.likes === 0 && 
           result.engagement.shares === 0 && 
           result.engagement.comments === 0)) {
        logger.info(`[PROPHET] Skipping item with zero engagement: ${result.platform}/${result.id}`);
        continue;
      }
      
      const engagementScore = 
        result.engagement.likes + 
        (result.engagement.shares * 2) + 
        result.engagement.comments;
      
      // Apply multiplier for news items, but keep Reddit scores as they were
      let finalScore = engagementScore;
      if (result.platform === 'news') {
        finalScore = engagementScore * 10;
      }
      
      logger.info(`[PROPHET] Storing engagement for ${result.platform}/${result.id}: ${finalScore}`);

      const response = await axios.post(`${PROPHET_SERVICE_URL}/api/v1/store-engagement`, {
        topic,
        platform: result.platform,
        timestamp: result.timestamp,
        value: finalScore,
        metadata: {
          source_url: result.source_url,
          engagement: result.engagement,
          calculated: result.engagement.calculated || false
        }
      });
      
      logger.info(`[PROPHET] Engagement storage response: ${JSON.stringify({
        status: response.status,
        data: response.data
      })}`);
    }
  } catch (error) {
    logStep('ERROR', `Failed to store engagement data: ${error.message}`);
  }
}

// Helper function to calculate news aggregate score
function calculateNewsAggregateScore(newsItems) {
  try {
    let totalEngagement = 0;
    
    for (const item of newsItems) {
      if (item.engagement && (item.engagement.likes > 0 || item.engagement.shares > 0 || item.engagement.comments > 0)) {
        const itemEngagement = 
          item.engagement.likes + 
          (item.engagement.shares * 2) + 
          (item.engagement.comments * 1.5);
        
        totalEngagement += itemEngagement;
      }
    }
    
    return totalEngagement > 0 ? totalEngagement : 0;
  } catch (error) {
    logger.error(`[ERROR] Failed to calculate news aggregate score: ${error.message}`);
    return 0;
  }
}

// Add this to your existing route
router.get('/topic/:topic/forecast', async (req, res) => {
  const { topic } = req.params;
  const { periods = 30, platform } = req.query;

  try {
    const response = await axios.post(`${PROPHET_SERVICE_URL}/api/v1/forecast`, {
      topic,
      platform,
      periods: parseInt(periods),
      include_history: true
    });

    res.json(response.data);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Topic routes
router.get('/topic/:id/latest', function(req, res) {
  try {
    const { id } = req.params;
    
    if (!Validator.isValidTopicId(id)) {
      logger.warn(`Invalid topic ID requested: ${id}`);
      return res.status(400).json({ error: 'Invalid topic ID' });
    }

    logger.info(`Fetching latest data for topic: ${id}`);
    
    // Topic fetching logic
    // Replace with your actual implementation
    res.json({ topic: id, message: 'Latest data retrieved' });
  } catch (error) {
    logger.error('Error in topic latest route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/topic/:id/history', function(req, res) {
  try {
    const { id } = req.params;
    
    if (!Validator.isValidTopicId(id)) {
      logger.warn(`Invalid topic ID requested: ${id}`);
      return res.status(400).json({ error: 'Invalid topic ID' });
    }

    logger.info(`Fetching history for topic: ${id}`);
    
    // History fetching logic
    // Replace with your actual implementation
    res.json({ topic: id, message: 'History retrieved' });
  } catch (error) {
    logger.error('Error in topic history route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 