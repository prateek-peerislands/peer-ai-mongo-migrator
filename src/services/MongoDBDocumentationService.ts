/**
 * MongoDB Documentation Service
 * Fetches and manages MongoDB official documentation as a knowledge source
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import { LLMClient } from './LLMClient.js';
import chalk from 'chalk';

export interface DocumentationContent {
  title: string;
  url: string;
  content: string;
  lastUpdated: Date;
  category: string;
  keywords: string[];
}

export interface DocumentationSearchResult {
  content: DocumentationContent;
  relevanceScore: number;
  matchedKeywords: string[];
}

export interface MongoDBDocsCache {
  lastFetch: Date;
  content: DocumentationContent[];
  totalPages: number;
}

export class MongoDBDocumentationService {
  private static instance: MongoDBDocumentationService | null = null;
  private llmClient: LLMClient;
  private cache: MongoDBDocsCache | null = null;
  private cacheFilePath: string;
  private baseUrl = 'https://www.mongodb.com/docs/';
  private maxCacheAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  constructor() {
    this.llmClient = LLMClient.getInstance();
    this.cacheFilePath = path.join(process.cwd(), 'mongodb-docs-cache.json');
    this.loadCache();
  }

  static getInstance(): MongoDBDocumentationService {
    if (!MongoDBDocumentationService.instance) {
      MongoDBDocumentationService.instance = new MongoDBDocumentationService();
    }
    return MongoDBDocumentationService.instance;
  }

  /**
   * Get relevant MongoDB documentation content for a query
   */
  async getRelevantDocumentation(query: string): Promise<string> {
    try {
      console.log(chalk.blue(`🔍 Searching MongoDB documentation for: "${query}"`));
      
      // Check if we need to refresh cache
      if (this.shouldRefreshCache()) {
        await this.fetchCompleteDocumentation();
      }

      if (!this.cache || !this.cache.content.length) {
        return 'MongoDB documentation not available. Please try again later.';
      }

      // Search for relevant content
      const searchResults = await this.searchDocumentation(query);
      
      if (searchResults.length === 0) {
        return 'No relevant MongoDB documentation found for your query.';
      }

      // Format the most relevant results
      return this.formatSearchResults(searchResults.slice(0, 3)); // Top 3 results

    } catch (error) {
      console.error('Error getting MongoDB documentation:', error);
      return 'Error retrieving MongoDB documentation. Please try again.';
    }
  }

  /**
   * Fetch complete MongoDB documentation
   */
  async fetchCompleteDocumentation(): Promise<void> {
    try {
      console.log(chalk.yellow('📚 Fetching MongoDB documentation...'));
      
      const documentationPages = [
        // Core MongoDB concepts
        { url: 'https://www.mongodb.com/docs/manual/core/document/', category: 'core', keywords: ['document', 'bson', 'json'] },
        { url: 'https://www.mongodb.com/docs/manual/core/collections/', category: 'core', keywords: ['collection', 'database'] },
        { url: 'https://www.mongodb.com/docs/manual/core/indexes/', category: 'core', keywords: ['index', 'performance', 'query'] },
        
        // Data modeling
        { url: 'https://www.mongodb.com/docs/manual/core/data-modeling-introduction/', category: 'modeling', keywords: ['data modeling', 'schema design', 'relationships'] },
        { url: 'https://www.mongodb.com/docs/manual/tutorial/model-embedded-one-to-many-relationships-between-documents/', category: 'modeling', keywords: ['embedded', 'relationships', 'one-to-many'] },
        { url: 'https://www.mongodb.com/docs/manual/tutorial/model-referenced-one-to-many-relationships-between-documents/', category: 'modeling', keywords: ['referenced', 'relationships', 'references'] },
        
        // Query operations
        { url: 'https://www.mongodb.com/docs/manual/tutorial/query-documents/', category: 'queries', keywords: ['query', 'find', 'filter'] },
        { url: 'https://www.mongodb.com/docs/manual/tutorial/update-documents/', category: 'queries', keywords: ['update', 'modify', 'change'] },
        { url: 'https://www.mongodb.com/docs/manual/tutorial/delete-documents/', category: 'queries', keywords: ['delete', 'remove'] },
        
        // Aggregation
        { url: 'https://www.mongodb.com/docs/manual/aggregation/', category: 'aggregation', keywords: ['aggregation', 'pipeline', 'group'] },
        { url: 'https://www.mongodb.com/docs/manual/reference/operator/aggregation/', category: 'aggregation', keywords: ['operators', 'aggregation operators'] },
        
        // Transactions
        { url: 'https://www.mongodb.com/docs/manual/core/transactions/', category: 'transactions', keywords: ['transactions', 'acid', 'consistency'] },
        
        // Performance
        { url: 'https://www.mongodb.com/docs/manual/core/query-optimization/', category: 'performance', keywords: ['performance', 'optimization', 'query optimization'] },
        { url: 'https://www.mongodb.com/docs/manual/core/index-optimization/', category: 'performance', keywords: ['index optimization', 'performance'] },
        
        // Migration
        { url: 'https://www.mongodb.com/docs/relational-migrator/', category: 'migration', keywords: ['migration', 'relational migrator', 'postgresql'] },
        
        // Atlas features
        { url: 'https://www.mongodb.com/docs/atlas/', category: 'atlas', keywords: ['atlas', 'cloud', 'managed'] },
        { url: 'https://www.mongodb.com/docs/atlas/atlas-search/', category: 'atlas', keywords: ['atlas search', 'search', 'full text search'] },
        { url: 'https://www.mongodb.com/docs/atlas/atlas-vector-search/', category: 'atlas', keywords: ['vector search', 'ai', 'embeddings'] }
      ];

      const content: DocumentationContent[] = [];
      
      for (const page of documentationPages) {
        try {
          const docContent = await this.fetchPageContent(page.url, page.category, page.keywords);
          if (docContent) {
            content.push(docContent);
          }
        } catch (error) {
          console.warn(`Failed to fetch ${page.url}:`, error);
        }
      }

      // Update cache
      this.cache = {
        lastFetch: new Date(),
        content,
        totalPages: content.length
      };

      this.saveCache();
      console.log(chalk.green(`✅ Fetched ${content.length} MongoDB documentation pages`));

    } catch (error) {
      console.error('Error fetching MongoDB documentation:', error);
      throw error;
    }
  }

  /**
   * Search through documentation content
   */
  private async searchDocumentation(query: string): Promise<DocumentationSearchResult[]> {
    if (!this.cache || !this.cache.content.length) {
      return [];
    }

    const queryLower = query.toLowerCase();
    const results: DocumentationSearchResult[] = [];

    for (const content of this.cache.content) {
      let relevanceScore = 0;
      const matchedKeywords: string[] = [];

      // Check title relevance
      if (content.title.toLowerCase().includes(queryLower)) {
        relevanceScore += 10;
      }

      // Check keyword matches
      for (const keyword of content.keywords) {
        if (queryLower.includes(keyword.toLowerCase())) {
          relevanceScore += 5;
          matchedKeywords.push(keyword);
        }
      }

      // Check content relevance using LLM
      const contentRelevance = await this.assessContentRelevance(query, content.content);
      relevanceScore += contentRelevance;

      if (relevanceScore > 0) {
        results.push({
          content,
          relevanceScore,
          matchedKeywords
        });
      }
    }

    // Sort by relevance score
    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Assess content relevance using LLM
   */
  private async assessContentRelevance(query: string, content: string): Promise<number> {
    try {
      const systemPrompt = `You are an expert at assessing the relevance of MongoDB documentation content to user queries.

Rate the relevance of the following MongoDB documentation content to the user's query on a scale of 0-10, where:
- 0 = Not relevant at all
- 5 = Somewhat relevant
- 10 = Highly relevant

Respond with just a number between 0-10.`;

      const userPrompt = `User Query: "${query}"

MongoDB Documentation Content:
${content.substring(0, 1000)}...`;

      const response = await this.llmClient.generateTextResponse(systemPrompt, userPrompt);
      const score = parseInt(response.trim());
      
      return isNaN(score) ? 0 : Math.max(0, Math.min(10, score));

    } catch (error) {
      console.warn('Error assessing content relevance:', error);
      return 0;
    }
  }

  /**
   * Fetch content from a specific MongoDB docs page
   */
  private async fetchPageContent(url: string, category: string, keywords: string[]): Promise<DocumentationContent | null> {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'MongoDB-Docs-Fetcher/1.0'
        }
      });

      const $ = cheerio.load(response.data);
      
      // Extract title
      const title = $('h1').first().text().trim() || 
                   $('title').text().trim() || 
                   'MongoDB Documentation';

      // Extract main content
      const content = $('main, .content, .documentation-content').text().trim() ||
                     $('body').text().trim();

      if (!content || content.length < 100) {
        return null;
      }

      return {
        title,
        url,
        content: content.substring(0, 5000), // Limit content size
        lastUpdated: new Date(),
        category,
        keywords
      };

    } catch (error) {
      console.warn(`Error fetching page ${url}:`, error);
      return null;
    }
  }

  /**
   * Format search results for LLM consumption
   */
  private formatSearchResults(results: DocumentationSearchResult[]): string {
    let formatted = 'MongoDB Official Documentation:\n\n';

    results.forEach((result, index) => {
      formatted += `${index + 1}. ${result.content.title}\n`;
      formatted += `   URL: ${result.content.url}\n`;
      formatted += `   Category: ${result.content.category}\n`;
      formatted += `   Relevance: ${result.relevanceScore}/10\n`;
      formatted += `   Content: ${result.content.content.substring(0, 1000)}...\n\n`;
    });

    return formatted;
  }

  /**
   * Check if cache should be refreshed
   */
  private shouldRefreshCache(): boolean {
    if (!this.cache) {
      return true;
    }

    const now = new Date();
    const cacheAge = now.getTime() - this.cache.lastFetch.getTime();
    return cacheAge > this.maxCacheAge;
  }

  /**
   * Load cache from file
   */
  private loadCache(): void {
    try {
      if (fs.existsSync(this.cacheFilePath)) {
        const cacheData = fs.readFileSync(this.cacheFilePath, 'utf8');
        this.cache = JSON.parse(cacheData);
        
        // Convert date strings back to Date objects
        if (this.cache) {
          this.cache.lastFetch = new Date(this.cache.lastFetch);
          this.cache.content.forEach(content => {
            content.lastUpdated = new Date(content.lastUpdated);
          });
        }
      }
    } catch (error) {
      console.warn('Error loading MongoDB docs cache:', error);
      this.cache = null;
    }
  }

  /**
   * Save cache to file
   */
  private saveCache(): void {
    try {
      fs.writeFileSync(this.cacheFilePath, JSON.stringify(this.cache, null, 2));
    } catch (error) {
      console.warn('Error saving MongoDB docs cache:', error);
    }
  }

  /**
   * Get cache status
   */
  getCacheStatus(): { hasCache: boolean; lastFetch?: Date; totalPages?: number } {
    return {
      hasCache: !!this.cache,
      lastFetch: this.cache?.lastFetch,
      totalPages: this.cache?.totalPages
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache = null;
    if (fs.existsSync(this.cacheFilePath)) {
      fs.unlinkSync(this.cacheFilePath);
    }
  }
}
