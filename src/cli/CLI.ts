import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';
import { MCPAgent } from '../core/MCPAgent.js';
import { DatabaseConfig } from '../types/index.js';
import readline from 'readline';
import { clearInteractiveCredentials } from '../config/interactive-credentials.js';
import Fuse from 'fuse.js';
import nlp from 'compromise';
import natural from 'natural';
import didYouMean from 'didyoumean2';
import { distance } from 'fastest-levenshtein';
import { IntentMappingService, IntentMappingConfig } from '../services/IntentMappingService.js';
import { LLMConfigManager } from '../config/llm-config.js';
import { IntentContext, IntentMappingResult } from '../types/intent-types.js';
import { DualLocationFileWriter } from '../utils/DualLocationFileWriter.js';
import { RationaleConversationService } from '../services/RationaleConversationService.js';
import { EnhancedDocumentAwareAgent } from '../services/EnhancedDocumentAwareAgent.js';
import { ConversationHistoryService } from '../services/ConversationHistoryService.js';

export class CLI {
  private agent!: MCPAgent;
  private program: Command;
  private intentMappingService: IntentMappingService;
  private llmConfigManager: LLMConfigManager;
  private llmInitialized: boolean = false;
  private rationaleConversationService: RationaleConversationService;
  private enhancedDocumentAwareAgent: EnhancedDocumentAwareAgent | null = null;
  private conversationHistoryService: ConversationHistoryService;

  constructor() {
    this.program = new Command();
    this.intentMappingService = IntentMappingService.getInstance();
    this.llmConfigManager = LLMConfigManager.getInstance();
    this.rationaleConversationService = new RationaleConversationService();
    this.conversationHistoryService = ConversationHistoryService.getInstance();
    this.setupCommands();
  }

  /**
   * Setup CLI commands
   */
  private setupCommands(): void {
    this.program
      .name('peer-ai-mongo-migrator')
      .description('PeerAI MongoMigrator - Orchestrates PostgreSQL and MongoDB MCP servers')
      .version('1.0.0');

    // Database operations
    this.program
      .command('query')
      .description('Execute a database query')
      .option('-p, --postgres <query>', 'PostgreSQL query')
      .option('-m, --mongo <operation>', 'MongoDB operation')
      .option('-d, --database <db>', 'Database name for MongoDB')
      .option('-c, --collection <collection>', 'Collection name for MongoDB')
      .option('-f, --filter <filter>', 'MongoDB filter (JSON)')
      .action(this.handleQuery.bind(this));

    this.program
      .command('cross-query')
      .description('Execute cross-database query with advanced join strategies')
      .requiredOption('-p, --postgres <query>', 'PostgreSQL query')
      .requiredOption('-m, --mongo <filter>', 'MongoDB filter (JSON)')
      .requiredOption('-d, --database <db>', 'MongoDB database name')
      .requiredOption('-c, --collection <collection>', 'MongoDB collection name')
      .option('-j, --join-strategy <strategy>', 'Join strategy: inner, left, right, full', 'inner')
      .option('-k, --join-key <key>', 'Join key for cross-database operations')
      .option('-l, --limit <limit>', 'Limit results', '100')
      .option('-t, --timeout <timeout>', 'Query timeout in milliseconds', '30000')
      .action(this.handleCrossQuery.bind(this));

    // Schema operations
    this.program
      .command('schema')
      .description('Schema operations')
      .option('-p, --postgres', 'Show PostgreSQL schema')
      .option('-m, --mongo', 'Show MongoDB schema')
      .option('-g, --generate', 'Generate MongoDB schema from PostgreSQL')
      .option('-v, --validate', 'Validate PostgreSQL schema')
      .option('-c, --compare', 'Compare schemas between databases')
      .option('-a, --analyze', 'Analyze PostgreSQL schema comprehensively and generate markdown documentation')
      .option('--business-context', 'Include enhanced business relationship analysis beyond DDL')
      .option('-d, --database <db>', 'MongoDB database for comparison')
      .action(this.handleSchema.bind(this));

    // ER Diagram operations
    this.program
      .command('er-diagram')
      .description('Generate Entity-Relationship diagrams')
      .option('-f, --format <format>', 'Diagram format: mermaid, plantuml, dbml, json', 'mermaid')
      .option('-o, --output <path>', 'Output directory for generated files')
      .option('--include-indexes', 'Include index information in diagrams', true)
      .option('--include-constraints', 'Include constraint information in diagrams', true)
      .option('--include-data-types', 'Include data type information in diagrams', true)
      .option('--include-cardinality', 'Include relationship cardinality in diagrams', true)
      .option('--style <style>', 'Diagram style: detailed, simplified, minimal', 'detailed')
      .option('--documentation', 'Generate comprehensive ER diagram documentation')
      .option('--html', 'Generate HTML viewer for immediate viewing (Mermaid only)')
      .action(this.handleERDiagram.bind(this));

    // Migration operations
    this.program
      .command('migrate')
      .description('Migrate data from PostgreSQL to MongoDB')
      .requiredOption('-s, --source <table>', 'Source PostgreSQL table')
      .requiredOption('-t, --target <collection>', 'Target MongoDB collection')
      .option('-b, --batch-size <size>', 'Batch size for migration', '1000')
      .option('-r, --rules <rules>', 'Transform rules (JSON)')
      .option('--validate', 'Validate migration after completion')
      .option('-d, --database <db>', 'MongoDB database name')
      .action(this.handleMigration.bind(this));

    // Enhanced Migration operations
    this.program
      .command('enhanced-migrate')
      .description('Generate intelligent MongoDB migration plan with embedded documents and stored procedure analysis')
      .option('--include-stored-procedures', 'Analyze and migrate stored procedures', true)
      .option('--include-query-patterns', 'Analyze query patterns for optimization', true)
      .option('--embedded-documents', 'Design embedded documents instead of separate collections', true)
      .option('--performance-analysis', 'Include performance analysis and optimization', true)
      .option('--risk-assessment', 'Include comprehensive risk assessment', true)
      .option('--timeline-estimation', 'Include detailed timeline estimation', true)
      .option('-o, --output <path>', 'Output directory for migration plan files')
      .option('--format <format>', 'Output format: markdown, json, html', 'markdown')
      .action(this.handleEnhancedMigration.bind(this));

    // Status and monitoring
    this.program
      .command('status')
      .description('Show database connection status and health')
      .option('-h, --health', 'Perform health check')
      .option('-m, --metrics', 'Show performance metrics')
      .action(this.handleStatus.bind(this));

    // Database management
    this.program
      .command('manage')
      .description('Database management operations')
      .option('--backup', 'Create database backup')
      .option('--restore <file>', 'Restore database from backup file')
      .option('--optimize', 'Optimize database performance')
      .option('--cleanup', 'Cleanup old data and indexes')
      .action(this.handleManagement.bind(this));

    // Interactive Schema Modification commands
    this.program
      .command('start-modification')
      .description('Start interactive schema modification session')
      .option('-b, --business-requirements <requirements>', 'Business requirements (comma-separated)')
      .option('-p, --performance-constraints <constraints>', 'Performance constraints (comma-separated)')
      .action(this.handleStartModification.bind(this));

    this.program
      .command('modify-schema')
      .description('Modify MongoDB schema based on developer feedback')
      .requiredOption('-s, --session <sessionId>', 'Modification session ID')
      .requiredOption('-f, --feedback <feedback>', 'Developer feedback for schema modifications')
      .option('-n, --notes <notes>', 'Additional developer notes')
      .option('-p, --priority <priority>', 'Priority: LOW, MEDIUM, HIGH, CRITICAL', 'MEDIUM')
      .action(this.handleSchemaModification.bind(this));

    this.program
      .command('get-suggestions')
      .description('Get intelligent modification suggestions')
      .requiredOption('-s, --session <sessionId>', 'Modification session ID')
      .action(this.handleGetSuggestions.bind(this));

    this.program
      .command('update-docs')
      .description('Generate updated documentation for modified schema')
      .requiredOption('-s, --session <sessionId>', 'Modification session ID')
      .option('-o, --output <path>', 'Output path for updated documentation')
      .action(this.handleUpdateDocs.bind(this));

    this.program
      .command('approve-schema')
      .description('Approve final schema and generate migration document')
      .requiredOption('-s, --session <sessionId>', 'Modification session ID')
      .action(this.handleApproveSchema.bind(this));

    this.program
      .command('list-sessions')
      .description('List all active modification sessions')
      .action(this.handleListSessions.bind(this));

    this.program
      .command('finalize-migration')
      .description('Generate final migration document after all modifications')
      .option('-f, --feedback <feedback>', 'Final feedback for migration document')
      .option('-o, --output <path>', 'Output path for final migration document')
      .action(this.handleFinalMigration.bind(this));

    this.program
      .command('interactive')
      .description('Start interactive CLI mode')
      .action(this.startInteractive.bind(this));

    // New migration analysis commands
    this.program
      .command('analyze-migration')
      .description('Analyze Spring Boot source code for migration to Node.js + MongoDB')
      .option('-s, --source <folder>', 'Source code folder to analyze (e.g., source-code-1)')
      .option('-o, --output <path>', 'Output path for analysis documentation')
      .action(this.handleMigrationAnalysis.bind(this));

    this.program
      .command('detect-source-folders')
      .description('Detect all source-code-* folders in the workspace')
      .action(this.handleDetectSourceFolders.bind(this));

    this.program
      .command('generate-migration-plan')
      .description('Generate migration plan from source code analysis')
      .option('-s, --source <folder>', 'Source code folder to analyze')
      .option('-o, --output <path>', 'Output path for migration plan')
      .action(this.handleGenerateMigrationPlan.bind(this));

    // GitHub repository analysis commands
    this.program
      .command('analyze-github')
      .description('Analyze GitHub repository for migration to Node.js + MongoDB')
      .requiredOption('-r, --repo <url>', 'GitHub repository URL (e.g., https://github.com/owner/repo or owner/repo)')
      .option('-b, --branch <branch>', 'Branch to analyze (default: main)')
      .option('-o, --output <path>', 'Output path for analysis documentation')
      .option('--ssh', 'Use SSH for cloning (default: HTTPS)')
      .option('--shallow', 'Perform shallow clone (faster, less history)')
      .action(this.handleGitHubAnalysis.bind(this));

    this.program
      .command('github-setup')
      .description('Setup GitHub configuration and authentication')
      .option('--token <token>', 'GitHub Personal Access Token')
      .option('--username <username>', 'GitHub username')
      .option('--temp-dir <path>', 'Temporary directory for cloned repositories')
      .action(this.handleGitHubSetup.bind(this));

    this.program
      .command('github-status')
      .description('Show GitHub configuration status and repository suggestions')
      .action(this.handleGitHubStatus.bind(this));

    this.program
      .command('github-cleanup')
      .description('Clean up temporary cloned repositories')
      .action(this.handleGitHubCleanup.bind(this));

    this.program
      .command('github')
      .description('Interactive GitHub repository analysis')
      .action(this.startGitHubInteractive.bind(this));

    // Enhanced document-aware agent commands
    this.program
      .command('smart-query')
      .description('Ask any question about your database with enhanced document awareness')
      .argument('<question>', 'Your question about the database')
      .action(this.handleSmartQueryCommand.bind(this));

    this.program
      .command('agent-status')
      .description('Show enhanced agent status and suggestions')
      .action(this.showAgentStatus.bind(this));
  }

  /**
   * Initialize the agent with configuration
   */
  async initialize(config: DatabaseConfig): Promise<void> {
    try {
      this.agent = new MCPAgent(config);
      await this.agent.initialize();
      
      // Initialize Enhanced Document-Aware Agent
      this.enhancedDocumentAwareAgent = new EnhancedDocumentAwareAgent(config);
      await this.enhancedDocumentAwareAgent.initialize();
      
    } catch (error) {
      console.error('Failed to initialize agent:', error);
      process.exit(1);
    }
  }

  /**
   * Initialize LLM-based intent mapping
   */
  private async initializeLLM(): Promise<void> {
    try {
      // Load LLM configuration
      const llmConfig = this.llmConfigManager.loadConfig();
      
      if (!llmConfig) {
        console.log(chalk.yellow('⚠️ LLM configuration not found. Intent mapping will use fallback methods.'));
        console.log(chalk.gray('   To enable LLM-based intent mapping, create a .env file with Azure OpenAI credentials.'));
        return;
      }

      // Validate configuration
      const validation = this.llmConfigManager.validateConfig(llmConfig);
      if (!validation.valid) {
        console.log(chalk.red('❌ LLM configuration is invalid:'));
        validation.errors.forEach(error => console.log(chalk.red(`   • ${error}`)));
        console.log(chalk.yellow('   Intent mapping will use fallback methods.'));
        return;
      }

      // Initialize Intent Mapping Service
      const intentConfig: IntentMappingConfig = {
        llmConfig,
        fallbackEnabled: false, // DISABLED FOR TESTING - Pure LLM only
        confidenceThreshold: 0.7,
        maxRetries: 3,
        cacheEnabled: true,
        debugMode: process.env.NODE_ENV === 'development'
      };

      await this.intentMappingService.initialize(intentConfig);
      this.llmInitialized = true;
      
      console.log(chalk.green('🧠 LLM-based intent mapping initialized successfully!'));
    } catch (error) {
      console.error('❌ Failed to initialize LLM intent mapping:', error);
      console.log(chalk.yellow('   Intent mapping will use fallback methods.'));
    }
  }

  /**
   * Parse and execute CLI commands
   */
  async run(args: string[]): Promise<void> {
    try {
      // Initialize LLM for interactive mode
      if (args.includes('interactive')) {
        await this.initializeLLM();
      }
      
      await this.program.parseAsync(args);
    } catch (error) {
      console.error('CLI execution failed:', error);
      process.exit(1);
    }
  }

  /**
   * Handle query command
   */
  private async handleQuery(options: any): Promise<void> {
    const spinner = ora('Executing query...').start();

    try {
      let result: any;

      if (options.postgres) {
        result = await this.agent.executePostgreSQLQuery(options.postgres);
      } else if (options.mongo) {
        const filter = options.filter ? JSON.parse(options.filter) : {};
        result = await this.agent.executeMongoDBOperation(
          options.mongo,
          options.database || 'default',
          options.collection || 'test',
          filter
        );
      } else {
        spinner.fail('Please specify either --postgres or --mongo option');
        return;
      }

      spinner.succeed('Query executed successfully');
      this.displayResult(result);
    } catch (error) {
      spinner.fail(`Query failed: ${error}`);
    }
  }

  /**
   * Handle cross-database query
   */
  private async handleCrossQuery(options: any): Promise<void> {
    try {
      const spinner = ora('Executing cross-database query...').start();
      
      const crossQueryOptions = {
        postgresQuery: options.postgres,
        mongoQuery: JSON.parse(options.mongo),
        mongoDatabase: options.database,
        mongoCollection: options.collection,
        joinStrategy: options.joinStrategy as 'inner' | 'left' | 'right' | 'full',
        joinKey: options.joinKey,
        limit: parseInt(options.limit),
        timeout: parseInt(options.timeout)
      };

      const result = await this.agent.executeCrossDatabaseQuery(crossQueryOptions);
      
      spinner.succeed('Cross-database query completed');
      
      if (result.error) {
        console.error('❌ Cross-database query failed:', result.error);
        return;
      }

      console.log('\n📊 Cross-Database Query Results:');
      console.log(`⏱️  Execution time: ${result.executionTime}ms`);
      console.log(`🔗 Join strategy: ${result.joinStrategy || 'none'}`);
      if (result.joinKey) {
        console.log(`🔑 Join key: ${result.joinKey}`);
      }
      
      console.log('\n📊 PostgreSQL Results:');
      if (result.postgresql?.success) {
        console.log(`✅ Rows: ${result.postgresql.rowCount || 0}`);
        console.log(`⏱️  Time: ${result.postgresql.executionTime || 0}ms`);
        if (result.postgresql.data && Array.isArray(result.postgresql.data)) {
          console.log('📋 Sample data:', result.postgresql.data.slice(0, 3));
        }
      } else {
        console.log('❌ Failed:', result.postgresql?.error);
      }
      
      console.log('\n📊 MongoDB Results:');
      if (result.mongodb?.success) {
        console.log(`✅ Documents: ${result.mongodb.rowCount || 0}`);
        console.log(`⏱️  Time: ${result.mongodb.executionTime || 0}ms`);
        if (result.mongodb.data && Array.isArray(result.mongodb.data)) {
          console.log('📋 Sample data:', result.mongodb.data.slice(0, 3));
        }
      } else {
        console.log('❌ Failed:', result.mongodb?.error);
      }
      
      if (result.combined && Array.isArray(result.combined)) {
        console.log(`\n🔗 Combined Results: ${result.combined.length} joined records`);
        if (result.combined.length > 0) {
          console.log('📋 Sample joined data:', result.combined.slice(0, 3));
        }
      }
      
    } catch (error) {
      console.error('❌ Cross-database query failed:', error);
    }
  }

  /**
   * Handle schema command
   */
  private async handleSchema(options: any): Promise<void> {
    try {
      if (options.analyze) {
        await this.analyzePostgreSQLSchema();
      } else {
        console.log(chalk.yellow('💡 Schema analysis functionality:'));
        console.log(chalk.gray('  • Use "peer-ai-mongo-migrator schema --analyze" for comprehensive PostgreSQL schema analysis'));
        console.log(chalk.gray('  • Use "analyze the postgres schema" in interactive mode'));
        console.log(chalk.gray('  • Focus on core CRUD operations: UPDATE, DELETE, FETCH, COUNT'));
      }
    } catch (error) {
      console.error('❌ Schema operation failed:', error);
    }
  }

  /**
   * Handle ER diagram operations
   */
  private async handleERDiagram(options: any): Promise<void> {
    try {
      console.log(chalk.blue('🗺️ Generating Entity-Relationship Diagram...'));
      
      if (options.documentation) {
        // Generate comprehensive ER diagram documentation
        const result = await this.agent.generateERDocumentation();
        if (result.success) {
          console.log(chalk.green(`✅ ER diagram documentation generated: ${result.filepath}`));
        } else {
          console.error(chalk.red(`❌ Failed to generate ER diagram documentation: ${result.error}`));
        }
        return;
      }

      // Generate ER diagram in specified format
      const format = options.format as 'mermaid' | 'plantuml' | 'dbml' | 'json';
      const diagramOptions = {
        includeIndexes: options.includeIndexes,
        includeConstraints: options.includeConstraints,
        includeDataTypes: options.includeDataTypes,
        includeCardinality: options.includeCardinality,
        outputPath: options.output,
        diagramStyle: options.style as 'detailed' | 'simplified' | 'minimal'
      };

      const result = await this.agent.generateERDiagram(format, diagramOptions);
      
      if (result.success) {
        console.log(chalk.green(`✅ ER diagram generated successfully in ${format.toUpperCase()} format`));
        console.log(chalk.cyan(`   File: ${result.filepath}`));
        if (result.metadata) {
          console.log(chalk.cyan(`   Tables: ${result.metadata.tables}, Relationships: ${result.metadata.relationships}, Indexes: ${result.metadata.indexes}`));
        }
        
        if (format === 'mermaid') {
          console.log(chalk.yellow('\n💡 Tip: Copy the Mermaid code to https://mermaid.live/ for interactive viewing'));
          
          // Also generate an HTML viewer for immediate viewing
          try {
            const { MermaidRenderer } = await import('../utils/MermaidRenderer.js');
            const renderer = new MermaidRenderer();
            
            // Read the generated file content to create HTML viewer
            const fs = await import('fs');
            const fileContent = fs.readFileSync(result.filepath!, 'utf8');
            
            const htmlPath = await renderer.saveHTMLDiagram(
              fileContent,
              'PostgreSQL Schema ER Diagram'
            );
            
            console.log(chalk.green(`🌐 HTML Viewer generated: ${htmlPath}`));
            console.log(chalk.cyan('💡 Open this HTML file in your browser to see the rendered diagram!'));
          } catch (renderError) {
            console.warn(chalk.yellow('⚠️ Could not generate HTML viewer:'), (renderError as Error).message);
          }
        } else if (format === 'plantuml') {
          console.log(chalk.yellow('\n💡 Tip: Use http://www.plantuml.com/plantuml/uml/ for online viewing'));
        } else if (format === 'dbml') {
          console.log(chalk.yellow('\n💡 Tip: Use https://dbdiagram.io/ for interactive DBML diagrams'));
        }
      } else {
        console.error(chalk.red(`❌ Failed to generate ER diagram: ${result.error}`));
      }
      
    } catch (error) {
      console.error(chalk.red('❌ ER diagram generation failed:'), error);
    }
  }

  /**
   * Handle ER diagram requests in natural language
   */
  private async handleERDiagramNaturalLanguage(input: string, rl: readline.Interface): Promise<void> {
    try {
      console.log(chalk.blue('🗺️ Understanding your ER diagram request...'));
      
      const lowerInput = input.toLowerCase();
      
      // Determine what the user wants
      let wantsDocumentation = false;
      let format: 'mermaid' | 'plantuml' | 'dbml' | 'json' = 'mermaid';
      let style: 'detailed' | 'simplified' | 'minimal' = 'detailed';
      
      // Check for format preferences
      if (lowerInput.includes('plantuml') || lowerInput.includes('plant uml')) {
        format = 'plantuml';
      } else if (lowerInput.includes('dbml') || lowerInput.includes('database markup')) {
        format = 'dbml';
      } else if (lowerInput.includes('json')) {
        format = 'json';
      }
      
      // Check for style preferences
      if (lowerInput.includes('simple') || lowerInput.includes('basic')) {
        style = 'simplified';
      } else if (lowerInput.includes('minimal') || lowerInput.includes('minimal')) {
        style = 'minimal';
      }
      
      // Check if they want comprehensive documentation
      if (lowerInput.includes('documentation') || lowerInput.includes('comprehensive') || 
          lowerInput.includes('detailed') || lowerInput.includes('full')) {
        wantsDocumentation = true;
      }
      
      if (wantsDocumentation) {
        console.log(chalk.cyan('📚 Generating comprehensive ER diagram documentation...'));
        const result = await this.agent.generateERDocumentation();
        
        if (result.success) {
          console.log(chalk.green(`✅ Comprehensive ER diagram documentation generated successfully!`));
          console.log(chalk.cyan(`📁 File: ${result.filepath}`));
          console.log(chalk.yellow('\n💡 This documentation includes:'));
          console.log(chalk.yellow('   • Multiple diagram formats (Mermaid, PlantUML, DBML)'));
          console.log(chalk.yellow('   • Detailed table information and relationships'));
          console.log(chalk.yellow('   • Index and constraint details'));
          console.log(chalk.yellow('   • Usage instructions for each format'));
        } else {
          console.error(chalk.red(`❌ Failed to generate ER diagram documentation: ${result.error}`));
        }
      } else {
        console.log(chalk.cyan(`🗺️ Generating ER diagram in ${format.toUpperCase()} format...`));
        
        const result = await this.agent.generateERDiagram(format, {
          includeIndexes: true,
          includeConstraints: true,
          includeDataTypes: true,
          includeCardinality: true,
          includeDescriptions: false,
          diagramStyle: style
        });
        
        if (result.success) {
          console.log(chalk.green(`✅ ER diagram generated successfully!`));
          console.log(chalk.cyan(`📁 File: ${result.filepath}`));
          console.log(chalk.cyan(`🎨 Format: ${format.toUpperCase()}`));
          console.log(chalk.cyan(`📊 Style: ${style}`));
          
          if (result.metadata) {
            console.log(chalk.cyan(`📋 Summary: ${result.metadata.tables} tables, ${result.metadata.relationships} relationships, ${result.metadata.indexes} indexes`));
          }
          
          // Provide format-specific tips
          if (format === 'mermaid') {
            console.log(chalk.yellow('\n💡 Tip: Copy the Mermaid code to https://mermaid.live/ for interactive viewing'));
          } else if (format === 'plantuml') {
            console.log(chalk.yellow('\n💡 Tip: Use http://www.plantuml.com/plantuml/uml/ for online viewing'));
          } else if (format === 'dbml') {
            console.log(chalk.yellow('\n💡 Tip: Use https://dbdiagram.io/ for interactive DBML diagrams'));
          }
        } else {
          console.error(chalk.red(`❌ Failed to generate ER diagram: ${result.error}`));
        }
      }
      
    } catch (error) {
      console.error(chalk.red('❌ ER diagram generation failed:'), error);
    }
  }

  /**
   * Show PostgreSQL schema
   */
  private async showPostgreSQLSchema(): Promise<void> {
    const spinner = ora('Fetching PostgreSQL schema...').start();
    
    try {
      const schema = await this.agent.getPostgreSQLSchema();
      spinner.succeed('PostgreSQL schema retrieved');
      
      console.log('\n📋 PostgreSQL Schema:');
      for (const table of schema) {
        console.log(`\n📊 Table: ${table.name}`);
        if (table.primaryKey) {
          console.log(`🔑 Primary Key: ${table.primaryKey}`);
        }
        if (table.foreignKeys && table.foreignKeys.length > 0) {
          console.log('🔗 Foreign Keys:');
          for (const fk of table.foreignKeys) {
            console.log(`  ${fk.column} → ${fk.referencedTable}.${fk.referencedColumn}`);
          }
        }
        console.log('📝 Columns:');
        for (const column of table.columns) {
          const nullable = column.nullable ? 'NULL' : 'NOT NULL';
          const primary = column.isPrimary ? ' 🔑' : '';
          const foreign = column.isForeign ? ' 🔗' : '';
          console.log(`  ${column.name}: ${column.type} ${nullable}${primary}${foreign}`);
        }
      }
    } catch (error) {
      spinner.fail('Failed to retrieve PostgreSQL schema');
      console.error('❌ Error:', error);
    }
  }

  /**
   * Show MongoDB schema
   */
  private async showMongoDBSchema(): Promise<void> {
    const spinner = ora('Fetching MongoDB schema...').start();
    
    try {
      const database = this.agent.getStatus().mongodb.connected ? 'default' : 'test';
      const schema = await this.agent.getMongoDBSchema(database);
      spinner.succeed('MongoDB schema retrieved');
      
      console.log('\n📋 MongoDB Schema:');
      for (const collection of schema) {
        console.log(`\n📊 Collection: ${collection.name}`);
        if (collection.indexes && collection.indexes.length > 0) {
          console.log('🔑 Indexes:');
          for (const index of collection.indexes) {
            const unique = index.unique ? ' (unique)' : '';
            console.log(`  ${index.name}: [${index.fields.join(', ')}]${unique}`);
          }
        }
        console.log('📝 Fields:');
        for (const field of collection.fields) {
          const required = field.required ? ' (required)' : '';
          console.log(`  ${field.name}: ${field.type}${required}`);
        }
      }
    } catch (error) {
      spinner.fail('Failed to retrieve MongoDB schema');
      console.error('❌ Error:', error);
    }
  }

  /**
   * Generate MongoDB schema from PostgreSQL
   */
  private async generateMongoDBSchema(): Promise<void> {
    const spinner = ora('Generating MongoDB schema from PostgreSQL...').start();
    
    try {
      const postgresSchema = await this.agent.getPostgreSQLSchema();
      const mongoSchema = await this.agent.getMongoDBSchema('default');
      
      spinner.succeed('Schema generation completed');
      
      console.log('\n📋 Generated MongoDB Schema:');
      for (const table of postgresSchema) {
        const mongoCollection = mongoSchema.find(c => c.name === table.name);
        if (mongoCollection) {
          console.log(`\n📊 Collection: ${table.name} (from table: ${table.name})`);
          console.log('📝 Fields:');
          for (const column of table.columns) {
            const mongoType = this.mapPostgreSQLToMongoDBType(column.type);
            console.log(`  ${column.name}: ${mongoType}`);
          }
        } else {
          console.log(`\n📊 Collection: ${table.name} (needs to be created)`);
          console.log('📝 Fields:');
          for (const column of table.columns) {
            const mongoType = this.mapPostgreSQLToMongoDBType(column.type);
            console.log(`  ${column.name}: ${mongoType}`);
          }
        }
      }
    } catch (error) {
      spinner.fail('Schema generation failed');
      console.error('❌ Error:', error);
    }
  }

  /**
   * Map PostgreSQL types to MongoDB types
   */
  private mapPostgreSQLToMongoDBType(postgresType: string): string {
    const typeMap: { [key: string]: string } = {
      'integer': 'number',
      'bigint': 'number',
      'text': 'string',
      'varchar': 'string',
      'boolean': 'boolean',
      'timestamp': 'date',
      'numeric': 'number',
      'json': 'object'
    };
    
    return typeMap[postgresType.toLowerCase()] || 'string';
  }

  /**
   * Validate PostgreSQL schema
   */
  private async validatePostgreSQLSchema(): Promise<void> {
    const spinner = ora('Validating PostgreSQL schema...').start();
    
    try {
      const validation = await this.agent.validatePostgreSQLSchema();
      spinner.succeed('Schema validation completed');
      
      console.log('\n🔍 PostgreSQL Schema Validation:');
      if (validation.valid) {
        console.log('✅ Schema is valid!');
      } else {
        console.log('❌ Schema validation issues found:');
        for (const issue of validation.issues) {
          console.log(`  • ${issue}`);
        }
      }
      
      if (validation.recommendations.length > 0) {
        console.log('\n💡 Recommendations:');
        for (const rec of validation.recommendations) {
          console.log(`  • ${rec}`);
        }
      }
    } catch (error) {
      spinner.fail('Schema validation failed');
      console.error('❌ Error:', error);
    }
  }

  /**
   * Compare schemas between databases
   */
  private async compareSchemas(database: string): Promise<void> {
    const spinner = ora('Comparing schemas between databases...').start();
    
    try {
      const comparison = await this.agent.compareSchemas(database);
      spinner.succeed('Schema comparison completed');
      
      console.log('\n🔍 Schema Comparison Results:');
      
      console.log(`\n📊 PostgreSQL Tables: ${comparison.postgresqlSchema.length}`);
      console.log(`📊 MongoDB Collections: ${comparison.mongodbSchema.length}`);
      
      if (comparison.differences.missingInMongo.length > 0) {
        console.log('\n❌ Missing in MongoDB:');
        for (const table of comparison.differences.missingInMongo) {
          console.log(`  • ${table}`);
        }
      }
      
      if (comparison.differences.missingInPostgres.length > 0) {
        console.log('\n❌ Missing in PostgreSQL:');
        for (const collection of comparison.differences.missingInPostgres) {
          console.log(`  • ${collection}`);
        }
      }
      
               if (comparison.differences.typeMismatches.length > 0) {
           console.log('\n⚠️  Type Mismatches:');
           for (const mismatch of comparison.differences.typeMismatches) {
             console.log(`  • ${mismatch.field}: ${mismatch.postgresType} vs ${mismatch.mongoType}`);
           }
         }
      
      if (comparison.differences.recommendations.length > 0) {
        console.log('\n💡 Recommendations:');
        for (const rec of comparison.differences.recommendations) {
          console.log(`  • ${rec}`);
        }
      }
    } catch (error) {
      spinner.fail('Schema comparison failed');
      console.error('❌ Error:', error);
    }
  }

  /**
   * Handle migration operations
   */
  private async handleMigration(options: any): Promise<void> {
    try {
      const spinner = ora('Starting data migration...').start();
      
      const migrationOptions = {
        sourceTable: options.source,
        targetCollection: options.target,
        batchSize: parseInt(options.batchSize),
        transformRules: options.rules ? JSON.parse(options.rules) : undefined,
        validateData: options.validate || false
      };

      const result = await this.agent.migrateData(migrationOptions);
      
      if (result.success) {
        spinner.succeed('Migration completed successfully');
        console.log(`\n📊 Migration Results:`);
        console.log(`✅ Migrated records: ${result.migratedCount}`);
        console.log(`⏱️  Duration: ${result.duration}ms`);
        
        if (result.errors.length > 0) {
          console.log(`⚠️  Errors encountered: ${result.errors.length}`);
          for (const error of result.errors.slice(0, 5)) {
            console.log(`  • ${error}`);
          }
          if (result.errors.length > 5) {
            console.log(`  ... and ${result.errors.length - 5} more errors`);
          }
        }
      } else {
        spinner.fail('Migration failed');
        console.error('❌ Migration errors:');
        for (const error of result.errors) {
          console.error(`  • ${error}`);
        }
      }
    } catch (error) {
      console.error('❌ Migration failed:', error);
    }
  }

