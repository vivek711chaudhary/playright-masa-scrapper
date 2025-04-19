const logger = require('../../../playwright-mcp/utils/logger');
const { verifyMongoDBConnection } = require('../../../playwright-mcp/utils/verify-db');

// Prophet service endpoint
const PROPHET_SERVICE_URL = 'http://34.45.252.228:8000';

async function verifySetup() {
  logger.info('Verifying Prophet service setup');

  // Check MongoDB
  await verifyMongoDBConnection();

  // Check Prophet service
  try {
    const response = await fetch(`${PROPHET_SERVICE_URL}/health`);
    const data = await response.json();
    if (response.status === 200 && data.status === 'healthy') {
      logger.info('✅ Prophet service is healthy');
    } else {
      logger.warn('⚠️ Prophet service responded but may have issues', { status: data.status });
    }
  } catch (error) {
    logger.error('❌ Prophet service check failed', { error: error.message });
  }
}

verifySetup(); 