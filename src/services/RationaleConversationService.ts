import fs from 'fs';
import path from 'path';
import { LLMClient } from './LLMClient.js';
import { IntentMappingService } from './IntentMappingService.js';
import { PostgreSQLSchemaFileParser } from './PostgreSQLSchemaFileParser.js';
// import { MongoDBSchemaFileParser } from './MongoDBSchemaFileParser.js';
// import { MigrationAnalysisFileParser } from './MigrationAnalysisFileParser.js';

export interface AnalysisContext {
  postgresSchema?: any;
  mongodbSchema?: any;
  migrationAnalysis?: any;
  latestFiles: {
    postgres?: string;
    mongodb?: string;
    migration?: string;
  };
}

export interface RationaleResponse {
  answer: string;
  context: {
    sourceFiles: string[];
    analysisType: 'postgres' | 'mongodb' | 'migration' | 'comparison';
  };
}

export class RationaleConversationService {
  private llmClient: LLMClient;
  private intentMappingService: IntentMappingService;
  private postgresParser: PostgreSQLSchemaFileParser;
  // private mongodbParser: MongoDBSchemaFileParser;
  // private migrationParser: MigrationAnalysisFileParser;

  constructor() {
    this.llmClient = LLMClient.getInstance();
    this.intentMappingService = IntentMappingService.getInstance();
    this.postgresParser = new PostgreSQLSchemaFileParser();
    // this.mongodbParser = new MongoDBSchemaFileParser();
    // this.migrationParser = new MigrationAnalysisFileParser();
  }

  /**
   * Main method to handle rationale conversation queries
   */
  async handleRationaleQuery(userQuery: string, projectPath: string = process.cwd()): Promise<RationaleResponse> {
    try {
      // 1. Detect available analysis files
      const context = await this.detectAnalysisContext(projectPath);
      
      // 2. Check if we have the necessary files
      if (!this.hasRequiredFiles(context, userQuery)) {
        return this.generateMissingFilesResponse(context, userQuery);
      }

      // 3. Parse relevant files based on query intent
      const parsedData = await this.parseRelevantFiles(context, userQuery);

      // 4. Generate rationale response using LLM
      const response = await this.generateRationaleResponse(userQuery, parsedData, context);

      return response;
    } catch (error) {
      console.error('Error in rationale conversation:', error);
      return {
        answer: `I encountered an error while processing your question: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again or check if the required analysis files are available.`,
        context: {
          sourceFiles: [],
          analysisType: 'comparison'
        }
      };
    }
  }

  /**
   * Detect available analysis files in the project directory
   */
  private async detectAnalysisContext(projectPath: string): Promise<AnalysisContext> {
    const files = fs.readdirSync(projectPath);
    
    // Find latest files by type
    const postgresFiles = files
      .filter(file => file.startsWith('postgres-schema-') && file.endsWith('.md'))
      .sort()
      .reverse();
    
    const mongodbFiles = files
      .filter(file => file.startsWith('mongodb-schema-') && file.endsWith('.md'))
      .sort()
      .reverse();
    
    const migrationFiles = files
      .filter(file => file.includes('-analysis-') && file.endsWith('.md'))
      .sort()
      .reverse();

    return {
      latestFiles: {
        postgres: postgresFiles[0] || undefined,
        mongodb: mongodbFiles[0] || undefined,
        migration: migrationFiles[0] || undefined
      }
    };
  }

  /**
   * Check if we have the required files for the query
   */
  private hasRequiredFiles(context: AnalysisContext, query: string): boolean {
    const queryLower = query.toLowerCase();
    
    // For rationale questions, we need at least one schema file
    if (this.isRationaleQuery(queryLower)) {
      return !!(context.latestFiles.postgres || context.latestFiles.mongodb);
    }
    
    // Check for PostgreSQL-related queries
    if (this.isPostgresQuery(queryLower)) {
      return !!context.latestFiles.postgres;
    }
    
    // Check for MongoDB-related queries
    if (this.isMongoDBQuery(queryLower)) {
      return !!context.latestFiles.mongodb;
    }
    
    // Check for migration/comparison queries
    if (this.isMigrationQuery(queryLower)) {
      return !!(context.latestFiles.postgres && context.latestFiles.mongodb);
    }
    
    // Default: need at least one schema file
    return !!(context.latestFiles.postgres || context.latestFiles.mongodb);
  }