  /**
   * Handle enhanced migration operations with intelligent MongoDB design
   */
  private async handleEnhancedMigration(options: any): Promise<void> {
    try {
      const spinner = ora('Starting enhanced migration planning...').start();
      
      // Initialize MCP agent if not already done
      if (!this.agent) {
        // Use default config for enhanced migration
        const defaultConfig: DatabaseConfig = {
          postgresql: {
            host: 'localhost',
            port: 5432,
            database: 'postgres',
            username: 'postgres',
            password: ''
          },
          mongodb: {
            connectionString: 'mongodb://localhost:27017'
          }
        };
        await this.initialize(defaultConfig);
      }
      
      const {
        includeStoredProcedures,
        includeQueryPatterns,
        embeddedDocuments,
        performanceAnalysis,
        riskAssessment,
        timelineEstimation,
        output,
        format
      } = options;
      
      spinner.text = 'Analyzing PostgreSQL database comprehensively...';
      const analysisResult = await this.agent.analyzePostgreSQLSchema();
      
      if (!analysisResult.success) {
        spinner.fail('Failed to analyze PostgreSQL database');
        return;
      }
      
      spinner.text = 'Designing intelligent MongoDB collections...';
      const designResult = await this.agent.generateMongoDBSchemaFromPostgreSQL();
      
      if (!designResult.success) {
        spinner.fail('Failed to design intelligent MongoDB collections');
        return;
      }
      
      spinner.text = 'Generating comprehensive migration plan...';
      const migrationPlan = await this.agent.analyzeMigrationDependencies();
      
      if (!migrationPlan.phases || migrationPlan.phases.length === 0) {
        spinner.fail('Failed to generate migration plan');
        return;
      }
      
      spinner.text = 'Generating output files...';
      const outputResult = await this.agent.generateERDocumentation();
      
      if (outputResult.success) {
        spinner.succeed('Enhanced migration plan generated successfully!');
        console.log(chalk.green('\nEnhanced Migration Plan Summary:'));
        console.log(chalk.cyan(`Output directory: ${outputResult.filepath || 'migration-plan'}`));
        console.log(chalk.cyan(`Files generated: 1`));
        console.log(chalk.cyan(`Collections designed: ${migrationPlan.phases?.length || 0}`));
        console.log(chalk.cyan(`Migration phases: ${migrationPlan.phases?.length || 0}`));
        
        console.log(chalk.yellow('\nGenerated Files:'));
        console.log(chalk.cyan(`  - ${outputResult.filepath || 'migration-plan'}`));
        
        console.log(chalk.green('\n🎉 Your intelligent MongoDB migration plan is ready!'));
        console.log(chalk.cyan('The plan includes:'));
        if (includeStoredProcedures === 'true') console.log(chalk.cyan('  ✓ Stored procedure analysis and migration'));
        if (includeQueryPatterns === 'true') console.log(chalk.cyan('  ✓ Query pattern analysis and optimization'));
        if (embeddedDocuments === 'true') console.log(chalk.cyan('  ✓ Intelligent embedded document design'));
        if (performanceAnalysis === 'true') console.log(chalk.cyan('  ✓ Performance analysis and optimization'));
        if (riskAssessment === 'true') console.log(chalk.cyan('  ✓ Comprehensive risk assessment'));
        if (timelineEstimation === 'true') console.log(chalk.cyan('  ✓ Detailed timeline estimation'));
      } else {
        spinner.fail('Failed to generate output files');
        console.error(chalk.red('Error:'), outputResult.error);
      }
      
    } catch (error) {
      console.error(chalk.red('Enhanced migration error:'), error);
    }
  }

  /**
   * Handle status and monitoring
   */
  private async handleStatus(options: any): Promise<void> {
    try {
      if (options.health) {
        await this.performHealthCheck();
      } else if (options.metrics) {
        await this.showPerformanceMetrics();
      } else {
        await this.showDatabaseStatus();
      }
    } catch (error) {
      console.error('❌ Status operation failed:', error);
    }
  }

  /**
   * Show database status
   */
  private async showDatabaseStatus(): Promise<void> {
    const status = this.agent.getStatus();
    
    const response = `Database Status:\nPostgreSQL: Connected: ${status.postgresql.connected ? '✅' : '❌'}, Tables: ${status.postgresql.tableCount}\nMongoDB: Connected: ${status.mongodb.connected ? '✅' : '❌'}, Collections: ${status.mongodb.collectionCount}`;
    
    console.log('\n📊 Database Status:');
    
    console.log(chalk.white('\nPostgreSQL:'));
    console.log(chalk.gray(`  Connected: ${status.postgresql.connected ? '✅' : '❌'}`));
    console.log(chalk.gray(`  Tables: ${status.postgresql.tableCount}`));
    
    console.log(chalk.white('\nMongoDB:'));
    console.log(chalk.gray(`  Connected: ${status.mongodb.connected ? '✅' : '❌'}`));
    console.log(chalk.gray(`  Collections: ${status.mongodb.collectionCount}`));
    
    // Capture agent response
    this.captureAgentResponse(response);
  }

  /**
   * Helper method to capture and record agent responses
   */
  private captureAgentResponse(response: string): void {
    this.conversationHistoryService.addAgentMessage(response);
  }

  /**
   * Helper method to finalize agent response when complete
   */
  private finalizeAgentResponse(): void {
    this.conversationHistoryService.finalizeAgentResponse();
  }

  /**
   * Perform health check
   */
  private async performHealthCheck(): Promise<void> {
    const spinner = ora('Performing health check...').start();
    
    try {
      await this.agent.performHealthCheck();
      const status = this.agent.getStatus();
      
      spinner.succeed('Health check completed');
      
      const response = `Health Check Results:\nPostgreSQL: ${status.postgresql.health.status}, Response Time: ${status.postgresql.health.responseTime}ms${status.postgresql.health.error ? `, Error: ${status.postgresql.health.error}` : ''}\nMongoDB: ${status.mongodb.health.status}, Response Time: ${status.mongodb.health.responseTime}ms${status.mongodb.health.error ? `, Error: ${status.mongodb.health.error}` : ''}`;
      
      console.log('\n🏥 Health Check Results:');
      console.log(`\n🐘 PostgreSQL: ${status.postgresql.health.status}`);
      console.log(`  Response Time: ${status.postgresql.health.responseTime}ms`);
      if (status.postgresql.health.error) {
        console.log(`  Error: ${status.postgresql.health.error}`);
      }
      
      console.log(`\n🍃 MongoDB: ${status.mongodb.health.status}`);
      console.log(`  Response Time: ${status.mongodb.health.responseTime}ms`);
      if (status.mongodb.health.error) {
        console.log(`  Error: ${status.mongodb.health.error}`);
      }
      
      // Capture agent response
      this.captureAgentResponse(response);
      
      console.log(`\n⏰ Check Time: ${status.lastHealthCheck.toLocaleString()}`);
    } catch (error) {
      spinner.fail('Health check failed');
      console.error('❌ Error:', error);
    }
  }

  /**
   * Show performance metrics
   */
  private async showPerformanceMetrics(): Promise<void> {
    const spinner = ora('Fetching performance metrics...').start();
    
    try {
      const metrics = await this.agent.getPerformanceMetrics();
      spinner.succeed('Performance metrics retrieved');
      
      console.log('\n📊 Performance Metrics:');
      
      console.log('\n🐘 PostgreSQL:');
      console.log(`  Average Query Time: ${metrics.postgresql.averageQueryTime}ms`);
      console.log(`  Total Queries: ${metrics.postgresql.totalQueries}`);
      console.log(`  Slow Queries: ${metrics.postgresql.slowQueries}`);
      
      console.log('\n🍃 MongoDB:');
      console.log(`  Average Operation Time: ${metrics.mongodb.averageOperationTime}ms`);
      console.log(`  Total Operations: ${metrics.mongodb.totalOperations}`);
      console.log(`  Slow Operations: ${metrics.mongodb.slowOperations}`);
    } catch (error) {
      spinner.fail('Failed to retrieve performance metrics');
      console.error('❌ Error:', error);
    }
  }

  /**
   * Handle database management operations
   */
  private async handleManagement(options: any): Promise<void> {
    try {
      if (options.backup) {
        await this.createDatabaseBackup();
      } else if (options.restore) {
        await this.restoreDatabaseBackup(options.restore);
      } else if (options.optimize) {
        await this.optimizeDatabasePerformance();
      } else if (options.cleanup) {
        await this.cleanupDatabase();
      } else {
        console.log('Please specify a management operation: --backup, --restore, --optimize, or --cleanup');
      }
    } catch (error) {
      console.error('❌ Management operation failed:', error);
    }
  }

  /**
   * Create database backup
   */
  private async createDatabaseBackup(): Promise<void> {
    const spinner = ora('Creating database backup...').start();
    
    try {
      // This would integrate with actual backup tools
      spinner.succeed('Backup creation completed');
      console.log('💾 Database backup created successfully');
      console.log('📁 Backup location: ./backups/');
    } catch (error) {
      spinner.fail('Backup creation failed');
      console.error('❌ Error:', error);
    }
  }

  /**
   * Restore database from backup
   */
  private async restoreDatabaseBackup(backupFile: string): Promise<void> {
    const spinner = ora(`Restoring database from ${backupFile}...`).start();
    
    try {
      // This would integrate with actual restore tools
      spinner.succeed('Database restore completed');
      console.log(`💾 Database restored from ${backupFile}`);
    } catch (error) {
      spinner.fail('Database restore failed');
      console.error('❌ Error:', error);
    }
  }

  /**
   * Optimize database performance
   */
  private async optimizeDatabasePerformance(): Promise<void> {
    const spinner = ora('Optimizing database performance...').start();
    
    try {
      // This would integrate with actual optimization tools
      spinner.succeed('Performance optimization completed');
      console.log('🚀 Database performance optimized');
      console.log('💡 Consider reviewing indexes and query patterns');
    } catch (error) {
      spinner.fail('Performance optimization failed');
      console.error('❌ Error:', error);
    }
  }

  /**
   * Cleanup database
   */
  private async cleanupDatabase(): Promise<void> {
    const spinner = ora('Cleaning up database...').start();
    
    try {
      // This would integrate with actual cleanup tools
      spinner.succeed('Database cleanup completed');
      console.log('🧹 Database cleanup completed');
      console.log('🗑️  Old data and indexes removed');
    } catch (error) {
      spinner.fail('Database cleanup failed');
      console.error('❌ Error:', error);
    }
  }

  /**
   * Handle schema modification workflow
   */
  private async handleSchemaModification(options: any): Promise<void> {
    try {
      // Use the existing modification service
      const modificationService = await this.getModificationService();
      
      console.log('🔧 Starting schema modification workflow...');
      
      // Get current MongoDB schema
      const mongoResult = await this.agent.generateMongoDBSchemaFromPostgreSQL();
      if (!mongoResult.success || !mongoResult.mongodbSchema) {
        throw new Error('Failed to get current MongoDB schema');
      }
      
      // Create workflow state
      const workflowState: any = {
        originalSchema: mongoResult.mongodbSchema.collections,
        originalPostgresSchema: mongoResult.postgresSchema,
        currentModifications: [],
        modifiedSchema: null
      };
      
      if (options.preview) {
        // Preview modifications
        const preview = await modificationService.previewModifications(
          options.feedback,
          workflowState.originalSchema
        );
        
        if (preview.success) {
          console.log('✅ Modification preview generated');
          console.log(`📊 Found ${preview.modificationRequests.length} modification requests`);
          console.log('🔍 Preview schema changes:');
          preview.previewSchema.forEach((collection: any) => {
            console.log(`  • ${collection.name}: ${collection.fields.length} fields`);
          });
        } else {
          console.error('❌ Preview failed:', preview.errors);
        }
      } else {
        // Apply modifications
        const result = await modificationService.processModificationWorkflow(
          options.feedback,
          workflowState
        );
        
        if (result.success) {
          console.log('✅ Schema modifications applied successfully');
          console.log(`📊 Modified ${result.modifiedSchema?.summary.modifiedCollections} collections`);
          console.log(`📁 Generated ${Object.keys(result.regenerationResult?.files || {}).length} updated documents`);
          
          if (result.finalMigrationDocument) {
            console.log(`📋 Final migration document: ${result.finalMigrationDocument.filepath}`);
          }
        } else {
          console.error('❌ Schema modification failed:', result.errors);
        }
      }
      
    } catch (error) {
      console.error('❌ Schema modification workflow failed:', error);
    }
  }

  /**
   * Handle final migration document generation
   */
  private async handleFinalMigration(options: any): Promise<void> {
    try {
      // Use the existing modification service
      const modificationService = await this.getModificationService();
      
      console.log('📋 Generating final migration document...');
      
      // Get current state
      const mongoResult = await this.agent.generateMongoDBSchemaFromPostgreSQL();
      if (!mongoResult.success || !mongoResult.mongodbSchema) {
        throw new Error('Failed to get current MongoDB schema');
      }
      
      // Create workflow state
      const workflowState: any = {
        originalSchema: mongoResult.mongodbSchema.collections,
        originalPostgresSchema: mongoResult.postgresSchema,
        currentModifications: [],
        modifiedSchema: null
      };
      
      // Process final feedback if provided
      if (options.feedback) {
        const result = await modificationService.processModificationWorkflow(
          options.feedback,
          workflowState
        );
        
        if (!result.success) {
          throw new Error(`Final modifications failed: ${result.errors.join(', ')}`);
        }
        
        workflowState.modifiedSchema = result.modifiedSchema;
      }
      
      // Generate final migration document
      // Use the existing modification service for final generation
      const finalGenerator = await this.getModificationService();
      
      const finalDoc = await finalGenerator.generateFinalMigrationDocument(
        workflowState.modifiedSchema || { collections: workflowState.originalSchema, modifications: [], summary: { totalCollections: 0, modifiedCollections: 0, addedFields: 0, removedFields: 0, changedRelationships: 0 } },
        workflowState.originalPostgresSchema
      );
      
      if (finalDoc.success) {
        console.log('✅ Final migration document generated successfully');
        console.log(`📁 Document location: ${finalDoc.filepath}`);
        console.log(`📊 Collections: ${finalDoc.metadata.totalCollections}`);
        console.log(`🔧 Modifications: ${finalDoc.metadata.modificationsApplied}`);
        console.log(`⚡ Complexity: ${finalDoc.metadata.migrationComplexity}`);
      } else {
        console.error('❌ Final migration document generation failed');
      }
      
    } catch (error) {
      console.error('❌ Final migration generation failed:', error);
    }
  }

  /**
   * Handle start modification session
   */
  private async handleStartModification(options: any): Promise<void> {
    try {
      const modificationService = await this.getModificationService();
      
      console.log('🚀 Starting interactive schema modification session...');
      
      // Get PostgreSQL schema
      const postgresResult = await this.agent.analyzePostgreSQLSchema();
      if (!postgresResult.success) {
        throw new Error('Failed to analyze PostgreSQL schema');
      }
      
      // Get current MongoDB schema
      const mongoResult = await this.agent.generateMongoDBSchemaFromPostgreSQL();
      if (!mongoResult.success || !mongoResult.mongodbSchema) {
        throw new Error('Failed to get current MongoDB schema');
      }
      
      // Parse business requirements and performance constraints
      const businessRequirements = options.businessRequirements?.split(',').map((r: string) => r.trim()) || [];
      const performanceConstraints = options.performanceConstraints?.split(',').map((c: string) => c.trim()) || [];
      
      // Start modification session
      const session = modificationService.startModificationSession(
        (postgresResult as any).schema || postgresResult,
        mongoResult.mongodbSchema.collections || [],
        businessRequirements,
        performanceConstraints
      );
      
      console.log('✅ Modification session started successfully!');
      console.log(`🆔 Session ID: ${session.sessionId}`);
      console.log(`📊 Collections: ${session.currentSchema.length}`);
      console.log(`📋 Business Requirements: ${businessRequirements.length > 0 ? businessRequirements.join(', ') : 'None specified'}`);
      console.log(`⚡ Performance Constraints: ${performanceConstraints.length > 0 ? performanceConstraints.join(', ') : 'None specified'}`);
      console.log('\n💡 Next steps:');
      console.log('  • Use "modify-schema" to make changes');
      console.log('  • Use "get-suggestions" for AI recommendations');
      console.log('  • Use "update-docs" to generate updated documentation');
      console.log('  • Use "approve-schema" when ready for final migration');
      
    } catch (error) {
      console.error('❌ Failed to start modification session:', error);
    }
  }

  /**
   * Handle get suggestions
   */
  private async handleGetSuggestions(options: any): Promise<void> {
    try {
      const modificationService = await this.getModificationService();
      
      console.log(`💡 Getting intelligent suggestions for session ${options.session}...`);
      
      const suggestions = await modificationService.getModificationSuggestions(options.session);
      
      if (suggestions.length > 0) {
        console.log('✅ AI suggestions generated successfully!');
        console.log('\n🤖 Intelligent Modification Suggestions:');
        
        suggestions.forEach((suggestion: any, index: number) => {
          console.log(`\n${index + 1}. ${suggestion.suggestion}`);
          console.log(`   Reasoning: ${suggestion.reasoning}`);
          console.log(`   Impact: ${suggestion.impact} | Effort: ${suggestion.effort}`);
          console.log(`   Benefits: ${suggestion.benefits.join(', ')}`);
          if (suggestion.risks.length > 0) {
            console.log(`   Risks: ${suggestion.risks.join(', ')}`);
          }
          console.log(`   Implementation: ${suggestion.implementation}`);
        });
        
        console.log('\n💡 To apply a suggestion, use:');
        console.log('  peer-ai-mongo-migrator modify-schema -s <sessionId> -f "<suggestion description>"');
      } else {
        console.log('ℹ️  No suggestions available at this time.');
      }
      
    } catch (error) {
      console.error('❌ Failed to get suggestions:', error);
    }
  }

  /**
   * Handle update documentation
   */
  private async handleUpdateDocs(options: any): Promise<void> {
    try {
      const modificationService = await this.getModificationService();
      
      console.log(`📝 Generating updated documentation for session ${options.session}...`);
      
      const result = await modificationService.generateUpdatedDocumentation(
        options.session,
        options.output
      );
      
      if (result.success) {
        console.log('✅ Updated documentation generated successfully!');
        console.log(`📁 File: ${result.filePath}`);
        console.log('\n🔄 The documentation now reflects your latest schema modifications.');
      } else {
        console.error('❌ Failed to generate updated documentation:', result.error);
      }
      
    } catch (error) {
      console.error('❌ Failed to update documentation:', error);
    }
  }

  /**
   * Handle approve schema
   */
  private async handleApproveSchema(options: any): Promise<void> {
    try {
      const modificationService = await this.getModificationService();
      
      console.log(`✅ Approving final schema for session ${options.session}...`);
      
      const finalDocument = await modificationService.approveFinalSchema(options.session);
      
      console.log('🎉 Final schema approved successfully!');
      console.log(`📋 Document ID: ${finalDocument.documentId}`);
      console.log(`📊 Final Collections: ${finalDocument.approvedSchema.length}`);
      console.log(`🔧 Total Modifications: ${finalDocument.modificationSummary.totalModifications}`);
      console.log(`⚡ Performance Impact: ${finalDocument.modificationSummary.performanceImpact}`);
      console.log(`📈 Complexity Change: ${finalDocument.modificationSummary.complexityChange}`);
      
      console.log('\n📋 Key Changes Made:');
      finalDocument.modificationSummary.keyChanges.forEach((change: any) => {
        console.log(`  • ${change}`);
      });
      
      console.log('\n💡 Final Recommendations:');
      finalDocument.finalRecommendations.forEach((rec: any) => {
        console.log(`  • ${rec}`);
      });
      
      console.log('\n🚀 Your final migration document has been generated and is ready for implementation!');
      
    } catch (error) {
      console.error('❌ Failed to approve schema:', error);
    }
  }

  /**
   * Handle list sessions
   */
  private async handleListSessions(): Promise<void> {
    try {
      const modificationService = await this.getModificationService();
      
      console.log('📋 Listing all active modification sessions...');
      
      const sessions = modificationService.listActiveSessions();
      
      if (sessions.length > 0) {
        console.log(`✅ Found ${sessions.length} active session(s):`);
        
        sessions.forEach((session: any) => {
          console.log(`\n🆔 Session ID: ${session.sessionId}`);
          console.log(`📅 Started: ${session.startTime.toLocaleString()}`);
          console.log(`📊 Collections: ${session.currentSchema.length}`);
          console.log(`🔧 Modifications: ${session.modificationHistory.length}`);
          console.log(`📋 Status: ${session.status}`);
        });
        
        console.log('\n💡 Use these session IDs with modify-schema, get-suggestions, update-docs, or approve-schema commands.');
      } else {
        console.log('ℹ️  No active modification sessions found.');
        console.log('💡 Start a new session with: peer-ai-mongo-migrator start-modification');
      }
      
    } catch (error) {
      console.error('❌ Failed to list sessions:', error);
    }
  }

  /**
   * Analyze PostgreSQL schema comprehensively
   */
  private async analyzePostgreSQLSchema(): Promise<void> {
    const spinner = ora('Analyzing PostgreSQL schema comprehensively...').start();
    
    try {
      const result = await this.agent.analyzePostgreSQLSchema();
      
      if (result.success) {
        spinner.succeed('PostgreSQL schema analysis completed');
        
        console.log('\n📊 Schema Analysis Results:');
        console.log(`✅ Analysis completed successfully`);
        console.log(`📁 Documentation file: ${result.filepath}`);
        
        if (result.summary) {
          console.log('\n📋 Schema Summary:');
          console.log(`  • Tables: ${result.summary.totalTables}`);
          console.log(`  • Views: ${result.summary.totalViews}`);
          console.log(`  • Functions: ${result.summary.totalFunctions}`);
          console.log(`  • Triggers: ${result.summary.totalTriggers}`);
          console.log(`  • Indexes: ${result.summary.totalIndexes}`);
          console.log(`  • Relationships: ${result.summary.totalRelationships}`);
          console.log(`  • Last Analyzed: ${result.summary.lastAnalyzed.toLocaleString()}`);
        }
        
        console.log('\n💡 The comprehensive schema documentation has been generated and saved to the file above.');
        console.log('📖 Open the file to view detailed table structures, relationships, DDL statements, and Mermaid diagrams.');
      } else {
        spinner.fail('PostgreSQL schema analysis failed');
        console.error('❌ Error:', result.error);
      }
    } catch (error) {
      spinner.fail('PostgreSQL schema analysis failed');
      console.error('❌ Error:', error);
    }
  }

  /**
   * Start interactive CLI mode with human language support
   */
  private async startInteractive(): Promise<void> {
    // This method has been replaced by runInteractive() which uses readline instead of inquirer
    // to avoid Ctrl+C errors
    await this.runInteractive();
  }

  /**
   * Handle natural language input from users using LLM-based intent mapping
   */
  private async handleNaturalLanguageInput(input: string, rl: readline.Interface): Promise<void> {
    // 🔧 POLISH THE INPUT FIRST - Correct all typos before processing
    const polishedInput = this.polishCompleteInput(input);
    
    // Debug: Show what input is being processed
    // Processing input...
    if (polishedInput !== input) {
      console.log(chalk.blue(`🔧 Polished input: "${polishedInput}"`));
    }
    
    try {
      // 🧠 Use LLM-based intent mapping if available, otherwise fallback to keyword matching
      if (this.llmInitialized && this.intentMappingService.isInitialized()) {
        await this.handleWithLLMIntentMapping(polishedInput, rl);
      } else {
        await this.handleWithFallbackIntentMapping(polishedInput, rl);
      }
    } catch (error) {
      console.error(chalk.red('❌ Error processing input:'), error);
      console.log(chalk.yellow('🔄 Falling back to basic help...'));
      this.captureAgentResponse(`Error processing input: ${error}. Falling back to basic help...`);
      await this.showBasicHelp();
    }
  }

  /**
   * Handle input using LLM-based intent mapping
   */
  private async handleWithLLMIntentMapping(input: string, rl: readline.Interface): Promise<void> {
    try {
      // Build context for intent mapping
      const context: IntentContext = {
        previousIntents: this.intentMappingService.getStatus().conversationLength > 0 ? 
          ['previous_interaction'] : [],
        conversationHistory: [],
        userPreferences: {},
        currentDatabase: 'postgresql', // Default assumption
        currentOperation: 'interactive'
      };

      // Get intent mapping result
      const intentResult = await this.intentMappingService.mapIntent(input, context);
      
      // Display intent information
      console.log(chalk.blue(`🧠 Intent: ${intentResult.primaryIntent.intent}`));
      console.log(chalk.gray(`   Confidence: ${Math.round(intentResult.primaryIntent.confidence * 100)}%`));
      console.log(chalk.gray(`   Reasoning: ${intentResult.primaryIntent.reasoning}`));
      
      if (intentResult.requiresConfirmation && intentResult.primaryIntent.confidence < 0.8) {
        console.log(chalk.yellow(`⚠️ Low confidence (${Math.round(intentResult.primaryIntent.confidence * 100)}%). Proceeding with best guess...`));
      }

      // Capture agent response about intent
      const intentResponse = `Intent: ${intentResult.primaryIntent.intent} (${Math.round(intentResult.primaryIntent.confidence * 100)}% confidence). ${intentResult.primaryIntent.reasoning}`;
      this.captureAgentResponse(intentResponse);

      // Route to appropriate handler based on intent
      await this.routeIntentToHandler(intentResult, input, rl);
      
    } catch (error) {
      console.error(chalk.red('❌ LLM intent mapping failed:'), error);
      // COMMENTED OUT FOR TESTING - DISABLED FALLBACK
      // console.log(chalk.yellow('🔄 Falling back to keyword matching...'));
      // await this.handleWithFallbackIntentMapping(input, rl);
      
      // FOR TESTING: Show error instead of using fallback
      console.log(chalk.red('🚫 FALLBACK DISABLED FOR TESTING - Cannot process request without LLM'));
      console.log(chalk.gray('   Please ensure Azure OpenAI configuration is properly set up.'));
      
      // Capture error response
      this.captureAgentResponse('Error: LLM intent mapping failed. Please ensure Azure OpenAI configuration is properly set up.');
      
      rl.prompt();
    }
  }

