/**
 * Unified Knowledge Service
 * 
 * This service intelligently combines all 4 knowledge sources:
 * 1. PostgreSQL Analysis
 * 2. MongoDB Analysis  
 * 3. Migration Analysis
 * 4. MongoDB Official Documentation
 * 
 * Provides comprehensive answers by analyzing and cross-referencing all sources.
 */

import { LLMClient } from './LLMClient.js';
import { MongoDBDocumentationService } from './MongoDBDocumentationService.js';
import { PostgreSQLSchemaFileParser } from './PostgreSQLSchemaFileParser.js';
import { MongoDBSchemaFileParser } from './MongoDBSchemaFileParser.js';
import { MigrationAnalysisFileParser } from './MigrationAnalysisFileParser.js';
import chalk from 'chalk';

export interface KnowledgeContext {
  postgresSchema?: any;
  mongodbSchema?: any;
  migrationAnalysis?: any;
  mongodbDocumentation?: any;
  queryIntent?: string;
  relevantSources: string[];
}

export interface UnifiedResponse {
  answer: string;
  sources: {
    postgres?: boolean;
    mongodb?: boolean;
    migration?: boolean;
    mongodbDocs?: boolean;
  };
  compliance?: {
    isCompliant: boolean;
    warnings: string[];
    recommendations: string[];
  };
  confidence: number;
  reasoning: string;
}

export class UnifiedKnowledgeService {
  private static instance: UnifiedKnowledgeService | null = null;
  private llmClient: LLMClient;
  private mongodbDocsService: MongoDBDocumentationService;
  private postgresParser: PostgreSQLSchemaFileParser;
  private mongodbParser: MongoDBSchemaFileParser;
  private migrationParser: MigrationAnalysisFileParser;

  constructor() {
    this.llmClient = LLMClient.getInstance();
    this.mongodbDocsService = MongoDBDocumentationService.getInstance();
    this.postgresParser = new PostgreSQLSchemaFileParser();
    this.mongodbParser = new MongoDBSchemaFileParser();
    this.migrationParser = new MigrationAnalysisFileParser();
  }

  static getInstance(): UnifiedKnowledgeService {
    if (!UnifiedKnowledgeService.instance) {
      UnifiedKnowledgeService.instance = new UnifiedKnowledgeService();
    }
    return UnifiedKnowledgeService.instance;
  }

  /**
   * Main method to process any user query using all available knowledge sources
   */
  async processQuery(userQuery: string, projectPath: string = process.cwd()): Promise<UnifiedResponse> {
    try {
      console.log(chalk.blue(`🧠 Processing query with unified knowledge: "${userQuery}"`));
      
      // 1. Analyze query intent and determine relevant knowledge sources
      const queryAnalysis = await this.analyzeQueryIntent(userQuery);
      
      // 2. Gather relevant knowledge from all sources
      const knowledgeContext = await this.gatherKnowledgeContext(userQuery, projectPath, queryAnalysis);
      
      // 3. Generate comprehensive response using all relevant sources
      const response = await this.generateUnifiedResponse(userQuery, knowledgeContext, queryAnalysis);
      
      console.log(chalk.green(`✅ Unified knowledge response generated with confidence: ${response.confidence}`));
      
      return response;

    } catch (error) {
      console.error('❌ Unified knowledge processing failed:', error);
      return {
        answer: 'I apologize, but I encountered an error while processing your query. Please try again.',
        sources: {},
        confidence: 0,
        reasoning: 'Error occurred during knowledge processing'
      };
    }
  }

