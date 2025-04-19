const rateLimit = require('express-rate-limit');
const logger = require('./logger');
const config = require('./config');

const createRateLimiter = (options = {}) => {
  return rateLimit({
    windowMs: options.windowMs || config.rateLimit.windowMs,
    max: options.max || config.rateLimit.max,
    message: {
      error: 'Too many requests, please try again later.',
    },
    handler: (req, res, next, options) => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
      res.status(429).json(options.message);
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    ...options,
  });
};

// Create specific rate limiters for different routes
const apiLimiter = createRateLimiter();

// More restrictive limiter for authentication routes
const authLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 requests per hour
});

// Limiter for topic routes
const topicLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
});

module.exports = {
  createRateLimiter,
  apiLimiter,
  authLimiter,
  topicLimiter,
};
