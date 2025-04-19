const winston = require('winston');
const path = require('path');

// Create custom formats
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.printf(info => {
    const { timestamp, level, message, ...rest } = info;
    const restString = Object.keys(rest).length ? JSON.stringify(rest) : '';
    return `${timestamp} ${level}: ${message} ${restString}`;
  })
);

// Create the logger with reduced verbosity
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'error',
  format: logFormat,
  transports: [
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/combined.log'),
      maxsize: 5242880,
      maxFiles: 5,
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
      level: 'error',
    }),
  ],
});

// Add stream for Morgan HTTP logging - silent by default
logger.stream = {
  write: (message) => {
    if (process.env.HTTP_LOGGING === 'true') {
      logger.info(message.trim());
    }
  },
};

// Add the logStep function that's used in topicRoutes.js
const logStep = (stepName, message) => {
  if (process.env.DEBUG === 'true') {
    logger.info(`[${stepName}] ${message}`);
  }
};

// Add the logError function
const logError = (message, error) => {
  // Always log errors regardless of DEBUG setting
  if (error && error.stack) {
    logger.error(`${message}`, { stack: error.stack, timestamp: new Date().toISOString() });
  } else {
    logger.error(`${message}`, { details: error, timestamp: new Date().toISOString() });
  }
};

module.exports = {
  logger,
  logStep,
  logError
}; 