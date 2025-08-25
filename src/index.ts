#!/usr/bin/env node

import { CLI } from './cli/CLI.js';
import { DatabaseConfig } from './types/index.js';
import { defaultConfig } from './config/default-config.js';
import { loadConfiguration as loadConfigFromLoader, ConfigLoader } from './config/config-loader.js';
import { needsSetup, runSetup, runReconfigure } from './config/interactive-setup.js';
import { getInteractiveCredentials, clearInteractiveCredentials } from './config/interactive-credentials.js';

/**
 * Load configuration from environment variables or config file
 */
async function loadConfiguration(): Promise<DatabaseConfig> {
  try {
    // Check if interactive setup is needed
    if (needsSetup()) {
      console.log('🔐 No configuration found. Starting interactive setup...\n');
      return await runSetup();
    }
    
    return loadConfigFromLoader();
  } catch (error) {
    console.error('❌ Failed to load configuration:', error);
    console.log('💡 Please check your environment variables or create a config file');
    console.log('💡 You can create a sample config with: peer-ai-mongo-migrator --create-config');
console.log('💡 Or reconfigure with: peer-ai-mongo-migrator --reconfigure');
    process.exit(1);
    return {} as DatabaseConfig; // This will never be reached but satisfies TypeScript
  }
}

/**
 * Create sample MCP configuration file
 */
function createSampleConfig(): void {
  ConfigLoader.getInstance().createSampleConfig();
}

/**
 * Show help information
 */
