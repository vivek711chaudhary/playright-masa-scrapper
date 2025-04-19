const ContentSchema = {
  id: String,
  platform: String,
  content: String,
  author: String,
  timestamp: Date,
  engagement: {
    likes: Number,
    shares: Number,
    comments: Number
  },
  metadata: Object,
  source_url: String
};

module.exports = { ContentSchema }; 