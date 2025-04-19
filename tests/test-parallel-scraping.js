const axios = require('axios');
const logger = require('../utils/logger');

// Sample tweets with URLs to test
const testTweets = [
  { id: '1', text: 'Check out this article https://www.theverge.com/ai-artificial-intelligence', url: 'https://www.theverge.com/ai-artificial-intelligence' },
  { id: '2', text: 'Interesting read https://techcrunch.com/category/artificial-intelligence/', url: 'https://techcrunch.com/category/artificial-intelligence/' },
  { id: '3', text: 'Latest news https://www.wired.com/category/artificial-intelligence/', url: 'https://www.wired.com/category/artificial-intelligence/' },
  { id: '4', text: 'AI advancements https://venturebeat.com/category/ai/', url: 'https://venturebeat.com/category/ai/' },
  { id: '5', text: 'Machine learning https://www.technologyreview.com/topic/artificial-intelligence/', url: 'https://www.technologyreview.com/topic/artificial-intelligence/' },
  { id: '6', text: 'Research paper https://arxiv.org/list/cs.AI/recent', url: 'https://arxiv.org/list/cs.AI/recent' },
  { id: '7', text: 'Deep learning https://deeplearning.ai/', url: 'https://deeplearning.ai/' },
  { id: '8', text: 'AI ethics https://hai.stanford.edu/', url: 'https://hai.stanford.edu/' },
  { id: '9', text: 'New algorithms https://www.fast.ai/', url: 'https://www.fast.ai/' },
  { id: '10', text: 'Computer vision https://opencv.org/', url: 'https://opencv.org/' }
];

async function testParallelScraping() {
  const SERVER_URL = 'http://localhost:3000';
  const endpoint = `${SERVER_URL}/enhance-tweets-playwright`;
  
  logger.info('Starting parallel scraping test...');
  const startTime = Date.now();
  
  try {
    const response = await axios.post(endpoint, { tweets: testTweets });
    const data = response.data;
    
    // Log results
    logger.info(`Test completed successfully in ${Date.now() - startTime}ms`);
    logger.info(`Total tweets processed: ${data.stats.totalTweets}`);
    logger.info(`Total processing time: ${data.stats.totalTimeMs}ms`);
    logger.info(`Average time per tweet: ${data.stats.avgTimePerTweetMs}ms`);
    logger.info(`Tweets per second: ${data.stats.tweetsPerSecond}`);
    
    // Log enhanced content for first tweet as example
    if (data.enhancedTweets.length > 0) {
      logger.info('Sample enhanced tweet:');
      logger.info(JSON.stringify(data.enhancedTweets[0], null, 2));
    }
    
    return data;
  } catch (error) {
    logger.error('Test failed:', error.response?.data || error.message);
    throw error;
  }
}

// Run the test
testParallelScraping()
  .then(() => logger.info('Test completed'))
  .catch(() => logger.error('Test failed'))
  .finally(() => process.exit()); 