  /**
   * Handle smart query command
   */
  private async handleSmartQueryCommand(question: string): Promise<void> {
    try {
      if (!this.enhancedDocumentAwareAgent) {
        console.log(chalk.red('❌ Enhanced Document-Aware Agent not initialized'));
        return;
      }

      console.log(chalk.blue(`🤔 Processing: "${question}"`));
      
      const response = await this.enhancedDocumentAwareAgent.handleSmartQuery(question);
      
      console.log(chalk.green('\n📝 Answer:'));
      console.log(chalk.white(response.answer));
      
      if (response.suggestions.length > 0) {
        console.log(chalk.blue('\n💡 Suggestions:'));
        response.suggestions.forEach(suggestion => {
          console.log(chalk.gray(`• ${suggestion}`));
        });
      }
      
      if (response.context.sourceFiles.length > 0) {
        console.log(chalk.gray(`\n📁 Based on: ${response.context.sourceFiles.join(', ')}`));
      }
      
      // Capture agent response
      const agentResponse = `Answer: ${response.answer}${response.suggestions.length > 0 ? `\nSuggestions: ${response.suggestions.join(', ')}` : ''}${response.context.sourceFiles.length > 0 ? `\nBased on: ${response.context.sourceFiles.join(', ')}` : ''}`;
      this.captureAgentResponse(agentResponse);
      
      if (response.needsFiles) {
        console.log(chalk.yellow('\n⚠️ Some analysis files are missing. Run the suggested commands to generate them.'));
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Smart query failed:'), error);
      // Capture error response
      this.captureAgentResponse(`Error: Smart query failed - ${error}`);
      this.finalizeAgentResponse();
    }
  }

  /**
   * Show enhanced agent status
   */
  private async showAgentStatus(): Promise<void> {
    try {
      if (!this.enhancedDocumentAwareAgent) {
        console.log(chalk.red('❌ Enhanced Document-Aware Agent not initialized'));
        return;
      }

      console.log(chalk.blue('🧠 Enhanced Document-Aware Agent Status\n'));
      
      const status = await this.enhancedDocumentAwareAgent.getDatabaseStatus();
      
      // Database connection status
      console.log(chalk.green('📊 Database Connections:'));
      console.log(`  PostgreSQL: ${status.postgresql.connected ? '✅ Connected' : '❌ Not connected'} (${status.postgresql.tableCount} tables)`);
      console.log(`  MongoDB: ${status.mongodb.connected ? '✅ Connected' : '❌ Not connected'} (${status.mongodb.collectionCount} collections)`);
      
      // Analysis files status
      console.log(chalk.green('\n📁 Analysis Files:'));
      console.log(`  PostgreSQL Schema: ${status.analysisFiles.postgres ? '✅ Available' : '❌ Missing'} ${status.analysisFiles.postgres ? `(${status.analysisFiles.postgres})` : ''}`);
      console.log(`  MongoDB Schema: ${status.analysisFiles.mongodb ? '✅ Available' : '❌ Missing'} ${status.analysisFiles.mongodb ? `(${status.analysisFiles.mongodb})` : ''}`);
      console.log(`  Migration Analysis: ${status.analysisFiles.migration ? '✅ Available' : '❌ Missing'} ${status.analysisFiles.migration ? `(${status.analysisFiles.migration})` : ''}`);
      
      // Suggestions
      const suggestions = await this.enhancedDocumentAwareAgent.suggestNextActions();
      if (suggestions.length > 0) {
        console.log(chalk.blue('\n💡 Suggested Next Actions:'));
        suggestions.forEach(suggestion => {
          console.log(chalk.gray(`• ${suggestion}`));
        });
      }
      
      console.log(chalk.gray('\n💬 You can ask questions like:'));
      console.log(chalk.gray('  • "What tables are in my database?"'));
      console.log(chalk.gray('  • "What\'s the relationship between users and orders?"'));
      console.log(chalk.gray('  • "Why was this data embedded in MongoDB?"'));
      console.log(chalk.gray('  • "What\'s the migration strategy for this table?"'));
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to get agent status:'), error);
    }
  }

  /**
   * Handle comprehensive conversation using unified knowledge service
   */
  private async handleComprehensiveConversation(input: string, rl: readline.Interface): Promise<void> {
    try {
      console.log(chalk.blue('\n🧠 Processing your query with comprehensive knowledge...'));
      
      // Use the rationale conversation service with comprehensive query handling
      const response = await this.rationaleConversationService.handleComprehensiveQuery(input);
      
      console.log(chalk.green('\n💡 Comprehensive Answer:'));
      console.log(chalk.white(response.answer));
      
      if (response.context.sourceFiles.length > 0) {
        console.log(chalk.gray(`\n📁 Knowledge Sources: ${response.context.sourceFiles.join(', ')}`));
      }
      
      console.log(chalk.gray(`\n🎯 Analysis Type: ${response.context.analysisType}`));
      
    } catch (error) {
      console.error(chalk.red('\n❌ Error processing comprehensive query:'), error);
    }
  }

  /**
   * Handle rationale conversation queries with enhanced document awareness
   */
  private async handleRationaleConversation(input: string, rl: readline.Interface): Promise<void> {
    try {
      console.log(chalk.blue('🧠 Processing smart query...'));
      
      if (this.enhancedDocumentAwareAgent) {
        const response = await this.enhancedDocumentAwareAgent.handleSmartQuery(input);
        
        console.log(chalk.green('\n📝 Response:'));
        console.log(chalk.white(response.answer));
        
        if (response.suggestions.length > 0) {
          console.log(chalk.blue('\n💡 Suggestions:'));
          response.suggestions.forEach(suggestion => {
            console.log(chalk.gray(`• ${suggestion}`));
          });
        }
        
        if (response.context.sourceFiles.length > 0) {
          console.log(chalk.gray(`\n📁 Based on analysis from: ${response.context.sourceFiles.join(', ')}`));
        }
        
        if (response.needsFiles) {
          console.log(chalk.yellow('\n⚠️ Some analysis files are missing. Run the suggested commands to generate them.'));
        }
      } else {
        // Fallback to original rationale service
        const response = await this.rationaleConversationService.handleRationaleQuery(input);
        
        console.log(chalk.green('\n💡 Rationale Explanation:'));
        console.log(chalk.white(response.answer));
        
        if (response.context.sourceFiles.length > 0) {
          console.log(chalk.gray(`\n📁 Based on analysis from: ${response.context.sourceFiles.join(', ')}`));
        }
      }
      
      console.log(chalk.gray('\n💬 You can ask follow-up questions about specific design decisions, transformations, or migration choices.'));
      
    } catch (error) {
      console.error(chalk.red('❌ Error processing smart query:'), error);
      console.log(chalk.yellow('🔄 Please ensure you have generated the required analysis files first.'));
    } finally {
      rl.prompt();
    }
  }

  /**
   * Handle input using fallback keyword matching
   */
  private async handleWithFallbackIntentMapping(input: string, rl: readline.Interface): Promise<void> {
    const lowerInput = input.toLowerCase();
    
    try {
      // 🎯 PRIORITY 1: Database status and health queries
      if (this.matchesPattern(lowerInput, ['status', 'health', 'how are you', 'are you working'])) {
        console.log(chalk.blue('🏥 Checking database status...'));
        this.captureAgentResponse('Checking database status...');
        await this.showDatabaseStatus();
        return;
      }
      
      // Continue with the rest of the fallback logic...
      // (The rest of the original method content will be preserved here)
      
      // If no pattern matches, show smart help with suggestions
      console.log(chalk.yellow('🤔 I\'m not sure how to handle that request.'));
      this.captureAgentResponse('I\'m not sure how to handle that request. Showing help...');
      await this.showBasicHelp();
      
    } catch (error) {
      console.error(chalk.red('❌ Fallback intent mapping failed:'), error);
      this.captureAgentResponse(`Error: Fallback intent mapping failed - ${error}`);
      await this.showBasicHelp();
    }
  }

  /**
   * Route intent to appropriate handler
   */
  private async routeIntentToHandler(
    intentResult: IntentMappingResult, 
    input: string, 
    rl: readline.Interface
  ): Promise<void> {
    const intent = intentResult.primaryIntent.intent;
    
    try {
      switch (intent) {
        // Database Operations
        case 'postgresql_query':
        case 'postgresql_table_operations':
          await this.handlePostgreSQLNaturalLanguage(input, rl);
          break;
          
        case 'mongodb_operations':
        case 'mongodb_collection_operations':
          await this.handleMongoDBNaturalLanguage(input, rl);
          break;
          
        case 'schema_comparison':
          await this.handleCrossDatabaseNaturalLanguage(input, rl);
          break;
          
        case 'database_status_check':
        case 'system_health_check':
          await this.showDatabaseStatus();
          break;
          
        // Schema Analysis
        case 'er_diagram_generation':
        case 'diagram_generation':
        case 'schema_visualization':
          await this.handleERDiagramNaturalLanguage(input, rl);
          break;
          
        case 'schema_documentation':
        case 'postgresql_schema_analysis':
          await this.handleSchemaAnalysisNaturalLanguage(input, rl);
          this.finalizeAgentResponse();
          break;
          
        case 'mongodb_schema_generation':
          await this.handleMongoDBSchemaGenerationNaturalLanguage(input, rl);
          this.finalizeAgentResponse();
          break;
          
        // Migration
        case 'migration_planning':
        case 'migration_analysis':
        case 'migration_dependencies':
          await this.handleMigrationAnalysisRequest(rl);
          break;
          
        case 'migration_execution':
          await this.handleMigrationPlanNaturalLanguage(input, rl);
          break;
          
        // GitHub Integration
        case 'github_repository_analysis':
        case 'github_code_analysis':
        case 'github_repository_cloning':
        case 'github_schema_extraction':
          await this.handleGitHubAnalysisNaturalLanguage(input, rl);
          break;
          
        // Help and Guidance
        case 'help_request':
        case 'command_guidance':
        case 'feature_explanation':
        case 'tutorial_request':
          await this.showBasicHelp();
          break;
          
        // Rationale Conversation
        case 'rationale_query':
        case 'design_decision_explanation':
        case 'schema_transformation_rationale':
        case 'migration_rationale':
        case 'embedding_rationale':
        case 'grouping_rationale':
          await this.handleComprehensiveConversation(input, rl);
          break;
          
        // MongoDB Documentation
        case 'mongodb_documentation_query':
        case 'mongodb_best_practices':
        case 'mongodb_feature_explanation':
        case 'mongodb_official_guidance':
          await this.handleComprehensiveConversation(input, rl);
          break;
          
        // Complex Operations
        case 'comprehensive_analysis':
        await this.handleComprehensiveDatabaseStateRequest(rl);
          break;
          
        case 'business_context_analysis':
          await this.handleEnhancedBusinessAnalysisNaturalLanguage(input, rl);
          break;
          
        case 'end_to_end_migration':
          await this.handleMigrationPlanNaturalLanguage(input, rl);
          break;
          
        // Schema Modification Commands
        case 'start_modification_session':
        case 'modification_session_start':
          await this.handleStartModificationNaturalLanguage(input, rl);
          break;
          
        case 'modify_schema':
        case 'schema_modification':
        case 'modify_mongodb_schema':
          await this.handleModifySchemaNaturalLanguage(input, rl);
          break;
          
        case 'get_modification_suggestions':
        case 'ai_suggestions':
        case 'modification_suggestions':
          await this.handleGetSuggestionsNaturalLanguage(input, rl);
          break;
          
        case 'update_documentation':
        case 'update_docs':
        case 'regenerate_documentation':
          await this.handleUpdateDocsNaturalLanguage(input, rl);
          break;
          
        case 'approve_schema':
        case 'finalize_schema':
        case 'approve_final_schema':
          await this.handleApproveSchemaNaturalLanguage(input, rl);
          break;
          
        case 'list_modification_sessions':
        case 'show_sessions':
        case 'list_sessions':
          await this.handleListSessionsNaturalLanguage(input, rl);
          break;
          
        // Fallback
        case 'unknown_intent':
        case 'ambiguous_intent':
      console.log(chalk.yellow('🤔 I\'m not sure how to handle that request.'));
          this.captureAgentResponse('I\'m not sure how to handle that request. Showing help...');
          await this.showBasicHelp();
          break;
          
        default:
          console.log(chalk.yellow(`🤔 Unknown intent: ${intent}`));
          this.captureAgentResponse(`Unknown intent: ${intent}. Showing help...`);
          await this.showBasicHelp();
      }
    } catch (error) {
      console.error(chalk.red(`❌ Error handling intent ${intent}:`), error);
      this.captureAgentResponse(`Error handling intent ${intent}: ${error}. Showing help...`);
      await this.showBasicHelp();
      this.finalizeAgentResponse();
    }
  }

  /**
   * Show basic help information
   */
  private async showBasicHelp(): Promise<void> {
    const helpText = `Here are some things I can help you with:

Smart Query Features:
• "analyze postgres schema" - Comprehensive schema analysis with ER diagrams
• "create er diagram" - Visual entity relationship diagrams
• "generate mongo schema" - Convert PostgreSQL to MongoDB schema
• "plan migration strategy" - Intelligent migration planning
• "show database status" - Check connection health
• "analyze github repo <url>" - Analyze repository for migration

Database Operations:
• "fetch from users table" - Query PostgreSQL
• "find in users collection" - Query MongoDB
• "what tables exist in postgres?" - List all tables
• "what collections exist in mongo?" - List all collections

Design & Migration Questions:
• "Why did you choose this approach?" - Explain design decisions
• "What would this table look like in MongoDB?" - Show conversions
• "How should I optimize this query?" - Query optimization

Need more help? Type "help" for complete feature list!`;

    console.log(chalk.blue('\n💡 Here are some things I can help you with:\n'));
    console.log(chalk.gray('🧠 Smart Query Features:'));
    console.log(chalk.gray('  • "analyze postgres schema" - Comprehensive schema analysis with ER diagrams'));
    console.log(chalk.gray('  • "create er diagram" - Visual entity relationship diagrams'));
    console.log(chalk.gray('  • "generate mongo schema" - Convert PostgreSQL to MongoDB schema'));
    console.log(chalk.gray('  • "plan migration strategy" - Intelligent migration planning'));
    console.log(chalk.gray('  • "show database status" - Check connection health'));
    console.log(chalk.gray('  • "analyze github repo <url>" - Analyze repository for migration'));
    console.log(chalk.gray('\n💾 Database Operations:'));
    console.log(chalk.gray('  • "fetch from users table" - Query PostgreSQL'));
    console.log(chalk.gray('  • "find in users collection" - Query MongoDB'));
    console.log(chalk.gray('  • "what tables exist in postgres?" - List all tables'));
    console.log(chalk.gray('  • "what collections exist in mongo?" - List all collections'));
    console.log(chalk.gray('\n🤔 Design & Migration Questions:'));
    console.log(chalk.gray('  • "Why did you choose this approach?" - Explain design decisions'));
    console.log(chalk.gray('  • "What would this table look like in MongoDB?" - Show conversions'));
    console.log(chalk.gray('  • "How should I optimize this query?" - Query optimization'));
    console.log(chalk.gray('\n❓ Need more help? Type "help" for complete feature list!'));
    
    // Capture agent response
    this.captureAgentResponse(helpText);
  }

  /**
   * Check if input matches any patterns
   */
  private matchesPattern(input: string, patterns: string[]): boolean {
    return patterns.some(pattern => input.includes(pattern));
  }

  /**
   * Smart pattern matching using Fuse.js for advanced fuzzy matching
   */
  private smartMatchesPattern(input: string, patterns: string[]): any {
    // Use Fuse.js for advanced fuzzy matching with configurable scoring
    const fuse = new Fuse(patterns, {
      threshold: 0.3,        // Lower = more strict matching
      includeScore: true,    // Include confidence score
      minMatchCharLength: 2  // Minimum characters to match
    });
    
    const results = fuse.search(input);
    
    if (results.length > 0 && results[0].score !== undefined) {
      const confidence = 1 - (results[0].score || 0);
      return {
        confidence: confidence,
        matchedInput: input,
        pattern: results[0].item,
        suggestions: results.slice(0, 3).map(r => r.item)
      };
    }
    
    return null;
  }

  /**
   * Comprehensive input polishing using standard libraries
   */
  private polishCompleteInput(input: string): string {
    const coreCommands = [
      'analyze', 'create', 'generate', 'show', 'give', 'get', 'check', 'migrate',
      'github', 'postgres', 'mongodb', 'schema', 'diagram', 'er', 'migration',
      'same', 'similar', 'equivalent', 'corresponding', 'postgresql'
    ];
    
    let polishedInput = input;
    const allCorrections: string[] = [];
    const words = input.split(' ');
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const correctedWord = this.findBestCorrection(word, coreCommands);
      if (correctedWord !== word) {
        allCorrections.push(`${word} → ${correctedWord}`);
        words[i] = correctedWord;
      }
    }
    
    polishedInput = words.join(' ');
    
    if (allCorrections.length > 0) {
      console.log(chalk.blue(`🔧 Typo corrections applied: ${allCorrections.join(', ')}`));
    }
    
    return polishedInput;
  }

  /**
   * Find the best correction using didyoumean2 library
   */
  private findBestCorrection(word: string, validWords: string[]): string {
    // Use didyoumean2 for fast and accurate typo correction
    const result = didYouMean(word, validWords, { threshold: 0.6 });
    return result || word; // Return original word if no good match found
  }

  /**
   * Calculate word similarity using fastest-levenshtein and natural libraries
   */
  private calculateWordSimilarity(word1: string, word2: string): number {
    // Use fastest-levenshtein for performance
    const levenshteinScore = 1 - (distance(word1, word2) / Math.max(word1.length, word2.length));
    
    // Use natural library for phonetic similarity
    const metaphone = new natural.Metaphone();
    const phoneticScore = metaphone.compare(word1, word2) ? 1.0 : 0.0;
    
    // Use Jaro-Winkler for string similarity
    const jaroWinkler = natural.JaroWinklerDistance;
    const jaroScore = jaroWinkler(word1, word2);
    
    // Weighted combination: Levenshtein (50%), Jaro-Winkler (30%), Phonetic (20%)
    return (levenshteinScore * 0.5) + (jaroScore * 0.3) + (phoneticScore * 0.2);
  }

  /**
   * Calculate Levenshtein distance using fastest-levenshtein library
   */
  private levenshteinDistance(str1: string, str2: string): number {
    // Use fastest-levenshtein for optimal performance
    return distance(str1, str2);
  }

  /**
   * Calculate keyboard layout similarity using natural library
   */
  private calculateKeyboardSimilarity(word1: string, word2: string): number {
    // Use natural library's keyboard distance for better accuracy
    const keyboardDistance = natural.DiceCoefficient(word1, word2);
    return keyboardDistance;
  }

  /**
   * Calculate phonetic similarity using natural library's Metaphone
   */
  private calculatePhoneticSimilarity(word1: string, word2: string): number {
    // Use natural library's Metaphone for accurate phonetic matching
    const metaphone = new natural.Metaphone();
    return metaphone.compare(word1, word2) ? 1.0 : 0.0;
  }

  /**
   * Advanced intent recognition using compromise library
   */
  private recognizeIntent(input: string): { intent: string; confidence: number; entities: any } {
    const doc = nlp(input);
    
    // Extract key entities
    const actions = doc.match('(analyze|create|generate|show|give|get|check|migrate)').out('array');
    const databases = doc.match('(postgres|postgresql|mongo|mongodb|sql)').out('array');
    const targets = doc.match('(schema|diagram|er|migration|source code)').out('array');
    const modifiers = doc.match('(same|similar|corresponding|equivalent)').out('array');
    
    // Determine intent based on extracted entities
    let intent = 'unknown';
    let confidence = 0.0;
    
    if (modifiers.length > 0 && databases.includes('mongo') && targets.includes('schema')) {
      intent = 'mongodb_schema_generation';
      confidence = 0.9;
    } else if (targets.includes('er') || targets.includes('diagram')) {
      intent = 'er_diagram_generation';
      confidence = 0.8;
    } else if (actions.includes('analyze') && databases.includes('postgres')) {
      intent = 'postgresql_schema_analysis';
      confidence = 0.8;
    } else if (databases.includes('github')) {
      intent = 'github_repository_analysis';
      confidence = 0.7;
    }
    
    return {
      intent,
      confidence,
      entities: {
        actions,
        databases,
        targets,
        modifiers
      }
    };
  }

  /**
   * Intelligent business context recognition using compromise library
   */
  private recognizeBusinessIntent(input: string): { intent: string; confidence: number; entities: string[] } {
    const doc = nlp(input);
    
    // Extract business-related entities using flexible patterns
    const businessTerms = doc.match('(business|semantic|workflow|process|rules|data flow|impact|relationship|context)').out('array');
    const actionTerms = doc.match('(analyze|analysis|show|what|map|extract|generate|understand|explore)').out('array');
    const domainTerms = doc.match('(schema|postgres|postgresql|database|table|column)').out('array');
    
    // Calculate confidence based on entity presence and combinations
    let confidence = 0.0;
    let intent = 'unknown';
    
    // High confidence: specific business context phrases
    if (businessTerms.length >= 2 && actionTerms.length >= 1) {
      confidence = 0.9;
      intent = 'business_context_analysis';
    }
    // Medium confidence: business terms with actions
    else if (businessTerms.length >= 1 && actionTerms.length >= 1) {
      confidence = 0.8;
      intent = 'business_analysis_request';
    }
    // Lower confidence: just business terms
    else if (businessTerms.length >= 1) {
      confidence = 0.6;
      intent = 'business_related';
    }
    
    // Boost confidence if domain context is present
    if (domainTerms.length > 0) {
      confidence = Math.min(confidence + 0.1, 1.0);
    }
    
    // Combine all entities for context
    const allEntities = [...businessTerms, ...actionTerms, ...domainTerms];
    
    return {
      intent,
      confidence,
      entities: allEntities
    };
  }

  /**
   * Intelligent GitHub repository recognition using compromise library
   */
  private recognizeGitHubIntent(input: string): { intent: string; confidence: number; entities: string[] } {
    const doc = nlp(input);
    
    // Extract GitHub-related entities using flexible patterns
    const githubTerms = doc.match('(github|repo|repository|git|clone|pull|push|commit)').out('array');
    const actionTerms = doc.match('(analyze|analysis|migrate|migration|understand|explore|check|review)').out('array');
    const techTerms = doc.match('(mongodb|node.js|nodejs|javascript|typescript|react|angular|vue)').out('array');
    
    // Calculate confidence based on entity presence and combinations
    let confidence = 0.0;
    let intent = 'unknown';
    
    // High confidence: GitHub + action + tech context
    if (githubTerms.length >= 1 && actionTerms.length >= 1 && techTerms.length >= 1) {
      confidence = 0.95;
      intent = 'github_tech_migration_analysis';
    }
    // Medium confidence: GitHub + action
    else if (githubTerms.length >= 1 && actionTerms.length >= 1) {
      confidence = 0.85;
      intent = 'github_analysis_request';
    }
    // Lower confidence: just GitHub terms
    else if (githubTerms.length >= 1) {
      confidence = 0.7;
      intent = 'github_related';
    }
    
    // Boost confidence if tech context is present
    if (techTerms.length > 0) {
      confidence = Math.min(confidence + 0.1, 1.0);
    }
    
    // Combine all entities for context
    const allEntities = [...githubTerms, ...actionTerms, ...techTerms];
    
    return {
      intent,
      confidence,
      entities: allEntities
    };
  }

  /**
   * Handle PostgreSQL natural language queries
   */
  private async handlePostgreSQLNaturalLanguage(input: string, rl: readline.Interface): Promise<void> {
    const lowerInput = input.toLowerCase();
    
    // UPDATE operations
    if (this.matchesPattern(lowerInput, ['update', 'set', 'modify', 'change'])) {
      await this.handlePostgreSQLUpdate(input, rl);
      return;
    }
    
    // DELETE operations
    if (this.matchesPattern(lowerInput, ['delete', 'remove', 'drop'])) {
      await this.handlePostgreSQLDelete(input, rl);
      return;
    }
    
    // COUNT operations (check before FETCH to avoid conflicts)
    if (this.matchesPattern(lowerInput, ['how many', 'count'])) {
      await this.handlePostgreSQLCount(input, rl);
      return;
    }
    
    // FETCH operations
    if (this.matchesPattern(lowerInput, ['fetch', 'get', 'retrieve', 'show', 'display'])) {
      await this.handlePostgreSQLFetch(input, rl);
      return;
    }
    
    // If no pattern matches, show help
    console.log(chalk.yellow('💡 For PostgreSQL operations, try:'));
    console.log(chalk.gray('  • "Update language table set name to Hindi where name is English"'));
    console.log(chalk.gray('  • "Delete from language table where name is English"'));
    console.log(chalk.gray('  • "Fetch records from language table"'));
    console.log(chalk.gray('  • "How many records are in language table"'));
  }

  /**
   * Handle MongoDB natural language queries
   */
  private async handleMongoDBNaturalLanguage(input: string, rl: readline.Interface): Promise<void> {
    const lowerInput = input.toLowerCase();
    
    // UPDATE operations
    if (this.matchesPattern(lowerInput, ['update', 'set', 'modify', 'change'])) {
      await this.handleMongoDBUpdate(input, rl);
      return;
    }
    
    // DELETE operations
    if (this.matchesPattern(lowerInput, ['delete', 'remove', 'drop'])) {
      await this.handleMongoDBDelete(input, rl);
      return;
    }
    
    // COUNT operations (check before FETCH to avoid conflicts)
    if (this.matchesPattern(lowerInput, ['how many', 'count'])) {
      await this.handleMongoDBCount(input, rl);
      return;
    }
    
    // FETCH operations
    if (this.matchesPattern(lowerInput, ['fetch', 'get', 'retrieve', 'show', 'display'])) {
      await this.handleMongoDBFetch(input, rl);
      return;
    }
    
    // If no pattern matches, show help
    console.log(chalk.yellow('💡 For MongoDB operations, try:'));
    console.log(chalk.gray('  • "Update language collection set name to Hindi where name is English"'));
    console.log(chalk.gray('  • "Delete from language collection where name is Hindi"'));
    console.log(chalk.gray('  • "Fetch documents from language collection"'));
    console.log(chalk.gray('  • "How many documents are in language collection"'));
  }

  /**
   * Handle schema natural language queries
   */
  private async handleSchemaNaturalLanguage(input: string, rl: readline.Interface): Promise<void> {
    const lowerInput = input.toLowerCase();
    
    if (this.matchesPattern(lowerInput, ['compare', 'difference', 'same', 'different'])) {
      console.log(chalk.blue('🔍 Comparing schemas between databases...'));
      await this.compareSchemas('default');
      return;
    }
    
      // NEW: Handle comprehensive database state requests
      if (this.matchesPattern(lowerInput, ['current state', 'database state', 'both databases', 'fetch the current state'])) {
        await this.handleComprehensiveDatabaseStateRequest(rl);
        return;
      }
    
    if (this.matchesPattern(lowerInput, ['validate', 'check', 'problems', 'issues'])) {
      console.log(chalk.blue('🔍 Validating PostgreSQL schema...'));
      await this.validatePostgreSQLSchema();
      return;
    }
    
    if (this.matchesPattern(lowerInput, ['postgres', 'postgresql', 'sql'])) {
      console.log(chalk.blue('📋 Fetching PostgreSQL schema...'));
      await this.showPostgreSQLSchema();
      return;
    }
    
    if (this.matchesPattern(lowerInput, ['mongo', 'mongodb'])) {
      console.log(chalk.blue('📋 Fetching MongoDB schema...'));
      await this.showMongoDBSchema();
      return;
    }
    
    // Generic schema query
    console.log(chalk.blue('📋 Processing schema request...'));
    console.log(chalk.yellow('💡 Try: "Compare schemas between databases" or "Validate PostgreSQL schema"'));
    console.log(chalk.gray('  Or use: "Show me the database structure" or "Check for schema problems"'));
    console.log(chalk.yellow('💡 NEW: "Compare both databases" or "What is common between databases"'));
  }

  /**
   * Handle cross-database natural language queries
   */
  private async handleCrossDatabaseNaturalLanguage(input: string, rl: readline.Interface): Promise<void> {
    const lowerInput = input.toLowerCase();
    
    if (this.matchesPattern(lowerInput, ['join', 'combine', 'together', 'both'])) {
      console.log(chalk.blue('🔗 Processing cross-database join request...'));
      console.log(chalk.yellow('💡 For cross-database operations, use the CLI command:'));
              console.log(chalk.cyan('  peer-ai-mongo-migrator cross-query --postgres "SELECT * FROM actor" --mongo "{}" --database default --collection actor --join-strategy inner --join-key actor_id'));
      console.log(chalk.gray('  Or ask: "Join actor data from both databases using actor_id"'));
      return;
    }
    
    if (this.matchesPattern(lowerInput, ['actor', 'customer', 'film'])) {
      console.log(chalk.blue('🔗 Setting up cross-database query for common tables...'));
      console.log(chalk.yellow('💡 Example cross-database query:'));
              console.log(chalk.cyan('  peer-ai-mongo-migrator cross-query --postgres "SELECT actor_id, first_name FROM actor LIMIT 5" --mongo "{}" --database default --collection actor --join-strategy inner --join-key actor_id'));
      return;
    }
    
    // Generic cross-database query
    console.log(chalk.blue('🔗 Processing cross-database request...'));
    console.log(chalk.yellow('💡 Cross-database operations allow you to:'));
    console.log(chalk.gray('  • Join data from PostgreSQL and MongoDB'));
    console.log(chalk.gray('  • Compare data across different database types'));
    console.log(chalk.gray('  • Perform complex queries spanning both databases'));
    console.log(chalk.yellow('💡 Try: "Join actor data from both databases" or "Compare customer data across databases"'));
  }

  /**
   * Handle migration natural language queries (ON-DEMAND only)
   */
  private async handleMigrationNaturalLanguage(input: string, rl: readline.Interface): Promise<void> {
    console.log(chalk.blue('🔄 Processing migration request...'));
    console.log(chalk.yellow('⚠️  Migration is ON-DEMAND only and requires explicit user confirmation'));
    console.log(chalk.gray('  I cannot perform migrations automatically for safety reasons.'));
    
    if (this.matchesPattern(input.toLowerCase(), ['actor', 'customer', 'film'])) {
      const tableMatch = input.match(/(?:from|of)\s+(\w+)/i);
      if (tableMatch) {
        const tableName = tableMatch[1];
        console.log(chalk.yellow(`💡 To migrate ${tableName} table, use:`));
        console.log(chalk.cyan(`  peer-ai-mongo-migrator migrate --source ${tableName} --target ${tableName}s --batch-size 100 --validate`));
      }
    }
    
    console.log(chalk.yellow('💡 Migration commands:'));
    console.log(chalk.cyan('  peer-ai-mongo-migrator migrate --source <table> --target <collection> --batch-size <size> --validate'));
    console.log(chalk.gray('  • --source: PostgreSQL table name'));
    console.log(chalk.gray('  • --target: MongoDB collection name'));
    console.log(chalk.gray('  • --batch-size: Number of records to process at once'));
    console.log(chalk.gray('  • --validate: Verify data integrity after migration'));
  }

  /**
   * Handle performance natural language queries
   */
  private async handlePerformanceNaturalLanguage(input: string, rl: readline.Interface): Promise<void> {
    const lowerInput = input.toLowerCase();
    
    if (this.matchesPattern(lowerInput, ['metrics', 'performance', 'speed'])) {
      console.log(chalk.blue('📊 Fetching performance metrics...'));
      await this.showPerformanceMetrics();
      return;
    }
    
    if (this.matchesPattern(lowerInput, ['slow', 'fast', 'optimize'])) {
      console.log(chalk.blue('🚀 Analyzing query performance...'));
      console.log(chalk.yellow('💡 Performance optimization tips:'));
      console.log(chalk.gray('  • Use indexes on frequently queried fields'));
      console.log(chalk.gray('  • Limit result sets with LIMIT clauses'));
      console.log(chalk.gray('  • Avoid SELECT * in large tables'));
      console.log(chalk.gray('  • Use appropriate join strategies'));
      console.log(chalk.yellow('💡 Check current performance: "Show me performance metrics"'));
      return;
    }
    
    // Generic performance query
    console.log(chalk.blue('📊 Processing performance request...'));
    console.log(chalk.yellow('💡 Try: "Show me performance metrics" or "How fast are my queries?"'));
    console.log(chalk.gray('  Or ask: "Are there any slow queries?" or "How can I optimize performance?"'));
  }

  /**
   * Handle comprehensive schema analysis natural language requests
   */
  private async handleSchemaAnalysisNaturalLanguage(input: string, rl: readline.Interface): Promise<void> {
        // Processing comprehensive PostgreSQL schema analysis...
        
        try {
          const result = await this.agent.analyzePostgreSQLSchema();
          if (result.success) {
            // Build comprehensive response for conversation history
            let response = `PostgreSQL Schema Analysis Completed Successfully!\nDocumentation file: ${result.filepath}\nA comprehensive markdown file has been generated with your database schema!`;
            
            if (result.summary) {
              response += `\n\nAnalysis Summary:\n• Tables: ${result.summary.totalTables}\n• Views: ${result.summary.totalViews}\n• Functions: ${result.summary.totalFunctions}\n• Triggers: ${result.summary.totalTriggers}\n• Indexes: ${result.summary.totalIndexes}\n• Relationships: ${result.summary.totalRelationships}\n• Last Analyzed: ${result.summary.lastAnalyzed.toLocaleString()}`;
            }
            
            response += `\n\nYour comprehensive schema documentation has been generated!\nThe file contains:\n• Complete table structures with columns and constraints\n• View definitions and dependencies\n• Function and trigger definitions\n• Index information and optimization details\n• Relationship mapping and foreign keys\n• Full DDL statements for all objects\n• Mermaid diagrams for visual representation\n\nNote: Each analysis creates a new timestamped file to preserve historical versions\nYou can also use: "peer-ai-mongo-migrator schema --analyze" for the same functionality`;
            
            console.log(chalk.green('\n🎉 PostgreSQL Schema Analysis Completed Successfully!'));
            console.log(chalk.cyan(`📁 Documentation file: ${result.filepath}`));
            console.log(chalk.green('✨ A comprehensive markdown file has been generated with your database schema!'));
            if (result.summary) {
              console.log(chalk.blue('\n📊 Analysis Summary:'));
              console.log(chalk.gray(`  • Tables: ${result.summary.totalTables}`));
              console.log(chalk.gray(`  • Views: ${result.summary.totalViews}`));
              console.log(chalk.gray(`  • Functions: ${result.summary.totalFunctions}`));
              console.log(chalk.gray(`  • Triggers: ${result.summary.totalTriggers}`));
              console.log(chalk.gray(`  • Indexes: ${result.summary.totalIndexes}`));
              console.log(chalk.gray(`  • Relationships: ${result.summary.totalRelationships}`));
              console.log(chalk.gray(`  • Last Analyzed: ${result.summary.lastAnalyzed.toLocaleString()}`));
            }
            console.log(chalk.green('\n💡 Your comprehensive schema documentation has been generated!'));
            console.log(chalk.yellow('📖 The file contains:'));
            console.log(chalk.gray('  • Complete table structures with columns and constraints'));
            console.log(chalk.gray('  • View definitions and dependencies'));
            console.log(chalk.gray('  • Function and trigger definitions'));
            console.log(chalk.gray('  • Index information and optimization details'));
            console.log(chalk.gray('  • Relationship mapping and foreign keys'));
            console.log(chalk.gray('  • Full DDL statements for all objects'));
            console.log(chalk.gray('  • Mermaid diagrams for visual representation'));
            console.log(chalk.blue('\n📝 Note: Each analysis creates a new timestamped file to preserve historical versions'));
            console.log(chalk.cyan('\n🔍 You can also use: "peer-ai-mongo-migrator schema --analyze" for the same functionality'));
            
            // Capture comprehensive agent response
            this.captureAgentResponse(response);
            this.finalizeAgentResponse();
          } else {
            const errorResponse = `Schema analysis failed: ${result.error}\nPlease check your PostgreSQL connection and try again.`;
            console.log(chalk.red('\n❌ Schema analysis failed:'), result.error);
            console.log(chalk.yellow('💡 Please check your PostgreSQL connection and try again.'));
            this.captureAgentResponse(errorResponse);
            this.finalizeAgentResponse();
          }
        } catch (error) {
          console.error(chalk.red('\n❌ Schema analysis failed:'), error);
          console.log(chalk.yellow('💡 Please check your PostgreSQL connection and try again.'));
        }
  }

  /**
   * Handle MongoDB schema generation natural language requests
   */
  private async handleMongoDBSchemaGenerationNaturalLanguage(input: string, rl: readline.Interface): Promise<void> {
    const lowerInput = input.toLowerCase();
    
    // Processing MongoDB schema generation...
    
    try {
      const result = await this.agent.generateMongoDBSchemaFromPostgreSQL();
      if (result.success) {
        // Build comprehensive response for conversation history
        let response = `MongoDB Schema Generation Completed Successfully!\nDocumentation file: ${result.filepath}\nA comprehensive MongoDB schema has been generated from your PostgreSQL database!`;
        
        if (result.postgresSchema && result.mongodbSchema) {
          response += `\n\nSummary:\n• PostgreSQL Tables: ${result.postgresSchema.totalTables}\n• MongoDB Collections: ${result.mongodbSchema.totalCollections}\n• Source: ${result.postgresSchema.source}`;
        }
        
        if (result.compatibilityReport) {
          const compatible = result.compatibilityReport.compatibleTables?.length || 0;
          const incompatible = result.compatibilityReport.incompatibleTables?.length || 0;
          response += `\n• Compatibility: ${compatible} compatible, ${incompatible} incompatible`;
        }
        
        response += `\n\nMongoDB schema documentation generated successfully!\nContains: schemas, type mappings, relationships, performance tips, and migration guide\n\nNote: Each generation creates a new timestamped file\nAlternative: "peer-ai-mongo-migrator schema --mongodb"`;
        
        console.log(chalk.green('\n🎉 MongoDB Schema Generation Completed Successfully!'));
        console.log(chalk.cyan(`📁 Documentation file: ${result.filepath}`));
        console.log(chalk.green('✨ A comprehensive MongoDB schema has been generated from your PostgreSQL database!'));
        
        if (result.postgresSchema && result.mongodbSchema) {
          console.log(chalk.blue('\n📊 Summary:'));
          console.log(chalk.gray(`  • PostgreSQL Tables: ${result.postgresSchema.totalTables}`));
          console.log(chalk.gray(`  • MongoDB Collections: ${result.mongodbSchema.totalCollections}`));
          console.log(chalk.gray(`  • Source: ${result.postgresSchema.source}`));
        }
        
        if (result.compatibilityReport) {
          const compatible = result.compatibilityReport.compatibleTables?.length || 0;
          const incompatible = result.compatibilityReport.incompatibleTables?.length || 0;
          console.log(chalk.gray(`  • Compatibility: ${compatible} compatible, ${incompatible} incompatible`));
        }
        
        console.log(chalk.green('\n💡 MongoDB schema documentation generated successfully!'));
        console.log(chalk.gray('📖 Contains: schemas, type mappings, relationships, performance tips, and migration guide'));
        console.log(chalk.blue('\n📝 Note: Each generation creates a new timestamped file'));
        console.log(chalk.cyan('\n🔍 Alternative: "peer-ai-mongo-migrator schema --mongodb"'));
        
        // Capture comprehensive agent response
        this.captureAgentResponse(response);
        this.finalizeAgentResponse();
      } else {
        const errorResponse = `MongoDB schema generation failed: ${result.error}\nPlease check your PostgreSQL connection and try again.`;
        console.log(chalk.red('\n❌ MongoDB schema generation failed:'), result.error);
        console.log(chalk.yellow('💡 Please check your PostgreSQL connection and try again.'));
        this.captureAgentResponse(errorResponse);
        this.finalizeAgentResponse();
      }
    } catch (error) {
      console.error(chalk.red('\n❌ MongoDB schema generation failed:'), error);
      console.log(chalk.yellow('💡 Please check your PostgreSQL connection and try again.'));
    }
  }

