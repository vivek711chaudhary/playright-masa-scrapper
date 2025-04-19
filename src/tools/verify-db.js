const { MongoClient } = require('mongodb');
const logger = require('../../utils/logger');

async function verifyMongoDBConnection() {
  const uri = "mongodb://localhost:27017";
  const client = new MongoClient(uri);

  try {
    await client.connect();
    logger.info('Successfully connected to MongoDB');
    
    const db = client.db('mcp2');
    const collections = await db.listCollections().toArray();
    
    logger.info('Available collections:', {
      collections: collections.map(c => c.name)
    });

    const engagements = await db.collection('engagements').find({}).limit(5).toArray();
    logger.info('Recent engagements:', {
      count: engagements.length,
      sample: engagements
    });

  } catch (error) {
    logger.error('MongoDB connection error', {
      error: error.message,
      stack: error.stack
    });
  } finally {
    await client.close();
  }
}

module.exports = { verifyMongoDBConnection }; 