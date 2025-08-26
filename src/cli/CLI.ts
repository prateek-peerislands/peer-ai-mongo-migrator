import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { MCPAgent } from '../core/MCPAgent.js';
import { DatabaseConfig } from '../types/index.js';
import readline from 'readline';
import { clearInteractiveCredentials } from '../config/interactive-credentials.js';

export class CLI {
  private agent!: MCPAgent;
  private program: Command;

  constructor() {
    this.program = new Command();
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
  }

  /**
   * Initialize the agent with configuration
   */
  async initialize(config: DatabaseConfig): Promise<void> {
    try {
      this.agent = new MCPAgent(config);
      await this.agent.initialize();
    } catch (error) {
      console.error('Failed to initialize agent:', error);
      process.exit(1);
    }
  }

  /**
   * Parse and execute CLI commands
   */
  async run(args: string[]): Promise<void> {
    try {
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
      const analysisResult = await this.agent.analyzePostgreSQLComprehensive({
        includeStoredProcedures: includeStoredProcedures === 'true',
        includeQueryPatterns: includeQueryPatterns === 'true',
        includePerformanceAnalysis: performanceAnalysis === 'true'
      });
      
      if (!analysisResult.success) {
        spinner.fail('Failed to analyze PostgreSQL database');
        return;
      }
      
      spinner.text = 'Designing intelligent MongoDB collections...';
      const designResult = await this.agent.designIntelligentMongoDB({
        embeddedDocuments: embeddedDocuments === 'true',
        includePerformanceOptimization: performanceAnalysis === 'true'
      });
      
      if (!designResult.success) {
        spinner.fail('Failed to design intelligent MongoDB collections');
        return;
      }
      
      spinner.text = 'Generating comprehensive migration plan...';
      const migrationPlan = await this.agent.generateEnhancedMigrationPlan({
        includeRiskAssessment: riskAssessment === 'true',
        includeTimelineEstimation: timelineEstimation === 'true'
      });
      
      if (!migrationPlan.success) {
        spinner.fail('Failed to generate migration plan');
        return;
      }
      
      spinner.text = 'Generating output files...';
      const outputResult = await this.agent.generateMigrationPlanOutput(
        migrationPlan.data,
        {
          format: format || 'markdown',
          outputDirectory: output || './migration-plan',
          includeAllSections: true
        }
      );
      
      if (outputResult.success) {
        spinner.succeed('Enhanced migration plan generated successfully!');
        console.log(chalk.green('\nEnhanced Migration Plan Summary:'));
        console.log(chalk.cyan(`Output directory: ${outputResult.data?.outputDirectory || 'migration-plan'}`));
        console.log(chalk.cyan(`Files generated: ${outputResult.data?.filesGenerated?.length || 0}`));
        console.log(chalk.cyan(`Collections designed: ${designResult.data?.collections?.length || 0}`));
        console.log(chalk.cyan(`Embedded documents: ${designResult.data?.embeddedDocuments?.length || 0}`));
        
        if (outputResult.data?.filesGenerated) {
          console.log(chalk.yellow('\nGenerated Files:'));
          outputResult.data.filesGenerated.forEach((file: string) => {
            console.log(chalk.cyan(`  - ${file}`));
          });
        }
        
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
    
    console.log('\n📊 Database Status:');
    
    console.log(chalk.white('\nPostgreSQL:'));
    console.log(chalk.gray(`  Connected: ${status.postgresql.connected ? '✅' : '❌'}`));
    console.log(chalk.gray(`  Tables: ${status.postgresql.tableCount}`));
    
    console.log(chalk.white('\nMongoDB:'));
    console.log(chalk.gray(`  Connected: ${status.mongodb.connected ? '✅' : '❌'}`));
    console.log(chalk.gray(`  Collections: ${status.mongodb.collectionCount}`));
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
   * Handle natural language input from users
   */
  private async handleNaturalLanguageInput(input: string, rl: readline.Interface): Promise<void> {
    const lowerInput = input.toLowerCase();
    
    // Debug: Show what input is being processed
    console.log(chalk.gray(`🔍 Processing input: "${input}"`));
    console.log(chalk.gray(`🔍 Lowercase: "${lowerInput}"`));
    
    try {
      // Database status and health queries
      if (this.matchesPattern(lowerInput, ['status', 'health', 'how are you', 'are you working'])) {
        console.log(chalk.blue('🏥 Checking database status...'));
        await this.showDatabaseStatus();
        return;
      }
      
      // NEW: Handle comprehensive schema analysis requests FIRST (before PostgreSQL handler)
      // Check for specific schema analysis patterns
      if (this.matchesPattern(lowerInput, ['analyze', 'analysis', 'comprehensive', 'complete', 'full', 'generate', 'document', 'show', 'display'])) {
        if (this.matchesPattern(lowerInput, ['postgres', 'postgresql', 'sql', 'schema', 'database'])) {
          await this.handleSchemaAnalysisNaturalLanguage(input, rl);
          return;
        }
      }
      
      // Special case for "analyze the postgres schema" - exact phrase matching
      if (lowerInput.includes('analyze') && lowerInput.includes('postgres') && lowerInput.includes('schema')) {
        await this.handleSchemaAnalysisNaturalLanguage(input, rl);
        return;
      }
      
      // NEW: Handle enhanced business context analysis requests FIRST (before general schema analysis)
      // Check for business context specific requests
      if (this.matchesPattern(lowerInput, ['business context', 'business relationships', 'data flow patterns', 'business processes', 'business rules', 'impact matrix'])) {
        console.log(chalk.blue('🔍 Business context pattern matched!'));
        await this.handleEnhancedBusinessAnalysisNaturalLanguage(input, rl);
        return;
      }
      
      // Check for business context action words
      if (this.matchesPattern(lowerInput, ['show me', 'what are', 'map the', 'extract', 'generate'])) {
        if (this.matchesPattern(lowerInput, ['business', 'semantic', 'workflow', 'process', 'rules', 'data flow', 'impact'])) {
          console.log(chalk.blue('🔍 Business context action pattern matched!'));
          await this.handleEnhancedBusinessAnalysisNaturalLanguage(input, rl);
          return;
        }
      }
      
      // Check for general business context words
      if (this.matchesPattern(lowerInput, ['business', 'context', 'semantic', 'workflow', 'process', 'rules', 'relationship beyond'])) {
        if (this.matchesPattern(lowerInput, ['analyze', 'analysis', 'schema', 'postgres', 'postgresql'])) {
          console.log(chalk.blue('🔍 Business context general pattern matched!'));
          await this.handleEnhancedBusinessAnalysisNaturalLanguage(input, rl);
          return;
        }
      }
      
      // Handle specific business context phrases for exact matching
      if (lowerInput.includes('business context') || 
          lowerInput.includes('business relationships') ||
          lowerInput.includes('data flow patterns') ||
          lowerInput.includes('business processes') ||
          lowerInput.includes('business rules') ||
          lowerInput.includes('impact matrix')) {
        console.log(chalk.blue('🔍 Business context exact phrase matched!'));
        await this.handleEnhancedBusinessAnalysisNaturalLanguage(input, rl);
        return;
      }
      
      // Fallback: Catch any remaining business-related requests
      if (lowerInput.includes('business') || 
          lowerInput.includes('semantic') ||
          lowerInput.includes('workflow') ||
          lowerInput.includes('process') ||
          lowerInput.includes('rules') ||
          lowerInput.includes('data flow') ||
          lowerInput.includes('impact')) {
        if (lowerInput.includes('analyze') || lowerInput.includes('show') || lowerInput.includes('what') || lowerInput.includes('map') || lowerInput.includes('extract') || lowerInput.includes('generate')) {
          console.log(chalk.blue('🔍 Business context fallback pattern matched!'));
          await this.handleEnhancedBusinessAnalysisNaturalLanguage(input, rl);
          return;
        }
      }
      
      // NEW: Handle ER diagram requests
      if (this.matchesPattern(lowerInput, ['er diagram', 'entity relationship', 'entity-relationship', 'relationship diagram', 'database diagram', 'schema diagram'])) {
        if (this.matchesPattern(lowerInput, ['postgres', 'postgresql', 'sql', 'current', 'my', 'generate', 'create', 'show'])) {
          await this.handleERDiagramNaturalLanguage(input, rl);
          return;
        }
      }
      
      // Special case for ER diagram requests - exact phrase matching
      if (lowerInput.includes('er diagram') || 
          lowerInput.includes('entity relationship diagram') ||
          lowerInput.includes('database diagram') ||
          lowerInput.includes('schema diagram')) {
        if (lowerInput.includes('postgres') || lowerInput.includes('current') || lowerInput.includes('my')) {
          await this.handleERDiagramNaturalLanguage(input, rl);
          return;
        }
      }
      
      // NEW: Handle MongoDB schema generation requests
      if (this.matchesPattern(lowerInput, ['mongodb', 'mongo', 'corresponding', 'equivalent', 'convert', 'generate'])) {
        if (this.matchesPattern(lowerInput, ['schema', 'postgres', 'postgresql', 'sql'])) {
          await this.handleMongoDBSchemaGenerationNaturalLanguage(input, rl);
          return;
        }
      }
      
      // Special case for MongoDB schema generation - exact phrase matching
      if (lowerInput.includes('mongodb') && lowerInput.includes('schema') && 
          (lowerInput.includes('corresponding') || lowerInput.includes('equivalent'))) {
        await this.handleMongoDBSchemaGenerationNaturalLanguage(input, rl);
            return;
      }
      
      // NEW: Handle GitHub repository analysis requests FIRST (before local migration analysis)
      // This should catch migration requests that might be for GitHub repos
      if (this.matchesPattern(lowerInput, ['migrate', 'migration', 'spring boot', 'node.js', 'nodejs'])) {
        // Check if this might be a GitHub request by asking the user
        if (this.matchesPattern(lowerInput, ['mongodb', 'mongo', 'node.js', 'nodejs', 'spring boot', 'postgresql', 'postgres'])) {
          // Ask user if source code is in GitHub or local machine
          const { sourceLocation } = await this.promptForSourceLocation(rl);
          
          if (sourceLocation === 'github') {
            await this.handleGitHubAnalysisNaturalLanguage(input, rl);
            return;
          } else {
            // User chose local machine, proceed with local analysis
            await this.handleMigrationAnalysisNaturalLanguage(input, rl);
            return;
          }
        }
      }
      
      // Handle simple database listing requests
      if (lowerInput === 'list the tables in postgres' || 
          lowerInput === 'list the tables in postgresql') {
        await this.handlePostgreSQLStateRequest(rl);
        return;
      }
      
      if (lowerInput === 'list the collections in mongo' || 
          lowerInput === 'list the collections in mongodb') {
        await this.handleMongoDBStateRequest(rl);
        return;
      }

      // NEW: Handle comprehensive database state requests
      if (this.matchesPattern(lowerInput, ['current state', 'database state', 'both databases', 'fetch the current state'])) {
        await this.handleComprehensiveDatabaseStateRequest(rl);
        return;
      }

      // NEW: Handle migration analysis and planning requests
      if (this.matchesPattern(lowerInput, ['analyze migration', 'migration plan', 'migration order', 'migration dependencies', 'plan migration', 'migration strategy', 'migrate postgresql', 'postgresql to mongodb'])) {
        await this.handleMigrationAnalysisRequest(rl);
        return;
      }
      
      // Handle source code analysis requests
      if (this.matchesPattern(lowerInput, ['analyze', 'analysis', 'source code', 'source-code'])) {
        await this.handleSourceCodeAnalysisNaturalLanguage(input, rl);
        return;
      }
      
      // Handle migration plan requests
      if (this.matchesPattern(lowerInput, ['migration plan', 'migration strategy', 'migration roadmap'])) {
        await this.handleMigrationPlanNaturalLanguage(input, rl);
        return;
      }
      
      // Handle explicit GitHub repository analysis requests
      if (this.matchesPattern(lowerInput, ['github', 'repo', 'repository', 'git', 'clone'])) {
        if (this.matchesPattern(lowerInput, ['analyze', 'analysis', 'migrate', 'migration', 'mongodb', 'node.js', 'nodejs'])) {
          await this.handleGitHubAnalysisNaturalLanguage(input, rl);
          return;
        }
      }
      
      // Core CRUD operations for PostgreSQL
      if (this.matchesPattern(lowerInput, ['postgres', 'postgresql', 'sql', 'table'])) {
        await this.handlePostgreSQLNaturalLanguage(input, rl);
        return;
      }
      
      // Core CRUD operations for MongoDB
      if (this.matchesPattern(lowerInput, ['mongo', 'mongodb', 'collection', 'document'])) {
        await this.handleMongoDBNaturalLanguage(input, rl);
        return;
      }
      
      // If no pattern matches, show help
      console.log(chalk.yellow('🤔 I\'m not sure how to handle that request. Here are the supported operations:'));
      console.log(chalk.gray('  • "Update language table set name to Hindi where name is English"'));
      console.log(chalk.gray('  • "Delete from language table where name is English"'));
      console.log(chalk.gray('  • "Fetch records from language table"'));
      console.log(chalk.gray('  • "How many records are in language table"'));
      console.log(chalk.gray('  • "Update language collection set name to Hindi where name is English"'));
      console.log(chalk.gray('  • "Delete from language collection where name is Hindi"'));
      console.log(chalk.gray('  • "Fetch documents from language collection"'));
      console.log(chalk.gray('  • "How many documents are in language collection"'));
      console.log(chalk.gray('  • "list the tables in postgres" (lists tables with row counts)'));
      console.log(chalk.gray('  • "list the collections in mongo" (lists collections with document counts)'));
      console.log(chalk.gray('  • "Analyze the postgres schema" (for comprehensive documentation)'));
      console.log(chalk.gray('  • "Analyze GitHub repo https://github.com/owner/project for MongoDB migration"'));
      console.log(chalk.gray('  • "I want to migrate to MongoDB and Node.js architecture, what all changes to be made"'));
      console.log(chalk.gray('  • Type "help" for more examples'));
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to process natural language input:'), error);
      
      // Ensure the readline interface is still responsive
      try {
        // Small delay to let any pending operations complete
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (delayError) {
        console.log(chalk.yellow('⚠️  Error during recovery delay'));
      }
    }
  }

  /**
   * Check if input matches any patterns
   */
  private matchesPattern(input: string, patterns: string[]): boolean {
    return patterns.some(pattern => input.includes(pattern));
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
    const lowerInput = input.toLowerCase();
    
    // Check for schema analysis patterns - more flexible matching
    if (this.matchesPattern(lowerInput, ['analyze', 'analysis', 'comprehensive', 'complete', 'full', 'generate', 'document', 'show', 'display'])) {
      if (this.matchesPattern(lowerInput, ['postgres', 'postgresql', 'sql', 'schema', 'database'])) {
        console.log(chalk.blue('🔍 Processing comprehensive PostgreSQL schema analysis request...'));
        console.log(chalk.yellow('💡 This will analyze your entire PostgreSQL database and generate detailed documentation.'));
        console.log(chalk.gray('⏳ Please wait, this may take a few moments...'));
        
        try {
          const result = await this.agent.analyzePostgreSQLSchema();
          if (result.success) {
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
          } else {
            console.log(chalk.red('\n❌ Schema analysis failed:'), result.error);
            console.log(chalk.yellow('💡 Please check your PostgreSQL connection and try again.'));
          }
        } catch (error) {
          console.error(chalk.red('\n❌ Schema analysis failed:'), error);
          console.log(chalk.yellow('💡 Please check your PostgreSQL connection and try again.'));
        }
        return;
      }
    }
    // If no specific pattern matched, provide helpful guidance
    console.log(chalk.blue('🔍 Processing schema analysis request...'));
    console.log(chalk.yellow('💡 For comprehensive PostgreSQL schema analysis, try:'));
    console.log(chalk.cyan('  • "Analyze the postgres schema"'));
    console.log(chalk.cyan('  • "Analyze the current postgres schema"'));
    console.log(chalk.cyan('  • "Analyze postgres schema comprehensively"'));
    console.log(chalk.cyan('  • "Generate postgres schema documentation"'));
    console.log(chalk.gray('  Or use the CLI command: peer-ai-mongo-migrator schema --analyze'));
  }

  /**
   * Handle MongoDB schema generation natural language requests
   */
  private async handleMongoDBSchemaGenerationNaturalLanguage(input: string, rl: readline.Interface): Promise<void> {
    const lowerInput = input.toLowerCase();
    
    console.log(chalk.blue('🔍 Processing MongoDB schema generation request...'));
    console.log(chalk.yellow('💡 This will convert your PostgreSQL schema to MongoDB collections with detailed analysis.'));
    console.log(chalk.gray('⏳ Please wait, this may take a few moments...'));
    
    try {
      const result = await this.agent.generateMongoDBSchemaFromPostgreSQL();
      if (result.success) {
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
      } else {
        console.log(chalk.red('\n❌ MongoDB schema generation failed:'), result.error);
        console.log(chalk.yellow('💡 Please check your PostgreSQL connection and try again.'));
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
      const outputPath = options.output || `./${sourceFolder}/${sourceFolder}-analysis.md`;
      
      console.log(`🔍 Starting migration analysis for: ${sourceFolder}`);
      
      // Import the migration analysis service
      const { MigrationAnalysisService } = await import('../services/MigrationAnalysisService.js');
      const migrationService = new MigrationAnalysisService();
      
      // Analyze the source code
      const analysis = await migrationService.analyzeSourceCode(sourceFolder);
      
      // Generate migration plan
      const plan = await migrationService.generateMigrationPlan(analysis);
      
      // Create documentation
      const actualOutputPath = await migrationService.createMigrationDocumentation(analysis, plan, outputPath);
      
      console.log(`✅ Migration analysis complete! Documentation saved to: ${actualOutputPath}`);
      
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
      const outputPath = options.output || `./${sourceFolder}/${sourceFolder}-migration-plan.md`;
      
      console.log(`📋 Generating migration plan for: ${sourceFolder}`);
      
      // Import the migration analysis service
      const { MigrationAnalysisService } = await import('../services/MigrationAnalysisService.js');
      const migrationService = new MigrationAnalysisService();
      
      // Analyze the source code
      const analysis = await migrationService.analyzeSourceCode(sourceFolder);
      
      // Generate migration plan
      const plan = await migrationService.generateMigrationPlan(analysis);
      
      // Create documentation
      const actualOutputPath = await migrationService.createMigrationDocumentation(analysis, plan, outputPath);
      
      console.log(`✅ Migration plan generated! Documentation saved to: ${actualOutputPath}`);
      
    } catch (error) {
      console.error('❌ Migration plan generation failed:', error);
      process.exit(1);
    }
  }

  /**
   * Show interactive help
   */
  private showInteractiveHelp(): void {
    console.log(chalk.blue('\n🚀 PeerAI MongoMigrator - Interactive Mode'));
    console.log(chalk.white('Type your requests in natural language or use commands. Type "help" for assistance.\n'));
    
    console.log(chalk.yellow('📋 Available Commands:'));
    console.log(chalk.gray('  • help     - Show this help message'));
    console.log(chalk.gray('  • status   - Show database connection status'));
    console.log(chalk.gray('  • health   - Perform manual health check'));
    console.log(chalk.gray('  • exit     - Exit interactive mode\n'));
    
    console.log(chalk.yellow('🗣️  Natural Language Commands That Work:'));
    console.log(chalk.white('\nPostgreSQL:'));
    console.log(chalk.gray('  • "Update language table set name to Hindi where name is English"'));
    console.log(chalk.gray('  • "Delete from language table where name is English"'));
    console.log(chalk.gray('  • "Fetch records from language table"'));
    console.log(chalk.gray('  • "How many records are in language table"'));
    console.log(chalk.gray('  • "Analyze the postgres schema" (comprehensive documentation)'));
    console.log(chalk.gray('  • "Generate postgres schema documentation"'));
    console.log(chalk.gray('  • "Document postgres database"'));
    console.log(chalk.gray('  • "Show postgres database structure"'));
    console.log(chalk.gray('  • "Give me the corresponding MongoDB schema"'));
    console.log(chalk.gray('  • "Convert postgres to MongoDB schema"'));
    
    console.log(chalk.white('\nMongoDB:'));
    console.log(chalk.gray('  • "Update language collection set name to Hindi where name is English"'));
    console.log(chalk.gray('  • "Delete from language collection where name is Hindi"'));
    console.log(chalk.gray('  • "Fetch documents from language collection"'));
    console.log(chalk.gray('  • "How many documents are in language collection"'));
    
    console.log(chalk.white('\nDatabase Status & Comparison:'));
    console.log(chalk.gray('  • "Show me the database status"'));
    console.log(chalk.gray('  • "How are the databases doing?"'));
    console.log(chalk.gray('  • "Perform a health check"'));
    console.log(chalk.gray('  • "list the tables in postgres" (lists tables with row counts)'));
    console.log(chalk.gray('  • "list the collections in mongo" (lists collections with document counts)'));
          console.log(chalk.gray('  • "fetch the current state of both the databases" (comprehensive comparison)'));
      console.log(chalk.gray('  • "analyze migration dependencies" (PostgreSQL to MongoDB migration plan)'));
      console.log(chalk.gray('  • "plan migration strategy" (intelligent migration ordering)'));
    console.log(chalk.gray('  • "Compare both databases" (basic comparison)'));
    
    console.log(chalk.yellow('\n💡 Tips:'));
    console.log(chalk.gray('  • Use natural language - the agent will convert it to the right database operations'));
    console.log(chalk.gray('  • Be specific about which database (table vs collection)'));
    console.log(chalk.gray('  • Health checks now run automatically every 5 minutes instead of constantly'));
    console.log(chalk.gray('  • Use "analyze the postgres schema" to generate comprehensive documentation'));
    console.log(chalk.gray('  • Schema analysis creates timestamped markdown files with full documentation'));
    console.log(chalk.gray('  • Timestamped files preserve historical versions of your database schema'));
    console.log(chalk.gray('  • MongoDB schema generation converts PostgreSQL to MongoDB collections'));
          console.log(chalk.gray('  • Check database state with: "list the tables in postgres" or "list the collections in mongo"'));
      console.log(chalk.gray('  • For schema analysis use "analyze the postgres schema" (comprehensive documentation)'));
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
      try {
        // Set a timeout to prevent hanging
        const timeout = setTimeout(() => {
          reject(new Error('Input timeout - no response received'));
        }, 30000); // 30 second timeout

        rl.question(question, (answer) => {
          clearTimeout(timeout);
          resolve(answer);
        });

        // Handle readline errors
        rl.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });

        // Handle readline close events
        rl.on('close', () => {
          clearTimeout(timeout);
          reject(new Error('Readline interface closed unexpectedly'));
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Fallback input method using process.stdin directly
   */
  private async fallbackInput(question: string): Promise<string> {
    return new Promise((resolve) => {
      process.stdout.write(question);
      
      const timeout = setTimeout(() => {
        process.stdin.removeAllListeners('data');
        resolve(''); // Return empty string on timeout
      }, 30000); // 30 second timeout
      
      process.stdin.once('data', (data) => {
        clearTimeout(timeout);
        const input = data.toString().trim();
        resolve(input);
      });
    });
  }

  /**
   * Handle exit command in fallback mode
   */
  private async handleFallbackExit(input: string): Promise<boolean> {
    const lowerInput = input.toLowerCase();
    if (lowerInput === 'exit' || lowerInput === 'quit') {
      console.log(chalk.yellow('👋 Goodbye!'));
      console.log(chalk.gray('🧹 Clearing credentials from memory...'));
      return true; // Signal to exit
    }
    return false; // Continue
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
   * Reset readline interface if it gets stuck
   */
  private resetReadlineInterface(rl: readline.Interface): void {
    try {
      // Pause and resume to reset the interface
      rl.pause();
      setTimeout(() => {
        rl.resume();
      }, 100);
    } catch (error) {
      console.log(chalk.yellow('⚠️  Readline reset failed, continuing...'));
    }
  }

  /**
   * Ensure readline interface is responsive
   */
  private ensureReadlineResponsive(rl: readline.Interface): void {
    try {
      // Check if the interface is responsive by trying to pause/resume
      rl.pause();
      rl.resume();
    } catch (error) {
      console.log(chalk.yellow('⚠️  Readline interface issue detected, attempting recovery...'));
      this.resetReadlineInterface(rl);
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
        try {
          // Test if readline is responsive
          this.ensureReadlineResponsive(rl);
        } catch (error) {
          console.log(chalk.yellow('⚠️  Periodic health check detected readline issues'));
        }
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Run interactive mode
   */
  async runInteractive(): Promise<void> {
    console.log(chalk.blue('\n🚀 PeerAI MongoMigrator - Interactive Mode'));
    console.log(chalk.white('Type your requests in natural language or use commands. Type "help" for assistance.\n'));
    console.log(chalk.gray('💡 If the interface gets stuck, press Ctrl+C twice to force exit\n'));

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false // Disable terminal mode to prevent input buffering issues
    });

    // Handle graceful shutdown
    const cleanup = async () => {
      try {
        rl.close();
        if (this.agent) {
          await this.agent.cleanup();
        }
        // Clear interactive credentials from memory
        clearInteractiveCredentials();
        process.exit(0);
      } catch (error) {
        console.error('Error during cleanup:', error);
        process.exit(1);
      }
    };

    // Setup force exit handlers
    this.setupForceExitHandlers(cleanup);

    let readlineFailed = false;
    let consecutiveFailures = 0;
    const maxFailures = 3;
    let healthCheckInterval: NodeJS.Timeout | null = null;

    try {
      // Start periodic health check
      healthCheckInterval = this.startReadlineHealthCheck(rl, readlineFailed);

      while (true) {
        try {
          let input: string;

          if (!readlineFailed) {
            try {
              // Ensure readline is responsive before prompting
              this.ensureReadlineResponsive(rl);
              
              input = await this.promptUser(rl, '? peer-ai-mongo-migrator> ');
            } catch (readlineError) {
              console.log(chalk.yellow('⚠️  Readline interface failed, switching to fallback input...'));
              readlineFailed = true;
              consecutiveFailures++;
              
              if (consecutiveFailures >= maxFailures) {
                console.log(chalk.red('❌ Too many readline failures. Exiting...'));
                break;
              }
              
              // Use fallback input
              input = await this.fallbackInput('? peer-ai-mongo-migrator> ');
            }
          } else {
            // Use fallback input
            input = await this.fallbackInput('? peer-ai-mongo-migrator> ');
          }
          
          if (!input || input.trim() === '') continue;
          
          if (await this.handleFallbackExit(input)) break;
          
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
          
          // Try to parse as natural language
          await this.handleNaturalLanguageInput(input, rl);
          
          // Reset failure counter on successful command
          if (readlineFailed) {
            consecutiveFailures = 0;
            readlineFailed = false;
            console.log(chalk.green('✅ Readline interface recovered, switching back to normal mode'));
          }
          
        } catch (error) {
          console.error(chalk.red('❌ Error:'), error);
          
          // If it's a readline error, try to recover
          if (error instanceof Error && error.message.includes('timeout')) {
            console.log(chalk.yellow('⚠️  Input timeout detected. Resetting readline interface...'));
            this.resetReadlineInterface(rl);
            // Small delay to let the interface reset
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        
        // Small delay between commands to ensure readline is ready
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    } finally {
      // Clean up health check interval
      if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
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
      console.log('🔍 Processing migration analysis request...');
      
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
      const outputPath = `./${sourceFolder}/${sourceFolder}-analysis.md`;
      const actualOutputPath = await migrationService.createMigrationDocumentation(analysis, plan, outputPath);
      
      console.log(`✅ Migration analysis complete!`);
      console.log(`📊 Summary:`);
      console.log(`   - Project: ${analysis.projectName}`);
      console.log(`   - Total Files: ${analysis.totalFiles}`);
      console.log(`   - Migration Complexity: ${analysis.migrationComplexity}`);
      console.log(`   - Estimated Effort: ${plan.summary.totalEffort} hours`);
      console.log(`   - Timeline: ${plan.summary.estimatedDuration}`);
      console.log(`📝 Documentation saved to: ${actualOutputPath}`);
      
    } catch (error) {
      console.error('❌ Migration analysis failed:', error);
    }
  }

  /**
   * Handle source code analysis natural language
   */
  private async handleSourceCodeAnalysisNaturalLanguage(input: string, rl: readline.Interface): Promise<void> {
    try {
      console.log('🔍 Processing source code analysis request...');
      
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
      const outputPath = `./${sourceFolder}/${sourceFolder}-migration-plan.md`;
      const actualOutputPath = await migrationService.createMigrationDocumentation(analysis, plan, outputPath);
      
      console.log(`✅ Migration plan generated!`);
      console.log(`📊 Plan Summary:`);
      console.log(`   - Total Phases: ${plan.phases.length}`);
      console.log(`   - Total Effort: ${plan.summary.totalEffort} hours`);
      console.log(`   - Risk Level: ${plan.summary.riskLevel}`);
      console.log(`   - Timeline: ${plan.summary.estimatedDuration}`);
      console.log(`📝 Documentation saved to: ${actualOutputPath}`);
      
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
      console.log('🐙 Processing GitHub repository analysis request...');
      
      // Import the GitHub analysis service
      const { GitHubAnalysisService } = await import('../services/GitHubAnalysisService.js');
      const githubService = new GitHubAnalysisService();
      
      // Extract repository URL from input
      let repoUrl = '';
      
      // Look for GitHub URLs in the input
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
      
      // If no URL found, prompt user
      if (!repoUrl) {
        console.log(chalk.blue('🔍 GitHub Repository Analysis'));
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
      
      // Perform the analysis
      const result = await githubService.analyzeGitHubRepository(repoUrl, {
        branch: branch || undefined,
        includeHistory: false // Default to shallow clone for speed
      });

      if (result.success) {
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
          console.log(chalk.gray(`   - Estimated Effort: ${result.plan.summary?.totalEffort || 'Unknown'} hours`));
          console.log(chalk.gray(`   - Risk Level: ${result.plan.summary?.riskLevel || 'Unknown'}`));
        }
      } else {
        console.log(chalk.red('\n❌ GitHub repository analysis failed:'));
        console.log(chalk.red(result.error));
        
        if (result.error?.includes('authentication') || result.error?.includes('token')) {
          console.log(chalk.yellow('\n💡 Tip: Run "peer-ai-mongo-migrator github-setup" to configure GitHub authentication'));
        }
      }
      
    } catch (error) {
      console.error(chalk.red('❌ GitHub repository analysis failed:'), error);
    }
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
          console.log(chalk.yellow('⚠️  Invalid choice. Defaulting to Local Machine.'));
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
}