  /**
   * Generate response when required files are missing
   */
  private generateMissingFilesResponse(context: AnalysisContext, query: string): RationaleResponse {
    const missingFiles = [];
    
    if (this.isPostgresQuery(query.toLowerCase()) && !context.latestFiles.postgres) {
      missingFiles.push('PostgreSQL schema analysis');
    }
    
    if (this.isMongoDBQuery(query.toLowerCase()) && !context.latestFiles.mongodb) {
      missingFiles.push('MongoDB schema analysis');
    }
    
    if (this.isMigrationQuery(query.toLowerCase())) {
      if (!context.latestFiles.postgres) missingFiles.push('PostgreSQL schema analysis');
      if (!context.latestFiles.mongodb) missingFiles.push('MongoDB schema analysis');
    }

    const answer = `To answer your question about the rationale behind the analysis, I need the following files to be generated first:

${missingFiles.map(file => `• ${file}`).join('\n')}

Please run the following commands to generate the required analysis:
${this.getRequiredCommands(missingFiles)}

Once you have generated these files, I'll be able to provide detailed explanations about the design decisions and rationale behind the schema transformations.`;

    return {
      answer,
      context: {
        sourceFiles: [],
        analysisType: 'comparison'
      }
    };
  }

  /**
   * Parse relevant files based on the query intent
   */
  private async parseRelevantFiles(context: AnalysisContext, query: string): Promise<any> {
    const parsedData: any = {};
    const queryLower = query.toLowerCase();

    // For rationale queries, parse all available files to provide comprehensive context
    if (this.isRationaleQuery(queryLower)) {
      if (context.latestFiles.postgres) {
        parsedData.postgres = await this.parseMarkdownFile(
          path.join(process.cwd(), context.latestFiles.postgres)
        );
      }
      
      if (context.latestFiles.mongodb) {
        parsedData.mongodb = await this.parseMarkdownFile(
          path.join(process.cwd(), context.latestFiles.mongodb)
        );
      }
      
      if (context.latestFiles.migration) {
        parsedData.migration = await this.parseMarkdownFile(
          path.join(process.cwd(), context.latestFiles.migration)
        );
      }
    } else {
      // For specific queries, parse only relevant files
      if (this.isPostgresQuery(queryLower) && context.latestFiles.postgres) {
        parsedData.postgres = await this.parseMarkdownFile(
          path.join(process.cwd(), context.latestFiles.postgres)
        );
      }

      if (this.isMongoDBQuery(queryLower) && context.latestFiles.mongodb) {
        parsedData.mongodb = await this.parseMarkdownFile(
          path.join(process.cwd(), context.latestFiles.mongodb)
        );
      }

      if (this.isMigrationQuery(queryLower) && context.latestFiles.migration) {
        parsedData.migration = await this.parseMarkdownFile(
          path.join(process.cwd(), context.latestFiles.migration)
        );
      }
    }

    return parsedData;
  }

  /**
   * Generate rationale response using LLM
   */
  private async generateRationaleResponse(
    query: string, 
    parsedData: any, 
    context: AnalysisContext
  ): Promise<RationaleResponse> {
    const systemPrompt = this.buildSystemPrompt(parsedData, context);
    const queryType = this.determineQueryType(query);
    
    const userPrompt = `User Question: ${query}

RESPONSE REQUIREMENTS:
• Maximum 70-80 words
• Use bullet points (•) or numbers (1. 2. 3.)
• Reference ONLY actual schema data above
• NO generic examples

QUERY TYPE: ${queryType}

Answer the user's question using the actual schema data provided above. Focus on:
1. Specific details from the actual database schema
2. Real table/collection names and field names
3. Actual relationships and transformations
4. Concrete benefits/trade-offs for this specific migration

Format: Bullet points for clarity.`;

    const response = await this.llmClient.generateTextResponse(systemPrompt, userPrompt);
    
    const sourceFiles = Object.values(context.latestFiles).filter(Boolean) as string[];
    const analysisType = this.determineAnalysisType(query, context);

    return {
      answer: response,
      context: {
        sourceFiles,
        analysisType
      }
    };
  }