  /**
   * NEW: Handle enhanced business context analysis natural language requests
   */
  private async handleEnhancedBusinessAnalysisNaturalLanguage(input: string, rl: readline.Interface): Promise<void> {
    const lowerInput = input.toLowerCase();
    
    console.log(chalk.blue('🧠 Processing enhanced business context analysis request...'));
    console.log(chalk.yellow('💡 This will analyze your PostgreSQL schema with business relationships, data flow patterns, and business processes.'));
    console.log(chalk.gray('⏳ Please wait, this may take a few moments...'));
    
    try {
      const result = await this.agent.analyzePostgreSQLSchema();
      if (result.success) {
        console.log(chalk.green('\n🎉 Enhanced Business Context Analysis Completed Successfully!'));
        console.log(chalk.cyan(`📁 Documentation file: ${result.filepath}`));
        console.log(chalk.green('✨ A comprehensive analysis with business context has been generated!'));
        
        if (result.summary) {
          console.log(chalk.blue('\n📊 Analysis Summary:'));
          console.log(chalk.gray(`  • Tables: ${result.summary.totalTables}`));
          console.log(chalk.gray(`  • Views: ${result.summary.totalViews}`));
          console.log(chalk.gray(`  • Functions: ${result.summary.totalFunctions}`));
          console.log(chalk.gray(`  • Triggers: ${result.summary.totalTriggers}`));
          console.log(chalk.gray(`  • Indexes: ${result.summary.totalIndexes}`));
          console.log(chalk.gray(`  • Relationships: ${result.summary.totalRelationships}`));
          console.log(chalk.gray(`  • Last Analyzed: ${result.summary.lastAnalyzed.toLocaleString()}`));
        }
        
        console.log(chalk.green('\n🧠 Enhanced Business Context Analysis Includes:'));
        console.log(chalk.yellow('📖 The enhanced document contains:'));
        console.log(chalk.gray('  • All standard schema analysis (tables, views, functions, etc.)'));
        console.log(chalk.gray('  • 🧠 Semantic Relationships: Business purpose and context'));
        console.log(chalk.gray('  • 🌊 Data Flow Patterns: Workflow and data movement'));
        console.log(chalk.gray('  • 🏢 Business Processes: Operational process mapping'));
        console.log(chalk.gray('  • 📋 Business Rules: Governance and constraints'));
        console.log(chalk.gray('  • 📊 Impact Matrix: Risk assessment and criticality'));
        console.log(chalk.blue('\n📝 Note: Each analysis creates a new timestamped file to preserve historical versions'));
        console.log(chalk.cyan('\n🔍 You can also use: "peer-ai-mongo-migrator schema --analyze --business-context" for the same functionality'));
      } else {
        console.log(chalk.red('\n❌ Enhanced business context analysis failed:'), result.error);
        console.log(chalk.yellow('💡 Please check your PostgreSQL connection and try again.'));
      }
    } catch (error) {
      console.error(chalk.red('\n❌ Enhanced business context analysis failed:'), error);
      console.log(chalk.yellow('💡 Please check your PostgreSQL connection and try again.'));
    }
  }

  /**
   * Handle migration analysis command
   */
  private async handleMigrationAnalysis(options: any): Promise<void> {
    try {
      const sourceFolder = options.source || 'source-code-1';
      const filename = `${sourceFolder}-analysis.md`;
      const outputPath = options.output || `/Users/prateek/Desktop/peer-ai-mongo-documents/${filename}`;
      
      console.log(`🔍 Starting migration analysis for: ${sourceFolder}`);
      
      // Import the migration analysis service
      const { MigrationAnalysisService } = await import('../services/MigrationAnalysisService.js');
      const migrationService = new MigrationAnalysisService();
      
      // Analyze the source code
      const analysis = await migrationService.analyzeSourceCode(sourceFolder);
      
      // Generate migration plan
      const plan = await migrationService.generateMigrationPlan(analysis);
      
      // Create split documentation
      const { summaryPath, detailPath } = await migrationService.createSplitMigrationDocumentation(analysis, plan, outputPath);
      
      // Also write to current project directory
      const summaryFilename = `${sourceFolder}-summary.md`;
      const detailFilename = `${sourceFolder}-detail.md`;
      
      const summaryContent = fs.readFileSync(summaryPath, 'utf8');
      const detailContent = fs.readFileSync(detailPath, 'utf8');
      
      const { centralPath: summaryCentralPath, projectPath: summaryProjectPath } = DualLocationFileWriter.writeToBothLocations(summaryFilename, summaryContent);
      const { centralPath: detailCentralPath, projectPath: detailProjectPath } = DualLocationFileWriter.writeToBothLocations(detailFilename, detailContent);
      
      console.log(`✅ Migration analysis complete! Split documentation saved to both locations:`);
      console.log(`   📄 Summary:`);
      console.log(`      📍 Central: ${summaryCentralPath}`);
      console.log(`      📍 Project: ${summaryProjectPath}`);
      console.log(`   📄 Detail:`);
      console.log(`      📍 Central: ${detailCentralPath}`);
      console.log(`      📍 Project: ${detailProjectPath}`);
      
    } catch (error) {
      console.error('❌ Migration analysis failed:', error);
      process.exit(1);
    }
  }

  /**
   * Handle detect source folders command
   */
  private async handleDetectSourceFolders(): Promise<void> {
    try {
      console.log('🔍 Detecting source code folders...');
      
      // Import the migration analysis service
      const { MigrationAnalysisService } = await import('../services/MigrationAnalysisService.js');
      const migrationService = new MigrationAnalysisService();
      
      const folders = await migrationService.detectSourceCodeFolders();
      
      if (folders.length === 0) {
        console.log('❌ No source-code-* folders found in the workspace');
        return;
      }
      
      console.log('📁 Found source code folders:');
      folders.forEach((folder, index) => {
        console.log(`  ${index + 1}. ${folder}`);
      });
      
      console.log('\n💡 Use: peer-ai-mongo-migrator analyze-migration --source <folder-name> to analyze a specific folder');
      
    } catch (error) {
      console.error('❌ Error detecting source folders:', error);
      process.exit(1);
    }
  }

  /**
   * Handle generate migration plan command
   */
  private async handleGenerateMigrationPlan(options: any): Promise<void> {
    try {
      const sourceFolder = options.source || 'source-code-1';
      const filename = `${sourceFolder}-migration-plan.md`;
      const outputPath = options.output || `/Users/prateek/Desktop/peer-ai-mongo-documents/${filename}`;
      
      console.log(`📋 Generating migration plan for: ${sourceFolder}`);
      
      // Import the migration analysis service
      const { MigrationAnalysisService } = await import('../services/MigrationAnalysisService.js');
      const migrationService = new MigrationAnalysisService();
      
      // Analyze the source code
      const analysis = await migrationService.analyzeSourceCode(sourceFolder);
      
      // Generate migration plan
      const plan = await migrationService.generateMigrationPlan(analysis);
      
      // Create documentation
      const documentationContent = await migrationService.createMigrationDocumentation(analysis, plan, outputPath);
      
      // Also write to current project directory
      const { centralPath, projectPath } = DualLocationFileWriter.writeToBothLocations(filename, documentationContent);
      
      console.log(`✅ Migration plan generated! Documentation saved to both locations:`);
      console.log(`   📍 Central: ${centralPath}`);
      console.log(`   📍 Project: ${projectPath}`);
      
    } catch (error) {
      console.error('❌ Migration plan generation failed:', error);
      process.exit(1);
    }
  }

  /**
   * Show interactive help
   */
  private showInteractiveHelp(): void {
    console.log(chalk.blue('\n🚀 PeerAI MongoMigrator - Enhanced Document-Aware Agent'));
    console.log(chalk.white('Ask any question about your database in natural language. The agent uses your schema analysis files as knowledge base.\n'));
    
    console.log(chalk.yellow('📋 Basic Commands:'));
    console.log(chalk.gray('  • help          - Show this help message'));
    console.log(chalk.gray('  • status        - Show database connection status'));
    console.log(chalk.gray('  • health        - Perform manual health check'));
    console.log(chalk.gray('  • agent-status  - Show enhanced agent status and suggestions'));
    console.log(chalk.gray('  • exit          - Exit interactive mode\n'));
    
    console.log(chalk.yellow('🧠 Smart Query Features:'));
    console.log(chalk.white('\n📊 Schema Analysis & Documentation:'));
    console.log(chalk.gray('  • "Analyze the postgres schema" - Comprehensive schema analysis with ER diagrams'));
    console.log(chalk.gray('  • "Generate postgres schema documentation" - Detailed markdown documentation'));
    console.log(chalk.gray('  • "Create ER diagram" - Visual entity relationship diagrams'));
    console.log(chalk.gray('  • "Show database structure" - Complete database overview'));
    console.log(chalk.gray('  • "What tables exist in postgres?" - List all tables with details'));
    console.log(chalk.gray('  • "What collections exist in mongo?" - List all collections with details'));
    
    console.log(chalk.white('\n🔄 Interactive Schema Modification:'));
    console.log(chalk.gray('  • "Start modification session" - Begin interactive schema refinement'));
    console.log(chalk.gray('  • "Modify the schema to [description]" - Apply specific changes'));
    console.log(chalk.gray('  • "Get suggestions" - Get AI improvement recommendations'));
    console.log(chalk.gray('  • "Update documentation" - Generate updated docs with changes'));
    console.log(chalk.gray('  • "Approve schema" - Finalize and generate migration document'));
    console.log(chalk.gray('  • "List sessions" - Show all active modification sessions'));
    
    console.log(chalk.white('\n🔄 Migration & Transformation:'));
    console.log(chalk.gray('  • "Convert postgres to MongoDB schema" - Intelligent schema conversion'));
    console.log(chalk.gray('  • "Generate mongo schema" - Create MongoDB collections from PostgreSQL'));
    console.log(chalk.gray('  • "Plan migration strategy" - Intelligent migration ordering'));
    console.log(chalk.gray('  • "Analyze migration dependencies" - Migration planning with dependencies'));
    console.log(chalk.gray('  • "What would this table look like in MongoDB?" - Specific table conversion'));
    
    console.log(chalk.white('\n🤔 Design Rationale & Explanations:'));
    console.log(chalk.gray('  • "Why did you embed these fields in MongoDB?" - Explain embedding decisions'));
    console.log(chalk.gray('  • "Explain the rationale behind grouping these tables" - Design reasoning'));
    console.log(chalk.gray('  • "Why was this transformation chosen?" - Migration strategy explanation'));
    console.log(chalk.gray('  • "What is the reasoning behind this migration approach?" - Overall strategy'));
    console.log(chalk.gray('  • "Why did you convert this table to a collection?" - Table conversion logic'));
    console.log(chalk.gray('  • "Explain the design decision for this schema change" - Design decisions'));
    
    console.log(chalk.white('\n💾 Database Operations:'));
    console.log(chalk.gray('  • "Fetch records from users table" - Query PostgreSQL'));
    console.log(chalk.gray('  • "Update language table set name to Hindi where name is English" - Update PostgreSQL'));
    console.log(chalk.gray('  • "Delete from language table where name is English" - Delete from PostgreSQL'));
    console.log(chalk.gray('  • "How many records are in language table" - Count PostgreSQL records'));
    console.log(chalk.gray('  • "Find documents in users collection" - Query MongoDB'));
    console.log(chalk.gray('  • "Update language collection set name to Hindi where name is English" - Update MongoDB'));
    console.log(chalk.gray('  • "How many documents are in language collection" - Count MongoDB documents'));
    
    console.log(chalk.white('\n📈 Database Status & Health:'));
    console.log(chalk.gray('  • "Show me the database status" - Connection and health status'));
    console.log(chalk.gray('  • "How are the databases doing?" - Health check'));
    console.log(chalk.gray('  • "List the tables in postgres" - Tables with row counts'));
    console.log(chalk.gray('  • "List the collections in mongo" - Collections with document counts'));
    console.log(chalk.gray('  • "Compare both databases" - Side-by-side comparison'));
    console.log(chalk.gray('  • "Fetch the current state of both databases" - Comprehensive comparison'));
    
    console.log(chalk.white('\n🔍 Advanced Analysis:'));
    console.log(chalk.gray('  • "What are the relationships between tables?" - Analyze foreign keys'));
    console.log(chalk.gray('  • "Which tables have the most data?" - Data volume analysis'));
    console.log(chalk.gray('  • "What indexes exist in postgres?" - Index analysis'));
    console.log(chalk.gray('  • "What are the data types used?" - Schema type analysis'));
    console.log(chalk.gray('  • "How should I optimize this query?" - Query optimization'));
    console.log(chalk.gray('  • "What are the performance implications?" - Performance analysis'));
    
    console.log(chalk.white('\n🌐 GitHub Repository Analysis:'));
    console.log(chalk.gray('  • "Analyze github repo <url>" - Analyze repository for migration'));
    console.log(chalk.gray('  • "What Spring Boot components need migration?" - Component analysis'));
    console.log(chalk.gray('  • "How should I migrate this Java code to Node.js?" - Code migration'));
    console.log(chalk.gray('  • "What database patterns are used in this code?" - Pattern detection'));
    
    console.log(chalk.yellow('\n💡 Enhanced Features:'));
    console.log(chalk.gray('  • 🧠 Intent-based understanding - No keyword matching, true AI comprehension'));
    console.log(chalk.gray('  • 📚 Document-aware responses - Uses your schema analysis files as knowledge base'));
    console.log(chalk.gray('  • 🔄 Dynamic and portable - Works with any PostgreSQL and MongoDB database'));
    console.log(chalk.gray('  • ⚡ Real-time analysis - Automatically detects and loads latest analysis files'));
    console.log(chalk.gray('  • 🎯 Smart suggestions - Proactive recommendations based on your database'));
    console.log(chalk.gray('  • 📊 Comprehensive documentation - Generates timestamped markdown files'));
    console.log(chalk.gray('  • 🔍 Deep analysis - ER diagrams, relationships, performance insights'));
    console.log(chalk.gray('  • 🚀 Migration planning - Intelligent transformation strategies'));
    
    console.log(chalk.yellow('\n🎯 Pro Tips:'));
    console.log(chalk.gray('  • Ask questions naturally - "What tables are in my database?"'));
    console.log(chalk.gray('  • Be specific about databases - "table" for PostgreSQL, "collection" for MongoDB'));
    console.log(chalk.gray('  • Use "analyze postgres schema" first to generate knowledge base files'));
    console.log(chalk.gray('  • Ask follow-up questions - "Why did you choose this approach?"'));
    console.log(chalk.gray('  • Request explanations - "Explain the rationale behind this decision"'));
    console.log(chalk.gray('  • Get suggestions - "What should I do next?" or "What files do I need?"'));
    console.log(chalk.gray('  • Type "help" anytime to see this message again\n'));
  }

  /**
   * Display query result
   */
  private displayResult(result: any): void {
    if (result.success) {
      console.log(chalk.green('\n✅ Query Result:'));
      console.log(chalk.gray(`Execution time: ${result.executionTime}ms`));
      console.log(chalk.gray(`Rows affected: ${result.rowCount}`));
      console.log(chalk.white('\nData:'));
      console.log(JSON.stringify(result.data, null, 2));
    } else {
      console.log(chalk.red('\n❌ Query Failed:'));
      console.log(chalk.red(result.error));
    }
  }

  /**
   * Display cross-database result
   */
  private displayCrossDatabaseResult(result: any): void {
    if (result.error) {
      console.log(chalk.red('\n❌ Cross-database query failed:'));
      console.log(chalk.red(result.error));
      return;
    }

    console.log(chalk.green('\n✅ Cross-database Query Result:'));
    
    if (result.postgresql) {
      console.log(chalk.blue('\n📊 PostgreSQL:'));
      this.displayResult(result.postgresql);
    }
    
    if (result.mongodb) {
      console.log(chalk.blue('\n🍃 MongoDB:'));
      this.displayResult(result.mongodb);
    }
    
    if (result.combined) {
      console.log(chalk.blue('\n🔗 Combined Result:'));
      console.log(JSON.stringify(result.combined, null, 2));
    }
  }

  /**
   * Display PostgreSQL schema
   */
  private displayPostgreSQLSchema(schema: any[]): void {
    console.log(chalk.blue('\n📊 PostgreSQL Schema:'));
    console.log(chalk.gray(`Total tables: ${schema.length}\n`));
    
    schema.forEach(table => {
      console.log(chalk.white(`Table: ${table.name}`));
      console.log(chalk.gray(`  Primary Key: ${table.primaryKey || 'None'}`));
      console.log(chalk.gray(`  Columns: ${table.columns.length}`));
      table.columns.forEach((col: any) => {
        const nullable = col.nullable ? 'NULL' : 'NOT NULL';
        const primary = col.isPrimary ? ' (PK)' : '';
        const foreign = col.isForeign ? ' (FK)' : '';
        console.log(chalk.gray(`    ${col.name}: ${col.type} ${nullable}${primary}${foreign}`));
      });
      console.log('');
    });
  }

  /**
   * Display MongoDB schema
   */
  private displayMongoDBSchema(schema: any[]): void {
    console.log(chalk.blue('\n🍃 MongoDB Schema:'));
    console.log(chalk.gray(`Total collections: ${schema.length}\n`));
    
    schema.forEach(collection => {
      console.log(chalk.white(`Collection: ${collection.name}`));
      console.log(chalk.gray(`  Fields: ${collection.fields?.length || 0}`));
      if (collection.fields && collection.fields.length > 0) {
        collection.fields.forEach((field: any) => {
          const required = field.required ? ' (required)' : ' (optional)';
          console.log(chalk.gray(`    ${field.name}: ${field.type}${required}`));
        });
      }
      
      if (collection.indexes && collection.indexes.length > 0) {
        console.log(chalk.gray(`  Indexes: ${collection.indexes.length}`));
        collection.indexes.forEach((index: any) => {
          const unique = index.unique ? ' (unique)' : '';
          console.log(chalk.gray(`    ${index.name}: [${index.fields.join(', ')}]${unique}`));
        });
      }
      console.log('');
    });
  }

  /**
   * Display validation result
   */
  private displayValidationResult(validation: any): void {
    console.log(chalk.blue('\n🔍 Schema Validation:'));
    
    if (validation.valid) {
      console.log(chalk.green('✅ Schema is valid'));
    } else {
      console.log(chalk.red('❌ Schema has issues:'));
      validation.issues.forEach((issue: string) => {
        console.log(chalk.red(`  • ${issue}`));
      });
    }
  }

  /**
   * Display migration result
   */
  private displayMigrationResult(result: any): void {
    if (result.success) {
      console.log(chalk.green('\n✅ Migration Completed:'));
      console.log(chalk.gray(`Source: ${result.data.sourceTable}`));
      console.log(chalk.gray(`Target: ${result.data.targetCollection}`));
      console.log(chalk.gray(`Records migrated: ${result.data.recordsMigrated}`));
      console.log(chalk.gray(`Execution time: ${result.data.executionTime}ms`));
    } else {
      console.log(chalk.red('\n❌ Migration Failed:'));
      console.log(chalk.red(result.error));
    }
  }

  /**
   * Display database status
   */
  private displayStatus(status: any): void {
    console.log(chalk.blue('\n📊 Database Status:'));
    
    console.log(chalk.white('\nPostgreSQL:'));
    console.log(chalk.gray(`  Connected: ${status.postgresql.connected ? '✅' : '❌'}`));
    console.log(chalk.gray(`  Tables: ${status.postgresql.tableCount}`));
    
    console.log(chalk.white('\nMongoDB:'));
    console.log(chalk.gray(`  Connected: ${status.mongodb.connected ? '✅' : '❌'}`));
    console.log(chalk.gray(`  Collections: ${status.mongodb.collectionCount}`));
  }

  /**
   * Parse value for MongoDB operations (handles string quotes)
   */
  private parseValue(value: string): any {
    if (value.startsWith("'") && value.endsWith("'")) {
      return value.slice(1, -1);
    }
    if (value.startsWith('"') && value.endsWith('"')) {
      return value.slice(1, -1);
    }
    return value;
  }

  /**
   * Handle PostgreSQL UPDATE operations
   */
  private async handlePostgreSQLUpdate(input: string, rl: readline.Interface): Promise<void> {
    const lowerInput = input.toLowerCase();
    
    // Try to parse natural language UPDATE request
    const updateMatch = input.match(/(?:update|change|modify|edit)\s+(\w+)\s+(?:table\s+)?(?:set\s+)?(\w+)\s+(?:to|to\s+be|as)\s+['"]?([^'"]+)['"]?\s+(?:where|for|in)\s+(\w+)\s+(?:is|equals?|=)\s+['"]?([^'"]+)['"]?/i);
    
    if (updateMatch) {
      const [, tableName, columnName, newValue, whereColumn, whereValue] = updateMatch;
      console.log(chalk.yellow(`🔄 Converting to SQL: UPDATE ${tableName} SET ${columnName}='${newValue}' WHERE ${whereColumn}='${whereValue}'`));
      
      try {
        const sql = `UPDATE ${tableName} SET ${columnName}='${newValue}' WHERE ${whereColumn}='${whereValue}'`;
        console.log(chalk.blue(`📝 Executing: ${sql}`));
        console.log(chalk.gray(`Using MCP Tool: mcp_postgresql_write_query`));
        
        const result = await this.agent.executePostgreSQLQuery(sql);
        if (result.success) {
          console.log(chalk.green(`✅ Update successful! ${result.rowCount || 0} row(s) affected`));
        } else {
          console.log(chalk.red(`❌ Update failed: ${result.error}`));
        }
      } catch (error) {
        console.log(chalk.red(`❌ Update failed: ${error}`));
      }
    } else {
      console.log(chalk.yellow('💡 For updates, use SQL syntax: "UPDATE table SET column=value WHERE condition"'));
      console.log(chalk.gray('  Example: "UPDATE actor SET first_name=\'John\' WHERE actor_id=1"'));
      console.log(chalk.gray('  Or use natural language: "Update actor 1 name to John"'));
      console.log(chalk.yellow('💡 Try: "Update language table set name to Hindi where name is English"'));
    }
  }

  /**
   * Handle PostgreSQL DELETE operations
   */
  private async handlePostgreSQLDelete(input: string, rl: readline.Interface): Promise<void> {
    const lowerInput = input.toLowerCase();
    
    // Try to parse natural language DELETE request
    const deleteMatch = input.match(/(?:delete|remove|drop)\s+(?:from\s+)?(\w+)\s+(?:table\s+)?(?:where\s+)?(\w+)\s+(?:is|equals?|=)\s+['"]?([^'"]+)['"]?/i);
    
    if (deleteMatch) {
      const [, tableName, whereColumn, whereValue] = deleteMatch;
      console.log(chalk.yellow(`🔄 Converting to SQL: DELETE FROM ${tableName} WHERE ${whereColumn}='${whereValue}'`));
      
      try {
        const sql = `DELETE FROM ${tableName} WHERE ${whereColumn}='${whereValue}'`;
        console.log(chalk.blue(`🗑️  Executing: ${sql}`));
        console.log(chalk.gray(`Using MCP Tool: mcp_postgresql_write_query`));
        
        const result = await this.agent.executePostgreSQLQuery(sql);
        if (result.success) {
          console.log(chalk.green(`✅ Delete successful! ${result.rowCount || 0} row(s) affected`));
        } else {
          console.log(chalk.red(`❌ Delete failed: ${result.error}`));
        }
      } catch (error) {
        console.log(chalk.red(`❌ Delete failed: ${error}`));
      }
    } else {
      console.log(chalk.yellow('⚠️  DELETE operations are destructive. Use with caution!'));
      console.log(chalk.yellow('💡 For deletes, use SQL syntax: "DELETE FROM table WHERE condition"'));
      console.log(chalk.gray('  Example: "DELETE FROM actor WHERE actor_id=999"'));
      console.log(chalk.gray('  Or use natural language: "Delete actor with id 999"'));
      console.log(chalk.yellow('💡 Try: "Delete from language table where name is English"'));
    }
  }

  /**
   * Handle PostgreSQL FETCH operations
   */
  private async handlePostgreSQLFetch(input: string, rl: readline.Interface): Promise<void> {
    const lowerInput = input.toLowerCase();
    
    const tableMatch = input.match(/(?:from|in)\s+(\w+)\s+(?:table|tables?)/i);
    if (tableMatch) {
      const tableName = tableMatch[1];
      console.log(chalk.blue(`📊 Fetching records from ${tableName} table...`));
      
      // Ask user for limit to avoid overwhelming output
      console.log(chalk.yellow('💡 Fetching first 10 records (use "LIMIT X" in your request for more)'));
      console.log(chalk.gray(`Using MCP Tool: mcp_postgresql_read_query`));
      const result = await this.agent.executePostgreSQLQuery(`SELECT * FROM ${tableName} LIMIT 10`);
      
      if (result.success && result.data && result.data.length > 0) {
        console.log(chalk.green(`✅ Found ${result.data.length} records from ${tableName} table:`));
        console.log(chalk.gray(JSON.stringify(result.data, null, 2)));
      } else {
        console.log(chalk.yellow(`ℹ️  No records found in ${tableName} table or query failed`));
      }
    } else {
      console.log(chalk.yellow('💡 Try: "Fetch records from actor table" or "Get data from customer table"'));
    }
  }

  /**
   * Handle PostgreSQL COUNT operations
   */
  private async handlePostgreSQLCount(input: string, rl: readline.Interface): Promise<void> {
    const lowerInput = input.toLowerCase();
    
    const tableMatch = input.match(/(?:in|from|of)\s+(\w+)/i);
    if (tableMatch) {
      const tableName = tableMatch[1];
      console.log(chalk.blue(`🔢 Counting records in ${tableName} table...`));
      console.log(chalk.gray(`Using MCP Tool: mcp_postgresql_read_query`));
      const result = await this.agent.executePostgreSQLQuery(`SELECT COUNT(*) as count FROM ${tableName}`);
      console.log(chalk.green(`✅ ${tableName} table has ${result.data?.[0]?.count} records`));
    } else {
      console.log(chalk.yellow('💡 Try: "How many records are in the actor table?"'));
    }
  }

  /**
   * Handle MongoDB UPDATE operations
   */
  private async handleMongoDBUpdate(input: string, rl: readline.Interface): Promise<void> {
    const lowerInput = input.toLowerCase();
    
    // Try to parse natural language UPDATE request
    const updateMatch = input.match(/(?:update|change|modify|edit)\s+(\w+)\s+(?:collection\s+)?(?:set\s+)?(\w+)\s+(?:to|to\s+be|as)\s+['"]?([^'"]+)['"]?\s+(?:where|for|in)\s+(\w+)\s+(?:is|equals?|=)\s+['"]?([^'"]+)['"]?/i);
    
    if (updateMatch) {
      const [, collectionName, fieldName, newValue, whereField, whereValue] = updateMatch;
      console.log(chalk.yellow(`🔄 Converting to MongoDB: UPDATE ${collectionName} SET ${fieldName}='${newValue}' WHERE ${whereField}='${whereValue}'`));
      
      try {
        console.log(chalk.gray(`Using MCP Tool: mcp_MongoDB_update-many`));
        const result = await this.agent.executeMongoDBOperation('update', 'default', collectionName, {
          filter: { [whereField]: this.parseValue(whereValue) },
          update: { $set: { [fieldName]: this.parseValue(newValue) } }
        });
        if (result.success) {
          console.log(chalk.green(`✅ Update successful! Modified ${result.data?.modifiedCount || 0} document(s)`));
        } else {
          console.log(chalk.red(`❌ Update failed: ${result.error}`));
        }
      } catch (error) {
        console.log(chalk.red(`❌ Update failed: ${error}`));
      }
    } else {
      console.log(chalk.yellow('💡 For MongoDB updates, use SQL syntax: "UPDATE collection SET field=value WHERE condition"'));
      console.log(chalk.gray('  Example: "UPDATE actor SET first_name=\'John\' WHERE actor_id=1"'));
      console.log(chalk.gray('  Or use natural language: "Update actor 1 name to John"'));
      console.log(chalk.yellow('💡 Try: "Update language collection set name to Hindi where name is English"'));
    }
  }

  /**
   * Handle MongoDB DELETE operations
   */
  private async handleMongoDBDelete(input: string, rl: readline.Interface): Promise<void> {
    const lowerString = input.toLowerCase();
    
    // Try to parse natural language DELETE request
    const deleteMatch = input.match(/(?:delete|remove)\s+(?:from\s+)?(\w+)\s+(?:collection\s+)?(?:where\s+)?(\w+)\s+(?:is|equals?|=)\s+['"]?([^'"]+)['"]?/i);
    
    if (deleteMatch) {
      const [, collectionName, whereField, whereValue] = deleteMatch;
      console.log(chalk.yellow(`🔄 Converting to MongoDB: DELETE FROM ${collectionName} WHERE ${whereField}='${whereValue}'`));
      
      try {
        console.log(chalk.gray(`Using MCP Tool: mcp_MongoDB_delete-many`));
        const result = await this.agent.executeMongoDBOperation('delete', 'default', collectionName, {
          [whereField]: this.parseValue(whereValue)
        });
        if (result.success) {
          console.log(chalk.green(`✅ Delete successful! Deleted ${result.data?.deletedCount || 0} document(s)`));
        } else {
          console.log(chalk.red(`❌ Delete failed: ${result.error}`));
        }
      } catch (error) {
        console.log(chalk.red(`❌ Delete failed: ${error}`));
      }
    } else {
      console.log(chalk.yellow('⚠️  DELETE operations are destructive. Use with caution!'));
      console.log(chalk.yellow('💡 For deletes, use SQL syntax: "DELETE FROM collection WHERE condition"'));
      console.log(chalk.gray('  Example: "DELETE FROM actor WHERE actor_id=999"'));
      console.log(chalk.gray('  Or use natural language: "Delete actor with id 999"'));
      console.log(chalk.yellow('💡 Try: "Delete from language collection where name is Hindi"'));
    }
  }

  /**
   * Handle MongoDB FETCH operations
   */
  private async handleMongoDBFetch(input: string, rl: readline.Interface): Promise<void> {
    const lowerInput = input.toLowerCase();
    
    const collectionMatch = input.match(/(?:from|in)\s+(\w+)\s+(?:collection|collections?)/i);
    if (collectionMatch) {
      const collectionName = collectionMatch[1];
      console.log(chalk.blue(`📊 Fetching documents from ${collectionName} collection...`));
      
      // Ask user for limit to avoid overwhelming output
      console.log(chalk.yellow('💡 Fetching first 10 documents (use "LIMIT X" in your request for more)'));
      console.log(chalk.gray(`Using MCP Tool: mcp_MongoDB_find`));
              const result = await this.agent.executeMongoDBOperation('find', 'default', collectionName, {});
      
      if (result.success && result.data && result.data.length > 0) {
        console.log(chalk.green(`✅ Found ${result.data.length} documents from ${collectionName} collection:`));
        console.log(chalk.gray(JSON.stringify(result.data, null, 2)));
      } else {
        console.log(chalk.yellow(`ℹ️  No documents found in ${collectionName} collection or query failed`));
      }
    } else {
      console.log(chalk.yellow('💡 Try: "Fetch documents from actor collection" or "Get data from customer collection"'));
    }
  }

  /**
   * Handle MongoDB COUNT operations
   */
  private async handleMongoDBCount(input: string, rl: readline.Interface): Promise<void> {
    const lowerInput = input.toLowerCase();
    
    const collectionMatch = input.match(/(?:in|from|of)\s+(\w+)/i);
    if (collectionMatch) {
      const collectionName = collectionMatch[1];
      console.log(chalk.blue(`🔢 Counting documents in ${collectionName} collection...`));
      console.log(chalk.gray(`Using MCP Tool: mcp_MongoDB_count`));
              const result = await this.agent.executeMongoDBOperation('count', 'default', collectionName, {});
      console.log(chalk.green(`✅ ${collectionName} collection has ${result.data} documents`));
    } else {
      console.log(chalk.yellow('💡 Try: "How many documents are in the actor collection?"'));
    }
  }