  /**
   * Analyze query intent and determine which knowledge sources are relevant
   */
  private async analyzeQueryIntent(query: string): Promise<{
    intent: string;
    requiresPostgres: boolean;
    requiresMongoDB: boolean;
    requiresMigration: boolean;
    requiresMongoDBDocs: boolean;
    confidence: number;
  }> {
    const queryLower = query.toLowerCase();
    
    // Determine which knowledge sources are needed
    const requiresPostgres = this.requiresPostgresKnowledge(queryLower);
    const requiresMongoDB = this.requiresMongoDBKnowledge(queryLower);
    const requiresMigration = this.requiresMigrationKnowledge(queryLower);
    const requiresMongoDBDocs = this.requiresMongoDBDocumentation(queryLower);
    
    // Classify intent using LLM
    const intentResult = await this.llmClient.classifyIntent(query);
    const intent = (intentResult as any).intent || 'general_query';
    const confidence = (intentResult as any).confidence || 0.8;
    
    return {
      intent,
      requiresPostgres,
      requiresMongoDB,
      requiresMigration,
      requiresMongoDBDocs,
      confidence
    };
  }

  /**
   * Gather knowledge context from all relevant sources
   */
  private async gatherKnowledgeContext(
    query: string, 
    projectPath: string, 
    queryAnalysis: any
  ): Promise<KnowledgeContext> {
    const context: KnowledgeContext = {
      relevantSources: []
    };

    // Gather PostgreSQL knowledge if needed
    if (queryAnalysis.requiresPostgres) {
      try {
        const postgresFile = this.postgresParser.findLatestPostgreSQLSchemaFile();
        if (postgresFile) {
          context.postgresSchema = await this.postgresParser.parsePostgreSQLSchemaFile(postgresFile);
          context.relevantSources.push('postgres');
          console.log(chalk.gray('📊 PostgreSQL schema loaded'));
        }
      } catch (error) {
        console.warn('Failed to load PostgreSQL schema:', error);
      }
    }

    // Gather MongoDB knowledge if needed
    if (queryAnalysis.requiresMongoDB) {
      try {
        const mongodbFile = this.mongodbParser.findLatestMongoDBSchemaFile(projectPath);
        if (mongodbFile) {
          context.mongodbSchema = await this.mongodbParser.parseSchemaFile(mongodbFile);
          context.relevantSources.push('mongodb');
          console.log(chalk.gray('🍃 MongoDB schema loaded'));
        }
      } catch (error) {
        console.warn('Failed to load MongoDB schema:', error);
      }
    }

    // Gather migration knowledge if needed
    if (queryAnalysis.requiresMigration) {
      try {
        const migrationFile = this.migrationParser.findLatestMigrationAnalysisFile(projectPath);
        if (migrationFile) {
          context.migrationAnalysis = await this.migrationParser.parseAnalysisFile(migrationFile);
          context.relevantSources.push('migration');
          console.log(chalk.gray('🔄 Migration analysis loaded'));
        }
      } catch (error) {
        console.warn('Failed to load migration analysis:', error);
      }
    }

    // Gather MongoDB documentation if needed
    if (queryAnalysis.requiresMongoDBDocs) {
      try {
        context.mongodbDocumentation = await this.mongodbDocsService.getRelevantDocumentation(query);
        context.relevantSources.push('mongodbDocs');
        console.log(chalk.gray('📚 MongoDB documentation loaded'));
      } catch (error) {
        console.warn('Failed to load MongoDB documentation:', error);
      }
    }

    return context;
  }

  /**
   * Generate unified response using all relevant knowledge sources
   */
  private async generateUnifiedResponse(
    query: string, 
    context: KnowledgeContext, 
    queryAnalysis: any
  ): Promise<UnifiedResponse> {
    
    // Build comprehensive system prompt with all relevant knowledge
    const systemPrompt = this.buildUnifiedSystemPrompt(context, queryAnalysis);
    
    // Build user prompt with specific query
    const userPrompt = this.buildUnifiedUserPrompt(query, context, queryAnalysis);
    
    // Generate response using LLM
    const response = await this.llmClient.generateTextResponse(systemPrompt, userPrompt);
    
    // Analyze compliance if MongoDB schema is involved
    const compliance = context.mongodbSchema ? 
      await this.analyzeCompliance(context.mongodbSchema, context.mongodbDocumentation) : 
      undefined;
    
    // Determine confidence based on available sources and response quality
    const confidence = this.calculateConfidence(context, queryAnalysis, response);
    
    // Generate reasoning for the response
    const reasoning = this.generateReasoning(context, queryAnalysis);
    
    return {
      answer: response,
      sources: {
        postgres: context.relevantSources.includes('postgres'),
        mongodb: context.relevantSources.includes('mongodb'),
        migration: context.relevantSources.includes('migration'),
        mongodbDocs: context.relevantSources.includes('mongodbDocs')
      },
      compliance,
      confidence,
      reasoning
    };
  }

