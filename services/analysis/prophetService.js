const Prophet = require('prophet-node');
const { logStep } = require('../../utils/logger');
const TopicHistory = require('../../models/topicHistory');
const { Op } = require('sequelize');

class ProphetService {
  constructor() {
    this.prophet = new Prophet({
      growth: 'linear',
      yearly_seasonality: true,
      weekly_seasonality: true,
      daily_seasonality: false
    });
  }

  calculateEngagementScore(results) {
    return results.reduce((total, item) => {
      return total + (
        item.engagement.likes * 1 +
        item.engagement.shares * 2 +
        item.engagement.comments * 1.5
      );
    }, 0);
  }

  async storeHistoricalData(topic, platform, results) {
    const timestamp = new Date();
    const engagement_score = this.calculateEngagementScore(results);
    const content_count = results.length;

    await TopicHistory.create({
      topic,
      platform,
      timestamp,
      engagement_score,
      content_count
    });

    logStep('HISTORY', `Stored data point for ${topic} on ${platform}`);
  }

  async getHistoricalData(topic, platform, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return await TopicHistory.findAll({
      where: {
        topic,
        platform,
        timestamp: {
          [Op.gte]: startDate
        }
      },
      order: [['timestamp', 'ASC']]
    });
  }

  async forecast(topic, platform, forecastDays = 7) {
    try {
      logStep('FORECAST', `Generating ${forecastDays} day forecast for ${topic} on ${platform}`);

      // Get historical data
      const history = await this.getHistoricalData(topic, platform, 30);
      
      if (history.length < 5) {
        throw new Error('Insufficient historical data for forecasting');
      }

      // Prepare data for Prophet
      const ds = history.map(h => ({
        ds: h.timestamp,
        y: h.engagement_score
      }));

      // Fit the model
      await this.prophet.fit(ds);

      // Generate future dates
      const future = [];
      const lastDate = new Date(history[history.length - 1].timestamp);
      
      for (let i = 1; i <= forecastDays; i++) {
        const date = new Date(lastDate);
        date.setDate(date.getDate() + i);
        future.push({ ds: date });
      }

      // Make prediction
      const forecast = await this.prophet.predict(future);

      return {
        history: history.map(h => ({
          timestamp: h.timestamp,
          actual: h.engagement_score
        })),
        forecast: forecast.map(f => ({
          timestamp: f.ds,
          predicted: f.yhat,
          lower_bound: f.yhat_lower,
          upper_bound: f.yhat_upper
        }))
      };
    } catch (error) {
      logStep('ERROR', `Forecast failed: ${error.message}`);
      throw error;
    }
  }

  async getTopicTrends(topic, platforms = ['twitter', 'reddit', 'news'], days = 7) {
    const trends = {};
    
    for (const platform of platforms) {
      const history = await this.getHistoricalData(topic, platform, days);
      
      if (history.length > 0) {
        trends[platform] = {
          data_points: history.length,
          total_engagement: history.reduce((sum, h) => sum + h.engagement_score, 0),
          average_engagement: history.reduce((sum, h) => sum + h.engagement_score, 0) / history.length,
          content_count: history.reduce((sum, h) => sum + h.content_count, 0),
          timeline: history.map(h => ({
            timestamp: h.timestamp,
            engagement: h.engagement_score,
            content_count: h.content_count
          }))
        };
      }
    }

    return trends;
  }
}

module.exports = new ProphetService(); 