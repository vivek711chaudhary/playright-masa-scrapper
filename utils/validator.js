const { logger } = require('./logger');

class Validator {
  static isValidTopicId(topicId) {
    if (!topicId || typeof topicId !== 'string') {
      logger.warn(`Invalid topic ID: ${topicId}`);
      return false;
    }
    // Allow alphanumeric characters, hyphens, and underscores
    const validTopicPattern = /^[a-zA-Z0-9-_]+$/;
    return validTopicPattern.test(topicId);
  }

  static isValidTimestamp(timestamp) {
    if (!timestamp) return false;
    const date = new Date(timestamp);
    return date instanceof Date && !isNaN(date);
  }

  static isValidEngagementData(data) {
    const requiredFields = ['topic', 'platform', 'value', 'timestamp'];
    const isValid = requiredFields.every(field => {
      const hasField = field in data;
      if (!hasField) {
        logger.warn(`Missing required field in engagement data: ${field}`);
      }
      return hasField;
    });

    if (!isValid) return false;

    return (
      this.isValidTopicId(data.topic) &&
      typeof data.platform === 'string' &&
      typeof data.value === 'number' &&
      this.isValidTimestamp(data.timestamp)
    );
  }

  static isValidPeriod(period) {
    return typeof period === 'number' && period > 0 && period <= 365;
  }

  static isValidFrequency(frequency) {
    const validFrequencies = ['D', 'W', 'M'];
    return validFrequencies.includes(frequency);
  }

  static sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    // Remove any potentially harmful characters
    return input.replace(/[<>{}()]/g, '').trim();
  }

  static validateQueryParams(params) {
    const sanitizedParams = {};
    for (const [key, value] of Object.entries(params)) {
      sanitizedParams[key] = this.sanitizeInput(value);
    }
    return sanitizedParams;
  }

  static isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch (error) {
      logger.warn(`Invalid URL: ${url}`);
      return false;
    }
  }

  static isValidApiKey(apiKey) {
    return typeof apiKey === 'string' && apiKey.length > 0;
  }
}

// Middleware function for request validation
const validateRequest = (req, res, next) => {
  try {
    // Validate topic parameter
    const { topic } = req.params;
    if (!topic || !Validator.isValidTopicId(topic)) {
      logger.warn(`Invalid topic parameter: ${topic}`);
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid topic parameter' 
      });
    }

    // Validate and sanitize query parameters
    const sanitizedQuery = {};
    
    // Validate timeframe if present
    if (req.query.timeframe) {
      const validTimeframes = ['1h', '6h', '12h', '24h', '7d', '30d'];
      if (!validTimeframes.includes(req.query.timeframe)) {
        logger.warn(`Invalid timeframe parameter: ${req.query.timeframe}`);
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid timeframe parameter. Valid options: 1h, 6h, 12h, 24h, 7d, 30d' 
        });
      }
      sanitizedQuery.timeframe = req.query.timeframe;
    }

    // Validate limit if present
    if (req.query.limit) {
      const limit = parseInt(req.query.limit);
      if (isNaN(limit) || limit < 1 || limit > 100) {
        logger.warn(`Invalid limit parameter: ${req.query.limit}`);
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid limit parameter. Must be a number between 1 and 100' 
        });
      }
      sanitizedQuery.limit = limit;
    }

    // Validate platforms if present
    if (req.query.platforms) {
      const platforms = req.query.platforms.split(',');
      const validPlatforms = ['twitter', 'reddit', 'news'];
      const invalidPlatforms = platforms.filter(p => !validPlatforms.includes(p));
      
      if (invalidPlatforms.length > 0) {
        logger.warn(`Invalid platforms: ${invalidPlatforms.join(', ')}`);
        return res.status(400).json({ 
          success: false, 
          error: `Invalid platforms: ${invalidPlatforms.join(', ')}. Valid options: twitter, reddit, news` 
        });
      }
      
      sanitizedQuery.platforms = req.query.platforms;
    }

    // If search query is present, sanitize it
    if (req.query.q) {
      sanitizedQuery.q = Validator.sanitizeInput(req.query.q);
    }

    // Replace original query with sanitized version
    req.query = { ...req.query, ...sanitizedQuery };
    
    next();
  } catch (error) {
    logger.error('Error in request validation:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error validating request' 
    });
  }
};

module.exports = {
  Validator,
  validateRequest
};