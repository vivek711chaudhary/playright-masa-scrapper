const Together = require('together-ai');
const { TOGETHER_API_KEY } = require('../../utils/config');
const { logStep } = require('../../utils/logger');

const together = new Together({ apiKey: TOGETHER_API_KEY });

class SemanticSearch {
  async getSemanticEmbedding(text) {
    try {
      const response = await together.embeddings.create({
        input: text,
        model: "togethercomputer/m2-bert-80M-8k-base"
      });
      return response.data[0].embedding;
    } catch (error) {
      logStep('ERROR', `Semantic embedding failed: ${error.message}`);
      throw error;
    }
  }

  async rankByRelevance(query, contents) {
    const queryEmbedding = await this.getSemanticEmbedding(query);
    
    const scoredContents = await Promise.all(
      contents.map(async (content) => {
        const contentEmbedding = await this.getSemanticEmbedding(content.content);
        const similarity = this.cosineSimilarity(queryEmbedding, contentEmbedding);
        return { ...content, similarity };
      })
    );

    return scoredContents.sort((a, b) => b.similarity - a.similarity);
  }

  cosineSimilarity(vec1, vec2) {
    const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
    const mag1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
    const mag2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (mag1 * mag2);
  }
}

module.exports = new SemanticSearch(); 