  /**
   * Build system prompt with relevant context
   */
  private buildSystemPrompt(parsedData: any, context: AnalysisContext): string {
    let prompt = `You are an expert database architect. Provide CONCISE, SPECIFIC answers based on the actual database schema data below.

ACTUAL SCHEMA DATA:
`;

    if (parsedData.postgres) {
      prompt += `
PostgreSQL Schema Data:
${this.formatExtractedTables(parsedData.postgres.tables || [])}

PostgreSQL Relationships:
${this.formatExtractedRelationships(parsedData.postgres.relationships || [])}
`;
    }

    if (parsedData.mongodb) {
      prompt += `
MongoDB Schema Data:
${this.formatExtractedTables(parsedData.mongodb.tables || [])}

MongoDB Relationships:
${this.formatExtractedRelationships(parsedData.mongodb.relationships || [])}
`;
    }

    if (parsedData.migration) {
      prompt += `
Migration Transformations:
${this.formatExtractedTransformations(parsedData.migration.transformations || [])}
`;
    }

    prompt += `

RESPONSE RULES:
• Use ONLY actual table/collection names from above
• Reference specific fields and relationships from the data
• Maximum 70-80 words
• Use bullet points (•) or numbers (1. 2. 3.)
• Be specific to this database schema
• NO generic examples or theoretical explanations
• Focus on concrete benefits and trade-offs`;

    return prompt;
  }

  /**
   * Helper methods to determine query intent
   */
  private isRationaleQuery(query: string): boolean {
    const rationaleKeywords = ['why', 'rationale', 'reason', 'explain', 'justify', 'decision', 'thinking', 'logic', 'how', 'what', 'when', 'where'];
    return rationaleKeywords.some(keyword => query.includes(keyword));
  }

  private isPostgresQuery(query: string): boolean {
    const postgresKeywords = ['postgres', 'postgresql', 'table', 'column', 'relation', 'sql'];
    return postgresKeywords.some(keyword => query.includes(keyword));
  }

  private isMongoDBQuery(query: string): boolean {
    const mongodbKeywords = ['mongo', 'mongodb', 'collection', 'document', 'embed', 'nosql'];
    return mongodbKeywords.some(keyword => query.includes(keyword));
  }

  private isMigrationQuery(query: string): boolean {
    const migrationKeywords = ['migrate', 'transform', 'convert', 'embed', 'group'];
    return migrationKeywords.some(keyword => query.includes(keyword));
  }

  private determineAnalysisType(query: string, context: AnalysisContext): 'postgres' | 'mongodb' | 'migration' | 'comparison' {
    if (this.isMigrationQuery(query.toLowerCase())) return 'migration';
    if (this.isPostgresQuery(query.toLowerCase())) return 'postgres';
    if (this.isMongoDBQuery(query.toLowerCase())) return 'mongodb';
    return 'comparison';
  }

  /**
   * Determine the specific type of rationale query for better context
   */
  private determineQueryType(query: string): string {
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('embed') || queryLower.includes('embedded')) {
      return 'EMBEDDING_RATIONALE - Why fields were embedded in documents';
    }
    
    if (queryLower.includes('group') || queryLower.includes('together') || queryLower.includes('combine')) {
      return 'GROUPING_RATIONALE - Why tables/collections were grouped together';
    }
    
    if (queryLower.includes('transform') || queryLower.includes('convert') || queryLower.includes('change')) {
      return 'TRANSFORMATION_RATIONALE - Why schema transformations were chosen';
    }
    
    if (queryLower.includes('migration') || queryLower.includes('approach') || queryLower.includes('strategy')) {
      return 'MIGRATION_RATIONALE - Why migration approach was chosen';
    }
    
    if (queryLower.includes('decision') || queryLower.includes('design')) {
      return 'DESIGN_DECISION_RATIONALE - Why specific design decisions were made';
    }
    
