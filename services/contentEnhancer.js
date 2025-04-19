const Together = require("together-ai");
const { logStep } = require('../utils/logger');
const { TOGETHER_API_KEY, API_TIMEOUT } = require('../utils/config');

const together = new Together({ apiKey: TOGETHER_API_KEY });

async function enhanceContent(tweet, pageContent, researchUrl, custom_instruction) {
  logStep("ENHANCE", "Generating enhanced content...");
  
  const basePrompt = `Enhance this tweet with context from research. Include:
    1. Key factual insight (with source if possible)
    2. Current social sentiment about this topic
    3. Maintain the original author's tone
    4. Add relevant hashtags if applicable`;
    
  const finalPrompt = custom_instruction 
    ? `${basePrompt}\n\nAdditional Instructions: ${custom_instruction}`
    : basePrompt;

  const enhancement = await together.chat.completions.create({
    messages: [{
      role: "system",
      content: `${finalPrompt}\n\nOriginal Tweet: ${tweet.Content}`
    }, { 
      role: "user", 
      content: `Research Context from ${researchUrl}:\n${pageContent.substring(0, 5000)}` 
    }],
    model: "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
    timeout: API_TIMEOUT
  });
  
  return enhancement.choices[0].message.content;
}

module.exports = { enhanceContent }; 