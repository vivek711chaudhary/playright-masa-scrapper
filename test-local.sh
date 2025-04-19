#!/bin/bash

# Test the health endpoint
echo "Testing health endpoint..."
curl http://localhost:3000/health

# Test the enhancement endpoint
echo -e "\n\nTesting enhancement endpoint..."
curl -X POST http://localhost:3000/enhance-tweets-playwright \
  -H "Content-Type: application/json" \
  -d '{
    "tweets": [
      {
        "ID": "test123",
        "Content": "Exploring the latest developments in AI and machine learning",
        "Metadata": {
          "public_metrics": {
            "RetweetCount": 10,
            "LikeCount": 50,
            "QuoteCount": 5,
            "ReplyCount": 8,
            "BookmarkCount": 3
          }
        }
      }
    ],
    "custom_instruction": "Focus on technical aspects"
  }' 