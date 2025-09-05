/**
 * Azure OpenAI LLM Client for Intent Mapping
 * Handles communication with Azure OpenAI GPT-4o for intent classification
 */

import OpenAI from 'openai';
import { IntentResult, IntentContext, IntentMappingResult } from '../types/intent-types.js';

export interface LLMConfig {
  apiKey: string;
  endpoint: string;
  deploymentName: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
}

export interface LLMResponse {
  success: boolean;
  data?: any;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class LLMClient {
  private static instance: LLMClient | null = null;
  private openai: OpenAI | null = null;
  private config: LLMConfig | null = null;
  private initialized: boolean = false;

  private constructor() {}

  static getInstance(): LLMClient {
    if (!LLMClient.instance) {
      LLMClient.instance = new LLMClient();
    }
    return LLMClient.instance;
  }

  /**
   * Initialize the LLM client with Azure OpenAI configuration
   */
  async initialize(config: LLMConfig): Promise<void> {
    try {
      this.config = {
        maxTokens: 2000,
        temperature: 0.1, // Low temperature for consistent intent classification
        timeout: 30000, // 30 seconds timeout
        ...config
      };

      this.openai = new OpenAI({
        apiKey: this.config.apiKey,
        baseURL: `${this.config.endpoint}/openai/deployments/${this.config.deploymentName}`,
        defaultQuery: {
          'api-version': '2024-02-15-preview'
        }
      });
      this.initialized = true;

      console.log('✅ LLM Client initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize LLM Client:', error);
      throw error;
    }
  }

  /**
   * Check if the LLM client is initialized
   */
  isInitialized(): boolean {
    return this.initialized && this.openai !== null;
  }

  /**
   * Classify user intent using LLM
   */
  async classifyIntent(
    userInput: string, 
    context?: IntentContext
  ): Promise<LLMResponse> {
    if (!this.isInitialized()) {
      return {
        success: false,
        error: 'LLM Client not initialized'
      };
    }

    try {
      const systemPrompt = this.buildSystemPrompt();
      const userPrompt = this.buildUserPrompt(userInput, context);

      const response = await this.openai!.chat.completions.create({
        model: this.config!.deploymentName,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        max_tokens: this.config!.maxTokens,
        temperature: this.config!.temperature,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return {
          success: false,
          error: 'No response content from LLM'
        };
      }

      let intentResult;
      try {
        intentResult = JSON.parse(content);
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        console.error('LLM Response Content:', content);
        return {
          success: false,
          error: `JSON parsing failed: ${parseError instanceof Error ? parseError.message : String(parseError)}. Content: ${content.substring(0, 200)}...`
        };
      }
      
      return {
        success: true,
        data: intentResult,
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0
        }
      };
    } catch (error) {
      console.error('❌ LLM Intent Classification failed:', error);
      return {
        success: false,
        error: `LLM classification failed: ${error}`
      };
    }
  }

  /**
   * Build system prompt for intent classification
   */
  private buildSystemPrompt(): string {
    return `You are an intelligent intent classification system for a database migration and analysis agent. Your job is to understand user requests and classify them into specific intents.

AVAILABLE INTENTS:
1. DATABASE_OPERATIONS:
   - postgresql_query: SQL queries, CRUD operations on PostgreSQL
   - postgresql_schema_analysis: Analyzing PostgreSQL database structure
   - postgresql_table_operations: Creating, modifying, dropping tables
   - mongodb_operations: MongoDB CRUD operations
   - mongodb_collection_operations: MongoDB collection management
   - database_status_check: Checking database connection status

2. SCHEMA_ANALYSIS:
   - er_diagram_generation: Creating entity relationship diagrams
   - schema_documentation: Generating schema documentation
   - schema_comparison: Comparing database schemas
   - mongodb_schema_generation: Converting PostgreSQL to MongoDB schema

3. MIGRATION:
   - migration_planning: Planning database migrations
   - migration_analysis: Analyzing migration dependencies and ordering (database-focused)
   - migration_execution: Executing migrations
   - migration_dependencies: Analyzing migration dependencies

4. VISUALIZATION:
   - diagram_generation: Creating various types of diagrams
   - data_visualization: Visualizing data
   - schema_visualization: Visualizing database schemas

5. CODE_ANALYSIS:
   - github_repository_analysis: Analyzing source code (local or GitHub repositories)
   - github_code_analysis: Analyzing code in repositories
   - github_repository_cloning: Cloning repositories
   - github_schema_extraction: Extracting schemas from code

6. SYSTEM_STATUS:
   - system_health_check: Checking system health
   - connection_status: Checking connection status
   - service_status: Checking service status

7. HELP_AND_GUIDANCE:
   - help_request: User asking for help
   - command_guidance: Guidance on commands
   - feature_explanation: Explaining features
   - tutorial_request: Requesting tutorials

8. RATIONALE_CONVERSATION:
   - rationale_query: General questions about reasoning and decision-making
   - design_decision_explanation: Questions about why specific design decisions were made
   - schema_transformation_rationale: Questions about why schema transformations were chosen
   - migration_rationale: Questions about migration approach and strategy reasoning
   - embedding_rationale: Questions about why fields were embedded in documents
   - grouping_rationale: Questions about why tables/collections were grouped together

9. MONGODB_DOCUMENTATION:
   - mongodb_documentation_query: General questions about MongoDB features and capabilities
   - mongodb_best_practices: Questions about MongoDB best practices and recommendations
   - mongodb_feature_explanation: Questions about specific MongoDB features and how they work
   - mongodb_official_guidance: Questions requiring official MongoDB documentation and guidance

10. CONFIGURATION:
   - credential_setup: Setting up credentials
   - configuration_change: Changing configuration
   - settings_management: Managing settings

11. COMPLEX_OPERATIONS:
   - comprehensive_analysis: Multi-step analysis
   - end_to_end_migration: Complete migration process
   - business_context_analysis: Business context analysis

12. FALLBACK:
    - unknown_intent: Intent not recognized
    - ambiguous_intent: Multiple possible intents

RESPONSE FORMAT:
Return a JSON object with:
{
  "intent": "specific_intent_type",
  "confidence": 0.0-1.0,
  "entities": {
    "databases": ["postgresql", "mongodb"],
    "actions": ["analyze", "create"],
    "targets": ["schema", "table"],
    "modifiers": ["comprehensive", "detailed"],
    "context": ["business", "technical"]
  },
  "reasoning": "Brief explanation of why this intent was chosen",
  "suggestedActions": ["action1", "action2"],
  "requiresConfirmation": false,
  "estimatedComplexity": "low|medium|high"
}

GUIDELINES:
- Be precise in intent classification
- Extract relevant entities from the input
- Provide confidence scores based on clarity
- Consider context and previous interactions
- Handle ambiguous requests gracefully
- Prioritize user intent over exact keyword matching

CRITICAL DISTINCTIONS:
- "analyze my codes" or "analyze my source code" → github_repository_analysis (code analysis)
- "analyze migration" or "migration dependencies" → migration_analysis (database migration planning)
- "analyze codes for migration" → github_repository_analysis (analyzing code to understand migration needs)
- "plan migration" or "migration strategy" → migration_planning (planning database migration)

RATIONALE CONVERSATION EXAMPLES:
- "why did you embed [field] in [collection]" → embedding_rationale
- "explain the rationale behind this transformation" → schema_transformation_rationale
- "why was this approach chosen for the migration" → migration_rationale
- "what's the reasoning behind grouping these tables" → grouping_rationale
- "why did you make this design decision" → design_decision_explanation
- "explain why you converted this table to a collection" → schema_transformation_rationale
- "How many fields does the [table] have?" → rationale_query
- "What tables are in the PostgreSQL database?" → rationale_query
- "What's the relationship between [table1] and [table2]?" → rationale_query
- "How many collections are in MongoDB?" → rationale_query
- "What's the migration strategy for this database?" → rationale_query

MONGODB DOCUMENTATION EXAMPLES:
- "What are MongoDB best practices for indexing?" → mongodb_best_practices
- "How do MongoDB transactions work?" → mongodb_feature_explanation
- "What's the recommended way to handle MongoDB aggregation?" → mongodb_official_guidance
- "How to optimize MongoDB performance?" → mongodb_best_practices
- "What is MongoDB Atlas vector search?" → mongodb_feature_explanation
- "MongoDB data modeling best practices" → mongodb_best_practices
- "How to use MongoDB Compass?" → mongodb_documentation_query
- "MongoDB official migration tools" → mongodb_official_guidance

CRITICAL PRIORITY RULES:
1. ANY question about existing schema data (tables, fields, relationships, collections) → prioritize RATIONALE_CONVERSATION intents
2. Questions starting with "How", "What", "Why", "When", "Where" about schema → rationale_query
3. Questions about existing analysis results → rationale_query
4. Only use analysis intents (postgresql_schema_analysis, mongodb_operations) for NEW analysis requests

When user mentions "codes", "source code", "repository", "files" → prioritize CODE_ANALYSIS intents
When user mentions "migration", "dependencies", "phases" → prioritize MIGRATION intents
When user asks "why", "rationale", "reason", "explain the decision" → prioritize RATIONALE_CONVERSATION intents
When user asks about existing schema data → prioritize RATIONALE_CONVERSATION intents`;
  }

  /**
   * Build user prompt with context
   */
  private buildUserPrompt(userInput: string, context?: IntentContext): string {
    let prompt = `User Input: "${userInput}"\n\n`;

    if (context) {
      if (context.previousIntents && context.previousIntents.length > 0) {
        prompt += `Previous Intents: ${context.previousIntents.join(', ')}\n`;
      }
      
      if (context.currentDatabase) {
        prompt += `Current Database: ${context.currentDatabase}\n`;
      }
      
      if (context.currentOperation) {
        prompt += `Current Operation: ${context.currentOperation}\n`;
      }
      
      if (context.userPreferences) {
        prompt += `User Preferences: ${JSON.stringify(context.userPreferences)}\n`;
      }
    }

    prompt += `\nPlease classify this user input and return the intent classification in JSON format.`;

    return prompt;
  }

  /**
   * Generate a general text response using the LLM
   */
  async generateTextResponse(systemPrompt: string, userPrompt: string): Promise<string> {
    if (!this.isInitialized()) {
      throw new Error('LLM Client not initialized');
    }

    try {
      const response = await this.openai!.chat.completions.create({
        model: this.config!.deploymentName,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        max_tokens: this.config!.maxTokens || 2000,
        temperature: this.config!.temperature || 0.7
      });

      return response.choices[0]?.message?.content || 'No response generated';
    } catch (error) {
      throw new Error(`Failed to generate text response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Test the LLM connection
   */
  async testConnection(): Promise<LLMResponse> {
    if (!this.isInitialized()) {
      return {
        success: false,
        error: 'LLM Client not initialized'
      };
    }

    try {
      const response = await this.openai!.chat.completions.create({
        model: this.config!.deploymentName,
        messages: [
          {
            role: 'user',
            content: 'Hello, please respond with "Connection successful"'
          }
        ],
        max_tokens: 50,
        temperature: 0
      });

      return {
        success: true,
        data: response.choices[0]?.message?.content,
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Connection test failed: ${error}`
      };
    }
  }

  /**
   * Get configuration status
   */
  getConfigStatus(): {
    initialized: boolean;
    hasConfig: boolean;
    endpoint?: string;
    deploymentName?: string;
  } {
    return {
      initialized: this.initialized,
      hasConfig: this.config !== null,
      endpoint: this.config?.endpoint,
      deploymentName: this.config?.deploymentName
    };
  }
}