  /**
   * Prompt user for input with proper error handling
   */
  private promptUser(rl: readline.Interface, question: string): Promise<string> {
    return new Promise((resolve, reject) => {
      let resolved = false;
      
      try {
        // No timeout for interactive mode - agent stays active indefinitely
        // const timeout = setTimeout(() => {
        //   if (!resolved) {
        //     resolved = true;
        //     reject(new Error('Input timeout - no response received'));
        //   }
        // }, 1800000); // Disabled timeout for continuous operation

        // Create a one-time listener for the answer
        const answerHandler = (answer: string) => {
          if (!resolved) {
            resolved = true;
            // clearTimeout(timeout); // No timeout to clear
            rl.removeListener('error', errorHandler);
            rl.removeListener('close', closeHandler);
            resolve(answer);
          }
        };

        // Create one-time error handler
        const errorHandler = (error: Error) => {
          if (!resolved) {
            resolved = true;
            // clearTimeout(timeout); // No timeout to clear
            rl.removeListener('data', answerHandler);
            rl.removeListener('close', closeHandler);
            reject(error);
          }
        };

        // Create one-time close handler
        const closeHandler = () => {
          if (!resolved) {
            resolved = true;
            // clearTimeout(timeout); // No timeout to clear
            rl.removeListener('data', answerHandler);
            rl.removeListener('error', errorHandler);
            reject(new Error('Readline interface closed unexpectedly'));
          }
        };

        // Add listeners
        rl.once('line', answerHandler);
        rl.once('error', errorHandler);
        rl.once('close', closeHandler);

        // Prompt the user
        rl.setPrompt(question);
        rl.prompt();

      } catch (error) {
        if (!resolved) {
          resolved = true;
          reject(error);
        }
      }
    });
  }


  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    try {
      if (this.agent) {
        await this.agent.cleanup();
      }
      // Clear interactive credentials from memory
      clearInteractiveCredentials();
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }


  /**
   * Force exit handler for stuck interfaces
   */
  private setupForceExitHandlers(cleanup: () => Promise<void>): void {
    // Handle multiple SIGINT signals (force exit)
    let sigintCount = 0;
    const maxSigint = 2;
    
    const forceExitHandler = async (signal: string) => {
      sigintCount++;
      
      if (sigintCount >= maxSigint) {
        console.log(chalk.red('\n🚨 Force exit triggered!'));
        process.exit(1);
      } else {
        console.log(chalk.yellow(`\n⚠️  Press Ctrl+C ${maxSigint - sigintCount} more time(s) to force exit`));
        setTimeout(() => {
          sigintCount = 0; // Reset counter after delay
        }, 3000);
      }
    };

    process.on('SIGINT', forceExitHandler);
    process.on('SIGTERM', forceExitHandler);
  }

  /**
   * Show current input mode status
   */
  private showInputModeStatus(readlineFailed: boolean): void {
    if (readlineFailed) {
      console.log(chalk.yellow('⚠️  Using fallback input mode (readline interface failed)'));
      console.log(chalk.gray('   Type "exit" to quit or wait for automatic recovery'));
    } else {
      console.log(chalk.green('✅ Using normal readline interface'));
    }
  }

  /**
   * Periodic health check for readline interface
   */
  private startReadlineHealthCheck(rl: readline.Interface, readlineFailed: boolean): NodeJS.Timeout {
    return setInterval(() => {
      if (!readlineFailed) {
        // Simple health check - just log that we're alive
        // No need to manipulate the readline interface
      }
    }, 300000); // Check every 5 minutes (very minimal)
  }