function showHelp(): void {
  console.log(`
🚀 PeerAI MongoMigrator v2.0

Enhanced TypeScript-based agent for MongoDB migration operations, schema management, 
real-time monitoring, and advanced database orchestration through MCP.

USAGE:
  peer-ai-mongo-migrator [command] [options]

COMMANDS:
  query                    Execute database queries
  cross-query             Execute cross-database queries with advanced join strategies
  schema                  Schema operations (introspect, generate, validate, compare)
  migrate                 Migrate data between databases (ON-DEMAND only)
  status                  Show database connection status and health
  manage                  Database management operations (backup, restore, optimize)
  interactive             Start interactive CLI mode with human language support
  help                    Show this help message

EXAMPLES:
  # Execute PostgreSQL query
  peer-ai-mongo-migrator query --postgres "SELECT * FROM actor LIMIT 5"

  # Execute MongoDB operation
  peer-ai-mongo-migrator query --mongo find --database default --collection actor

  # Cross-database query with INNER JOIN
  peer-ai-mongo-migrator cross-query --postgres "SELECT * FROM actor LIMIT 5" --mongo '{}' --database default --collection actor --join-strategy inner --join-key actor_id

  # Show PostgreSQL schema
  peer-ai-mongo-migrator schema --postgres

  # Compare schemas between databases
  peer-ai-mongo-migrator schema --compare --database default

  # Validate PostgreSQL schema
  peer-ai-mongo-migrator schema --validate

  # Analyze PostgreSQL schema comprehensively and generate documentation
  peer-ai-mongo-migrator schema --analyze

  # Generate ER diagrams in multiple formats
  peer-ai-mongo-migrator er-diagram --format mermaid --style detailed
  peer-ai-mongo-migrator er-diagram --format plantuml --output ./diagrams
  peer-ai-mongo-migrator er-diagram --documentation

  # Enhanced schema analysis with business context (NEW!)
  peer-ai-mongo-migrator schema --analyze --business-context

  # Migrate data (ON-DEMAND only)
  peer-ai-mongo-migrator migrate --source actor --target actors --batch-size 100 --validate

  # Check database health
  peer-ai-mongo-migrator status --health

  # Show performance metrics
  peer-ai-mongo-migrator status --metrics

  # Interactive mode with human language
  peer-ai-mongo-migrator interactive

CONFIGURATION:
  The agent uses MCP (Model Context Protocol) tools and can be configured via:
  1. MCP server configurations
  2. Configuration file (mcp-config.json)
  3. Environment variables for MCP server settings

  Create a sample config: peer-ai-mongo-migrator --create-config
  Reconfigure credentials: peer-ai-mongo-migrator --reconfigure

ENVIRONMENT VARIABLES:
  POSTGRES_HOST          PostgreSQL MCP server host (default: localhost)
  POSTGRES_PORT          PostgreSQL MCP server port (default: 5432)
  POSTGRES_DB            PostgreSQL database name for MCP operations
  POSTGRES_USER          PostgreSQL username for MCP server
  POSTGRES_PASSWORD      PostgreSQL password for MCP server
  MONGO_CONNECTION_STRING MongoDB MCP server connection string
  MONGO_DB               MongoDB database name for MCP operations
  MCP_CONFIG_PATH        Path to MCP configuration file

HUMAN LANGUAGE INTERACTION:
  The agent supports natural language interaction in interactive mode:
  
  • "Update language table set name to Hindi where name is English"
  • "Delete from language table where name is English"
  • "Fetch records from language table"
  • "How many records are in language table"
  • "Update language collection set name to Hindi where name is English"
  • "Delete from language collection where name is Hindi"
  • "Fetch documents from language collection"
  • "How many documents are in language collection"
  • "Show me the database status"
  • "How are the databases doing?"
  • "list the tables in postgres" (lists tables and row counts)
  • "list the collections in mongo" (lists collections and document counts)
  • "generate ER diagram for my postgres schema" (creates comprehensive ER diagrams)
  • "show me the database relationships" (displays entity-relationship diagrams)
  • "create database diagram in plantuml format" (generates PlantUML ER diagrams)

NOTE: "list the tables in postgres" = quick overview, "analyze the postgres schema" = comprehensive documentation

MCP TOOLS SUPPORTED:
  PostgreSQL: read_query, write_query, list_tables, describe_table, create_table, alter_table, drop_table, export_query
  MongoDB: connect, list-databases, list-collections, find, insert-many, update-many, delete-many, count, aggregate, create-collection, drop-collection, create-index, collection-schema, explain

ER DIAGRAM FEATURES:
  🗺️ Multiple Formats: Mermaid, PlantUML, DBML, JSON
  🎨 Customizable Styles: Detailed, Simplified, Minimal
  📊 Comprehensive: Tables, Relationships, Indexes, Constraints
  🔗 Interactive: Clickable diagrams with relationship details
  📚 Documentation: Complete ER diagram documentation with usage instructions

NEW: RELATIONSHIP BEYOND DDL FEATURES:
  🧠 Semantic Relationships: Business context and purpose of table relationships
  🌊 Data Flow Patterns: How data moves through business workflows
  🏢 Business Processes: Operational processes supported by the database
  📋 Business Rules: Governance rules and data integrity constraints
  📊 Impact Matrix: Risk assessment and business criticality analysis

FEATURES:
  ✅ Complete MCP Integration with real tool calls
  ✅ Core CRUD operations: UPDATE, DELETE, FETCH, COUNT
  ✅ Support for both PostgreSQL and MongoDB
  ✅ Human language interaction capabilities
  ✅ Database state monitoring and comparison
  ✅ Comprehensive schema analysis and documentation
  ✅ Enhanced Entity-Relationship (ER) diagram generation
  ✅ Multiple diagram formats: Mermaid, PlantUML, DBML, JSON
  ✅ Interactive ER diagram documentation
  ✅ Simplified and focused functionality
  ✅ Health monitoring (every 5 minutes instead of constantly)

For more information, visit: https://github.com/your-repo/mcp-database-agent
`);
}

/**
 * Main application entry point
 */
async function main(): Promise<void> {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    
    // Handle special flags
    if (args.includes('--help') || args.includes('-h')) {
      showHelp();
      return;
    }

    if (args.includes('--create-config')) {
      createSampleConfig();
      return;
    }

    if (args.includes('--reconfigure')) {
      console.log('🔄 Reconfiguring database credentials...\n');
      const config = await runReconfigure();
      console.log('✅ Reconfiguration complete! You can now run the agent normally.');
      return;
    }

    if (args.includes('--version') || args.includes('-v')) {
      console.log('PeerAI MongoMigrator v2.0.0');
      return;
    }

    let config: DatabaseConfig;

    // Check if this is interactive mode
    if (args.includes('interactive')) {
      // Use interactive credentials for interactive mode
      config = await getInteractiveCredentials();
    } else {
      // Use regular configuration loading for other commands
      config = await loadConfiguration();
    }
    
    // Initialize CLI
    const cli = new CLI();
    await cli.initialize(config);
    
    // Run CLI with arguments
    await cli.run(process.argv);
    
  } catch (error) {
    console.error('❌ Application failed to start:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n👋 Shutting down MCP Agent...');
  try {
    // Clear interactive credentials from memory
    clearInteractiveCredentials();
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('\n👋 Shutting down MCP Agent...');
  try {
    // Clear interactive credentials from memory
    clearInteractiveCredentials();
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

// Start the application
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
  });
}