  /**
   * Build unified system prompt with all relevant knowledge sources
   */
  private buildUnifiedSystemPrompt(context: KnowledgeContext, queryAnalysis: any): string {
    let prompt = `You are an expert database architect and migration specialist with access to comprehensive knowledge sources. Provide detailed, specific answers by intelligently combining information from all available sources.

AVAILABLE KNOWLEDGE SOURCES:
`;

    // Add PostgreSQL knowledge
    if (context.postgresSchema) {
      prompt += `
POSTGRESQL SCHEMA DATA:
${this.formatPostgreSQLData(context.postgresSchema)}
`;
    }

    // Add MongoDB knowledge
    if (context.mongodbSchema) {
      prompt += `
MONGODB SCHEMA DATA:
${this.formatMongoDBData(context.mongodbSchema)}
`;
    }

    // Add migration knowledge
    if (context.migrationAnalysis) {
      prompt += `
MIGRATION ANALYSIS DATA:
${this.formatMigrationData(context.migrationAnalysis)}
`;
    }

    // Add MongoDB documentation
    if (context.mongodbDocumentation) {
      prompt += `
MONGODB OFFICIAL DOCUMENTATION:
${context.mongodbDocumentation}
`;
    }

    prompt += `

RESPONSE REQUIREMENTS:
• Combine information from ALL relevant knowledge sources
• Provide specific examples from the actual schema data
• Reference MongoDB official best practices when applicable
• Explain the reasoning behind migration decisions
• Validate compliance with MongoDB standards
• Use bullet points (•) or numbers (1. 2. 3.) for clarity
• Be specific to this database schema and migration context
• Include technical details and business rationale
• When referencing MongoDB best practices, cite the official documentation
• NO generic examples - use only data from the actual schemas and official MongoDB docs

COMPLIANCE VALIDATION:
• Check if MongoDB schema follows official best practices
• Identify any non-standard patterns or configurations
• Suggest improvements based on MongoDB documentation
• Validate indexing strategies against official recommendations
• Ensure data modeling follows MongoDB guidelines`;

    return prompt;
  }

  /**
   * Build unified user prompt
   */
  private buildUnifiedUserPrompt(query: string, context: KnowledgeContext, queryAnalysis: any): string {
    let prompt = `User Question: "${query}"

QUERY ANALYSIS:
- Intent: ${queryAnalysis.intent}
- Confidence: ${queryAnalysis.confidence}
- Relevant Sources: ${context.relevantSources.join(', ')}

RESPONSE REQUIREMENTS:
1. Provide a comprehensive answer using ALL relevant knowledge sources
2. Cross-reference information between sources when applicable
3. Validate against MongoDB official standards
4. Explain the reasoning behind specific design decisions
5. Suggest improvements based on best practices
6. Be specific to this database schema and migration context`;

    return prompt;
  }

  /**
   * Analyze MongoDB schema compliance against official documentation
   */
  private async analyzeCompliance(mongodbSchema: any, mongodbDocs: string): Promise<{
    isCompliant: boolean;
    warnings: string[];
    recommendations: string[];
  }> {
    const warnings: string[] = [];
    const recommendations: string[] = [];
    
    // Basic compliance checks
    if (mongodbSchema && mongodbSchema.length > 0) {
      // Check for proper indexing
      const collectionsWithoutIndexes = mongodbSchema.filter((collection: any) => 
        !collection.indexes || collection.indexes.length === 0
      );
      
      if (collectionsWithoutIndexes.length > 0) {
        warnings.push(`${collectionsWithoutIndexes.length} collections lack proper indexing`);
        recommendations.push('Add appropriate indexes based on query patterns');
      }
      
      // Check for embedded document patterns
      const collectionsWithEmbeddedDocs = mongodbSchema.filter((collection: any) => 
        collection.embeddedDocuments && collection.embeddedDocuments.length > 0
      );
      
      if (collectionsWithEmbeddedDocs.length > 0) {
        recommendations.push('Review embedded document patterns for optimal performance');
      }
    }
    
    const isCompliant = warnings.length === 0;
    
    return {
      isCompliant,
      warnings,
      recommendations
    };
  }