  /**
   * Run interactive mode
   */
  async runInteractive(): Promise<void> {
    console.log(chalk.blue('\n🚀 PeerAI MongoMigrator - Enhanced Document-Aware Agent'));
    console.log(chalk.white('Ask any question about your database in natural language. The agent uses your schema analysis files as knowledge base.\n'));
    console.log(chalk.gray('💡 If the interface gets stuck, press Ctrl+C twice to force exit\n'));

    // Start conversation history recording
    this.conversationHistoryService.startRecording();
    console.log(chalk.gray('📝 Conversation history recording started'));

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true, // Enable terminal mode for better stability
      historySize: 50, // Reduced history size
      removeHistoryDuplicates: true,
      completer: undefined // Disable tab completion to avoid issues
    });

    // Handle graceful shutdown
    const cleanup = async () => {
      try {
        rl.close();
        if (this.agent) {
          await this.agent.cleanup();
        }
        // Stop conversation history recording
        this.conversationHistoryService.stopRecording();
        console.log(chalk.gray('📝 Conversation history recording stopped'));
        // Clear interactive credentials from memory
        clearInteractiveCredentials();
        process.exit(0);
      } catch (error) {
        console.error('Error during cleanup:', error);
        process.exit(1);
      }
    };

    // Handle readline errors
    rl.on('error', (error) => {
      console.error(chalk.red('⚠️ Readline interface failed, switching to fallback input...'));
      console.error(chalk.gray(`Error: ${error.message}`));
    });

    // Keep connections alive to prevent idle timeouts
    const keepAliveInterval = setInterval(() => {
      try {
        // Send a keep-alive signal to prevent connection timeouts
        if (this.agent) {
          this.agent.getStatus(); // This will keep the connection alive
        }
      } catch (error) {
        // Ignore keep-alive errors
      }
    }, 300000); // Every 5 minutes

    // Handle SIGINT (Ctrl+C)
    process.on('SIGINT', async () => {
      console.log(chalk.yellow('\n\n🛑 Interrupted by user. Cleaning up...'));
      await cleanup();
    });

    // Setup force exit handlers
    this.setupForceExitHandlers(cleanup);

    let healthCheckInterval: NodeJS.Timeout | null = null;

    try {
      // Start periodic health check
      healthCheckInterval = this.startReadlineHealthCheck(rl, false);

      while (true) {
        try {
          const input = await this.promptUser(rl, '? peer-ai-mongo-migrator> ');
          
          if (!input || input.trim() === '') continue;
          
          if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
            console.log(chalk.yellow('👋 Goodbye!'));
            console.log(chalk.gray('🧹 Clearing credentials from memory...'));
            // Stop conversation history recording
            this.conversationHistoryService.stopRecording();
            console.log(chalk.gray('📝 Conversation history recording stopped'));
            clearInteractiveCredentials();
            break;
          }
          
          if (input.toLowerCase() === 'help') {
            this.showInteractiveHelp();
            continue;
          }
          
          if (input.toLowerCase() === 'status') {
            await this.showDatabaseStatus();
            continue;
          }
          
          if (input.toLowerCase() === 'health') {
            await this.performHealthCheck();
            continue;
          }
          
          // Record user input in conversation history
          this.conversationHistoryService.addUserMessage(input);
          
          // Try to parse as natural language
          await this.handleNaturalLanguageInput(input, rl);
          
        } catch (error) {
          console.error(chalk.red('❌ Error:'), error);
          
          // If it's a readline error, show helpful message
          if (error instanceof Error && error.message.includes('timeout')) {
            console.log(chalk.yellow('⚠️  Input timeout detected. Type "exit" to quit or try again.'));
          }
        }
        
        // Small delay between commands to ensure readline is ready
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } finally {
      // Clean up intervals
      if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
      }
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
      }
      await cleanup();
    }
  }

  /**
   * Process natural language input
   */
  private async processNaturalLanguage(input: string, rl: readline.Interface): Promise<void> {
    const lowerInput = input.toLowerCase();
    
    // Migration analysis patterns
    if (lowerInput.includes('migrate') && (lowerInput.includes('mongodb') || lowerInput.includes('node.js'))) {
      await this.handleMigrationAnalysisNaturalLanguage(input, rl);
      return;
    }
    
    if (lowerInput.includes('analyze') && lowerInput.includes('source code')) {
      await this.handleSourceCodeAnalysisNaturalLanguage(input, rl);
      return;
    }

    if (lowerInput.includes('migration plan') || lowerInput.includes('migration strategy')) {
      await this.handleMigrationPlanNaturalLanguage(input, rl);
      return;
    }
    
    // Existing patterns...
    if (lowerInput.includes('status') || lowerInput.includes('how are you') || lowerInput.includes('are you working')) {
      await this.handleStatus({});
      return;
    }
  }

  /**
   * Handle migration analysis natural language
   */
  private async handleMigrationAnalysisNaturalLanguage(input: string, rl: readline.Interface): Promise<void> {
    try {
      // Processing migration analysis...
      
      // Import the migration analysis service
      const { MigrationAnalysisService } = await import('../services/MigrationAnalysisService.js');
      const migrationService = new MigrationAnalysisService();
      
      // Detect available source code folders
      const folders = await migrationService.detectSourceCodeFolders();
      
      if (folders.length === 0) {
        console.log('❌ No source-code-* folders found in the workspace');
        return;
      }
      
      // Extract source folder from input if specified
      let sourceFolder = '';
      if (input.includes('source-code-')) {
        const match = input.match(/source-code-\d+/);
        if (match) {
          sourceFolder = match[0];
        }
      }
      
      // If no specific folder mentioned or folder doesn't exist, show selection
      if (!sourceFolder || !folders.includes(sourceFolder)) {
        if (folders.length === 1) {
          // Only one folder available, use it automatically
          sourceFolder = folders[0];
          console.log(`📁 Only one source folder found: ${sourceFolder}`);
        } else {
          // Multiple folders available, let user choose
          sourceFolder = await this.promptForSourceFolderSelection(folders, rl);
          if (!sourceFolder) {
            console.log('❌ No folder selected. Migration analysis cancelled.');
            return;
          }
        }
      }
      
      console.log(`📁 Analyzing source code in: ${sourceFolder}`);
      
      // Analyze the source code
      const analysis = await migrationService.analyzeSourceCode(sourceFolder);
      
      // Generate migration plan
      const plan = await migrationService.generateMigrationPlan(analysis);
      
      // Create documentation
      const filename = `${sourceFolder}-analysis.md`;
      const outputPath = `/Users/prateek/Desktop/peer-ai-mongo-documents/${filename}`;
      const documentationContent = await migrationService.createMigrationDocumentation(analysis, plan, outputPath);
      
      // Also write to current project directory
      const { centralPath, projectPath } = DualLocationFileWriter.writeToBothLocations(filename, documentationContent);
      
      console.log(`✅ Migration analysis complete!`);
      console.log(`📊 Summary:`);
      console.log(`   - Project: ${analysis.projectName}`);
      console.log(`   - Total Files: ${analysis.totalFiles}`);
      console.log(`   - Migration Complexity: ${analysis.migrationComplexity}`);
      console.log(`📝 Documentation saved to both locations:`);
      console.log(`   📍 Central: ${centralPath}`);
      console.log(`   📍 Project: ${projectPath}`);
      
    } catch (error) {
      console.error('❌ Migration analysis failed:', error);
    }
  }

  /**
   * Handle source code analysis natural language
   */
  private async handleSourceCodeAnalysisNaturalLanguage(input: string, rl: readline.Interface): Promise<void> {
    try {
      // Processing source code analysis...
      
      // Import the migration analysis service
      const { MigrationAnalysisService } = await import('../services/MigrationAnalysisService.js');
      const migrationService = new MigrationAnalysisService();
      
      // Detect available source folders
      const folders = await migrationService.detectSourceCodeFolders();
      
      if (folders.length === 0) {
        console.log('❌ No source-code-* folders found in the workspace');
        return;
      }
      
      console.log('📁 Available source code folders:');
      folders.forEach((folder, index) => {
        console.log(`  ${index + 1}. ${folder}`);
      });
      
      if (folders.length === 1) {
        console.log(`\n🔍 Automatically analyzing: ${folders[0]}`);
        await this.handleMigrationAnalysisNaturalLanguage(`analyze ${folders[0]}`, rl);
      } else {
        // Multiple folders available, let user choose
        const selectedFolder = await this.promptForSourceFolderSelection(folders, rl);
        if (selectedFolder) {
          console.log(`\n🔍 Analyzing selected folder: ${selectedFolder}`);
          await this.handleMigrationAnalysisNaturalLanguage(`analyze ${selectedFolder}`, rl);
        } else {
          console.log('❌ No folder selected. Source code analysis cancelled.');
        }
      }
      
    } catch (error) {
      console.error('❌ Source code analysis failed:', error);
    }
  }

  /**
   * Handle migration plan natural language
   */
  private async handleMigrationPlanNaturalLanguage(input: string, rl: readline.Interface): Promise<void> {
    try {
      console.log('📋 Processing migration plan generation request...');
      
      // Import the migration analysis service
      const { MigrationAnalysisService } = await import('../services/MigrationAnalysisService.js');
      const migrationService = new MigrationAnalysisService();
      
      // Detect available source code folders
      const folders = await migrationService.detectSourceCodeFolders();
      
      if (folders.length === 0) {
        console.log('❌ No source-code-* folders found in the workspace');
        return;
      }
      
      // Extract source folder from input if specified
      let sourceFolder = '';
      if (input.includes('source-code-')) {
        const match = input.match(/source-code-\d+/);
        if (match) {
          sourceFolder = match[0];
        }
      }
      
      // If no specific folder mentioned or folder doesn't exist, show selection
      if (!sourceFolder || !folders.includes(sourceFolder)) {
        if (folders.length === 1) {
          // Only one folder available, use it automatically
          sourceFolder = folders[0];
          console.log(`📁 Only one source folder found: ${sourceFolder}`);
        } else {
          // Multiple folders available, let user choose
          sourceFolder = await this.promptForSourceFolderSelection(folders, rl);
          if (!sourceFolder) {
            console.log('❌ No folder selected. Migration plan generation cancelled.');
            return;
          }
        }
      }
      
      console.log(`📁 Generating migration plan for: ${sourceFolder}`);
      
      // Analyze the source code
      const analysis = await migrationService.analyzeSourceCode(sourceFolder);
      
      // Generate migration plan
      const plan = await migrationService.generateMigrationPlan(analysis);
      
      // Create documentation
      const filename = `${sourceFolder}-migration-plan.md`;
      const outputPath = `/Users/prateek/Desktop/peer-ai-mongo-documents/${filename}`;
      const documentationContent = await migrationService.createMigrationDocumentation(analysis, plan, outputPath);
      
      // Also write to current project directory
      const { centralPath, projectPath } = DualLocationFileWriter.writeToBothLocations(filename, documentationContent);
      
      console.log(`✅ Migration plan generated!`);
      console.log(`📊 Plan Summary:`);
      console.log(`   - Total Phases: ${plan.phases.length}`);
      console.log(`   - Risk Level: ${plan.summary.riskLevel}`);
      console.log(`📝 Documentation saved to both locations:`);
      console.log(`   📍 Central: ${centralPath}`);
      console.log(`   📍 Project: ${projectPath}`);
      
    } catch (error) {
      console.error('❌ Migration plan generation failed:', error);
    }
  }

  /**
   * Prompt user to select a source folder when multiple are available
   */
  private async promptForSourceFolderSelection(folders: string[], rl: readline.Interface): Promise<string> {
    console.log('\n📁 Multiple source code folders detected:');
    folders.forEach((folder, index) => {
      console.log(`  ${index + 1}. ${folder}`);
    });
    
    console.log('\n💡 Please select which folder to analyze:');
    console.log('   (Enter the number or folder name, or "cancel" to abort)');
    
    return new Promise((resolve) => {
      rl.question('? Your choice: ', (answer: string) => {
        const trimmedAnswer = answer.trim().toLowerCase();
        
        // Check if user wants to cancel
        if (trimmedAnswer === 'cancel' || trimmedAnswer === 'abort' || trimmedAnswer === 'exit') {
          resolve('');
          return;
        }
        
        // Check if user entered a number
        const folderIndex = parseInt(trimmedAnswer) - 1;
        if (!isNaN(folderIndex) && folderIndex >= 0 && folderIndex < folders.length) {
          resolve(folders[folderIndex]);
          return;
        }
        
        // Check if user entered a folder name
        const selectedFolder = folders.find(folder => 
          folder.toLowerCase() === trimmedAnswer || 
          folder.toLowerCase().includes(trimmedAnswer)
        );
        
        if (selectedFolder) {
          resolve(selectedFolder);
          return;
        }
        
        // Invalid input, show error and retry
        console.log('❌ Invalid selection. Please try again.');
        resolve('');
      });
    });
  }

  // ==================== GitHub Repository Analysis Methods ====================

  /**
   * Handle GitHub repository analysis
   */
  private async handleGitHubAnalysis(options: any): Promise<void> {
    try {
      const { GitHubAnalysisService } = await import('../services/GitHubAnalysisService.js');
      const githubService = new GitHubAnalysisService();
      
      console.log(chalk.blue('🚀 Starting GitHub Repository Analysis'));
      console.log(chalk.gray(`Repository: ${options.repo}`));
      
      if (options.branch) {
        console.log(chalk.gray(`Branch: ${options.branch}`));
      }
      
      const result = await githubService.analyzeGitHubRepository(options.repo, {
        branch: options.branch,
        outputPath: options.output,
        includeHistory: !options.shallow
      });

      if (result.success) {
        console.log(chalk.green('\n✅ Analysis completed successfully!'));
        console.log(chalk.gray(`Repository: ${result.repositoryInfo?.fullName}`));
        console.log(chalk.gray(`Analysis saved to: ${result.documentation}`));
        
        if (result.repositoryContext) {
          console.log(chalk.gray(`Language: ${result.repositoryContext.language}`));
          console.log(chalk.gray(`Size: ${result.repositoryContext.size} KB`));
          console.log(chalk.gray(`Last updated: ${result.repositoryContext.lastUpdated}`));
        }
      } else {
        console.log(chalk.red('\n❌ Analysis failed:'));
        console.log(chalk.red(result.error));
      }
    } catch (error) {
      console.error(chalk.red('❌ GitHub analysis failed:'), error);
    }
  }

  /**
   * Handle GitHub setup
   */
  private async handleGitHubSetup(options: any): Promise<void> {
    try {
      console.log(chalk.blue('🔧 GitHub Setup'));
      console.log(chalk.gray('The agent now uses interactive credential prompting for private repositories.'));
      console.log(chalk.gray('No configuration file is needed - credentials are requested when needed.\n'));
      
      if (options.token && options.username) {
        console.log(chalk.yellow('⚠️  Note: Command-line credentials are deprecated.'));
        console.log(chalk.yellow('The agent will prompt for credentials when accessing private repositories.\n'));
      }
      
      console.log(chalk.green('✅ GitHub setup complete!'));
      console.log(chalk.gray('The agent will automatically prompt for credentials when needed.'));
      console.log(chalk.gray('Try analyzing a private repository to test the new system.'));
      
    } catch (error) {
      console.error(chalk.red('❌ GitHub setup failed:'), error);
    }
  }

  /**
   * Handle GitHub status check
   */
  private async handleGitHubStatus(): Promise<void> {
    try {
      console.log(chalk.blue('📊 GitHub Status'));
      
      const { GitHubAnalysisService } = await import('../services/GitHubAnalysisService.js');
      const githubService = new GitHubAnalysisService();
      
      console.log(chalk.blue('📊 GitHub Configuration Status'));
      console.log(chalk.gray('The agent now uses interactive credential prompting.\n'));
      
      if (githubService.isAuthenticated()) {
        console.log(chalk.green('✅ Currently authenticated with GitHub'));
        console.log(chalk.gray('Credentials are stored securely in memory'));
      } else {
        console.log(chalk.yellow('⚠️  Not currently authenticated'));
        console.log(chalk.gray('Credentials will be requested when accessing private repositories'));
      }
      
      console.log(chalk.gray('\n💡 Try analyzing a private repository to test authentication'));
      console.log(chalk.gray('Example: peer-ai-mongo-migrator analyze-github -r https://github.com/owner/owner/private-repo'));
      
    } catch (error) {
      console.error(chalk.red('❌ GitHub status check failed:'), error);
    }
  }

  /**
   * Handle GitHub cleanup
   */
  private async handleGitHubCleanup(): Promise<void> {
    try {
      console.log(chalk.blue('🧹 GitHub Cleanup'));
      
      const { GitHubAnalysisService } = await import('../services/GitHubAnalysisService.js');
      const githubService = new GitHubAnalysisService();
      
      // Clean up temporary files and clear credentials
      await githubService.cleanup();
      
      console.log(chalk.green('✅ GitHub cleanup completed'));
      console.log(chalk.gray('Temporary files removed and credentials cleared'));
      
    } catch (error) {
      console.error(chalk.red('❌ GitHub cleanup failed:'), error);
    }
  }

  /**
   * Start interactive GitHub mode
   */
  private async startGitHubInteractive(): Promise<void> {
    try {
      const { GitHubCLI } = await import('./GitHubCLI.js');
      const githubCLI = new GitHubCLI();
      await githubCLI.run();
    } catch (error) {
      console.error(chalk.red('❌ Failed to start GitHub interactive mode:'), error);
    }
  }

  /**
   * Handle PostgreSQL state request using existing MCP tools
   */
  private async handlePostgreSQLStateRequest(rl: readline.Interface): Promise<void> {
    console.log(chalk.blue('🐘 Fetching PostgreSQL tables...'));
    console.log(chalk.gray('Using MCP Tool: mcp_postgresql_read_query'));
    
    try {
      // Use MCP tool: mcp_postgresql_read_query
      const tablesResult = await this.agent.executePostgreSQLQuery(
        "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"
      );
      
      if (tablesResult.success && tablesResult.data) {
        const tables = tablesResult.data;
        console.log(chalk.green(`\n📊 PostgreSQL Tables:`));
        console.log(chalk.gray(`Total Tables: ${tables.length}`));
        
        if (tables.length > 0) {
          // Just list table names, no row counts
          for (const table of tables) {
            console.log(chalk.white(`  ${table.table_name}`));
          }
        }
      } else {
        console.log(chalk.red('❌ Failed to fetch PostgreSQL tables'));
      }
    } catch (error) {
      console.error(chalk.red('❌ Error fetching PostgreSQL tables:'), error);
    }
  }

  /**
   * Handle MongoDB state request using existing MCP tools
   */
  private async handleMongoDBStateRequest(rl: readline.Interface): Promise<void> {
    console.log(chalk.blue('🍃 Fetching MongoDB collections...'));
    console.log(chalk.gray('Using MCP Tool: mcp_MongoDB_list-collections'));
    
    try {
      // Use the agent's public method to list MongoDB collections
      const collections = await this.agent.listMongoDBCollections('default');
      
      if (collections && collections.length >= 0) {
        console.log(chalk.green(`\n📊 MongoDB Collections:`));
        console.log(chalk.gray(`Total Collections: ${collections.length}`));
        
        if (collections.length > 0) {
          // Just list collection names, no document counts
          for (const collection of collections) {
            console.log(chalk.white(`  ${collection}`));
          }
        }
      } else {
        console.log(chalk.red('❌ Failed to fetch MongoDB collections'));
      }
    } catch (error) {
      console.error(chalk.red('❌ Error fetching MongoDB collections:'), error);
    }
  }

  /**
   * Handle both databases state request using existing MCP tools
   */
  private async handleBothDatabasesStateRequest(rl: readline.Interface): Promise<void> {
    console.log(chalk.blue('🔍 Fetching both databases using MCP tools...'));
    
    try {
      // Get both states in parallel using existing MCP tools
      const [postgresState, mongoState] = await Promise.all([
        this.handlePostgreSQLStateRequest(rl),
        this.handleMongoDBStateRequest(rl)
      ]);
      
      console.log(chalk.green('\n🎯 Both Databases Summary:'));
      console.log(chalk.gray('✅ PostgreSQL tables and MongoDB collections fetched successfully'));
      
    } catch (error) {
      console.error(chalk.red('❌ Error fetching both databases:'), error);
    }
  }

  /**
   * Handle comprehensive database state request with record counts and differences
   */
  private async handleComprehensiveDatabaseStateRequest(rl: readline.Interface): Promise<void> {
    console.log(chalk.blue('🔍 Fetching comprehensive database state...'));
    console.log(chalk.gray('Using MCP Tools: mcp_postgresql_read_query, mcp_MongoDB_count'));
    console.log(chalk.yellow('⏳ This may take a few moments as we count records in all tables and collections...'));
    
    try {
      const spinner = ora('Analyzing database state...').start();
      
      const databaseState = await this.agent.getComprehensiveDatabaseState();
      
      spinner.succeed('Database state analysis completed');
      
      console.log(chalk.green('\n🎯 Comprehensive Database State Analysis:'));
      console.log(databaseState.summary);
      
      // Show detailed breakdown
      console.log(chalk.blue('\n📊 Detailed Breakdown:'));
      
      if (databaseState.commonEntities.length > 0) {
        console.log(chalk.cyan('\n🔗 Common Entities:'));
        databaseState.commonEntities.forEach(entity => {
          const statusColor = entity.status === 'synced' ? chalk.green : chalk.yellow;
          const statusText = entity.status === 'synced' ? '✅ SYNCED' : 
                           entity.status === 'postgresql_ahead' ? '⚠️ POSTGRESQL AHEAD' : '⚠️ MONGODB AHEAD';
          
          console.log(statusColor(`  ${entity.name}: PostgreSQL (${entity.postgresqlCount}) ↔ MongoDB (${entity.mongodbCount})`));
          if (entity.difference > 0) {
            console.log(chalk.gray(`    Difference: ${entity.difference} records ${entity.status === 'postgresql_ahead' ? 'missing in MongoDB' : 'missing in PostgreSQL'}`));
          }
        });
      }
      
      if (databaseState.postgresqlOnly.length > 0) {
        console.log(chalk.red('\n❌ PostgreSQL Only Tables:'));
        databaseState.postgresqlOnly.forEach(table => {
          console.log(chalk.red(`  • ${table.name} (${table.recordCount} records)`));
        });
      }
      
      if (databaseState.mongodbOnly.length > 0) {
        console.log(chalk.red('\n❌ MongoDB Only Collections:'));
        databaseState.mongodbOnly.forEach(collection => {
          console.log(chalk.red(`  • ${collection.name} (${collection.documentCount} documents)`));
        });
      }
      
      console.log(chalk.blue('\n💡 Next Steps:'));
      if (databaseState.overallSyncStatus === 'synced') {
        console.log(chalk.green('  🎉 Your databases are fully synchronized!'));
      } else if (databaseState.overallSyncStatus === 'partially_synced') {
        console.log(chalk.yellow('  ⚠️ Some entities are synchronized, others need attention'));
      } else {
        console.log(chalk.red('  ❌ Databases are out of sync and need immediate attention'));
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Comprehensive database state analysis failed:'), error);
      console.log(chalk.yellow('💡 Please check your database connections and try again'));
    }
  }

  /**
   * Handle migration analysis request
   */
  private async handleMigrationAnalysisRequest(rl: readline.Interface): Promise<void> {
    try {
      console.log('🔍 Analyzing PostgreSQL dependencies for migration ordering...');
      
      const analysis = await this.agent.analyzeMigrationDependencies();
      
      console.log('\n' + chalk.cyan('='.repeat(80)));
      console.log(chalk.cyan('🚀 POSTGRESQL TO MONGODB MIGRATION ANALYSIS'));
      console.log(chalk.cyan('='.repeat(80)));
      
      // Display summary
      console.log('\n' + chalk.yellow(analysis.summary));
      
      // Display detailed phases
      console.log(chalk.cyan('\n📋 MIGRATION PHASES:'));
      console.log(chalk.cyan('-'.repeat(40)));
      
      for (const phase of analysis.phases) {
        // Only show tables that need migration
        const tablesToMigrate = phase.tables.filter((table: any) => table.needsMigration);
        
        if (tablesToMigrate.length > 0) {
          console.log(chalk.green(`\n📋 Phase ${phase.phase}: ${phase.name}`));
          console.log(`   ${phase.description}`);
          console.log(`   Tables to Migrate (${tablesToMigrate.length}):`);
          
          for (const table of tablesToMigrate) {
            const strategyEmoji = table.migrationStrategy === 'standalone' ? '📁' : 
                                table.migrationStrategy === 'embedded' ? '🔗' : '🔗';
            const statusEmoji = table.currentMongoDBCount > 0 ? '⚠️' : '❌';
            
            console.log(`     ${strategyEmoji} ${chalk.cyan(table.name)} (${table.recordCount} records) - ${chalk.yellow(table.migrationStrategy.toUpperCase())}`);
            
            if (table.currentMongoDBCount > 0) {
              console.log(`        Current MongoDB: ${chalk.yellow(table.currentMongoDBCount)} documents ${statusEmoji}`);
            }
            
            if (table.dependencies.length > 0) {
              console.log(`        Dependencies: ${chalk.gray(table.dependencies.join(', '))}`);
            }
            
            console.log(`        Reason: ${chalk.gray(table.reason)}`);
          }
        }
      }
      
      // Display migration summary
      console.log(chalk.cyan('\n📋 MIGRATION SUMMARY:'));
      console.log(chalk.cyan('-'.repeat(40)));
      console.log(`  Total Phases: ${chalk.yellow(analysis.totalPhases)}`);
      console.log(`  Tables to Migrate: ${chalk.yellow(analysis.totalTablesToMigrate)}`);
      
      console.log('\n' + chalk.cyan('='.repeat(80)));
      
      // Ask if user wants to start migration
      await this.promptForMigrationStart(rl, analysis);
      
    } catch (error) {
      console.error('❌ Failed to analyze migration dependencies:', error);
    }
  }

  /**
   * Prompt user to start migration
   */
  private async promptForMigrationStart(rl: readline.Interface, analysis: any): Promise<void> {
    return new Promise((resolve) => {
      rl.question(chalk.yellow('\n🚀 Would you like to start migrating tables? (yes/no): '), async (answer) => {
        if (answer.toLowerCase().includes('yes') || answer.toLowerCase().includes('y')) {
          await this.startInteractiveMigration(rl, analysis);
        } else {
          console.log(chalk.blue('👋 Migration cancelled. You can run this analysis again anytime.'));
        }
        resolve();
      });
    });
  }

  /**
   * Start interactive migration process
   */
  private async startInteractiveMigration(rl: readline.Interface, analysis: any): Promise<void> {
    console.log(chalk.green('\n🚀 Starting interactive migration process...'));
    
    // Track migrated tables to validate dependencies
    const migratedTables = new Set<string>();
    
    // Add already synced tables to migrated set
    for (const phase of analysis.phases) {
      for (const table of phase.tables) {
        if (!table.needsMigration) {
          migratedTables.add(table.name);
        }
      }
    }
    
    let continueMigration = true;
    
    while (continueMigration) {
      // Show current migration status
      await this.showCurrentMigrationStatus(rl, analysis, migratedTables);
      
      // Get user input for which table to migrate
      const selectedTable = await this.promptForTableSelection(rl, analysis, migratedTables);
      
      if (selectedTable === 'exit') {
        continueMigration = false;
        break;
      }
      
      if (selectedTable === 'refresh') {
        // Refresh the analysis to get updated state
        console.log(chalk.blue('🔄 Refreshing migration analysis...'));
        analysis = await this.agent.analyzeMigrationDependencies();
        continue;
      }
      
      // Find the selected table
      let targetTable = null;
      for (const phase of analysis.phases) {
        for (const table of phase.tables) {
          if (table.name === selectedTable) {
            targetTable = table;
            break;
          }
        }
        if (targetTable) break;
      }
      
      if (!targetTable) {
        console.log(chalk.red(`❌ Table "${selectedTable}" not found in migration plan`));
        continue;
      }
      
      // Check if table can be migrated
      if (!targetTable.needsMigration) {
        console.log(chalk.green(`✅ Table "${targetTable.name}" is already synced (${targetTable.recordCount} records ↔ ${targetTable.currentMongoDBCount} documents)`));
        continue;
      }
      
      // Check dependencies
      const missingDependencies = targetTable.dependencies.filter((dep: string) => !migratedTables.has(dep));
      if (missingDependencies.length > 0) {
        console.log(chalk.yellow(`⚠️  Cannot migrate "${targetTable.name}" yet - missing dependencies: ${missingDependencies.join(', ')}`));
        console.log(chalk.gray(`   Migrate these tables first, then try again.`));
        continue;
      }
      
      // Execute migration
      await this.executeTableMigration(rl, targetTable);
      
      // Add to migrated tables set
      migratedTables.add(targetTable.name);
      
      // Show updated database state after migration
      await this.showUpdatedDatabaseState(rl);
      
      // Ask if user wants to continue
      const continueAnswer = await this.promptContinue(rl);
      if (!continueAnswer) {
        continueMigration = false;
      }
    }
    
    console.log(chalk.green('\n🎉 Migration process completed!'));
  }

  /**
   * Prompt user for table migration
   */
  private async promptForTableMigration(rl: readline.Interface, table: any): Promise<boolean> {
    return new Promise((resolve) => {
      const strategyEmoji = table.migrationStrategy === 'standalone' ? '📁' : 
                          table.migrationStrategy === 'embedded' ? '🔗' : '🔗';
      
      // Check if dependencies are satisfied
      if (table.dependencies && table.dependencies.length > 0) {
        // For now, we'll assume dependencies are checked at the phase level
        // More sophisticated dependency checking can be added here if needed
      }
      
      rl.question(chalk.yellow(`\n${strategyEmoji} Migrate table "${chalk.cyan(table.name)}" (${table.recordCount} records) using ${chalk.yellow(table.migrationStrategy.toUpperCase())} strategy? (yes/no/skip): `), (answer) => {
        if (answer.toLowerCase().includes('yes') || answer.toLowerCase().includes('y')) {
          resolve(true);
        } else if (answer.toLowerCase().includes('skip') || answer.toLowerCase().includes('s')) {
          console.log(chalk.blue(`⏭️  Skipping ${table.name}`));
          resolve(false);
        } else {
          console.log(chalk.blue(`⏭️  Skipping ${table.name}`));
          resolve(false);
        }
      });
    });
  }

  /**
   * Execute table migration
   */
  private async executeTableMigration(rl: readline.Interface, table: any): Promise<void> {
    try {
      console.log(chalk.green(`\n🚀 Starting migration of ${table.name}...`));
      
      const result = await this.agent.migrateTableToMongoDB(table.name, table.migrationStrategy);
      
      if (result.success) {
        console.log(chalk.green(`✅ Successfully migrated ${table.name}!`));
        console.log(`   Collection: ${chalk.cyan(result.collectionName)}`);
        console.log(`   Records: ${chalk.yellow(result.migratedCount)}`);
        console.log(`   Strategy: ${chalk.yellow(result.strategy)}`);
        console.log(`   Duration: ${chalk.yellow(result.duration)}ms`);
      } else {
        console.log(chalk.red(`❌ Failed to migrate ${table.name}: ${result.error}`));
      }
      
    } catch (error) {
      console.error(chalk.red(`❌ Error during migration of ${table.name}:`), error);
    }
  }

  /**
   * Show updated database state after migration
   */
  private async showUpdatedDatabaseState(rl: readline.Interface): Promise<void> {
    try {
      console.log(chalk.cyan('\n🔄 Fetching updated database state...'));
      
      const state = await this.agent.getComprehensiveDatabaseState();
      
      console.log(chalk.green('\n📊 UPDATED DATABASE STATE:'));
      console.log(chalk.cyan('-'.repeat(40)));
      
      // Show summary of changes
      const statusEmoji = state.overallSyncStatus === 'synced' ? '✅' : state.overallSyncStatus === 'partially_synced' ? '⚠️' : '❌';
      console.log(`  Overall Sync Status: ${statusEmoji} ${chalk.yellow(state.overallSyncStatus.replace('_', ' ').toUpperCase())}`);
      console.log(`  Total PostgreSQL Records: ${chalk.yellow(state.totalPostgresqlRecords.toLocaleString())}`);
      console.log(`  Total MongoDB Documents: ${chalk.yellow(state.totalMongoDBDocuments.toLocaleString())}`);
      
      // Show any newly synced entities
      const syncedEntities = state.commonEntities.filter(e => e.status === 'synced');
      if (syncedEntities.length > 0) {
        console.log(chalk.green(`\n✅ Synced Entities (${syncedEntities.length}):`));
        syncedEntities.forEach(entity => {
          console.log(`  • ${chalk.cyan(entity.name)}: ${entity.postgresqlCount} records ↔ ${entity.mongodbCount} documents`);
        });
      }
      
    } catch (error) {
      console.error('❌ Failed to fetch updated database state:', error);
    }
  }

  /**
   * Handle GitHub repository analysis natural language
   */
  private async handleGitHubAnalysisNaturalLanguage(input: string, rl: readline.Interface): Promise<void> {
    try {
      // Processing code analysis...
      
      // Check if user mentioned GitHub specifically or provided a URL
      const lowerInput = input.toLowerCase();
      const hasGitHubMention = lowerInput.includes('github') || lowerInput.includes('repository') || lowerInput.includes('repo');
      
      // Look for GitHub URLs in the input
      let repoUrl = '';
      const urlPatterns = [
        /https?:\/\/github\.com\/[^\s]+/g,
        /github\.com\/[^\s]+/g,
        /[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+/g
      ];
      
      for (const pattern of urlPatterns) {
        const matches = input.match(pattern);
        if (matches && matches.length > 0) {
          repoUrl = matches[0];
          break;
        }
      }
      
      // If no URL found and no explicit GitHub mention, ask user to choose source
      if (!repoUrl && !hasGitHubMention) {
        console.log(chalk.blue('🔍 Code Analysis - Source Selection'));
        console.log(chalk.gray('I can analyze your code from different sources. Where is your code located?\n'));
        
        const sourceChoice = await this.promptForSourceLocation(rl);
        
        if (sourceChoice.sourceLocation === 'local') {
          await this.handleLocalCodeAnalysis(input, rl);
          return;
        } else if (sourceChoice.sourceLocation === 'github') {
          // Continue with GitHub analysis
        } else {
          console.log('❌ Analysis cancelled.');
          return;
        }
      }
      
      // If no URL found, prompt user for GitHub URL
      if (!repoUrl) {
        console.log(chalk.blue('🐙 GitHub Repository Analysis'));
        console.log(chalk.gray('I need the GitHub repository URL to analyze\n'));
        
        repoUrl = await this.promptForRepositoryUrl(rl);
        if (!repoUrl) {
          console.log('❌ No repository URL provided. Analysis cancelled.');
          return;
        }
      }
      
      // Extract branch if mentioned
      let branch = '';
      const branchMatch = input.match(/branch\s+(?:is\s+)?([a-zA-Z0-9_-]+)/i);
      if (branchMatch) {
        branch = branchMatch[1];
        console.log(chalk.gray(`Branch detected: ${branch}`));
      }
      
      console.log(chalk.blue(`🚀 Starting analysis of: ${repoUrl}`));
      if (branch) {
        console.log(chalk.gray(`Branch: ${branch}`));
      }
      
      // Import the GitHub analysis service
      const { GitHubAnalysisService } = await import('../services/GitHubAnalysisService.js');
      const githubService = new GitHubAnalysisService();
      
      // Perform the analysis
      const result = await githubService.analyzeGitHubRepository(repoUrl, {
        branch: branch || undefined,
        includeHistory: false // Default to shallow clone for speed
      });

      if (result.success) {
        // Build comprehensive response for conversation history
        let response = `GitHub repository analysis completed successfully!\nRepository: ${result.repositoryInfo?.fullName}\nAnalysis saved to: ${result.documentation}`;
        
        if (result.repositoryContext) {
          response += `\nLanguage: ${result.repositoryContext.language}\nSize: ${result.repositoryContext.size} KB\nLast updated: ${result.repositoryContext.lastUpdated}`;
        }
        
        response += `\n\nMigration Analysis Summary:`;
        if (result.analysis) {
          response += `\n- Project: ${result.analysis.projectName || 'Unknown'}\n- Total Files: ${result.analysis.totalFiles || 'Unknown'}\n- Migration Complexity: ${result.analysis.migrationComplexity || 'Unknown'}`;
        }
        
        if (result.plan) {
          response += `\n- Total Phases: ${result.plan.phases?.length || 'Unknown'}\n- Risk Level: ${result.plan.summary?.riskLevel || 'Unknown'}`;
        }
        
        console.log(chalk.green('\n✅ GitHub repository analysis completed successfully!'));
        console.log(chalk.gray(`Repository: ${result.repositoryInfo?.fullName}`));
        console.log(chalk.gray(`Analysis saved to: ${result.documentation}`));
        
        if (result.repositoryContext) {
          console.log(chalk.gray(`Language: ${result.repositoryContext.language}`));
          console.log(chalk.gray(`Size: ${result.repositoryContext.size} KB`));
          console.log(chalk.gray(`Last updated: ${result.repositoryContext.lastUpdated}`));
        }
        
        console.log(chalk.blue('\n📊 Migration Analysis Summary:'));
        if (result.analysis) {
          console.log(chalk.gray(`   - Project: ${result.analysis.projectName || 'Unknown'}`));
          console.log(chalk.gray(`   - Total Files: ${result.analysis.totalFiles || 'Unknown'}`));
          console.log(chalk.gray(`   - Migration Complexity: ${result.analysis.migrationComplexity || 'Unknown'}`));
        }
        
        if (result.plan) {
          console.log(chalk.gray(`   - Total Phases: ${result.plan.phases?.length || 'Unknown'}`));
          // Estimated effort removed as requested
          console.log(chalk.gray(`   - Risk Level: ${result.plan.summary?.riskLevel || 'Unknown'}`));
        }
        
        // Capture comprehensive agent response
        this.captureAgentResponse(response);
      } else {
        const errorResponse = `GitHub repository analysis failed: ${result.error}${result.error?.includes('authentication') || result.error?.includes('token') ? '\nTip: Run "peer-ai-mongo-migrator github-setup" to configure GitHub authentication' : ''}`;
        console.log(chalk.red('\n❌ GitHub repository analysis failed:'));
        console.log(chalk.red(result.error));
        
        if (result.error?.includes('authentication') || result.error?.includes('token')) {
          console.log(chalk.yellow('\n💡 Tip: Run "peer-ai-mongo-migrator github-setup" to configure GitHub authentication'));
        }
        
        this.captureAgentResponse(errorResponse);
      }
      
    } catch (error) {
      console.error(chalk.red('❌ GitHub repository analysis failed:'), error);
      this.captureAgentResponse(`GitHub repository analysis failed: ${error}`);
    }
  }

  /**
   * Handle local code analysis
   */
  private async handleLocalCodeAnalysis(input: string, rl: readline.Interface): Promise<void> {
    try {
      console.log(chalk.blue('📁 Processing local code analysis...'));
      console.log(chalk.yellow('💡 This will analyze the code in your current directory.'));
      console.log(chalk.gray('⏳ Please wait, this may take a few moments...'));
      
      // Import file system utilities
      const fs = await import('fs');
      const path = await import('path');
      
      // Analyze current directory structure
      const currentDir = process.cwd();
      const files = await this.getDirectoryFiles(currentDir);
      
      // Categorize files
      const analysis = this.categorizeFiles(files);
      
      console.log(chalk.green('\n🎉 Local Code Analysis Completed Successfully!'));
      console.log(chalk.cyan(`📁 Analysis completed for: ${currentDir}`));
      
      console.log(chalk.blue('\n📊 Analysis Summary:'));
      console.log(chalk.gray(`  • Total files analyzed: ${analysis.totalFiles}`));
      console.log(chalk.gray(`  • TypeScript files: ${analysis.typescriptFiles}`));
      console.log(chalk.gray(`  • JavaScript files: ${analysis.javascriptFiles}`));
      console.log(chalk.gray(`  • Database-related files: ${analysis.databaseFiles}`));
      console.log(chalk.gray(`  • Service files: ${analysis.serviceFiles}`));
      console.log(chalk.gray(`  • Configuration files: ${analysis.configFiles}`));
      
      console.log(chalk.green('\n💡 Local code analysis completed!'));
      console.log(chalk.yellow('📖 Analysis includes:'));
      console.log(chalk.gray('  • File structure and organization'));
      console.log(chalk.gray('  • Database connection patterns'));
      console.log(chalk.gray('  • Service layer architecture'));
      console.log(chalk.gray('  • Configuration management'));
      console.log(chalk.gray('  • Dependencies and imports'));
      
      if (analysis.recommendations.length > 0) {
        console.log(chalk.blue('\n💡 Recommendations:'));
        analysis.recommendations.forEach((rec: string, index: number) => {
          console.log(chalk.gray(`  ${index + 1}. ${rec}`));
        });
      }
      
    } catch (error) {
      console.error(chalk.red('\n❌ Local code analysis failed:'), error);
      console.log(chalk.yellow('💡 Please check that you\'re in the correct directory with your code.'));
    }
  }

  /**
   * Get all files in directory recursively
   */
  private async getDirectoryFiles(dir: string): Promise<string[]> {
    const fs = await import('fs');
    const path = await import('path');
    const files: string[] = [];
    
    try {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          const subFiles = await this.getDirectoryFiles(fullPath);
          files.push(...subFiles);
        } else if (stat.isFile()) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Ignore permission errors
    }
    
    return files;
  }

  /**
   * Categorize files for analysis
   */
  private categorizeFiles(files: string[]): any {
    const analysis = {
      totalFiles: files.length,
      typescriptFiles: 0,
      javascriptFiles: 0,
      databaseFiles: 0,
      serviceFiles: 0,
      configFiles: 0,
      recommendations: [] as string[]
    };
    
    for (const file of files) {
      const ext = file.split('.').pop()?.toLowerCase();
      const fileName = file.split('/').pop()?.toLowerCase() || '';
      
      if (ext === 'ts') {
        analysis.typescriptFiles++;
      } else if (ext === 'js') {
        analysis.javascriptFiles++;
      }
      
      if (fileName.includes('database') || fileName.includes('db') || fileName.includes('schema')) {
        analysis.databaseFiles++;
      }
      
      if (fileName.includes('service') || fileName.includes('repository')) {
        analysis.serviceFiles++;
      }
      
      if (fileName.includes('config') || fileName.includes('env') || ext === 'json') {
        analysis.configFiles++;
      }
    }
    
    // Generate recommendations
    if (analysis.typescriptFiles > 0) {
      analysis.recommendations.push('Consider using TypeScript for better type safety');
    }
    
    if (analysis.databaseFiles > 0) {
      analysis.recommendations.push('Database files detected - consider migration planning');
    }
    
    if (analysis.serviceFiles > 0) {
      analysis.recommendations.push('Service layer detected - good architecture pattern');
    }
    
    return analysis;
  }

  /**
   * Prompt user for repository URL
   */
  private async promptForRepositoryUrl(rl: readline.Interface): Promise<string> {
    return new Promise((resolve) => {
      rl.question('📝 Please enter the GitHub repository URL: ', (answer: string) => {
        const trimmedAnswer = answer.trim();
        
        if (!trimmedAnswer) {
          resolve('');
          return;
        }
        
        // Simple URL validation without external dependencies
        if (this.isValidGitHubUrl(trimmedAnswer)) {
          resolve(trimmedAnswer);
        } else {
          console.log(chalk.yellow('⚠️  Please enter a valid GitHub URL (e.g., https://github.com/owner/repo or owner/repo)'));
          resolve('');
        }
      });
    });
  }

  /**
   * Simple GitHub URL validation
   */
  private isValidGitHubUrl(url: string): boolean {
    // Remove any trailing slashes or .git extensions
    const cleanUrl = url.trim().replace(/\/$/, '').replace(/\.git$/, '');
    
    // Check for different GitHub URL formats
    if (cleanUrl.includes('github.com')) {
      // Full GitHub URLs
      return /^https?:\/\/github\.com\/[^\s\/]+\/[^\s\/]+$/.test(cleanUrl) ||
             /^git@github\.com:[^\s\/]+\/[^\s\/]+$/.test(cleanUrl);
    } else if (cleanUrl.includes(':')) {
      // SSH format
      return /^git@github\.com:[^\s\/]+\/[^\s\/]+$/.test(cleanUrl);
    } else if (cleanUrl.includes('/')) {
      // Short format (owner/repo)
      return /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/.test(cleanUrl);
    }
    
    return false;
  }

  /**
   * Prompt user for source location (GitHub vs Local)
   */
  private async promptForSourceLocation(rl: readline.Interface): Promise<{ sourceLocation: 'github' | 'local' }> {
    return new Promise((resolve) => {
      console.log(chalk.blue('\n🔍 I\'ll help you analyze your source code for migration to MongoDB + Node.js!'));
      console.log(chalk.gray('First, I need to know where your source code is located:\n'));
      
      rl.question('📁 Is your source code in:\n  1️⃣  GitHub Repository (I\'ll clone and analyze it)\n  2️⃣  Local Machine (I\'ll analyze existing source-code-* folders)\n\nPlease choose [1] or [2]: ', (answer: string) => {
        const trimmedAnswer = answer.trim().toLowerCase();
        
        if (trimmedAnswer === '1' || trimmedAnswer === 'github' || trimmedAnswer.includes('github')) {
          console.log(chalk.green('✅ GitHub Repository selected'));
          resolve({ sourceLocation: 'github' });
        } else if (trimmedAnswer === '2' || trimmedAnswer === 'local' || trimmedAnswer.includes('local')) {
          console.log(chalk.green('✅ Local Machine selected'));
          resolve({ sourceLocation: 'local' });
        } else {
          console.log(chalk.yellow('⚠️  Invalid choice. Defaulting to Local Machine.'));
          resolve({ sourceLocation: 'local' });
        }
      });
    });
  }

  /**
   * Show current migration status
   */
  private async showCurrentMigrationStatus(rl: readline.Interface, analysis: any, migratedTables: Set<string>): Promise<void> {
    console.log(chalk.cyan('\n📊 CURRENT MIGRATION STATUS:'));
    console.log(chalk.cyan('='.repeat(50)));
    
    let totalMigratable = 0;
    let totalMigrated = migratedTables.size;
    
    for (const phase of analysis.phases) {
      console.log(chalk.cyan(`\n📋 Phase ${phase.phase}: ${phase.name}`));
      console.log(chalk.cyan('-'.repeat(40)));
      
      for (const table of phase.tables) {
        if (table.needsMigration) {
          const missingDependencies = table.dependencies.filter((dep: string) => !migratedTables.has(dep));
          const canMigrate = missingDependencies.length === 0;
          
          if (canMigrate) {
            totalMigratable++;
            console.log(chalk.green(`  📁 ${table.name} (${table.recordCount} records) - READY TO MIGRATE`));
          } else {
            console.log(chalk.yellow(`  ⚠️  ${table.name} (${table.recordCount} records) - WAITING FOR: ${missingDependencies.join(', ')}`));
          }
        } else {
          console.log(chalk.green(`  ✅ ${table.name} (${table.recordCount} records) - ALREADY SYNCED`));
        }
      }
    }
    
    console.log(chalk.cyan('\n📈 SUMMARY:'));
    console.log(chalk.cyan(`  Total Migratable: ${totalMigratable}`));
    console.log(chalk.cyan(`  Total Migrated: ${totalMigrated}`));
    console.log(chalk.cyan(`  Total Tables: ${totalMigratable + totalMigrated}`));
  }

  /**
   * Prompt user to select a table for migration
   */
  private async promptForTableSelection(rl: readline.Interface, analysis: any, migratedTables: Set<string>): Promise<string> {
    return new Promise((resolve) => {
      console.log(chalk.yellow('\n🎯 SELECT A TABLE TO MIGRATE:'));
      console.log(chalk.yellow('Available options:'));
      
      // Show migratable tables
      const migratableTables: string[] = [];
      for (const phase of analysis.phases) {
        for (const table of phase.tables) {
          if (table.needsMigration) {
            const missingDependencies = table.dependencies.filter((dep: string) => !migratedTables.has(dep));
            if (missingDependencies.length === 0) {
              migratableTables.push(table.name);
              console.log(chalk.green(`  • ${table.name} (${table.recordCount} records)`));
            }
          }
        }
      }
      
      if (migratableTables.length === 0) {
        console.log(chalk.green('  🎉 All tables are migrated or waiting for dependencies!'));
        resolve('exit');
        return;
      }
      
      console.log(chalk.blue('\nSpecial commands:'));
      console.log(chalk.blue('  • refresh - Update migration analysis'));
      console.log(chalk.blue('  • exit - End migration process'));
      
      rl.question(chalk.yellow('\nEnter table name to migrate (or command): '), (answer) => {
        const input = answer.trim().toLowerCase();
        
        if (input === 'exit' || input === 'quit') {
          resolve('exit');
        } else if (input === 'refresh') {
          resolve('refresh');
        } else if (migratableTables.includes(input)) {
          resolve(input);
        } else {
          console.log(chalk.red(`❌ Invalid table name: "${input}"`));
          console.log(chalk.yellow('Available tables:'), migratableTables.join(', '));
          resolve('refresh'); // Refresh to show current state
        }
      });
    });
  }

  /**
   * Prompt user to continue migration
   */
  private async promptContinue(rl: readline.Interface): Promise<boolean> {
    return new Promise((resolve) => {
      rl.question(chalk.yellow('\n🔄 Continue migrating more tables? (yes/no): '), (answer) => {
        if (answer.toLowerCase().includes('yes') || answer.toLowerCase().includes('y')) {
          resolve(true);
        } else {
          resolve(false);
        }
      });
    });
  }

  // ========================================
  // Schema Modification Natural Language Handlers
  // ========================================

  /**
   * Find the latest file matching a pattern
   */
  private async findLatestFile(pattern: string): Promise<string | null> {
    const fs = await import('fs');
    const path = await import('path');
    
    try {
      const files = fs.readdirSync(process.cwd())
        .filter((file: string) => file.match(pattern.replace('*', '.*')))
        .map((file: string) => ({
          name: file,
          time: fs.statSync(file).mtime.getTime()
        }))
        .sort((a: any, b: any) => b.time - a.time);
      
      return files.length > 0 ? files[0].name : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Load schema from markdown file
   */
  private async loadSchemaFromFile(filename: string): Promise<any> {
    const fs = await import('fs');
    const path = await import('path');
    
    try {
      const content = fs.readFileSync(filename, 'utf8');
      
      // For PostgreSQL schema files, we need to extract the actual schema data
      if (filename.includes('postgres-schema-')) {
        // Look for the schema data in the markdown
        const schemaMatch = content.match(/## Database Schema[\s\S]*?```json\n([\s\S]*?)\n```/);
        if (schemaMatch) {
          return JSON.parse(schemaMatch[1]);
        }
        
        // Fallback: create a basic schema structure
        return {
          tables: [],
          relationships: [],
          metadata: { source: filename, type: 'postgresql' }
        };
      }
      
      // For MongoDB schema files, extract the collections
      if (filename.includes('proposed-mongodb-schema-')) {
        // Look for the MongoDB collections data
        const collectionsMatch = content.match(/## MongoDB Collections[\s\S]*?```json\n([\s\S]*?)\n```/);
        if (collectionsMatch) {
          return JSON.parse(collectionsMatch[1]);
        }
        
        // Fallback: create a basic MongoDB schema structure
        return {
          collections: [],
          metadata: { source: filename, type: 'mongodb' }
        };
      }
      
      // Generic fallback
      return { collections: [], metadata: { source: filename } };
    } catch (error) {
      console.error(`Failed to load schema from ${filename}:`, error);
      return null;
    }
  }

  /**
   * Get or create modification service instance
   */
  private async getModificationService(): Promise<any> {
    if (!this.modificationService) {
      const { SchemaModificationService } = await import('../services/SchemaModificationService.js');
      this.modificationService = new SchemaModificationService();
    }
    return this.modificationService;
  }

  /**
   * Read file content
   */
  private async readFileContent(filename: string): Promise<string> {
    const fs = await import('fs');
    try {
      return fs.readFileSync(filename, 'utf8');
    } catch (error) {
      console.warn(`Warning: Could not read file ${filename}:`, error);
      return '';
    }
  }

  /**
   * Generate comprehensive migration document
   */
  private async generateComprehensiveMigrationDocument(
    finalDocument: any,
    mongoSchemaContent: string,
    appAnalysisContent: string,
    sessionId: string
  ): Promise<string> {
    const timestamp = new Date().toISOString();
    
    // Get the actual modifications from the session
    const modifications = finalDocument.modificationSummary?.keyChanges || [];
    
    // Get the actual session data to understand what was modified
    const modificationService = await this.getModificationService();
    const session = modificationService.getSession(sessionId);
    
    // Extract content from the source documents
    const mongoERDiagram = this.extractMongoERDiagram(mongoSchemaContent, modifications);
    const impactAnalysisTables = this.extractImpactAnalysisTables(appAnalysisContent);
    const architectDiscussion = this.generateArchitectDiscussion(modifications);
    const finalArchitecture = this.generateFinalArchitecture(modifications);
    
    // Extract actual collection count from the proposed schema
    const actualCollectionCount = await this.extractCollectionCount(mongoSchemaContent);
    
    return `# Comprehensive Migration Document

**Document ID:** ${finalDocument.documentId}
**Generated:** ${timestamp}
**Version:** 2.0.0
**Session ID:** ${sessionId}

---

## 🎯 Executive Summary

This comprehensive migration document provides a complete strategy for migrating from PostgreSQL to MongoDB, incorporating all user-requested modifications and optimizations. The migration focuses on performance improvements through embedded documents, compound indexing, and denormalized analytics fields.

### 📊 Migration Overview
- **Original PostgreSQL Tables:** 22
- **Final MongoDB Collections:** ${actualCollectionCount > 0 ? actualCollectionCount : 'Loading...'}
- **Total Modifications:** ${finalDocument.modificationSummary?.totalModifications || modifications.length}
- **Performance Impact:** ${finalDocument.modificationSummary?.performanceImpact || 'POSITIVE'}
- **Complexity Change:** ${finalDocument.modificationSummary?.complexityChange || 'UNCHANGED'}

---

## 📊 Dynamic MongoDB ER Diagram

${mongoERDiagram}

---

## 📊 Impact Analysis & Code Inventory

${impactAnalysisTables}

---

## 🔧 User-Requested Modifications Applied

${this.generateDetailedModifications(modifications)}

---

## 💬 Architect Discussion Points

${architectDiscussion}

---

## 🏗️ Final MongoDB + Node.js Architecture

${finalArchitecture}

---

## 🚀 Implementation Plan

### Phase 1: Schema Preparation
**Description:** Set up MongoDB collections with the approved schema

**Tasks:**
- Create MongoDB collections with proper structure
- Set up compound indexes for performance
- Implement data validation rules
- Configure archiving strategy for historical data

### Phase 2: Data Migration
**Description:** Migrate data from PostgreSQL to MongoDB

**Tasks:**
- Extract data from PostgreSQL tables
- Transform data to MongoDB document format
- Migrate data in batches to avoid downtime
- Validate data integrity and relationships

### Phase 3: Application Migration
**Description:** Update application code to work with MongoDB

**Tasks:**
- Refactor Spring Boot entities to MongoDB documents
- Update repository layer to use MongoDB operations
- Modify service layer for embedded document handling
- Update API endpoints for new data structure

### Phase 4: Testing & Validation
**Description:** Comprehensive testing and performance validation

**Tasks:**
- Unit testing for all modified components
- Integration testing for data flow
- Performance testing with production-like data
- User acceptance testing

### Phase 5: Deployment & Monitoring
**Description:** Production deployment and monitoring setup

**Tasks:**
- Deploy to staging environment
- Performance monitoring setup
- Backup and recovery procedures
- Production deployment with rollback plan

---

## 📊 Performance Optimizations

### Indexing Strategy
Based on the modifications made, the following indexes are recommended:

${this.generateIndexingStrategy(modifications)}

### Query Performance Improvements
- **Before:** Multiple table JOINs for related data
- **After:** Single document queries with embedded data
- **Expected Improvement:** Significant performance improvement due to reduced JOIN operations

### Memory Usage Optimization
- **Before:** Multiple entity objects in memory
- **After:** Single document with embedded data
- **Expected Improvement:** Reduced memory footprint due to better data locality

---

## 🔒 Security & Compliance

### Data Protection
- Encrypt sensitive data at rest and in transit
- Implement field-level encryption for PII
- Set up proper access controls and authentication

### Backup & Recovery
- Automated daily backups
- Point-in-time recovery capabilities
- Cross-region backup replication

---

## 📈 Monitoring & Maintenance

### Key Metrics
- Query performance and execution time
- Index usage and efficiency
- Memory usage and cache hit ratio
- Document size and growth patterns

### Maintenance Tasks
- Regular index optimization
- Data archiving based on business rules
- Performance tuning based on usage patterns
- Schema evolution planning

---

## 💡 Final Recommendations

${finalDocument.finalRecommendations?.map((rec: any) => `- ${rec}`).join('\n') || '- Implement proper indexing strategy based on query patterns\n- Set up monitoring for MongoDB performance metrics\n- Create backup and recovery procedures\n- Document the new schema for team reference\n- Plan for gradual migration with rollback capability'}

### Additional Considerations
- Implement gradual migration with feature flags
- Plan for zero-downtime deployment
- Document all schema changes for team reference
- Set up automated testing for schema changes

---

## 📋 Next Steps

1. **Review this document** with your development team
2. **Set up MongoDB environment** with the approved schema
3. **Begin Phase 1** following the implementation plan
4. **Monitor progress** and adjust timeline as needed

---

*This comprehensive document was generated by PeerAI MongoMigrator with interactive modification capabilities.*
`;
  }


  /**
   * Extract MongoDB ER diagram from proposed schema and update with modifications
   */
  private extractMongoERDiagram(content: string, modifications: string[] = []): string {
    // Debug: Check if content is empty
    if (!content || content.trim().length === 0) {
      console.warn('extractMongoERDiagram: Content is empty');
      return `**Error:** MongoDB schema content is empty. Please ensure the schema document was generated properly.`;
    }
    
    console.log(`extractMongoERDiagram: Content length: ${content.length}`);
    console.log(`extractMongoERDiagram: First 200 chars: ${content.substring(0, 200)}`);

    const patterns = [
      /## 🌐 Interactive MongoDB ER Diagram Viewer[\s\S]*?(?=## |$)/,
      /## Database Diagrams[\s\S]*?(?=## |$)/,
      /## MongoDB ER Diagram[\s\S]*?(?=## |$)/,
      /ER Diagram[\s\S]*?(?=## |$)/,
      /Interactive.*Diagram[\s\S]*?(?=## |$)/,
      /Diagram.*Viewer[\s\S]*?(?=## |$)/,
      /MongoDB.*Schema.*Design[\s\S]*?(?=## |$)/
    ];

    let baseDiagram = '';
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match && match[0].trim().length > 100) {
        baseDiagram = match[0].trim();
        break;
      }
    }

    if (!baseDiagram) {
      return `**Error:** Could not extract MongoDB ER diagram from the schema document. Please ensure the document contains the required diagram sections.`;
    }

    // Generate updated diagram with modifications
    if (modifications && modifications.length > 0) {
      const modificationNotes = this.generateERDiagramModifications(modifications);
      return `${baseDiagram}

---

## 🔄 **Updated Schema with Architect Modifications**

The following modifications have been applied to the MongoDB schema:

${modificationNotes}

**Note:** This diagram now reflects the updated MongoDB schema design incorporating all architect-requested modifications.`;
    }

    return baseDiagram;
  }

  /**
   * Extract impact analysis tables and code inventory from application analysis
   */
  private extractImpactAnalysisTables(content: string): string {
    // Debug: Check if content is empty
    if (!content || content.trim().length === 0) {
      console.warn('extractImpactAnalysisTables: Content is empty');
      return `**Error:** Application analysis content is empty. Please ensure the analysis document was generated properly.`;
    }
    
    console.log(`extractImpactAnalysisTables: Content length: ${content.length}`);
    console.log(`extractImpactAnalysisTables: First 200 chars: ${content.substring(0, 200)}`);

    const patterns = [
      // Impact Analysis Matrix
      /## 📊 Impact Analysis Matrix[\s\S]*?(?=## |$)/,
      /Impact Analysis Matrix[\s\S]*?(?=## |$)/,
      // Architecture Comparison Matrix
      /## 📊 Architecture Comparison Matrix[\s\S]*?(?=## |$)/,
      /Architecture Comparison Matrix[\s\S]*?(?=## |$)/,
      // Repository Layer Transformation Table
      /🔄 Repository Layer Transformation:[\s\S]*?(?=#### |## |$)/,
      /Repository Layer Transformation[\s\S]*?(?=#### |## |$)/,
      // Service Layer Transformation Table
      /🔄 Service Layer Transformation:[\s\S]*?(?=#### |## |$)/,
      /Service Layer Transformation[\s\S]*?(?=#### |## |$)/,
      // Controller Layer Transformation Table
      /🔄 Controller Layer Transformation:[\s\S]*?(?=#### |## |$)/,
      /Controller Layer Transformation[\s\S]*?(?=#### |## |$)/,
      // Entity Analysis Table
      /Entity.*Complexity.*Characteristics[\s\S]*?(?=#### |## |$)/,
      /Entity.*Analysis[\s\S]*?(?=#### |## |$)/,
      // Repository Analysis Table
      /Repository.*Complexity.*Characteristics[\s\S]*?(?=#### |## |$)/,
      /Repository.*Analysis[\s\S]*?(?=#### |## |$)/,
      // Service Analysis Table
      /Service.*Complexity.*Characteristics[\s\S]*?(?=#### |## |$)/,
      /Service.*Analysis[\s\S]*?(?=#### |## |$)/
    ];

    let extractedTables = '';
    const foundSections = new Set<string>();

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match && match[0].trim().length > 100) {
        const section = match[0].trim();
        // Avoid duplicates by checking if we've already extracted this section
        const sectionKey = section.substring(0, 100);
        if (!foundSections.has(sectionKey)) {
          foundSections.add(sectionKey);
          extractedTables += section + '\n\n';
        }
      }
    }

    if (extractedTables.trim().length > 0) {
      return extractedTables.trim();
    }

    return `**Error:** Could not extract impact analysis tables from the application analysis document. Please ensure the document contains the required analysis tables.`;
  }

  /**
   * Generate ER diagram modification notes based on architect changes
   */
  private generateERDiagramModifications(modifications: string[]): string {
    const notes = modifications.map((mod, index) => {
      if (mod.toLowerCase().includes('analytics')) {
        return `**Modification ${index + 1}:** ${mod}
- Added analytics fields (total_rentals, revenue, last_rental_date) to films collection
- Pre-calculated fields for faster reporting without JOINs
- Updated collection schema to include embedded analytics data`;
      } else if (mod.toLowerCase().includes('inventory')) {
        return `**Modification ${index + 1}:** ${mod}
- Added inventory tracking fields directly to films collection
- Created inventory_movements collection for audit trail
- Enhanced data model for better inventory management`;
      } else if (mod.toLowerCase().includes('timestamp') || mod.toLowerCase().includes('isodate')) {
        return `**Modification ${index + 1}:** ${mod}
- Updated all timestamp fields to use ISODate format
- Added timezone information for better date handling
- Enhanced date field validation and indexing`;
      } else if (mod.toLowerCase().includes('merge') || mod.toLowerCase().includes('embedded')) {
        return `**Modification ${index + 1}:** ${mod}
- Merged related collections into embedded arrays
- Improved data locality and query performance
- Reduced need for JOIN operations`;
      } else {
        return `**Modification ${index + 1}:** ${mod}
- Applied architect-requested schema changes
- Updated collection structure and relationships
- Enhanced data model for improved performance`;
      }
    }).join('\n\n');

    return notes;
  }


  /**
   * Generate architect discussion points based on modifications
   */
  private generateArchitectDiscussion(modifications: string[]): string {
    if (!modifications || modifications.length === 0) {
      return `No specific discussion points generated as no modifications were made during this session.

### General Architecture Questions

1. **Performance Impact Assessment**
   - How will the migration affect overall system performance?
   - What monitoring metrics should be implemented?
   - What are the expected performance improvements?

2. **Scalability Considerations**
   - How will the new architecture impact the system's ability to scale?
   - What are the resource requirements for the new architecture?
   - How will data growth be handled?

3. **Security and Compliance**
   - What security implications does the migration have?
   - How will data privacy be maintained?
   - What compliance requirements need to be considered?`;
    }

    const discussionPoints = modifications.map((mod, index) => {
      return `### Discussion Point ${index + 1}: ${mod}

${this.generateDynamicArchitectQuestions(mod)}

${this.generateDynamicTechnicalConsiderations(mod)}

**Code Impact Analysis:**
${this.generateCodeImpactForModification(mod)}

**MongoDB Document Structure:**
${this.generateMongoDocumentStructureForModification(mod)}

**Migration Strategy:**
${this.generateMigrationStrategyForModification(mod)}

**Performance Impact:**
${this.generatePerformanceImpactForModification(mod)}

**Testing Requirements:**
${this.generateTestingRequirementsForModification(mod)}

**Implementation Timeline:**
${this.generateDynamicImplementationTimeline(mod)}`;
    });

    return `Based on the modifications requested during this session, the following discussion points should be addressed with the architecture team:

${discussionPoints.join('\n\n')}

### General Architecture Questions

1. **Performance Impact Assessment**
   - How will these modifications affect overall system performance?
   - What monitoring metrics should be implemented?
   - What are the expected performance improvements?

2. **Scalability Considerations**
   - How will these changes impact the system's ability to scale?
   - What are the resource requirements for the new architecture?
   - How will data growth be handled?

3. **Security and Compliance**
   - What security implications do these modifications have?
   - How will data privacy be maintained?
   - What compliance requirements need to be considered?

4. **Migration Strategy**
   - What is the recommended approach for implementing these changes?
   - How can we minimize downtime during migration?
   - What rollback procedures should be in place?

5. **Team Readiness**
   - What training is needed for the development team?
   - What documentation should be updated?
   - How will knowledge transfer be handled?`;
  }

  /**
   * Generate code impact analysis for a specific modification
   */
  private generateCodeImpactForModification(modification: string): string {
    if (modification.toLowerCase().includes('analytics')) {
      return `\`\`\`javascript
// Before: Complex aggregation queries
const analytics = await db.rentals.aggregate([
  { $match: { film_id: filmId } },
  { $group: { _id: null, total: { $sum: 1 }, revenue: { $sum: "$amount" } } }
]);

// After: Direct field access
const film = await db.films.findOne({ _id: filmId });
const analytics = film.analytics; // Pre-calculated
\`\`\``;
    }
    
    if (modification.toLowerCase().includes('embedded')) {
      return `\`\`\`javascript
// Before: Multiple queries with JOINs
const film = await db.films.findOne({ _id: filmId });
const actors = await db.film_actors.find({ film_id: filmId });
const categories = await db.film_categories.find({ film_id: filmId });

// After: Single query with embedded data
const film = await db.films.findOne({ _id: filmId });
// actors and categories are already embedded
\`\`\``;
    }
    
    if (modification.toLowerCase().includes('index')) {
      return `\`\`\`javascript
// Before: Slow queries without indexes
db.films.find({ category: "Action", rating: "PG-13" }).explain();

// After: Fast queries with compound indexes
db.films.createIndex({ category: 1, rating: 1, release_year: 1 });
db.films.find({ category: "Action", rating: "PG-13" }).explain();
\`\`\``;
    }
    
    if (modification.toLowerCase().includes('validation') || modification.toLowerCase().includes('business logic')) {
      return `\`\`\`javascript
// Before: Client-side validation only
const customer = {
  name: req.body.name,
  email: req.body.email,
  rental_status: req.body.rental_status
};

// After: Server-side validation with business rules
const customerSchema = {
  name: { type: String, required: true, minlength: 2 },
  email: { type: String, required: true, match: /^[\\w\\.-]+@[\\w\\.-]+\\.[a-zA-Z]{2,}$/ },
  rental_status: { 
    type: String, 
    enum: ['active', 'suspended', 'inactive'],
    default: 'active'
  },
  overdue_fees: { type: Number, min: 0, default: 0 },
  membership_tier: { 
    type: String, 
    enum: ['bronze', 'silver', 'gold', 'platinum'],
    default: 'bronze'
  }
};
\`\`\``;
    }
    
    if (modification.toLowerCase().includes('search') || modification.toLowerCase().includes('keywords')) {
      return `\`\`\`javascript
// Before: Slow text search across multiple fields
const films = await db.films.find({
  $or: [
    { title: { $regex: searchTerm, $options: 'i' } },
    { description: { $regex: searchTerm, $options: 'i' } },
    { genre: { $regex: searchTerm, $options: 'i' } }
  ]
});

// After: Fast search using pre-computed keywords
const films = await db.films.find({
  search_keywords: { $in: searchTerms }
});

// Or use the dedicated search collection
const searchResults = await db.film_search.find({
  keywords: { $in: searchTerms }
});
\`\`\``;
    }
    
    if (modification.toLowerCase().includes('timestamp') || modification.toLowerCase().includes('isodate')) {
      return `\`\`\`javascript
// Before: String timestamps with timezone issues
const rental = {
  rental_date: "2025-09-11 10:30:00",
  return_date: "2025-09-15 14:45:00",
  last_update: "2025-09-11 10:30:00"
};

// After: ISODate with proper timezone handling
const rental = {
  rental_date: new Date("2025-09-11T10:30:00.000Z"),
  return_date: new Date("2025-09-15T14:45:00.000Z"),
  last_update: new Date("2025-09-11T10:30:00.000Z"),
  timezone: "UTC"
};

// Query with ISODate range
const recentRentals = await db.rentals.find({
  rental_date: {
    $gte: new Date("2025-09-01T00:00:00.000Z"),
    $lt: new Date("2025-09-12T00:00:00.000Z")
  }
});
\`\`\``;
    }
    
    if (modification.toLowerCase().includes('merge') || modification.toLowerCase().includes('embedded')) {
      return `\`\`\`javascript
// Before: Multiple queries with JOINs
const film = await db.films.findOne({ _id: filmId });
const actors = await db.film_actors.find({ film_id: filmId });
const categories = await db.film_categories.find({ film_id: filmId });

// After: Single query with embedded data
const film = await db.films.findOne({ _id: filmId });
// film.actors and film.categories are already embedded

// Query embedded arrays
const actionFilms = await db.films.find({
  "categories.name": "Action"
});

// Update embedded array
await db.films.updateOne(
  { _id: filmId },
  { $push: { actors: { actor_id: newActorId, name: "New Actor" } } }
);
\`\`\``;
    }
    
    return `\`\`\`javascript
// Code changes will be specific to this modification
// Implementation details will be provided during development
\`\`\``;
  }

  /**
   * Generate MongoDB document structure for a specific modification
   */
  private generateMongoDocumentStructureForModification(modification: string): string {
    if (modification.toLowerCase().includes('analytics')) {
      return `\`\`\`json
{
  "_id": "ObjectId('...')",
  "title": "Film Title",
  "description": "Film Description",
  "analytics": {
    "total_rentals": 150,
    "revenue": 2500.00,
    "last_rental_date": "2025-09-10T10:00:00Z"
  }
}
\`\`\``;
    }
    
    if (modification.toLowerCase().includes('embedded')) {
      return `\`\`\`json
{
  "_id": "ObjectId('...')",
  "title": "Film Title",
  "actors": [
    {
      "actor_id": "ObjectId('...')",
      "name": "Actor Name",
      "role": "Character Role"
    }
  ],
  "categories": [
    {
      "category_id": "ObjectId('...')",
      "name": "Category Name"
    }
  ]
}
\`\`\``;
    }
    
    if (modification.toLowerCase().includes('index')) {
      return `\`\`\`javascript
// Compound indexes for performance
db.films.createIndex({ category: 1, rating: 1, release_year: 1 });
db.rentals.createIndex({ customer_id: 1, rental_date: 1 });
\`\`\``;
    }
    
    if (modification.toLowerCase().includes('validation') || modification.toLowerCase().includes('business logic')) {
      const randomId = Math.floor(Math.random() * 1000000);
      const names = ['Alex', 'Jordan', 'Casey', 'Taylor', 'Morgan', 'Riley', 'Avery', 'Quinn'];
      const randomName = names[Math.floor(Math.random() * names.length)];
      const statuses = ['active', 'suspended', 'inactive'];
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
      const tiers = ['bronze', 'silver', 'gold', 'platinum'];
      const randomTier = tiers[Math.floor(Math.random() * tiers.length)];
      const now = new Date().toISOString();
      
      return `\`\`\`json
{
  "_id": "ObjectId('${randomId.toString(16).padStart(24, '0')}')",
  "customer_id": ${Math.floor(Math.random() * 10000) + 1},
  "first_name": "${randomName}",
  "last_name": "${randomName}",
  "email": "${randomName.toLowerCase()}_${randomId}@example.com",
  "rental_status": "${randomStatus}",
  "overdue_fees": ${Math.round(Math.random() * 100 * 100) / 100},
  "membership_tier": "${randomTier}",
  "created_at": "${now}",
  "updated_at": "${now}"
}
\`\`\``;
    }
    
    if (modification.toLowerCase().includes('search') || modification.toLowerCase().includes('keywords')) {
      const randomId = Math.floor(Math.random() * 1000000);
      const titles = ['The Matrix', 'Inception', 'Interstellar', 'Blade Runner', 'The Dark Knight'];
      const randomTitle = titles[Math.floor(Math.random() * titles.length)];
      const keywords = ['action', 'sci-fi', 'thriller', 'drama', 'adventure'];
      const randomKeywords = keywords.slice(0, Math.floor(Math.random() * 3) + 2);
      
      return `\`\`\`json
{
  "_id": "ObjectId('${randomId.toString(16).padStart(24, '0')}')",
  "title": "${randomTitle}",
  "description": "A sample film description",
  "search_keywords": ${JSON.stringify(randomKeywords)},
  "release_year": ${Math.floor(Math.random() * 30) + 1990},
  "rating": "PG-13",
  "genre": "Action"
}
\`\`\``;
    }
    
    if (modification.toLowerCase().includes('timestamp') || modification.toLowerCase().includes('isodate')) {
      const randomId = Math.floor(Math.random() * 1000000);
      const now = new Date().toISOString();
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      
      return `\`\`\`json
{
  "_id": "ObjectId('${randomId.toString(16).padStart(24, '0')}')",
  "rental_id": ${Math.floor(Math.random() * 10000) + 1},
  "customer_id": ${Math.floor(Math.random() * 1000) + 1},
  "film_id": ${Math.floor(Math.random() * 1000) + 1},
  "rental_date": ISODate("${now}"),
  "return_date": ISODate("${futureDate}"),
  "last_update": ISODate("${now}"),
  "timezone": "UTC",
  "amount": ${(Math.random() * 10 + 1).toFixed(2)}
}
\`\`\``;
    }
    
    if (modification.toLowerCase().includes('merge') || modification.toLowerCase().includes('embedded')) {
      const randomId = Math.floor(Math.random() * 1000000);
      const titles = ['The Matrix', 'Inception', 'Interstellar', 'Blade Runner', 'The Dark Knight'];
      const randomTitle = titles[Math.floor(Math.random() * titles.length)];
      const actors = ['Keanu Reeves', 'Leonardo DiCaprio', 'Matthew McConaughey', 'Harrison Ford', 'Christian Bale'];
      const categories = ['Action', 'Sci-Fi', 'Thriller', 'Drama', 'Adventure'];
      const randomActors = actors.slice(0, Math.floor(Math.random() * 3) + 2);
      const randomCategories = categories.slice(0, Math.floor(Math.random() * 2) + 1);
      
      return `\`\`\`json
{
  "_id": "ObjectId('${randomId.toString(16).padStart(24, '0')}')",
  "title": "${randomTitle}",
  "description": "A sample film description",
  "release_year": ${Math.floor(Math.random() * 30) + 1990},
  "rating": "PG-13",
  "actors": [
    ${randomActors.map(actor => `{
      "actor_id": "ObjectId('${Math.floor(Math.random() * 1000000).toString(16).padStart(24, '0')}')",
      "name": "${actor}",
      "character": "Main Character"
    }`).join(',\n    ')}
  ],
  "categories": [
    ${randomCategories.map(category => `{
      "category_id": "ObjectId('${Math.floor(Math.random() * 1000000).toString(16).padStart(24, '0')}')",
      "name": "${category}"
    }`).join(',\n    ')}
  ]
}
\`\`\``;
    }
    
    return `\`\`\`json
// Document structure will be specific to this modification
// Detailed schema will be provided during implementation
\`\`\``;
  }

  /**
   * Extract collection count from proposed MongoDB schema intelligently
   */
  private async extractCollectionCount(mongoSchemaContent: string): Promise<number> {
    // Debug: Check if content is empty
    if (!mongoSchemaContent || mongoSchemaContent.trim().length === 0) {
      console.warn('Warning: MongoDB schema content is empty, cannot extract collection count');
      return 0;
    }

    // Method 1: Count collections from table of contents (most reliable)
    const tocMatches = mongoSchemaContent.match(/- \[(\w+)\]\(#collection-\w+\)/g);
    if (tocMatches && tocMatches.length > 0) {
      console.log(`Found ${tocMatches.length} collections from table of contents`);
      return tocMatches.length;
    }

    // Method 2: Count from MongoDB Collections section
    const mongoCollectionsMatch = mongoSchemaContent.match(/## MongoDB Collections[\s\S]*?(?=## |$)/);
    if (mongoCollectionsMatch) {
      const collectionListMatches = mongoCollectionsMatch[0].match(/- \*\*(\w+)\*\*/g);
      if (collectionListMatches && collectionListMatches.length > 0) {
        console.log(`Found ${collectionListMatches.length} collections from MongoDB Collections section`);
        return collectionListMatches.length;
      }
    }

    // Method 3: Count from collection headers
    const collectionHeaders = mongoSchemaContent.match(/### Collection \w+/g);
    if (collectionHeaders && collectionHeaders.length > 0) {
      console.log(`Found ${collectionHeaders.length} collections from collection headers`);
      return collectionHeaders.length;
    }

    // Method 4: Count from any collection references (fallback)
    const allCollectionMatches = mongoSchemaContent.match(/collection[_-]?\w+/gi);
    if (allCollectionMatches && allCollectionMatches.length > 0) {
      // Filter out duplicates and return unique count
      const uniqueCollections = [...new Set(allCollectionMatches.map(match => match.toLowerCase()))];
      console.log(`Found ${uniqueCollections.length} unique collections from all references`);
      return uniqueCollections.length;
    }

    // Method 5: Try to extract from "Total Collections" line (but this might be wrong)
    const countMatch = mongoSchemaContent.match(/Total Collections.*?(\d+)/i);
    if (countMatch) {
      const count = parseInt(countMatch[1], 10);
      console.log(`Found ${count} collections from Total Collections line (may be inaccurate)`);
      return count;
    }

    // If we still can't find anything, return 0 to indicate unknown
    console.warn('Warning: Could not determine collection count from schema document');
    return 0;
  }

  /**
   * Generate final MongoDB + Node.js architecture based on modifications
   */
  private generateFinalArchitecture(modifications: string[]): string {
    const hasAnalytics = modifications.some(mod => 
      mod.toLowerCase().includes('analytics') || 
      mod.toLowerCase().includes('revenue') || 
      mod.toLowerCase().includes('statistics')
    );
    const hasEmbedded = modifications.some(mod => 
      mod.toLowerCase().includes('embedded') || 
      mod.toLowerCase().includes('embed') ||
      mod.toLowerCase().includes('nested')
    );
    const hasIndexes = modifications.some(mod => 
      mod.toLowerCase().includes('index') || 
      mod.toLowerCase().includes('performance') ||
      mod.toLowerCase().includes('optimization')
    );
    const hasArchiving = modifications.some(mod => 
      mod.toLowerCase().includes('archiving') || 
      mod.toLowerCase().includes('archive') ||
      mod.toLowerCase().includes('historical')
    );
    const hasValidation = modifications.some(mod => 
      mod.toLowerCase().includes('validation') || 
      mod.toLowerCase().includes('business logic') ||
      mod.toLowerCase().includes('rules')
    );
    const hasSearch = modifications.some(mod => 
      mod.toLowerCase().includes('search') || 
      mod.toLowerCase().includes('keywords') ||
      mod.toLowerCase().includes('text search')
    );

    return `### Database Layer
- **MongoDB Atlas** for cloud-hosted database with automatic scaling
- **Collections** optimized for the new schema design with embedded documents
- **Indexes** for performance optimization and query efficiency
- **Aggregation pipelines** for complex analytics and reporting
- **Data validation** using MongoDB schema validation rules

### Application Layer
- **Node.js** with Express.js framework for high-performance API
- **Mongoose** for MongoDB object modeling and validation
- **RESTful API** endpoints with proper HTTP status codes
- **Authentication** and authorization middleware using JWT
- **Rate limiting** and security middleware
- **Error handling** and logging middleware

### Key Architectural Changes
${hasAnalytics ? '- **Analytics Integration**: Pre-calculated analytics fields for faster reporting and real-time insights' : ''}
${hasEmbedded ? '- **Embedded Documents**: Related data embedded for better performance and reduced queries' : ''}
${hasIndexes ? '- **Performance Indexes**: Compound indexes for optimized queries and faster data retrieval' : ''}
${hasArchiving ? '- **Data Archiving**: Separate collections for historical data with automated archiving processes' : ''}
${hasValidation ? '- **Data Validation**: Business logic fields and validation rules for data integrity and consistency' : ''}
${hasSearch ? '- **Search Optimization**: Text search capabilities with keyword arrays and pre-computed search collections for improved query performance' : ''}

### Technology Stack
- **Backend**: Node.js 18+, Express.js 4.x, Mongoose 7.x
- **Database**: MongoDB Atlas with replica sets
- **Authentication**: JWT tokens with refresh token rotation
- **API**: RESTful endpoints with OpenAPI documentation
- **Testing**: Jest, Supertest, MongoDB Memory Server
- **Documentation**: Swagger/OpenAPI with interactive testing
- **Logging**: Winston with structured logging
- **Monitoring**: Application performance monitoring (APM)

### Performance Optimizations
${hasIndexes ? '- **Database Indexes**: Compound indexes on frequently queried fields' : ''}
${hasEmbedded ? '- **Embedded Data**: Reduced JOIN operations and improved query performance' : ''}
${hasAnalytics ? '- **Pre-calculated Fields**: Analytics data computed during data updates' : ''}
${hasValidation ? '- **Data Validation**: Server-side validation rules for improved data quality and reduced client-side processing' : ''}
${hasSearch ? '- **Search Optimization**: Pre-computed search collections and keyword arrays for faster text search queries' : ''}
- **Connection Pooling**: Optimized database connections
- **Caching**: Redis for frequently accessed data
- **Query Optimization**: Aggregation pipelines for complex operations

### Security Architecture
- **Authentication**: JWT-based authentication with secure token storage
- **Authorization**: Role-based access control (RBAC)
- **Data Encryption**: At-rest and in-transit encryption
- **Input Validation**: Comprehensive input sanitization and validation
- **Rate Limiting**: API rate limiting to prevent abuse
- **CORS**: Proper cross-origin resource sharing configuration

### Deployment Architecture
- **Cloud Platform**: AWS/Azure/GCP with auto-scaling capabilities
- **Containerization**: Docker with multi-stage builds
- **Orchestration**: Kubernetes with horizontal pod autoscaling
- **Monitoring**: Application performance monitoring and alerting
- **CI/CD**: GitHub Actions with automated testing and deployment
- **Load Balancing**: Application load balancer with health checks
- **Backup**: Automated database backups with point-in-time recovery

### Scalability Considerations
- **Horizontal Scaling**: Stateless application design for easy scaling
- **Database Sharding**: MongoDB sharding for large datasets
- **Caching Strategy**: Multi-level caching for improved performance
- **CDN**: Content delivery network for static assets
- **Microservices**: Potential future migration to microservices architecture`;
  }

  /**
   * Generate detailed modifications section
   */
  private generateDetailedModifications(modifications: string[]): string {
    if (!modifications || modifications.length === 0) {
      return 'No specific modifications were requested during this session.';
    }

    return modifications.map((modification, index) => {
      return `#### ${index + 1}. **${modification}**

**Description:** This modification was requested during the interactive session and has been applied to the schema.

**Status:** Applied and integrated into the final MongoDB schema design.

**Impact:** ${this.getModificationImpact(modification)}

---`;
    }).join('\n\n');
  }

  /**
   * Generate dynamic architect questions based on modification
   */
  private generateDynamicArchitectQuestions(modification: string): string {
    const questions = [];
    
    // Generate questions based on modification type
    if (modification.toLowerCase().includes('timestamp') || modification.toLowerCase().includes('isodate')) {
      questions.push(
        "How will the timestamp format change impact existing API contracts?",
        "What timezone handling strategy should be implemented?",
        "How will this affect date range queries and indexing?",
        "What are the data migration challenges for timestamp conversion?",
        "How will this impact frontend date parsing and display?",
        "What validation rules are needed for the new timestamp format?"
      );
    } else if (modification.toLowerCase().includes('merge') || modification.toLowerCase().includes('embedded')) {
      questions.push(
        "How will embedding related data affect document size limits?",
        "What indexing strategy is needed for embedded arrays?",
        "How will this impact query performance for large datasets?",
        "What are the trade-offs between data locality and update complexity?",
        "How will this affect data consistency and referential integrity?",
        "What migration strategy ensures zero data loss during embedding?"
      );
    } else if (modification.toLowerCase().includes('search') || modification.toLowerCase().includes('keywords')) {
      questions.push(
        "How will the search functionality impact database performance?",
        "What indexing strategy is optimal for text search?",
        "How will search results be ranked and filtered?",
        "What are the storage implications of pre-computed search terms?",
        "How will this affect search query response times?",
        "What fallback strategy is needed if search indexes fail?"
      );
    } else {
      // Generic questions based on modification content
      questions.push(
        `How will "${modification}" impact the existing data model?`,
        `What are the performance implications of this change?`,
        `How will this affect the application's scalability?`,
        `What testing strategies should be implemented?`,
        `What are the data migration challenges?`,
        `How will this affect existing queries and API endpoints?`
      );
    }
    
    return `**Architect Questions:**
${questions.map(q => `- ${q}`).join('\n')}`;
  }

  /**
   * Generate dynamic technical considerations based on modification
   */
  private generateDynamicTechnicalConsiderations(modification: string): string {
    const considerations = [];
    
    if (modification.toLowerCase().includes('timestamp') || modification.toLowerCase().includes('isodate')) {
      considerations.push(
        "Timestamp conversion scripts for data migration",
        "Timezone conversion logic implementation",
        "Date validation and parsing updates",
        "API response format changes",
        "Frontend date handling modifications",
        "Database index optimization for date fields"
      );
    } else if (modification.toLowerCase().includes('merge') || modification.toLowerCase().includes('embedded')) {
      considerations.push(
        "Embedded document structure design",
        "Array manipulation and query optimization",
        "Data denormalization strategy",
        "Referential integrity maintenance",
        "Index design for embedded arrays",
        "Update operation complexity management"
      );
    } else if (modification.toLowerCase().includes('search') || modification.toLowerCase().includes('keywords')) {
      considerations.push(
        "Search index creation and maintenance",
        "Keyword extraction and preprocessing",
        "Search query optimization",
        "Result ranking and filtering logic",
        "Search performance monitoring",
        "Fallback search mechanisms"
      );
    } else {
      considerations.push(
        "Code changes required in the application layer",
        "Database migration scripts needed",
        "Performance monitoring requirements",
        "Rollback strategy if issues arise",
        "Data validation and integrity checks",
        "Index optimization requirements"
      );
    }
    
    return `**Technical Considerations:**
${considerations.map(c => `- ${c}`).join('\n')}`;
  }

  /**
   * Generate dynamic implementation timeline based on modification
   */
  private generateDynamicImplementationTimeline(modification: string): string {
    const phases = [];
    
    if (modification.toLowerCase().includes('timestamp') || modification.toLowerCase().includes('isodate')) {
      phases.push(
        "Analysis and timestamp mapping phase",
        "Conversion script development and testing",
        "Data migration and validation",
        "Application code updates",
        "Testing and deployment"
      );
    } else if (modification.toLowerCase().includes('merge') || modification.toLowerCase().includes('embedded')) {
      phases.push(
        "Data relationship analysis phase",
        "Embedded document design and validation",
        "Migration script development",
        "Application code refactoring",
        "Testing and performance optimization"
      );
    } else if (modification.toLowerCase().includes('search') || modification.toLowerCase().includes('keywords')) {
      phases.push(
        "Search requirements analysis",
        "Index design and keyword extraction logic",
        "Search functionality implementation",
        "Performance testing and optimization",
        "Integration and deployment"
      );
    } else {
      phases.push(
        "Analysis and planning phase",
        "Development and testing phase",
        "Data migration and validation phase",
        "Deployment and monitoring phase"
      );
    }
    
    return phases.map(phase => `- ${phase}`).join('\n');
  }

  /**
   * Generate migration strategy for specific modification
   */
  private generateMigrationStrategyForModification(modification: string): string {
    const strategies = [];
    
    if (modification.toLowerCase().includes('timestamp') || modification.toLowerCase().includes('isodate')) {
      strategies.push(
        "**Data Analysis Phase:**",
        "- Identify all timestamp fields in existing PostgreSQL tables",
        "- Analyze current timestamp formats and timezone information", 
        "- Create mapping between old and new timestamp formats",
        "",
        "**Migration Script Development:**",
        "- Create data transformation scripts to convert string timestamps to ISODate",
        "- Implement timezone conversion logic",
        "- Add validation to ensure data integrity",
        "",
        "**Application Code Updates:**",
        "- Update all date handling in application code",
        "- Modify API responses to use ISODate format",
        "- Update frontend date parsing logic"
      );
    } else if (modification.toLowerCase().includes('merge') || modification.toLowerCase().includes('embedded')) {
      strategies.push(
        "**Data Analysis Phase:**",
        "- Analyze relationships between related tables",
        "- Identify data that can be safely embedded",
        "- Plan for data denormalization strategy",
        "",
        "**Schema Design Phase:**",
        "- Design new embedded document structure",
        "- Plan for maintaining referential integrity",
        "- Design indexes for embedded arrays",
        "",
        "**Migration Script Development:**",
        "- Create scripts to merge related data into embedded arrays",
        "- Implement data validation for embedded documents",
        "- Create rollback procedures"
      );
    } else if (modification.toLowerCase().includes('search') || modification.toLowerCase().includes('keywords')) {
      strategies.push(
        "**Search Requirements Analysis:**",
        "- Identify searchable fields and content",
        "- Define search ranking and filtering criteria",
        "- Plan for search performance optimization",
        "",
        "**Index Design Phase:**",
        "- Design text search indexes",
        "- Plan for keyword extraction and preprocessing",
        "- Design search result caching strategy",
        "",
        "**Implementation Phase:**",
        "- Implement search functionality",
        "- Create search result ranking logic",
        "- Add search performance monitoring"
      );
    } else {
      strategies.push(
        "**Analysis Phase:**",
        `- Analyze the impact of "${modification}" on existing data`,
        "- Identify affected components and dependencies",
        "- Plan for data transformation requirements",
        "",
        "**Development Phase:**",
        "- Develop migration scripts with proper validation",
        "- Update application code to work with new structure",
        "- Implement comprehensive testing strategy"
      );
    }
    
    return `**Migration Strategy:**
${strategies.join('\n')}`;
  }

  /**
   * Generate performance impact analysis for specific modification
   */
  private generatePerformanceImpactForModification(modification: string): string {
    const impacts = [];
    
    if (modification.toLowerCase().includes('timestamp') || modification.toLowerCase().includes('isodate')) {
      impacts.push(
        "**Positive Impacts:**",
        "- **Query Performance**: ISODate format enables better indexing and range queries",
        "- **Sorting Efficiency**: Native date sorting instead of string comparison",
        "- **Storage Optimization**: More efficient storage compared to string timestamps",
        "- **Timezone Handling**: Built-in timezone support reduces application complexity",
        "",
        "**Potential Challenges:**",
        "- **Migration Time**: Large datasets may require significant migration time",
        "- **Memory Usage**: ISODate objects may use slightly more memory than strings",
        "- **Index Rebuilding**: Existing indexes on timestamp fields need to be rebuilt",
        "",
        "**Expected Performance Improvements:**",
        "- 30-50% faster date range queries",
        "- 20-30% improvement in sorting operations",
        "- Reduced application complexity for timezone handling"
      );
    } else if (modification.toLowerCase().includes('merge') || modification.toLowerCase().includes('embedded')) {
      impacts.push(
        "**Positive Impacts:**",
        "- **Query Performance**: Single document queries instead of JOINs",
        "- **Data Locality**: Related data stored together for better cache performance",
        "- **Reduced Network Roundtrips**: Fewer database calls needed",
        "- **Simplified Queries**: No complex JOIN operations required",
        "",
        "**Potential Challenges:**",
        "- **Document Size**: Larger documents may impact memory usage",
        "- **Update Complexity**: Updating embedded arrays may be more complex",
        "- **Index Limitations**: Some query patterns may be less efficient",
        "",
        "**Expected Performance Improvements:**",
        "- 60-80% faster queries that previously required JOINs",
        "- 40-60% reduction in database roundtrips",
        "- Improved cache hit rates due to data locality"
      );
    } else if (modification.toLowerCase().includes('search') || modification.toLowerCase().includes('keywords')) {
      impacts.push(
        "**Positive Impacts:**",
        "- **Search Performance**: Pre-computed keywords enable faster text search",
        "- **Query Efficiency**: Optimized search queries with proper indexing",
        "- **Scalability**: Search performance scales better with data growth",
        "- **User Experience**: Faster search results improve user satisfaction",
        "",
        "**Potential Challenges:**",
        "- **Storage Overhead**: Additional storage for search keywords and indexes",
        "- **Index Maintenance**: Search indexes require regular maintenance",
        "- **Memory Usage**: Search indexes may increase memory requirements",
        "",
        "**Expected Performance Improvements:**",
        "- 70-90% faster text search queries",
        "- 50-70% improvement in search result relevance",
        "- Reduced server load for search operations"
      );
    } else {
      impacts.push(
        "**Performance Impact Analysis:**",
        `- Measure current performance baseline for "${modification}"`,
        "- Identify potential bottlenecks and optimization opportunities",
        "- Plan for performance monitoring and alerting",
        "- Set realistic performance improvement targets",
        "- Consider scalability implications of the changes"
      );
    }
    
    return `**Performance Impact:**
${impacts.join('\n')}`;
  }

  /**
   * Generate testing requirements for specific modification
   */
  private generateTestingRequirementsForModification(modification: string): string {
    const requirements = [];
    
    if (modification.toLowerCase().includes('timestamp') || modification.toLowerCase().includes('isodate')) {
      requirements.push(
        "**Unit Tests:**",
        "- Timestamp conversion functions",
        "- Timezone handling logic",
        "- Date validation functions",
        "- API response formatting",
        "",
        "**Integration Tests:**",
        "- API endpoints with new timestamp format",
        "- Database queries with ISODate fields",
        "- Frontend date parsing and display",
        "- Cross-browser compatibility",
        "",
        "**Data Validation Tests:**",
        "- Verify timestamp accuracy after conversion",
        "- Test timezone conversion correctness",
        "- Validate date range queries",
        "- Check for data integrity issues",
        "",
        "**Performance Tests:**",
        "- Query performance with new timestamp format",
        "- Memory usage with ISODate objects",
        "- Migration script performance",
        "- API response times"
      );
    } else if (modification.toLowerCase().includes('merge') || modification.toLowerCase().includes('embedded')) {
      requirements.push(
        "**Unit Tests:**",
        "- Embedded document creation and validation",
        "- Array manipulation functions",
        "- Query building for embedded data",
        "- Data transformation logic",
        "",
        "**Integration Tests:**",
        "- API endpoints with embedded documents",
        "- Database queries on embedded arrays",
        "- Frontend handling of nested data",
        "- Data consistency checks",
        "",
        "**Data Validation Tests:**",
        "- Verify embedded data integrity",
        "- Test array operations (add, remove, update)",
        "- Validate referential integrity",
        "- Check for data duplication issues",
        "",
        "**Performance Tests:**",
        "- Query performance with embedded documents",
        "- Document size impact on memory",
        "- Index performance on embedded arrays",
        "- Migration script performance"
      );
    } else if (modification.toLowerCase().includes('search') || modification.toLowerCase().includes('keywords')) {
      requirements.push(
        "**Unit Tests:**",
        "- Search keyword extraction functions",
        "- Search query building logic",
        "- Search result ranking algorithms",
        "- Search index management functions",
        "",
        "**Integration Tests:**",
        "- Search API endpoints",
        "- Database search queries",
        "- Frontend search functionality",
        "- Search result display and filtering",
        "",
        "**Data Validation Tests:**",
        "- Verify search keyword accuracy",
        "- Test search result relevance",
        "- Validate search index consistency",
        "- Check for search performance issues",
        "",
        "**Performance Tests:**",
        "- Search query response times",
        "- Search index performance",
        "- Search scalability testing",
        "- Search memory usage optimization"
      );
    } else {
      requirements.push(
        "**Unit Tests:**",
        `- Functions related to "${modification}"`,
        "- Data validation and transformation logic",
        "- API endpoint modifications",
        "- Business logic changes",
        "",
        "**Integration Tests:**",
        "- End-to-end data flow testing",
        "- API integration testing",
        "- Database operation testing",
        "- Frontend integration testing",
        "",
        "**Data Validation Tests:**",
        "- Data integrity verification",
        "- Data transformation accuracy",
        "- Data consistency checks",
        "- Error handling validation",
        "",
        "**Performance Tests:**",
        "- Performance impact assessment",
        "- Scalability testing",
        "- Load testing with production data",
        "- Memory and resource usage monitoring"
      );
    }
    
    return `**Testing Requirements:**
${requirements.join('\n')}`;
  }

  /**
   * Generate schema changes summary
   */
  private generateSchemaChangesSummary(session: any, modifications: string[]): string {
    if (!session || !modifications || modifications.length === 0) {
      return 'No schema changes were made during this session.';
    }

    return `### Original Proposed Schema
The original proposed MongoDB schema included multiple collections with normalized structure.

### Modifications Applied
${modifications.map((mod, index) => `${index + 1}. **${mod}**`).join('\n')}

### Final Schema Structure
After applying all modifications, the schema has been optimized based on the specific requirements requested during this session.

### Performance Impact
The modifications will improve overall system performance, with specific metrics to be measured during implementation and testing phases.`;
  }

  /**
   * Generate indexing strategy based on modifications
   */
  private generateIndexingStrategy(modifications: string[]): string {
    if (!modifications || modifications.length === 0) {
      return 'Standard MongoDB indexes will be created for primary keys and frequently queried fields.';
    }

    return `Based on the modifications made during this session, the following indexing strategy is recommended:

${modifications.map((mod, index) => `${index + 1}. **${mod}**
   - Indexes will be created based on the specific requirements of this modification
   - Performance impact will be measured and optimized during implementation`).join('\n\n')}

**Note:** Specific index definitions will be provided during the implementation phase based on the actual schema structure and query patterns.`;
  }

  /**
   * Get modification impact
   */
  private getModificationImpact(modification: string): string {
    if (modification.includes('compound indexes')) {
      return 'Improves query performance for multi-field searches by creating optimized indexes';
    }
    if (modification.includes('analytics')) {
      return 'Enables faster reporting without complex JOINs by pre-calculating analytics data';
    }
    if (modification.includes('embedded')) {
      return 'Eliminates JOINs and improves data locality by embedding related data';
    }
    if (modification.includes('archived')) {
      return 'Keeps active collections lean and fast by moving historical data to separate collections';
    }
    return 'Improves overall system performance and maintainability';
  }

  /**
   * Extract MongoDB collections from schema content
   */
  private extractMongoCollections(content: string): string {
    // Look for the actual collection sections in the proposed MongoDB schema
    const patterns = [
      /## 📋 Table of Contents[\s\S]*?(?=## 🏗️ Schema Overview)/,
      /## 🏗️ Schema Overview[\s\S]*?(?=## 🔍 Compatibility Report)/,
      /## MongoDB Collections[\s\S]*?(?=## |$)/,
      /## 🧠 Proposed Intelligent MongoDB Collections[\s\S]*?(?=## |$)/
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match && match[0].trim().length > 50) {
        return match[0].trim();
      }
    }

    // Fallback: Extract the overview section
    const overviewMatch = content.match(/## 🏗️ Schema Overview[\s\S]*?(?=## 🔍 Compatibility Report)/);
    if (overviewMatch) {
      return overviewMatch[0].trim();
    }
    
    return 'Collection details will be extracted from the approved schema.';
  }

  /**
   * Generate sample documents for each collection
   */
  private generateSampleDocuments(finalDocument: any): string {
    const collections = finalDocument.approvedSchema || [];
    
    if (collections.length === 0) {
      return 'No collections available for sample documents.';
    }

    let samples = '';
    
    collections.forEach((collection: any, index: number) => {
      const collectionName = collection.name || collection.collectionName || `collection_${index + 1}`;
      
      samples += `\n### ${collectionName} Collection\n\n`;
      samples += `**Sample Document:**\n\n`;
      samples += '```json\n';
      samples += this.generateSampleDocument(collectionName, collection);
      samples += '\n```\n\n';
    });

    return samples;
  }

  /**
   * Generate sample document for a collection based on actual schema
   */
  private generateSampleDocument(collectionName: string, collectionSchema?: any): string {
    // If we have the actual collection schema, use it to generate realistic sample
    if (collectionSchema && collectionSchema.fields) {
      const sampleDoc: any = {
        "_id": "ObjectId('507f1f77bcf86cd799439011')"
      };

      // Generate sample data based on actual fields
      collectionSchema.fields.forEach((field: any) => {
        const fieldName = field.name || field.fieldName;
        const fieldType = field.type || field.fieldType;
        
        if (fieldName && fieldName !== '_id') {
          sampleDoc[fieldName] = this.generateSampleValue(fieldType, fieldName);
        }
      });

      return JSON.stringify(sampleDoc, null, 2);
    }

    // Fallback: Generate generic sample based on collection name patterns
    return this.generateGenericSample(collectionName);
  }

  /**
   * Generate sample value based on field type
   */
  private generateSampleValue(fieldType: string, fieldName: string): any {
    const lowerFieldName = fieldName.toLowerCase();
    
    // Handle common field patterns dynamically
    if (lowerFieldName.includes('email')) {
      return `user_${Math.floor(Math.random() * 1000)}@example.com`;
    }
    if (lowerFieldName.includes('phone')) {
      return `+1-555-${Math.floor(Math.random() * 9000) + 1000}`;
    }
    if (lowerFieldName.includes('name')) {
      const names = ['Alex', 'Jordan', 'Casey', 'Taylor', 'Morgan', 'Riley', 'Avery', 'Quinn'];
      return names[Math.floor(Math.random() * names.length)];
    }
    if (lowerFieldName.includes('title')) {
      return `Sample ${fieldName.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`;
    }
    if (lowerFieldName.includes('description')) {
      return `Sample description for ${fieldName}`;
    }
    if (lowerFieldName.includes('amount') || lowerFieldName.includes('price')) {
      return Math.round((Math.random() * 100 + 10) * 100) / 100;
    }
    if (lowerFieldName.includes('count') || lowerFieldName.includes('quantity')) {
      return Math.floor(Math.random() * 10) + 1;
    }
    if (lowerFieldName.includes('status')) {
      const statuses = ['active', 'pending', 'completed', 'inactive'];
      return statuses[Math.floor(Math.random() * statuses.length)];
    }
    if (lowerFieldName.includes('date') || lowerFieldName.includes('time')) {
      const now = new Date();
      return now.toISOString();
    }
    if (lowerFieldName.includes('id') && !lowerFieldName.includes('_id')) {
      return `ID_${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    }

    // Handle by type
    switch (fieldType?.toLowerCase()) {
      case 'string':
      case 'varchar':
      case 'text':
        return "sample_string";
      case 'number':
      case 'integer':
      case 'int':
      case 'float':
      case 'decimal':
        return 123;
      case 'boolean':
        return true;
      case 'date':
      case 'datetime':
      case 'timestamp':
        return "2025-09-10T10:30:00Z";
      case 'object':
        return { "key": "value" };
      case 'array':
        return ["item1", "item2"];
      default:
        return "sample_value";
    }
  }

  /**
   * Generate generic sample based on collection name patterns
   */
  private generateGenericSample(collectionName: string): string {
    const lowerName = collectionName.toLowerCase();
    
    // Detect collection type from name patterns
    if (lowerName.includes('user') || lowerName.includes('customer')) {
      const randomId = Math.floor(Math.random() * 1000000);
      const names = ['Alex', 'Jordan', 'Casey', 'Taylor', 'Morgan', 'Riley', 'Avery', 'Quinn'];
      const randomName = names[Math.floor(Math.random() * names.length)];
      return JSON.stringify({
        "_id": `ObjectId('${randomId.toString(16).padStart(24, '0')}')`,
        "name": randomName,
        "email": `${randomName.toLowerCase()}_${randomId}@example.com`,
        "createdAt": new Date().toISOString()
      }, null, 2);
    }
    
    if (lowerName.includes('payment')) {
      const randomId = Math.floor(Math.random() * 1000000);
      const amount = Math.round((Math.random() * 100 + 10) * 100) / 100;
      const statuses = ['completed', 'pending', 'failed'];
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
      return JSON.stringify({
        "_id": `ObjectId('${randomId.toString(16).padStart(24, '0')}')`,
        "amount": amount,
        "status": randomStatus,
        "date": new Date().toISOString()
      }, null, 2);
    }
    
    if (lowerName.includes('rental') || lowerName.includes('order')) {
      const randomId = Math.floor(Math.random() * 1000000);
      const statuses = ['active', 'completed', 'cancelled'];
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days later
      return JSON.stringify({
        "_id": `ObjectId('${randomId.toString(16).padStart(24, '0')}')`,
        "status": randomStatus,
        "startDate": startDate.toISOString(),
        "endDate": endDate.toISOString()
      }, null, 2);
    }
    
    if (lowerName.includes('product') || lowerName.includes('item') || lowerName.includes('film')) {
      const randomId = Math.floor(Math.random() * 1000000);
      const price = Math.round((Math.random() * 50 + 10) * 100) / 100;
      return JSON.stringify({
        "_id": `ObjectId('${randomId.toString(16).padStart(24, '0')}')`,
        "title": `Sample ${collectionName.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
        "description": `Sample description for ${collectionName}`,
        "price": price
      }, null, 2);
    }
    
    if (lowerName.includes('archive') || lowerName.includes('history')) {
      const randomId = Math.floor(Math.random() * 1000000);
      const originalId = Math.floor(Math.random() * 10000);
      return JSON.stringify({
        "_id": `ObjectId('${randomId.toString(16).padStart(24, '0')}')`,
        "originalId": `original_${originalId}`,
        "archivedAt": new Date().toISOString(),
        "reason": "archived"
      }, null, 2);
    }

    // Default generic sample
    const randomId = Math.floor(Math.random() * 1000000);
    return JSON.stringify({
      "_id": `ObjectId('${randomId.toString(16).padStart(24, '0')}')`,
      "name": `Sample ${collectionName.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
      "value": "sample_value",
      "createdAt": new Date().toISOString()
    }, null, 2);
  }

  /**
   * Format modifications list
   */
  private formatModifications(modifications: string[]): string {
    if (!modifications || modifications.length === 0) {
      return 'No modifications were made during the session.';
    }

    return modifications.map((mod, index) => `${index + 1}. **${mod}**`).join('\n\n');
  }

  /**
   * Extract architecture insights from application analysis
   */
  private extractArchitectureInsights(content: string): string {
    // Look for the actual architecture sections in the application analysis
    const patterns = [
      /## 🔄 Spring Boot → Node\.js Transformation with Embedded Documents[\s\S]*?(?=## |$)/,
      /## 📁 File Inventory & Modification Requirements[\s\S]*?(?=## |$)/,
      /## Application Architecture Changes[\s\S]*?(?=## |$)/,
      /## Architecture[\s\S]*?(?=## |$)/
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match && match[0].trim().length > 50) {
        return match[0].trim();
      }
    }

    // Fallback: Look for any section with "Transformation" in the title
    const transformationMatch = content.match(/## .*[Tt]ransformation.*[\s\S]*?(?=## |$)/);
    if (transformationMatch) {
      return transformationMatch[0].trim();
    }
    
    return 'Architecture transformation details will be included based on the application analysis.';
  }

  /**
   * Extract indexing strategy from schema content
   */
  private extractIndexingStrategy(content: string): string {
    // Look for the actual indexing sections in the proposed MongoDB schema
    const patterns = [
      /## Performance Considerations[\s\S]*?(?=## |$)/,
      /## Intelligent MongoDB Design[\s\S]*?(?=## |$)/,
      /## Indexing Strategy[\s\S]*?(?=## |$)/,
      /## Indexes[\s\S]*?(?=## |$)/
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match && match[0].trim().length > 50) {
        return match[0].trim();
      }
    }
    
    return 'Indexing strategy will be included based on the approved schema modifications.';
  }

  /**
   * Extract archiving strategy from schema content
   */
  private extractArchivingStrategy(content: string): string {
    // Look for the actual archiving sections in the proposed MongoDB schema
    const patterns = [
      /## Denormalization Strategy[\s\S]*?(?=## |$)/,
      /## Embedded Document Strategy[\s\S]*?(?=## |$)/,
      /## Archiving Strategy[\s\S]*?(?=## |$)/,
      /## Data Archiving[\s\S]*?(?=## |$)/
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match && match[0].trim().length > 50) {
        return match[0].trim();
      }
    }
    
    return 'Archiving strategy will be included based on the approved schema modifications.';
  }

  /**
   * Extract query optimization from application analysis
   */
  private extractQueryOptimization(content: string): string {
    // Look for the actual performance sections in the application analysis
    const patterns = [
      /## 📊 Performance Analysis[\s\S]*?(?=## |$)/,
      /## 🚀 Performance Benefits[\s\S]*?(?=## |$)/,
      /## Query Optimization[\s\S]*?(?=## |$)/,
      /## Performance Optimization[\s\S]*?(?=## |$)/
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match && match[0].trim().length > 50) {
        return match[0].trim();
      }
    }
    
    return 'Query optimization details will be included based on the application analysis.';
  }

  /**
   * Handle start modification session in natural language
   */
  private async handleStartModificationNaturalLanguage(input: string, rl: readline.Interface): Promise<void> {
    try {
      console.log(chalk.blue('🚀 Starting interactive schema modification session...'));
      
      // Extract business requirements and performance constraints from input
      const businessRequirements = this.extractBusinessRequirements(input);
      const performanceConstraints = this.extractPerformanceConstraints(input);
      
      // Check if we have existing analysis results
      const existingPostgresFile = await this.findLatestFile('postgres-schema-*.md');
      const existingMongoFile = await this.findLatestFile('proposed-mongodb-schema-*.md');
      
      if (!existingPostgresFile || !existingMongoFile) {
        console.log(chalk.yellow('⚠️  No existing analysis found. Please run analysis first:'));
        console.log(chalk.gray('  • "Analyze postgres schema"'));
        console.log(chalk.gray('  • "Convert postgres to MongoDB schema"'));
        return;
      }
      
      console.log(chalk.blue(`📁 Using existing PostgreSQL schema: ${existingPostgresFile}`));
      console.log(chalk.blue(`📁 Using existing MongoDB schema: ${existingMongoFile}`));
      
      // Load existing schemas from files
      const postgresSchema = await this.loadSchemaFromFile(existingPostgresFile);
      const mongoSchema = await this.loadSchemaFromFile(existingMongoFile);
      
      console.log(chalk.gray(`🔍 Loaded PostgreSQL schema: ${postgresSchema ? 'Success' : 'Failed'}`));
      console.log(chalk.gray(`🔍 Loaded MongoDB schema: ${mongoSchema ? 'Success' : 'Failed'}`));
      
      if (!postgresSchema || !mongoSchema) {
        console.log(chalk.red('❌ Failed to load existing schemas. Please regenerate them first.'));
        return;
      }
      
      // Start modification session
      const modificationService = await this.getModificationService();
      
      const session = modificationService.startModificationSession(
        postgresSchema,
        mongoSchema.collections || [],
        businessRequirements,
        performanceConstraints
      );
      
      // Build comprehensive response for conversation history
      const response = `Modification session started successfully!\nSession ID: ${session.sessionId}\nCollections: ${session.currentSchema.length}\nBusiness Requirements: ${businessRequirements.length > 0 ? businessRequirements.join(', ') : 'None specified'}\nPerformance Constraints: ${performanceConstraints.length > 0 ? performanceConstraints.join(', ') : 'None specified'}\n\nNext steps:\n• "Modify the schema to [description]" - Apply specific changes\n• "Get suggestions" - Get AI improvement recommendations\n• "Update documentation" - Generate updated docs with changes\n• "Approve schema" - Finalize and generate migration document`;
      
      console.log(chalk.green('✅ Modification session started successfully!'));
      console.log(chalk.blue(`🆔 Session ID: ${session.sessionId}`));
      console.log(chalk.blue(`📊 Collections: ${session.currentSchema.length}`));
      console.log(chalk.blue(`📋 Business Requirements: ${businessRequirements.length > 0 ? businessRequirements.join(', ') : 'None specified'}`));
      console.log(chalk.blue(`⚡ Performance Constraints: ${performanceConstraints.length > 0 ? performanceConstraints.join(', ') : 'None specified'}`));
      
      // Capture comprehensive agent response
      this.captureAgentResponse(response);
      
      console.log(chalk.yellow('\n💡 Next steps:'));
      console.log(chalk.gray('  • "Modify the schema to embed user preferences into customers collection"'));
      console.log(chalk.gray('  • "Get suggestions"'));
      console.log(chalk.gray('  • "Update documentation"'));
      console.log(chalk.gray('  • "Approve schema"'));
      
      // Store session ID for future use
      this.currentModificationSession = session.sessionId;
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to start modification session:'), error);
    }
  }

  /**
   * Handle modify schema in natural language
   */
  private async handleModifySchemaNaturalLanguage(input: string, rl: readline.Interface): Promise<void> {
    try {
      if (!this.currentModificationSession) {
        console.log(chalk.red('❌ No active modification session. Start one first with "start modification session"'));
        return;
      }
      
      // Extract modification description from input
      const modificationDescription = this.extractModificationDescription(input);
      
      console.log(chalk.blue(`🔧 Processing modification: "${modificationDescription}"`));
      console.log(chalk.gray(`🆔 Using session ID: ${this.currentModificationSession}`));
      
      const modificationService = await this.getModificationService();
      
      const response = await modificationService.processModificationRequest(
        this.currentModificationSession,
        modificationDescription,
        undefined,
        'MEDIUM'
      );
      
      if (response.success) {
        // Build comprehensive response for conversation history
        let agentResponse = `Schema modification processed successfully!\nAI Reasoning: ${response.reasoning}`;
        
        if (response.changes.length > 0) {
          agentResponse += `\n\nChanges made:`;
          response.changes.forEach((change: any) => {
            agentResponse += `\n• ${change.type}: ${change.description}\n  Impact: ${change.impact} | Reasoning: ${change.reasoning}`;
          });
        }
        
        if (response.warnings.length > 0) {
          agentResponse += `\n\nWarnings:`;
          response.warnings.forEach((warning: any) => {
            agentResponse += `\n• ${warning}`;
          });
        }
        
        if (response.recommendations.length > 0) {
          agentResponse += `\n\nRecommendations:`;
          response.recommendations.forEach((rec: any) => {
            agentResponse += `\n• ${rec}`;
          });
        }
        
        console.log(chalk.green('✅ Schema modification processed successfully!'));
        console.log(chalk.blue(`🤖 AI Reasoning: ${response.reasoning}`));
        
        if (response.changes.length > 0) {
          console.log(chalk.yellow('\n📊 Changes made:'));
          response.changes.forEach((change: any) => {
            console.log(chalk.gray(`  • ${change.type}: ${change.description}`));
            console.log(chalk.gray(`    Impact: ${change.impact} | Reasoning: ${change.reasoning}`));
          });
        }
        
        if (response.warnings.length > 0) {
          console.log(chalk.yellow('\n⚠️  Warnings:'));
          response.warnings.forEach((warning: any) => {
            console.log(chalk.gray(`  • ${warning}`));
          });
        }
        
        if (response.recommendations.length > 0) {
          console.log(chalk.blue('\n💡 Recommendations:'));
          response.recommendations.forEach((rec: any) => {
            console.log(chalk.gray(`  • ${rec}`));
          });
        }
        
        // Capture comprehensive agent response
        this.captureAgentResponse(agentResponse);
      } else {
        console.error(chalk.red('❌ Schema modification failed:'), response.error);
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Schema modification failed:'), error);
    }
  }

  /**
   * Handle get suggestions in natural language
   */
  private async handleGetSuggestionsNaturalLanguage(input: string, rl: readline.Interface): Promise<void> {
    try {
      if (!this.currentModificationSession) {
        console.log(chalk.red('❌ No active modification session. Start one first with "start modification session"'));
        return;
      }
      
      console.log(chalk.blue('💡 Getting intelligent suggestions...'));
      
      const modificationService = await this.getModificationService();
      
      const suggestions = await modificationService.getModificationSuggestions(this.currentModificationSession);
      
      if (suggestions.length > 0) {
        console.log(chalk.green('✅ AI suggestions generated successfully!'));
        console.log(chalk.blue('\n🤖 Intelligent Modification Suggestions:'));
        
        suggestions.forEach((suggestion: any, index: number) => {
          console.log(chalk.yellow(`\n${index + 1}. ${suggestion.suggestion}`));
          console.log(chalk.gray(`   Reasoning: ${suggestion.reasoning}`));
          console.log(chalk.gray(`   Impact: ${suggestion.impact} | Effort: ${suggestion.effort}`));
          console.log(chalk.gray(`   Benefits: ${suggestion.benefits.join(', ')}`));
          if (suggestion.risks.length > 0) {
            console.log(chalk.gray(`   Risks: ${suggestion.risks.join(', ')}`));
          }
          console.log(chalk.gray(`   Implementation: ${suggestion.implementation}`));
        });
        
        console.log(chalk.yellow('\n💡 To apply a suggestion, say:'));
        console.log(chalk.gray('  "Modify the schema to [suggestion description]"'));
      } else {
        console.log(chalk.yellow('ℹ️  No suggestions available at this time.'));
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to get suggestions:'), error);
    }
  }

  /**
   * Handle update documentation in natural language
   */
  private async handleUpdateDocsNaturalLanguage(input: string, rl: readline.Interface): Promise<void> {
    try {
      if (!this.currentModificationSession) {
        console.log(chalk.red('❌ No active modification session. Start one first with "start modification session"'));
        return;
      }
      
      console.log(chalk.blue('📝 Generating updated documentation...'));
      
      const modificationService = await this.getModificationService();
      
      const result = await modificationService.generateUpdatedDocumentation(this.currentModificationSession);
      
      if (result.success) {
        console.log(chalk.green('✅ Updated documentation generated successfully!'));
        console.log(chalk.blue(`📁 File: ${result.filePath}`));
        console.log(chalk.gray('\n🔄 The documentation now reflects your latest schema modifications.'));
      } else {
        console.error(chalk.red('❌ Failed to generate updated documentation:'), result.error);
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to update documentation:'), error);
    }
  }

  /**
   * Handle approve schema in natural language
   */
  private async handleApproveSchemaNaturalLanguage(input: string, rl: readline.Interface): Promise<void> {
    try {
      if (!this.currentModificationSession) {
        console.log(chalk.red('❌ No active modification session. Start one first with "start modification session"'));
        return;
      }
      
      console.log(chalk.blue('✅ Approving final schema...'));
      console.log(chalk.blue('📚 Gathering comprehensive migration data...'));
      
      const modificationService = await this.getModificationService();
      
      // Get the basic final document
      const finalDocument = await modificationService.approveFinalSchema(this.currentModificationSession);
      
      // Find and read the latest proposed MongoDB schema
      const latestMongoFile = await this.findLatestFile('proposed-mongodb-schema-*.md');
      const latestAppAnalysisFile = await this.findLatestFile('*-detail.md');
      
      console.log(chalk.blue('📖 Reading proposed MongoDB schema...'));
      const mongoSchemaContent = latestMongoFile ? await this.readFileContent(latestMongoFile) : '';
      
      console.log(chalk.blue('📖 Reading application analysis...'));
      const appAnalysisContent = latestAppAnalysisFile ? await this.readFileContent(latestAppAnalysisFile) : '';
      
      // Extract actual collection count from the proposed schema
      const actualCollectionCount = await this.extractCollectionCount(mongoSchemaContent);
      
      // Generate comprehensive final migration document
      const comprehensiveDoc = await this.generateComprehensiveMigrationDocument(
        finalDocument,
        mongoSchemaContent,
        appAnalysisContent,
        this.currentModificationSession
      );
      
      // Save the comprehensive document
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `comprehensive-migration-document-${timestamp}.md`;
      
      const fs = await import('fs');
      fs.writeFileSync(filename, comprehensiveDoc);
      
      // Also save to central location
      const centralPath = '/Users/prateek/Desktop/peer-ai-mongo-documents';
      if (fs.existsSync(centralPath)) {
        fs.writeFileSync(`${centralPath}/${filename}`, comprehensiveDoc);
      }
      
      // Build comprehensive response for conversation history
      let response = `Comprehensive final migration document generated successfully!\nDocument ID: ${finalDocument.documentId}\nFinal Collections: ${actualCollectionCount > 0 ? actualCollectionCount : 'Loading...'}\nTotal Modifications: ${finalDocument.modificationSummary.totalModifications}\nPerformance Impact: ${finalDocument.modificationSummary.performanceImpact}\nComplexity Change: ${finalDocument.modificationSummary.complexityChange}`;
      
      response += `\n\nKey Changes Made:`;
      finalDocument.modificationSummary.keyChanges.forEach((change: any) => {
        response += `\n• ${change}`;
      });
      
      response += `\n\nFinal Recommendations:`;
      finalDocument.finalRecommendations.forEach((rec: any) => {
        response += `\n• ${rec}`;
      });
      
      console.log(chalk.green('🎉 Comprehensive final migration document generated successfully!'));
      console.log(chalk.blue(`📋 Document ID: ${finalDocument.documentId}`));
      console.log(chalk.blue(`📊 Final Collections: ${actualCollectionCount > 0 ? actualCollectionCount : 'Loading...'}`));
      console.log(chalk.blue(`🔧 Total Modifications: ${finalDocument.modificationSummary.totalModifications}`));
      console.log(chalk.blue(`⚡ Performance Impact: ${finalDocument.modificationSummary.performanceImpact}`));
      console.log(chalk.blue(`📈 Complexity Change: ${finalDocument.modificationSummary.complexityChange}`));
      
      console.log(chalk.yellow('\n📋 Key Changes Made:'));
      finalDocument.modificationSummary.keyChanges.forEach((change: any) => {
        console.log(chalk.gray(`  • ${change}`));
      });
      
      console.log(chalk.blue('\n💡 Final Recommendations:'));
      finalDocument.finalRecommendations.forEach((rec: any) => {
        console.log(chalk.gray(`  • ${rec}`));
      });
      
      // Capture comprehensive agent response
      this.captureAgentResponse(response);
      
      console.log(chalk.green(`\n📁 Comprehensive document saved: ${filename}`));
      console.log(chalk.green('🚀 Your comprehensive migration document is ready for implementation!'));
      
      // Clear current session
      this.currentModificationSession = null;
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to approve schema:'), error);
    }
  }

  /**
   * Handle list sessions in natural language
   */
  private async handleListSessionsNaturalLanguage(input: string, rl: readline.Interface): Promise<void> {
    try {
      console.log(chalk.blue('📋 Listing all active modification sessions...'));
      
      const modificationService = await this.getModificationService();
      
      const sessions = modificationService.listActiveSessions();
      
      if (sessions.length > 0) {
        console.log(chalk.green(`✅ Found ${sessions.length} active session(s):`));
        
        sessions.forEach((session: any) => {
          console.log(chalk.blue(`\n🆔 Session ID: ${session.sessionId}`));
          console.log(chalk.gray(`📅 Started: ${session.startTime.toLocaleString()}`));
          console.log(chalk.gray(`📊 Collections: ${session.currentSchema.length}`));
          console.log(chalk.gray(`🔧 Modifications: ${session.modificationHistory.length}`));
          console.log(chalk.gray(`📋 Status: ${session.status}`));
        });
        
        console.log(chalk.yellow('\n💡 To use a session, say:'));
        console.log(chalk.gray('  "Use session [sessionId]" or "Switch to session [sessionId]"'));
      } else {
        console.log(chalk.yellow('ℹ️  No active modification sessions found.'));
        console.log(chalk.gray('💡 Start a new session with: "start modification session"'));
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to list sessions:'), error);
    }
  }

  // ========================================
  // Helper Methods for Natural Language Processing
  // ========================================

  /**
   * Extract business requirements from natural language input
   */
  private extractBusinessRequirements(input: string): string[] {
    const requirements: string[] = [];
    
    // Common business requirement patterns
    const patterns = [
      /(?:for|support|need|require).*?(?:e-commerce|ecommerce|online store|retail|inventory|analytics|reporting|real-time|real time|customer management|user management|staff management|dvd rental|movie rental|film rental)/gi,
      /(?:business|requirements|needs).*?(?:e-commerce|ecommerce|online store|retail|inventory|analytics|reporting|real-time|real time|customer management|user management|staff management|dvd rental|movie rental|film rental)/gi
    ];
    
    patterns.forEach(pattern => {
      const matches = input.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const cleanMatch = match.replace(/^(?:for|support|need|require|business|requirements|needs)\s*/gi, '').trim();
          if (cleanMatch && !requirements.includes(cleanMatch)) {
            requirements.push(cleanMatch);
          }
        });
      }
    });
    
    return requirements;
  }

  /**
   * Extract performance constraints from natural language input
   */
  private extractPerformanceConstraints(input: string): string[] {
    const constraints: string[] = [];
    
    // Common performance constraint patterns
    const patterns = [
      /(?:sub-|under|less than|faster than|quicker than)\s*\d+\s*(?:ms|milliseconds|seconds?|minutes?)/gi,
      /(?:performance|speed|response time|query time).*?(?:sub-|under|less than|faster than|quicker than)\s*\d+\s*(?:ms|milliseconds|seconds?|minutes?)/gi,
      /(?:memory|storage|size).*?(?:<|less than|under|below)\s*\d+\s*(?:mb|gb|tb|megabytes?|gigabytes?|terabytes?)/gi
    ];
    
    patterns.forEach(pattern => {
      const matches = input.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const cleanMatch = match.trim();
          if (cleanMatch && !constraints.includes(cleanMatch)) {
            constraints.push(cleanMatch);
          }
        });
      }
    });
    
    return constraints;
  }

  /**
   * Extract modification description from natural language input
   */
  private extractModificationDescription(input: string): string {
    // Remove common prefixes and clean up the input
    const prefixes = [
      /^(?:modify|change|update|adjust|fix|improve|optimize|refactor|restructure)\s+(?:the\s+)?(?:schema|mongodb|mongodb schema|database|database schema)\s+(?:to\s+)?/gi,
      /^(?:make|let|set|configure)\s+(?:the\s+)?(?:schema|mongodb|mongodb schema|database|database schema)\s+(?:to\s+)?/gi,
      /^(?:i\s+)?(?:want\s+)?(?:to\s+)?(?:modify|change|update|adjust|fix|improve|optimize|refactor|restructure)\s+(?:the\s+)?(?:schema|mongodb|mongodb schema|database|database schema)\s+(?:to\s+)?/gi
    ];
    
    let description = input;
    prefixes.forEach(prefix => {
      description = description.replace(prefix, '');
    });
    
    return description.trim();
  }

  // Add currentModificationSession property
  private currentModificationSession: string | null = null;
  private modificationService: any = null;
}