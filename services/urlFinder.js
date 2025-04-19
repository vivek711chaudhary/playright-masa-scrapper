const Together = require("together-ai");
const { logStep } = require('../utils/logger');
const { TOGETHER_API_KEY, API_TIMEOUT } = require('../utils/config');

const together = new Together({ apiKey: TOGETHER_API_KEY });

async function findRelevantUrl(tweetContent) {
  // Step 1: Extract search query
  logStep("QUERY", "Generating search query...");
  const searchQuery = await together.chat.completions.create({
    messages: [{
      role: "system",
      content: "Create a detailed web search query from this tweet. Respond ONLY with the query:"
    }, { 
      role: "user", 
      content: tweetContent 
    }],
    model: "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
    timeout: API_TIMEOUT
  });
  
  const query = searchQuery.choices[0].message.content;
  logStep("QUERY", `Generated query: "${query}"`);

  // Step 2: Get research URL
  logStep("URL", "Identifying research URL...");
  const urlResponse = await together.chat.completions.create({
    messages: [{
      role: "system",
      content: "Suggest ONE most relevant URL to research this. Respond ONLY with a valid URL:"
    }, { 
      role: "user", 
      content: query 
    }],
    model: "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
    temperature: 0.3,
    timeout: API_TIMEOUT
  });
  
  let researchUrl = urlResponse.choices[0].message.content.trim();
  if (!researchUrl.startsWith('http')) {
    researchUrl = 'https://' + researchUrl;
  }
  researchUrl = researchUrl.split(' ')[0];
  
  return { query, researchUrl };
}

module.exports = { findRelevantUrl }; 