    return 'GENERAL_RATIONALE - General reasoning behind schema choices';
  }

  private getRequiredCommands(missingFiles: string[]): string {
    const commands = [];
    
    if (missingFiles.some(file => file.includes('PostgreSQL'))) {
      commands.push('npm run dev -- analyze postgres');
    }
    
    if (missingFiles.some(file => file.includes('MongoDB'))) {
      commands.push('npm run dev -- analyze mongo');
    }
    
    return commands.join('\n');
  }

  /**
   * Format PostgreSQL tables for prompt
   */
  private formatPostgresTables(tables: any[]): string {
    if (!tables || tables.length === 0) return 'No tables found';
    
    return tables.slice(0, 10).map(table => 
      `- ${table.name}: ${table.columns?.length || 0} columns`
    ).join('\n');
  }

  /**
   * Format PostgreSQL relationships for prompt
   */
  private formatPostgresRelationships(relationships: any[]): string {
    if (!relationships || relationships.length === 0) return 'No relationships found';
    
    return relationships.slice(0, 5).map(rel => 
      `- ${rel.fromTable} → ${rel.toTable} (${rel.type})`
    ).join('\n');
  }

  /**
   * Format MongoDB collections for prompt
   */
  private formatMongoDBCollections(collections: any[]): string {
    if (!collections || collections.length === 0) return 'No collections found';
    
    return collections.slice(0, 10).map(collection => 
      `- ${collection.name}: ${collection.documents?.length || 0} document types`
    ).join('\n');
  }

  /**
   * Format migration transformations for prompt
   */
  private formatMigrationTransformations(transformations: any[]): string {
    if (!transformations || transformations.length === 0) return 'No transformations found';
    
    return transformations.slice(0, 5).map(trans => 
      `- ${trans.sourceType} → ${trans.targetType}: ${trans.description}`
    ).join('\n');
  }

  /**
   * Format extracted tables for prompt
   */
  private formatExtractedTables(tables: any[]): string {
    if (!tables || tables.length === 0) return 'No tables/collections found';
    
    return tables.slice(0, 10).map(table => {
      const fields = table.fields?.slice(0, 5).map((f: any) => f.name).join(', ') || 'no fields';
      return `- ${table.name} (${table.type}): ${fields}`;
    }).join('\n');
  }

  /**
   * Format extracted relationships for prompt
   */
  private formatExtractedRelationships(relationships: any[]): string {
    if (!relationships || relationships.length === 0) return 'No relationships found';
    
    return relationships.slice(0, 8).map(rel => {
      if (rel.type === 'foreign_key') {
        return `- ${rel.fromTable}.${rel.fromField} → ${rel.toTable}.${rel.toField}`;
      } else if (rel.type === 'embedded') {
        return `- ${rel.fromTable} → embedded in ${rel.toTable}`;
      }
      return `- ${rel.fromTable} → ${rel.toTable}`;
    }).join('\n');
  }

  /**
   * Format extracted transformations for prompt
   */
  private formatExtractedTransformations(transformations: any[]): string {
    if (!transformations || transformations.length === 0) return 'No transformations found';
    
    return transformations.slice(0, 8).map(trans => 
      `- ${trans.sourceName} (${trans.sourceType}) → ${trans.targetName} (${trans.targetType})`
    ).join('\n');
  }

  /**
   * Parse markdown file and extract schema data
   */
  private async parseMarkdownFile(filePath: string): Promise<any> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Extract tables/collections from markdown
      const tables = this.extractTablesFromMarkdown(content);
      const relationships = this.extractRelationshipsFromMarkdown(content);
      const transformations = this.extractTransformationsFromMarkdown(content);
      
      return {
        tables,
        relationships,
        transformations,
        rawContent: content.substring(0, 2000) // First 2000 chars for context
      };
    } catch (error) {
      console.error('Error parsing markdown file:', error);
      return { tables: [], relationships: [], transformations: [], rawContent: '' };
    }
  }

  /**
   * Extract table/collection information from markdown content
   */
  private extractTablesFromMarkdown(content: string): any[] {
    const tables: any[] = [];
    
    // Extract PostgreSQL tables - get unique table names first
    const tableNameRegex = /### Table: `([^`]+)`/g;
    const uniqueTableNames = new Set<string>();
    let match;
    
    while ((match = tableNameRegex.exec(content)) !== null) {
      uniqueTableNames.add(match[1]);
    }
    
    // For each unique table, extract its fields
    for (const tableName of uniqueTableNames) {
      const tableSection = this.extractTableSection(content, `### Table: \`${tableName}\``);
      if (tableSection) {
        const fields = this.extractFieldsFromSection(tableSection);
        tables.push({
          name: tableName,
          type: 'postgres',
          fields: fields
        });
      }
    }
    
    // Extract MongoDB collections - get unique collection names first
    const collectionNameRegex = /### 🔗 Collection: `([^`]+)`/g;
    const uniqueCollectionNames = new Set<string>();
    
    while ((match = collectionNameRegex.exec(content)) !== null) {
      uniqueCollectionNames.add(match[1]);
    }
    
    // For each unique collection, extract its fields
    for (const collectionName of uniqueCollectionNames) {
      const collectionSection = this.extractTableSection(content, `### 🔗 Collection: \`${collectionName}\``);
      if (collectionSection) {
        const fields = this.extractFieldsFromSection(collectionSection);
        tables.push({
          name: collectionName,
          type: 'mongodb',
          fields: fields
        });
      }
    }
    
    return tables;
  }

  /**
   * Extract a specific table/collection section from markdown content
   */
  private extractTableSection(content: string, tableHeader: string): string | null {
    const startIndex = content.indexOf(tableHeader);
    if (startIndex === -1) return null;
    
    const sectionStart = content.substring(startIndex);
    const nextTableIndex = sectionStart.indexOf('\n### ', 1);
    
    if (nextTableIndex === -1) {
      return sectionStart;
    } else {
      return sectionStart.substring(0, nextTableIndex);
    }
  }

  /**
   * Extract fields from a table/collection section
   */
  private extractFieldsFromSection(section: string): any[] {
    const fields: any[] = [];
    const fieldRegex = /\| `([^`]+)` \| `([^`]+)` \| ([^|]+) \|/g;
    let match;
    
    while ((match = fieldRegex.exec(section)) !== null) {
      const fieldName = match[1];
      const fieldType = match[2];
      const nullable = match[3];
      
      fields.push({
        name: fieldName,
        type: fieldType,
        nullable: nullable.trim() === 'NO' ? false : true
      });
    }
    
    return fields;
  }

  /**
   * Extract relationships from markdown content
   */
  private extractRelationshipsFromMarkdown(content: string): any[] {
    const relationships: any[] = [];
    
    // Extract foreign key relationships
    const fkRegex = /CONSTRAINT "([^"]+)" FOREIGN KEY \("([^"]+)"\) REFERENCES "([^"]+)" \("([^"]+)"\)/g;
    let match;
    
    while ((match = fkRegex.exec(content)) !== null) {
      relationships.push({
        constraint: match[1],
        fromTable: match[3], // References table
        fromField: match[4],
        toTable: match[3], // Referenced table
        toField: match[4],
        type: 'foreign_key'
      });
    }
    
    // Extract embedded relationships from MongoDB
    const embeddedRegex = /- \*\*([^*]+)\*\* \(from PostgreSQL table `([^`]+)`\)/g;
    
    while ((match = embeddedRegex.exec(content)) !== null) {
      relationships.push({
        fromTable: match[2],
        toTable: match[1],
        type: 'embedded',
        description: `Embedded ${match[1]} in collection`
      });
    }
    
    return relationships;
  }

  /**
   * Extract transformations from markdown content
   */
  private extractTransformationsFromMarkdown(content: string): any[] {
    const transformations: any[] = [];
    
    // Extract table to collection transformations
    const transformRegex = /- Table '([^']+)' converted to collection '([^']+)'/g;
    let match;
    
    while ((match = transformRegex.exec(content)) !== null) {
      transformations.push({
        sourceType: 'table',
        targetType: 'collection',
        sourceName: match[1],
        targetName: match[2],
        description: `Table ${match[1]} converted to collection ${match[2]}`
      });
    }
    
    return transformations;
  }
}
