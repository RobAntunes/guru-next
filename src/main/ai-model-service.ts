/**
 * AI Model Service
 * Handles local AI model loading and inference in the main process
 * Uses @huggingface/transformers v3 for embeddings and text generation
 */

import { pipeline, Pipeline, env } from '@huggingface/transformers';

// Configure transformers to use local models
env.allowLocalModels = true;
env.useBrowserCache = false;

export interface EmbeddingResult {
  embedding: number[];
  dimensions: number;
}

export interface GenerationResult {
  text: string;
  tokens: number;
  finishReason: string;
}

export interface SummarizationResult {
  summary: string;
  compressionRatio: number;
}

class AIModelService {
  private embeddingPipeline: Pipeline | null = null;
  private generationPipeline: Pipeline | null = null;
  private summarizationPipeline: Pipeline | null = null;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  /**
   * Initialize AI models
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initializationPromise) return this.initializationPromise;

    this.initializationPromise = (async () => {
      try {
        console.log('Initializing AI models...');

        // Load embedding model (smaller, faster model for embeddings)
        this.embeddingPipeline = await pipeline(
          'feature-extraction',
          'Xenova/all-MiniLM-L6-v2'
        );

        // Load text generation model (small model for local inference)
        this.generationPipeline = await pipeline(
          'text-generation',
          'Xenova/gpt2'
        );

        // Load summarization model
        this.summarizationPipeline = await pipeline(
          'summarization',
          'Xenova/distilbart-cnn-6-6'
        );

        this.isInitialized = true;
        console.log('AI models initialized successfully');
      } catch (error) {
        console.error('Failed to initialize AI models:', error);
        this.initializationPromise = null;
        throw error;
      }
    })();

    return this.initializationPromise;
  }

  /**
   * Generate embeddings for text
   */
  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.embeddingPipeline) {
      throw new Error('Embedding pipeline not initialized');
    }

    const output = await this.embeddingPipeline(text, {
      pooling: 'mean',
      normalize: true
    });

    const embedding = Array.from(output.data);

    return {
      embedding,
      dimensions: embedding.length
    };
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateEmbeddingsBatch(texts: string[]): Promise<EmbeddingResult[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const results: EmbeddingResult[] = [];
    
    // Process in smaller batches to avoid memory issues
    const batchSize = 10;
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(text => this.generateEmbedding(text))
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Generate text completion
   */
  async generateText(
    prompt: string,
    options?: {
      maxTokens?: number;
      temperature?: number;
      topP?: number;
    }
  ): Promise<GenerationResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.generationPipeline) {
      throw new Error('Generation pipeline not initialized');
    }

    const result = await this.generationPipeline(prompt, {
      max_new_tokens: options?.maxTokens || 100,
      temperature: options?.temperature || 0.7,
      top_p: options?.topP || 0.9,
      do_sample: true
    });

    const generated = result[0].generated_text;
    
    return {
      text: generated,
      tokens: generated.split(' ').length,
      finishReason: 'stop'
    };
  }

  /**
   * Summarize text
   */
  async summarizeText(
    text: string,
    options?: {
      maxLength?: number;
      minLength?: number;
    }
  ): Promise<SummarizationResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.summarizationPipeline) {
      throw new Error('Summarization pipeline not initialized');
    }

    const result = await this.summarizationPipeline(text, {
      max_length: options?.maxLength || 130,
      min_length: options?.minLength || 30
    });

    const summary = result[0].summary_text;
    const compressionRatio = text.length / summary.length;

    return {
      summary,
      compressionRatio
    };
  }

  /**
   * Extract keywords from text using embeddings similarity
   */
  async extractKeywords(
    text: string,
    candidates: string[],
    topK: number = 5
  ): Promise<Array<{ keyword: string; score: number }>> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Generate embedding for the text
    const textEmbedding = await this.generateEmbedding(text);

    // Generate embeddings for candidates
    const candidateEmbeddings = await this.generateEmbeddingsBatch(candidates);

    // Calculate cosine similarity
    const scores = candidateEmbeddings.map((candEmb, idx) => {
      const similarity = this.cosineSimilarity(
        textEmbedding.embedding,
        candEmb.embedding
      );
      return {
        keyword: candidates[idx],
        score: similarity
      };
    });

    // Sort by score and return top K
    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    const dotProduct = vecA.reduce((sum, a, idx) => sum + a * vecB[idx], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Analyze document content
   */
  async analyzeDocument(content: string): Promise<{
    summary: string;
    keywords: string[];
    sentiment: 'positive' | 'neutral' | 'negative';
    complexity: number;
  }> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Generate summary
    const summaryResult = await this.summarizeText(content, {
      maxLength: 100,
      minLength: 30
    });

    // Extract potential keywords from the text
    const words = content
      .toLowerCase()
      .match(/\b[a-z]{4,}\b/g) || [];
    const uniqueWords = [...new Set(words)].slice(0, 50);

    // Use embedding similarity to find most relevant keywords
    const keywordResults = await this.extractKeywords(
      content,
      uniqueWords,
      10
    );

    const keywords = keywordResults.map(k => k.keyword);

    // Simple sentiment analysis based on word counts
    const positiveWords = ['good', 'great', 'excellent', 'best', 'love', 'amazing'];
    const negativeWords = ['bad', 'worst', 'hate', 'terrible', 'awful', 'poor'];
    
    const lowerContent = content.toLowerCase();
    const positiveCount = positiveWords.filter(w => lowerContent.includes(w)).length;
    const negativeCount = negativeWords.filter(w => lowerContent.includes(w)).length;
    
    let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
    if (positiveCount > negativeCount + 2) sentiment = 'positive';
    else if (negativeCount > positiveCount + 2) sentiment = 'negative';

    // Calculate complexity (average sentence length and vocabulary diversity)
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgSentenceLength = content.split(' ').length / sentences.length;
    const vocabularyDiversity = uniqueWords.length / words.length;
    const complexity = Math.min(10, Math.round((avgSentenceLength / 15 + vocabularyDiversity) * 5));

    return {
      summary: summaryResult.summary,
      keywords,
      sentiment,
      complexity
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.embeddingPipeline = null;
    this.generationPipeline = null;
    this.summarizationPipeline = null;
    this.isInitialized = false;
    this.initializationPromise = null;
  }
}

export const aiModelService = new AIModelService();
