/**
 * Enhanced Document-Aware Agent
 * Makes the agent truly dynamic and portable with intent-based matching
 * No hardcoded values - adapts to any PostgreSQL and MongoDB database
 */

import { RationaleConversationService, AnalysisContext, RationaleResponse } from './RationaleConversationService.js';
import { MCPAgent } from '../core/MCPAgent.js';
import { DatabaseConfig } from '../types/index.js';
import { LLMClient } from './LLMClient.js';
import chalk from 'chalk';

export interface SmartQueryResponse {
  answer: string;
  suggestions: string[];
  needsFiles: boolean;
  generatedFiles: string[];
  context: {
    sourceFiles: string[];
    analysisType: 'postgres' | 'mongodb' | 'migration' | 'comparison';
    intent: string;
    confidence: number;
  };
}

export interface QueryIntent {
  intent: string;
  confidence: number;
  requiresFiles: string[];
  suggestedActions: string[];
}

export class EnhancedDocumentAwareAgent {
  private rationaleService: RationaleConversationService;
  private mcpAgent: MCPAgent;
  private llmClient: LLMClient;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
    this.rationaleService = new RationaleConversationService();
    this.mcpAgent = new MCPAgent(config);
    this.llmClient = LLMClient.getInstance();
  }

  /**
   * Initialize the enhanced agent
   */
  async initialize(): Promise<void> {
    await this.mcpAgent.initialize();
    console.log('🧠 Enhanced Document-Aware Agent initialized');
  }

  /**
   * Handle any type of query with smart context awareness
   */
  async handleSmartQuery(userQuery: string, projectPath: string = process.cwd()): Promise<SmartQueryResponse> {
    try {
      // Analyze query intent using LLM
      const intent = await this.analyzeQueryIntent(userQuery);
      
      // Check if we have the required files
      const context = await this.rationaleService['detectAnalysisContext'](projectPath);
      const hasRequiredFiles = this.checkRequiredFiles(intent.requiresFiles, context);
      
      if (hasRequiredFiles) {
        // Answer with existing context
        const rationaleResponse = await this.rationaleService.handleRationaleQuery(userQuery, projectPath);
        return this.enhanceResponseWithIntent(rationaleResponse, intent, userQuery);
      } else {
        // Generate smart suggestions based on intent
        return this.generateIntentBasedSuggestions(userQuery, intent, context);
      }
      
    } catch (error) {
      console.error('Error in smart query handling:', error);
      return {
        answer: `I encountered an error while processing your question: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        suggestions: ['Check if the required analysis files are available', 'Try rephrasing your question'],
        needsFiles: true,
        generatedFiles: [],
        context: {
          sourceFiles: [],
          analysisType: 'comparison',
          intent: 'error',
          confidence: 0
        }
      };
    }
  }

  /**
   * Analyze query intent using LLM for dynamic intent detection
   */
  private async analyzeQueryIntent(query: string): Promise<QueryIntent> {
    const systemPrompt = `You are an expert at analyzing database-related queries. Analyze the user's question and determine:

1. INTENT: What is the user trying to accomplish? (schema_analysis, data_migration, performance_analysis, relationship_analysis, data_comparison, etc.)
2. CONFIDENCE: How confident are you in this intent? (0.0 to 1.0)
3. REQUIRES_FILES: Which analysis files would be most helpful? (postgres, mongodb, migration, or combination)
4. SUGGESTED_ACTIONS: What specific actions would help answer this question?

Respond in JSON format:
{
  "intent": "specific_intent_name",
  "confidence": 0.85,
  "requiresFiles": ["postgres", "mongodb"],
  "suggestedActions": ["analyze_schema", "compare_structures", "explain_relationships"]
}

Be specific and avoid generic responses. Focus on what the user actually needs.`;

    const userPrompt = `Analyze this database query: "${query}"

Consider:
- Is this about understanding schema structure?
- Is this about data migration or transformation?
- Is this about performance or optimization?
- Is this about relationships between data?
- Is this about comparing different databases?
- What specific information would be most helpful?

Respond with the JSON analysis.`;

    try {
      const response = await this.llmClient.generateTextResponse(systemPrompt, userPrompt);

      // Clean the response to extract JSON
      let cleanResponse = response.trim();
      
      // Remove markdown code blocks if present
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      // Try to extract JSON from the response
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanResponse = jsonMatch[0];
      }

      const intentData = JSON.parse(cleanResponse);
      return {
        intent: intentData.intent || 'general_query',
        confidence: intentData.confidence || 0.5,
        requiresFiles: intentData.requiresFiles || [],
        suggestedActions: intentData.suggestedActions || []
      };
    } catch (error) {
      console.warn('Failed to analyze intent with LLM, using fallback:', error);
      return this.fallbackIntentAnalysis(query);
    }
  }

  /**
   * Fallback intent analysis when LLM fails
   */
  private fallbackIntentAnalysis(query: string): QueryIntent {
    const queryLower = query.toLowerCase();
    
    // More sophisticated pattern matching
    if (this.matchesPattern(queryLower, ['how many', 'count', 'number of', 'total'])) {
      return {
        intent: 'count_analysis',
        confidence: 0.8,
        requiresFiles: ['postgres', 'mongodb'],
        suggestedActions: ['count_tables', 'count_collections', 'analyze_schema']
      };
    }

    if (this.matchesPattern(queryLower, ['relationship', 'foreign key', 'reference', 'link', 'connect'])) {
      return {
        intent: 'relationship_analysis',
        confidence: 0.8,
        requiresFiles: ['postgres', 'mongodb', 'migration'],
        suggestedActions: ['analyze_relationships', 'explain_foreign_keys', 'show_connections']
      };
    }

    if (this.matchesPattern(queryLower, ['migrate', 'transform', 'convert', 'change', 'move'])) {
      return {
        intent: 'migration_analysis',
        confidence: 0.8,
        requiresFiles: ['postgres', 'mongodb', 'migration'],
        suggestedActions: ['analyze_migration', 'explain_transformations', 'show_strategy']
      };
    }

    if (this.matchesPattern(queryLower, ['compare', 'difference', 'vs', 'versus', 'between'])) {
      return {
        intent: 'comparison_analysis',
        confidence: 0.8,
        requiresFiles: ['postgres', 'mongodb'],
        suggestedActions: ['compare_schemas', 'show_differences', 'analyze_mapping']
      };
    }

    if (this.matchesPattern(queryLower, ['performance', 'optimize', 'index', 'speed', 'fast'])) {
      return {
        intent: 'performance_analysis',
        confidence: 0.8,
        requiresFiles: ['postgres', 'mongodb'],
        suggestedActions: ['analyze_performance', 'suggest_indexes', 'optimize_queries']
      };
    }

    // Default to general schema analysis
    return {
      intent: 'schema_analysis',
      confidence: 0.6,
      requiresFiles: ['postgres', 'mongodb'],
      suggestedActions: ['analyze_schema', 'explain_structure', 'show_tables']
    };
  }

  /**
   * Check if multiple patterns match the query
   */
  private matchesPattern(query: string, patterns: string[]): boolean {
    return patterns.some(pattern => query.includes(pattern));
  }

  /**
   * Check if required files are available
   */
  private checkRequiredFiles(requiredFiles: string[], context: AnalysisContext): boolean {
    return requiredFiles.every(fileType => {
      switch (fileType) {
        case 'postgres':
          return !!context.latestFiles.postgres;
        case 'mongodb':
          return !!context.latestFiles.mongodb;
        case 'migration':
          return !!context.latestFiles.migration;
        default:
          return false;
      }
    });
  }

  /**
   * Enhance response with intent-based suggestions
   */
  private enhanceResponseWithIntent(response: RationaleResponse, intent: QueryIntent, query: string): SmartQueryResponse {
    const suggestions = this.generateIntentBasedSuggestionsForResponse(query, intent, response.context.analysisType);
    
    return {
      answer: response.answer,
      suggestions,
      needsFiles: false,
      generatedFiles: response.context.sourceFiles,
      context: {
        ...response.context,
        intent: intent.intent,
        confidence: intent.confidence
      }
    };
  }

  /**
   * Generate suggestions based on detected intent
   */
  private generateIntentBasedSuggestionsForResponse(query: string, intent: QueryIntent, analysisType: string): string[] {
    const suggestions: string[] = [];
    
    // Intent-specific suggestions
    switch (intent.intent) {
      case 'count_analysis':
        suggestions.push('Ask about specific table or collection counts');
        suggestions.push('Inquire about field counts in specific tables');
        suggestions.push('Ask about relationship counts between entities');
        break;
        
      case 'relationship_analysis':
        suggestions.push('Ask about specific foreign key relationships');
        suggestions.push('Inquire about embedded document structures');
        suggestions.push('Ask about data integrity constraints');
        break;
        
      case 'migration_analysis':
        suggestions.push('Ask about specific transformation strategies');
        suggestions.push('Inquire about data mapping challenges');
        suggestions.push('Ask about migration performance considerations');
        break;
        
      case 'comparison_analysis':
        suggestions.push('Compare specific tables and collections');
        suggestions.push('Ask about data type differences');
        suggestions.push('Inquire about structural similarities');
        break;
        
      case 'performance_analysis':
        suggestions.push('Ask about indexing strategies');
        suggestions.push('Inquire about query optimization opportunities');
        suggestions.push('Ask about database performance metrics');
        break;
        
      default:
        suggestions.push('Ask about specific database structures');
        suggestions.push('Inquire about data relationships');
        suggestions.push('Ask about migration strategies');
    }
    
    // Add context-aware suggestions
    if (analysisType === 'postgres') {
      suggestions.push('Ask about MongoDB equivalent structures');
    } else if (analysisType === 'mongodb') {
      suggestions.push('Ask about PostgreSQL source structures');
    } else if (analysisType === 'migration') {
      suggestions.push('Ask about specific transformation details');
    }
    
    return suggestions; // Show all suggestions
  }

  /**
   * Generate intent-based suggestions when files are missing
   */
  private generateIntentBasedSuggestions(query: string, intent: QueryIntent, context: AnalysisContext): SmartQueryResponse {
    const suggestions: string[] = [];
    const commands: string[] = [];
    
    // Generate suggestions based on intent requirements
    if (intent.requiresFiles.includes('postgres')) {
      suggestions.push('Generate PostgreSQL schema analysis to understand your source database structure');
      commands.push('npm run dev -- schema --analyze --postgres');
    }
    
    if (intent.requiresFiles.includes('mongodb')) {
      suggestions.push('Generate MongoDB schema analysis to understand your target database structure');
      commands.push('npm run dev -- schema --analyze --mongo');
    }
    
    if (intent.requiresFiles.includes('migration')) {
      suggestions.push('Generate migration analysis to understand the transformation strategy');
      commands.push('npm run dev -- migrate --analyze');
    }
    
    // Add intent-specific suggestions
    suggestions.push(...intent.suggestedActions.map(action => 
      `Ask about ${action.replace(/_/g, ' ')} once analysis is complete`
    ));
    
    const answer = `I'd love to help you with that question! Based on your query, I need to analyze your database first.

**Detected Intent:** ${intent.intent} (confidence: ${Math.round(intent.confidence * 100)}%)

**Recommended next steps:**
${suggestions.map(s => `• ${s}`).join('\n')}

**Commands to run:**
${commands.map(c => `\`${c}\``).join('\n')}

**What I can help you with once analysis is complete:**
• Answer detailed questions about your database schema
• Explain relationships between tables and collections
• Provide migration rationale and strategies
• Help you understand data transformations
• Compare PostgreSQL and MongoDB structures
• Suggest optimization opportunities

**Example questions I can answer:**
• "How many tables are in my PostgreSQL database?"
• "What's the relationship between users and orders?"
• "Why was this data embedded in MongoDB?"
• "What's the migration strategy for this table?"
• "How many fields does the products table have?"

Just run the analysis commands above, and then ask me anything! 🚀`;

    return {
      answer,
      suggestions,
      needsFiles: true,
      generatedFiles: [],
      context: {
        sourceFiles: [],
        analysisType: 'comparison',
        intent: intent.intent,
        confidence: intent.confidence
      }
    };
  }

  /**
   * Get comprehensive database status
   */
  async getDatabaseStatus(): Promise<{
    postgresql: { connected: boolean; tableCount: number };
    mongodb: { connected: boolean; collectionCount: number };
    analysisFiles: {
      postgres: string | null;
      mongodb: string | null;
      migration: string | null;
    };
  }> {
    const status = this.mcpAgent.getStatus();
    
    // Check for analysis files
    const postgresFile = this.rationaleService['postgresParser'].findLatestPostgreSQLSchemaFile();
    const mongodbFile = this.rationaleService['mongodbParser'].findLatestMongoDBSchemaFile();
    const migrationFile = this.rationaleService['migrationParser'].findLatestMigrationAnalysisFile();
    
    return {
      postgresql: {
        connected: status.postgresql.connected,
        tableCount: status.postgresql.tableCount
      },
      mongodb: {
        connected: status.mongodb.connected,
        collectionCount: status.mongodb.collectionCount
      },
      analysisFiles: {
        postgres: postgresFile,
        mongodb: mongodbFile,
        migration: migrationFile
      }
    };
  }

  /**
   * Suggest next actions based on current state
   */
  async suggestNextActions(): Promise<string[]> {
    const status = await this.getDatabaseStatus();
    const suggestions = [];
    
    if (!status.postgresql.connected) {
      suggestions.push('Connect to PostgreSQL database');
    }
    
    if (!status.mongodb.connected) {
      suggestions.push('Connect to MongoDB database');
    }
    
    if (!status.analysisFiles.postgres) {
      suggestions.push('Generate PostgreSQL schema analysis: `npm run dev -- schema --analyze --postgres`');
    }
    
    if (!status.analysisFiles.mongodb) {
      suggestions.push('Generate MongoDB schema analysis: `npm run dev -- schema --analyze --mongo`');
    }
    
    if (!status.analysisFiles.migration) {
      suggestions.push('Generate migration analysis: `npm run dev -- migrate --analyze`');
    }
    
    if (suggestions.length === 0) {
      suggestions.push('Ask me anything about your database!');
      suggestions.push('Try: "What tables are in my database?"');
      suggestions.push('Try: "What\'s the migration strategy?"');
    }
    
    return suggestions;
  }
}