  /**
   * Calculate response confidence based on available sources
   */
  private calculateConfidence(context: KnowledgeContext, queryAnalysis: any, response: string): number {
    let confidence = 0.5; // Base confidence
    
    // Increase confidence based on available sources
    if (context.relevantSources.includes('postgres')) confidence += 0.1;
    if (context.relevantSources.includes('mongodb')) confidence += 0.1;
    if (context.relevantSources.includes('migration')) confidence += 0.1;
    if (context.relevantSources.includes('mongodbDocs')) confidence += 0.1;
    
    // Increase confidence based on query analysis
    confidence += queryAnalysis.confidence * 0.2;
    
    // Increase confidence based on response length and detail
    if (response.length > 200) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Generate reasoning for the response
   */
  private generateReasoning(context: KnowledgeContext, queryAnalysis: any): string {
    const sources = context.relevantSources;
    let reasoning = `Response generated using ${sources.length} knowledge source(s): ${sources.join(', ')}.`;
    
    if (sources.includes('postgres') && sources.includes('mongodb')) {
      reasoning += ' Cross-referenced PostgreSQL and MongoDB schemas for comprehensive analysis.';
    }
    
    if (sources.includes('mongodbDocs')) {
      reasoning += ' Validated against MongoDB official documentation for best practices compliance.';
    }
    
    if (sources.includes('migration')) {
      reasoning += ' Incorporated migration strategy and rationale for context-aware recommendations.';
    }
    
    return reasoning;
  }

  // Knowledge source requirement detection methods
  private requiresPostgresKnowledge(query: string): boolean {
    const postgresKeywords = ['postgres', 'postgresql', 'table', 'column', 'relation', 'sql', 'schema'];
    return postgresKeywords.some(keyword => query.includes(keyword));
  }

  private requiresMongoDBKnowledge(query: string): boolean {
    const mongodbKeywords = ['mongo', 'mongodb', 'collection', 'document', 'embed', 'nosql'];
    return mongodbKeywords.some(keyword => query.includes(keyword));
  }

  private requiresMigrationKnowledge(query: string): boolean {
    const migrationKeywords = ['migrate', 'transform', 'convert', 'migration', 'strategy', 'approach'];
    return migrationKeywords.some(keyword => query.includes(keyword));
  }

  private requiresMongoDBDocumentation(query: string): boolean {
    const docsKeywords = ['best practice', 'recommendation', 'official', 'documentation', 'guide', 'how to', 'what is'];
    return docsKeywords.some(keyword => query.includes(keyword)) || 
           this.requiresMongoDBKnowledge(query);
  }

  // Data formatting methods
  private formatPostgreSQLData(schema: any): string {
    if (!schema || !schema.tables) return 'No PostgreSQL schema data available';
    
    return `Tables: ${schema.tables.length}
${schema.tables.map((table: any) => `- ${table.name}: ${table.columns?.length || 0} columns`).join('\n')}`;
  }

  private formatMongoDBData(schema: any): string {
    if (!schema || !Array.isArray(schema)) return 'No MongoDB schema data available';
    
    return `Collections: ${schema.length}
${schema.map((collection: any) => `- ${collection.name}: ${collection.fields?.length || 0} fields`).join('\n')}`;
  }

  private formatMigrationData(analysis: any): string {
    if (!analysis) return 'No migration analysis data available';
    
    return `Migration Analysis: ${analysis.phases?.length || 0} phases identified`;
  }
}
