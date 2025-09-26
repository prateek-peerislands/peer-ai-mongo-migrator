import { AzureOpenAIConfig, ModificationContext, IntelligentModificationSuggestion } from '../types/modification-types.js';
import { MongoDBCollectionSchema } from './MongoDBSchemaGenerator.js';

export class AzureOpenAIService {
  private config: AzureOpenAIConfig;
  private configured: boolean = false;

  constructor(config?: AzureOpenAIConfig) {
    this.config = config || this.loadConfigFromEnvironment();
    this.configured = this.validateConfig();
  }

  /**
   * Load configuration from environment variables
   */
  private loadConfigFromEnvironment(): AzureOpenAIConfig {
    return {
      endpoint: process.env.AZURE_OPENAI_ENDPOINT || '',
      apiKey: process.env.AZURE_OPENAI_API_KEY || '',
      deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o',
      apiVersion: '2024-02-15-preview'
    };
  }

  /**
   * Validate configuration
   */
  private validateConfig(): boolean {
    return !!(
      this.config.endpoint &&
      this.config.apiKey &&
      this.config.deploymentName &&
      this.config.apiVersion
    );
  }

  /**
   * Process modification request using Azure OpenAI
   */
  async processModificationRequest(
    modificationDescription: string,
    context: ModificationContext
  ): Promise<{
    success: boolean;
    modifiedSchema: MongoDBCollectionSchema[];
    reasoning: string;
    warnings: string[];
    recommendations: string[];
    error?: string;
  }> {
    try {
      if (!this.configured) {
        throw new Error('Azure OpenAI not configured. Please set environment variables.');
      }

      console.log('🤖 Processing modification request with Azure OpenAI...');

      const prompt = this.buildModificationPrompt(modificationDescription, context);
      const response = await this.callAzureOpenAI(prompt);

      return this.parseModificationResponse(response, context.currentMongoDBSchema);

    } catch (error) {
      console.error('❌ Azure OpenAI modification processing failed:', error);
      return {
        success: false,
        modifiedSchema: context.currentMongoDBSchema,
        reasoning: 'Failed to process modification request',
        warnings: ['Azure OpenAI processing failed'],
        recommendations: ['Please check your Azure OpenAI configuration'],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get intelligent modification suggestions
   */
  async getModificationSuggestions(
    context: ModificationContext
  ): Promise<IntelligentModificationSuggestion[]> {
    try {
      if (!this.configured) {
        return this.getFallbackSuggestions();
      }

      console.log('💡 Generating intelligent modification suggestions...');

      const prompt = this.buildSuggestionPrompt(context);
      const response = await this.callAzureOpenAI(prompt);

      return this.parseSuggestionResponse(response);

    } catch (error) {
      console.error('❌ Failed to generate suggestions:', error);
      return this.getFallbackSuggestions();
    }
  }

  /**
   * Build modification prompt for Azure OpenAI
   */
  private buildModificationPrompt(
    modificationDescription: string,
    context: ModificationContext
  ): string {
    return `You are an expert MongoDB schema designer. You need to modify a proposed MongoDB schema based on a developer's request.

CURRENT MONGODB SCHEMA:
${JSON.stringify(context.currentMongoDBSchema, null, 2)}

ORIGINAL POSTGRESQL SCHEMA:
${JSON.stringify(context.originalPostgreSQLSchema, null, 2)}

MODIFICATION REQUEST:
"${modificationDescription}"

BUSINESS REQUIREMENTS:
${context.businessRequirements?.join(', ') || 'Not specified'}

PERFORMANCE CONSTRAINTS:
${context.performanceConstraints?.join(', ') || 'Not specified'}

MODIFICATION HISTORY:
${context.modificationHistory.map(m => `- ${m.modificationDescription} (${m.status})`).join('\n')}

Please provide a modified MongoDB schema that addresses the developer's request while maintaining:
1. MongoDB best practices
2. Query performance optimization
3. Data consistency
4. Scalability considerations

Respond with a JSON object containing:
{
  "modifiedSchema": [/* array of MongoDBCollectionSchema objects */],
  "reasoning": "explanation of changes made",
  "warnings": ["any potential issues or concerns"],
  "recommendations": ["suggestions for further optimization"]
}`;
  }

  /**
   * Build suggestion prompt for Azure OpenAI
   */
  private buildSuggestionPrompt(context: ModificationContext): string {
    return `You are an expert MongoDB schema designer. Analyze the current MongoDB schema and provide intelligent suggestions for improvement.

CURRENT MONGODB SCHEMA:
${JSON.stringify(context.currentMongoDBSchema, null, 2)}

ORIGINAL POSTGRESQL SCHEMA:
${JSON.stringify(context.originalPostgreSQLSchema, null, 2)}

BUSINESS REQUIREMENTS:
${context.businessRequirements?.join(', ') || 'Not specified'}

PERFORMANCE CONSTRAINTS:
${context.performanceConstraints?.join(', ') || 'Not specified'}

Please provide 3-5 intelligent suggestions for schema improvements, considering:
1. Query performance optimization
2. Data modeling best practices
3. Scalability improvements
4. Business logic alignment

Respond with a JSON array of suggestions:
[
  {
    "suggestion": "brief description of the suggestion",
    "reasoning": "why this suggestion would be beneficial",
    "impact": "LOW|MEDIUM|HIGH",
    "effort": "LOW|MEDIUM|HIGH",
    "benefits": ["list of benefits"],
    "risks": ["list of potential risks"],
    "implementation": "brief implementation guidance"
  }
]`;
  }

  /**
   * Call Azure OpenAI API
   */
  private async callAzureOpenAI(prompt: string): Promise<string> {
    const url = `${this.config.endpoint}/openai/deployments/${this.config.deploymentName}/chat/completions?api-version=${this.config.apiVersion}`;
    
    const requestBody = {
      messages: [
        {
          role: 'system',
          content: 'You are an expert MongoDB schema designer with deep knowledge of database optimization, data modeling, and migration strategies.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 4000,
      temperature: 0.3,
      top_p: 0.9,
      frequency_penalty: 0,
      presence_penalty: 0
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.config.apiKey
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Azure OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as any;
    return data.choices[0].message.content;
  }

  /**
   * Parse modification response from Azure OpenAI
   */
  private parseModificationResponse(
    response: string,
    currentSchema: MongoDBCollectionSchema[]
  ): {
    success: boolean;
    modifiedSchema: MongoDBCollectionSchema[];
    reasoning: string;
    warnings: string[];
    recommendations: string[];
    error?: string;
  } {
    try {
      // Extract JSON from response (handle cases where response includes markdown)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        success: true,
        modifiedSchema: parsed.modifiedSchema || currentSchema,
        reasoning: parsed.reasoning || 'No reasoning provided',
        warnings: parsed.warnings || [],
        recommendations: parsed.recommendations || []
      };
    } catch (error) {
      return {
        success: false,
        modifiedSchema: currentSchema,
        reasoning: 'Failed to parse Azure OpenAI response',
        warnings: ['Response parsing failed'],
        recommendations: ['Please try rephrasing your modification request'],
        error: error instanceof Error ? error.message : 'Unknown parsing error'
      };
    }
  }

  /**
   * Parse suggestion response from Azure OpenAI
   */
  private parseSuggestionResponse(response: string): IntelligentModificationSuggestion[] {
    try {
      // Extract JSON array from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('Failed to parse suggestions:', error);
      return this.getFallbackSuggestions();
    }
  }

  /**
   * Get fallback suggestions when Azure OpenAI is not available
   */
  private getFallbackSuggestions(): IntelligentModificationSuggestion[] {
    return [
      {
        suggestion: 'Consider embedding frequently accessed related data',
        reasoning: 'Embedding can improve query performance by reducing the need for joins',
        impact: 'HIGH',
        effort: 'MEDIUM',
        benefits: ['Faster queries', 'Reduced network calls', 'Better data locality'],
        risks: ['Larger document size', 'More complex updates'],
        implementation: 'Identify one-to-many relationships that are frequently queried together'
      },
      {
        suggestion: 'Add compound indexes for common query patterns',
        reasoning: 'Proper indexing can significantly improve query performance',
        impact: 'HIGH',
        effort: 'LOW',
        benefits: ['Faster queries', 'Better performance', 'Reduced CPU usage'],
        risks: ['Additional storage overhead', 'Slower writes'],
        implementation: 'Analyze query patterns and create indexes on frequently queried field combinations'
      },
      {
        suggestion: 'Consider denormalization for read-heavy workloads',
        reasoning: 'Denormalization can improve read performance at the cost of some data consistency',
        impact: 'MEDIUM',
        effort: 'HIGH',
        benefits: ['Faster reads', 'Simplified queries', 'Better performance'],
        risks: ['Data duplication', 'Consistency challenges', 'More complex updates'],
        implementation: 'Identify data that is frequently read together and consider duplicating it'
      }
    ];
  }

  /**
   * Check if Azure OpenAI is configured
   */
  isConfigured(): boolean {
    return this.configured;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AzureOpenAIConfig>): void {
    this.config = { ...this.config, ...config };
    this.configured = this.validateConfig();
  }
}
