# PeerAI MongoMigrator - User Command Flow Guide

## Overview

The PeerAI MongoMigrator is a powerful TypeScript-based tool that orchestrates PostgreSQL and MongoDB operations through MCP (Model Context Protocol) tools. This document explains the complete flow of various user commands, from initial setup to complex database operations.

## Table of Contents

1. [Initial Setup & Credentials](#initial-setup--credentials)
2. [Schema Analysis Commands](#schema-analysis-commands)
3. [MongoDB Schema Generation](#mongodb-schema-generation)
4. [Migration Analysis](#migration-analysis)
5. [Core CRUD Operations](#core-crud-operations)
6. [Database State Queries](#database-state-queries)
7. [Migration Planning](#migration-planning)

---

## Initial Setup & Credentials

### When the Agent Starts

When you run `npm run dev` or `peer-ai-mongo-migrator interactive`, the agent follows this flow:

1. **Configuration Check**
   ```bash
   🔐 No configuration found. Starting interactive setup...
   ```

2. **Interactive Credential Setup**
   - The agent checks for existing configuration files
   - If none found, it prompts for database credentials interactively
   - Credentials are stored securely in memory (not persisted to disk)

3. **Database Connection Establishment**
   - PostgreSQL connection via MCP tools
   - MongoDB connection via MCP tools
   - Health checks performed automatically

4. **Interactive CLI Ready**
   ```bash
   🚀 PeerAI MongoMigrator - Interactive Mode
   Type your requests in natural language or use commands. Type "help" for assistance.
   
   ? peer-ai-mongo-migrator>
   ```

---

## Schema Analysis Commands

### 1. "analyze the postgres schema"

**Flow:**
```
User Input → Natural Language Processing → Schema Analysis → Documentation Generation → File Output
```

**Detailed Steps:**

1. **Command Detection**
   ```typescript
   // CLI detects the natural language pattern
   if (lowerInput.includes('analyze') && lowerInput.includes('postgres') && lowerInput.includes('schema')) {
     await this.handleSchemaAnalysisNaturalLanguage(input, rl);
     return;
   }
   ```

2. **User Feedback**
   ```bash
   🔍 Processing comprehensive PostgreSQL schema analysis request...
   💡 This will analyze your entire PostgreSQL database and generate detailed documentation.
   ⏳ Please wait, this may take a few moments...
   ```

3. **MCP Agent Coordination**
   ```typescript
   // MCPAgent.analyzePostgreSQLSchema()
   const schema = await this.schemaService.getComprehensivePostgreSQLSchema();
   const filepath = await this.markdownGenerator.generatePostgreSQLSchemaMarkdown(schema);
   ```

4. **Schema Data Extraction** (via MCP tools)
   - Tables: `mcp_postgresql_read_query` for table metadata
   - Views: `mcp_postgresql_read_query` for view definitions
   - Functions: `mcp_postgresql_read_query` for function details
   - Triggers: `mcp_postgresql_read_query` for trigger information
   - Indexes: `mcp_postgresql_read_query` for index details
   - Relationships: `mcp_postgresql_read_query` for foreign key constraints

5. **Documentation Generation**
   - Creates timestamped markdown file (e.g., `postgres-schema-2025-01-20T10-30-00.md`)
   - Includes Mermaid diagrams for visual representation
   - Contains complete DDL statements
   - Provides relationship mapping

6. **Success Output**
   ```bash
   🎉 PostgreSQL Schema Analysis Completed Successfully!
   📁 Documentation file: ./postgres-schema-2025-01-20T10-30-00.md
   
   📊 Analysis Summary:
     • Tables: 15
     • Views: 3
     • Functions: 8
     • Triggers: 5
     • Indexes: 25
     • Relationships: 12
     • Last Analyzed: 1/20/2025, 10:30:00 AM
   ```

---

## MongoDB Schema Generation

### 2. "Give me the corresponding MongoDB schema"

**Flow:**
```
User Input → Pattern Matching → PostgreSQL Schema Retrieval → MongoDB Conversion → Documentation
```

**Detailed Steps:**

1. **Command Detection**
   ```typescript
   if (this.matchesPattern(lowerInput, ['mongodb', 'mongo', 'corresponding', 'equivalent', 'convert', 'generate'])) {
     if (this.matchesPattern(lowerInput, ['schema', 'postgres', 'postgresql', 'sql'])) {
       await this.handleMongoDBSchemaGenerationNaturalLanguage(input, rl);
       return;
     }
   }
   ```

2. **User Feedback**
   ```bash
   🔍 Processing MongoDB schema generation request...
   💡 This will convert your PostgreSQL schema to MongoDB collections with detailed analysis.
   ⏳ Please wait, this may take a few moments...
   ```

3. **PostgreSQL Schema Retrieval**
   - First checks for recent schema analysis files (within 24 hours)
   - If none found, generates new PostgreSQL schema analysis
   - Uses existing analysis if available to avoid duplication

4. **MongoDB Schema Conversion**
   ```typescript
   // MongoDBSchemaGenerator.generateMongoDBSchemaFromPostgreSQL()
   const conversionResult = await this.mongoDBSchemaGenerator.generateMongoDBSchemaFromPostgreSQL(
     postgresSchema.tables
   );
   ```

5. **Conversion Process**
   - Maps PostgreSQL data types to MongoDB types
   - Converts table relationships to embedded documents or references
   - Generates indexing recommendations
   - Creates performance optimization suggestions

6. **Documentation Output**
   ```bash
   🎉 MongoDB Schema Generation Completed Successfully!
   📁 Documentation file: ./mongodb-schema-2025-01-20T10-35-00.md
   
   📊 PostgreSQL Source:
     • Source: Generated from live PostgreSQL database
     • Total Tables: 15
   
   🍃 MongoDB Schema:
     • Total Collections: 15
   
   🔍 Compatibility Report:
     • Compatible Tables: 12
     • Incompatible Tables: 3
     • Type Mappings: 8
     • Relationship Strategies: 5
   ```

---

## Migration Analysis

### 3. "I want to migrate to MongoDB and Node.js architecture, what all changes to be made in the configurations"

**Flow:**
```
User Input → Source Location Detection → Source Code Analysis → Migration Plan Generation → Documentation
```

**Detailed Steps:**

1. **Command Detection**
   ```typescript
   if (this.matchesPattern(lowerInput, ['migrate', 'migration', 'spring boot', 'node.js', 'nodejs'])) {
     if (this.matchesPattern(lowerInput, ['mongodb', 'mongo', 'node.js', 'nodejs', 'spring boot', 'postgresql', 'postgres'])) {
       const { sourceLocation } = await this.promptForSourceLocation(rl);
       
       if (sourceLocation === 'github') {
         await this.handleGitHubAnalysisNaturalLanguage(input, rl);
       } else {
         await this.handleMigrationAnalysisNaturalLanguage(input, rl);
       }
     }
   }
   ```

2. **Source Location Prompt**
   ```bash
   📍 Where is your source code located?
   1. GitHub repository
   2. Local machine (source-code-* folders)
   
   ? Your choice: 2
   ```

3. **Source Code Analysis** (Local Machine Path)
   ```bash
   🔍 Processing migration analysis request...
   📁 Analyzing source code in: source-code-1
   ```

4. **Analysis Process**
   ```typescript
   // MigrationAnalysisService.analyzeSourceCode()
   const analysis = await migrationService.analyzeSourceCode(sourceFolder);
   const plan = await migrationService.generateMigrationPlan(analysis);
   ```

5. **Analysis Components**
   - **Project Structure**: Identifies Spring Boot components
   - **Database Dependencies**: Maps JPA entities and repositories
   - **Configuration Files**: Analyzes application.properties/yml
   - **Dependencies**: Reviews pom.xml or build.gradle
   - **Business Logic**: Examines service and controller layers

6. **Migration Plan Generation**
   ```bash
   ✅ Migration analysis complete!
   📊 Summary:
      - Project: Spring Boot Application
      - Total Files: 45
      - Migration Complexity: Medium
      - Estimated Effort: 24 hours
      - Timeline: 3-4 weeks
   📝 Documentation saved to: ./source-code-1/source-code-1-analysis.md
   ```

---

## Core CRUD Operations

### PostgreSQL Operations

#### FETCH: "Fetch records from language table"

**Flow:**
```
User Input → Pattern Matching → SQL Generation → MCP Tool Execution → Result Display
```

**Detailed Steps:**

1. **Command Detection**
   ```typescript
   if (this.matchesPattern(lowerInput, ['fetch', 'get', 'retrieve', 'show', 'display'])) {
     await this.handlePostgreSQLFetch(input, rl);
     return;
   }
   ```

2. **Table Name Extraction**
   ```typescript
   const tableMatch = input.match(/(?:from|in)\s+(\w+)\s+(?:table|tables?)/i);
   const tableName = tableMatch[1]; // "language"
   ```

3. **SQL Generation & Execution**
   ```bash
   📊 Fetching records from language table...
   💡 Fetching first 10 records (use "LIMIT X" in your request for more)
   Using MCP Tool: mcp_postgresql_read_query
   ```

4. **MCP Tool Call**
   ```typescript
   const result = await this.agent.executePostgreSQLQuery(`SELECT * FROM ${tableName} LIMIT 10`);
   ```

5. **Result Display**
   ```bash
   ✅ Found 6 records from language table:
   [
     {
       "language_id": 1,
       "name": "English",
       "last_update": "2025-01-20T10:00:00.000Z"
     },
     // ... more records
   ]
   ```

#### COUNT: "How many records are in language table"

**Flow:**
```
User Input → Pattern Matching → COUNT Query → MCP Tool Execution → Result Display
```

**Detailed Steps:**

1. **Command Detection**
   ```typescript
   if (this.matchesPattern(lowerInput, ['how many', 'count'])) {
     await this.handlePostgreSQLCount(input, rl);
     return;
   }
   ```

2. **Table Name Extraction**
   ```typescript
   const tableMatch = input.match(/(?:in|from|of)\s+(\w+)/i);
   const tableName = tableMatch[1]; // "language"
   ```

3. **COUNT Query Execution**
   ```bash
   🔢 Counting records in language table...
   Using MCP Tool: mcp_postgresql_read_query
   ```

4. **MCP Tool Call**
   ```typescript
   const result = await this.agent.executePostgreSQLQuery(`SELECT COUNT(*) as count FROM ${tableName}`);
   ```

5. **Result Display**
   ```bash
   ✅ language table has 6 records
   ```

### MongoDB Operations

#### FETCH: "Fetch documents from language collection"

**Flow:**
```
User Input → Pattern Matching → MongoDB Operation → MCP Tool Execution → Result Display
```

**Detailed Steps:**

1. **Command Detection**
   ```typescript
   if (this.matchesPattern(lowerInput, ['fetch', 'get', 'retrieve', 'show', 'display'])) {
     await this.handleMongoDBFetch(input, rl);
     return;
   }
   ```

2. **Collection Name Extraction**
   ```typescript
   const collectionMatch = input.match(/(?:from|in)\s+(\w+)\s+(?:collection|collections?)/i);
   const collectionName = collectionMatch[1]; // "language"
   ```

3. **MongoDB Operation Execution**
   ```bash
   📊 Fetching documents from language collection...
   💡 Fetching first 10 documents (use "LIMIT X" in your request for more)
   Using MCP Tool: mcp_MongoDB_find
   ```

4. **MCP Tool Call**
   ```typescript
   const result = await this.agent.executeMongoDBOperation('find', 'dvdrental', collectionName, {});
   ```

5. **Result Display**
   ```bash
   ✅ Found 6 documents from language collection:
   [
     {
       "_id": ObjectId("..."),
       "language_id": 1,
       "name": "English",
       "last_update": ISODate("2025-01-20T10:00:00.000Z")
     },
     // ... more documents
   ]
   ```

#### COUNT: "How many documents are in language collection"

**Flow:**
```
User Input → Pattern Matching → MongoDB COUNT → MCP Tool Execution → Result Display
```

**Detailed Steps:**

1. **Command Detection**
   ```typescript
   if (this.matchesPattern(lowerInput, ['how many', 'count'])) {
     await this.handleMongoDBCount(input, rl);
     return;
   }
   ```

2. **Collection Name Extraction**
   ```typescript
   const collectionMatch = input.match(/(?:in|from|of)\s+(\w+)/i);
   const collectionName = collectionMatch[1]; // "language"
   ```

3. **MongoDB COUNT Operation**
   ```bash
   🔢 Counting documents in language collection...
   Using MCP Tool: mcp_MongoDB_count
   ```

4. **MCP Tool Call**
   ```typescript
   const result = await this.agent.executeMongoDBOperation('count', 'dvdrental', collectionName, {});
   ```

5. **Result Display**
   ```bash
   ✅ language collection has 6 documents
   ```

---

## Database State Queries

### "list the tables in postgres"

**Flow:**
```
User Input → Exact Pattern Match → PostgreSQL Table Listing → MCP Tool Execution → Result Display
```

**Detailed Steps:**

1. **Command Detection**
   ```typescript
   if (lowerInput === 'list the tables in postgres' || lowerInput === 'list the tables in postgresql') {
     await this.handlePostgreSQLStateRequest(rl);
     return;
   }
   ```

2. **MCP Tool Execution**
   ```bash
   🐘 Fetching PostgreSQL tables...
   Using MCP Tool: mcp_postgresql_read_query
   ```

3. **SQL Query**
   ```typescript
   const tablesResult = await this.agent.executePostgreSQLQuery(
     "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"
   );
   ```

4. **Result Display**
   ```bash
   📊 PostgreSQL Tables:
   Total Tables: 15
     actor
     address
     category
     city
     country
     customer
     film
     film_actor
     film_category
     inventory
     language
     payment
     rental
     staff
     store
   ```

### "list the collections in mongo"

**Flow:**
```
User Input → Exact Pattern Match → MongoDB Collection Listing → MCP Tool Execution → Result Display
```

**Detailed Steps:**

1. **Command Detection**
   ```typescript
   if (lowerInput === 'list the collections in mongo' || lowerInput === 'list the collections in mongodb') {
     await this.handleMongoDBStateRequest(rl);
     return;
   }
   ```

2. **MCP Tool Execution**
   ```bash
   🍃 Fetching MongoDB collections...
   Using MCP Tool: mcp_MongoDB_list-collections
   ```

3. **MongoDB Operation**
   ```typescript
   const collections = await this.agent.listMongoDBCollections('dvdrental');
   ```

4. **Result Display**
   ```bash
   📊 MongoDB Collections:
   Total Collections: 8
     actor
     address
     category
     city
     country
     customer
     film
     language
   ```

---

## Data Migration Execution

### "migrate data from postgres to mongo"

**Flow:**
```
User Input → Safety Warning → CLI Command Guidance → Manual Execution → Results Display
```

**Important Note:** The agent follows a **safety-first approach** and does NOT perform automatic migrations. Instead, it provides guidance and CLI commands for safe, controlled execution.

**Detailed Steps:**

1. **Command Detection**
   ```typescript
   if (this.matchesPattern(lowerInput, ['migrate', 'migration', 'postgres to mongo', 'postgresql to mongodb', 'transfer data'])) {
     await this.handleMigrationNaturalLanguage(input, rl);
     return;
   }
   ```

2. **Safety Warning & User Education**
   ```bash
   🔄 Processing migration request...
   ⚠️  Migration is ON-DEMAND only and requires explicit user confirmation
     I cannot perform migrations automatically for safety reasons.
   ```

3. **Specific Table Guidance** (if mentioned)
   ```bash
   💡 To migrate actor table, use:
  peer-ai-mongo-migrator migrate --source actor --target actors --batch-size 100 --validate
   ```

4. **CLI Command Instructions**
   ```bash
   💡 Migration commands:
     peer-ai-mongo-migrator migrate --source <table> --target <collection> --batch-size <size> --validate
   
   📋 Parameters:
     • --source: PostgreSQL table name
     • --target: MongoDB collection name  
     • --batch-size: Number of records to process at once
     • --validate: Verify data integrity after migration
   ```

5. **Manual CLI Execution** (User runs the command)
   ```bash
   $ peer-ai-mongo-migrator migrate --source language --target languages --batch-size 100 --validate
   ```

6. **Migration Execution via CLI**
   ```typescript
   // CLI.handleMigration() method
   private async handleMigration(options: any): Promise<void> {
     const migrationOptions = {
       sourceTable: options.source,        // "language"
       targetCollection: options.target,   // "languages"
       batchSize: parseInt(options.batchSize), // 100
       transformRules: options.rules ? JSON.parse(options.rules) : undefined,
       validateData: options.validate || false // true
     };

     const result = await this.agent.migrateData(migrationOptions);
   }
   ```

7. **MCP Agent Migration Processing**
   ```typescript
   // MCPAgent.migrateData()
   async migrateData(options: MigrationOptions): Promise<QueryResult> {
     // Step 1: Get data from PostgreSQL via MCP tools
     const postgresData = await this.fetchPostgreSQLData(postgresService, options.sourceTable);
     
     // Step 2: Transform data for MongoDB
     const transformedData = this.transformDataForMongoDB(postgresData.data, options.transformRules);
     
     // Step 3: Insert data into MongoDB via MCP tools
     const mongoResult = await this.insertMongoDBData(mongoService, options.targetCollection, transformedData);
     
     // Step 4: Validate migration if requested
     if (options.validateData) {
       const validationResult = await this.validateMigration(postgresService, mongoService, options.sourceTable, options.targetCollection);
     }
   }
   ```

8. **Results Display**
   ```bash
   ✅ Migration completed successfully
   
   📊 Migration Results:
   ✅ Migrated records: 6
   ⏱️  Duration: 245ms
   
   ⚠️  Errors encountered: 0
   ```

### **Why This Safety-First Approach?**

1. **Data Protection**: Prevents accidental data loss or corruption
2. **User Control**: User explicitly chooses what, when, and how to migrate
3. **Audit Trail**: Clear CLI commands provide migration history
4. **Error Prevention**: Reduces risk of unintended operations
5. **Compliance**: Meets enterprise security requirements

### **Migration Workflow Example**

**User Request:** "I want to migrate the language table to MongoDB"

**Agent Response:**
```bash
🔄 Processing migration request...
⚠️  Migration is ON-DEMAND only and requires explicit user confirmation
  I cannot perform migrations automatically for safety reasons.

💡 To migrate language table, use:
  peer-ai-mongo-migrator migrate --source language --target languages --batch-size 100 --validate

💡 Migration commands:
  peer-ai-mongo-migrator migrate --source <table> --target <collection> --batch-size <size> --validate

📋 Parameters:
  • --source: PostgreSQL table name
  • --target: MongoDB collection name  
  • --batch-size: Number of records to process at once
  • --validate: Verify data integrity after migration
```

**User Action:** Runs the CLI command
```bash
$ peer-ai-mongo-migrator migrate --source language --target languages --batch-size 100 --validate
```

**Result:** Safe, controlled migration with validation

### **Available Migration Options**

1. **Single Table Migration**
   ```bash
   peer-ai-mongo-migrator migrate --source actor --target actors --batch-size 100 --validate
   ```

2. **Custom Batch Size**
   ```bash
   peer-ai-mongo-migrator migrate --source film --target films --batch-size 500 --validate
   ```

3. **With Transform Rules**
   ```bash
   peer-ai-mongo-migrator migrate --source customer --target customers --batch-size 200 --rules '{"transform": "custom"}' --validate
   ```

4. **Without Validation** (faster but less safe)
   ```bash
   peer-ai-mongo-migrator migrate --source category --target categories --batch-size 50
   ```

### **Migration Safety Features**

1. **Batch Processing**: Processes records in manageable chunks
2. **Data Validation**: Verifies data integrity after migration
3. **Error Handling**: Graceful handling of migration failures
4. **Progress Tracking**: Real-time migration status updates
5. **Rollback Support**: Ability to revert changes if needed

---

## MCP Tool Integration

### How MCP Tools Are Used

The agent uses MCP tools instead of direct database connections:

**PostgreSQL Operations:**
- `mcp_postgresql_read_query` - SELECT operations
- `mcp_postgresql_write_query` - INSERT, UPDATE, DELETE operations
- `mcp_postgresql_list_tables` - Table listing
- `mcp_postgresql_describe_table` - Table structure details

**MongoDB Operations:**
- `mcp_MongoDB_find` - Document queries
- `mcp_MongoDB_count` - Document counting
- `mcp_MongoDB_update-many` - Document updates
- `mcp_MongoDB_delete-many` - Document deletion
- `mcp_MongoDB_list-collections` - Collection listing

### Benefits of MCP Integration

1. **Security**: No direct database credentials in application code
2. **Flexibility**: Easy to switch between different database providers
3. **Standardization**: Consistent interface across different database types
4. **Monitoring**: Built-in health checks and performance metrics
5. **Scalability**: Easy to add new database types or operations

---

## Error Handling & Recovery

### Common Error Scenarios

1. **Database Connection Issues**
   ```bash
   ❌ PostgreSQL is not connected. Please check your connection settings.
   💡 Try: "Show me the database status" to check connections
   ```

2. **Invalid Table/Collection Names**
   ```bash
   ❌ Table 'invalid_table' does not exist
   💡 Try: "list the tables in postgres" to see available tables
   ```

3. **Permission Issues**
   ```bash
   ❌ Permission denied for table 'restricted_table'
   💡 Check your database user permissions
   ```

4. **Query Syntax Errors**
   ```bash
   ❌ Syntax error in SQL query
   💡 Use natural language: "Fetch records from actor table"
   ```

### Recovery Mechanisms

1. **Automatic Health Checks**: Every 5 minutes
2. **Connection Retry**: Automatic reconnection attempts
3. **Fallback Input**: Readline interface recovery
4. **Graceful Degradation**: Partial results when possible

---

## Best Practices

### For Users

1. **Use Natural Language**: The agent understands human language better than technical commands
2. **Be Specific**: Mention the database type (table vs collection)
3. **Check Status**: Use "Show me the database status" to verify connections
4. **Use Help**: Type "help" anytime to see available commands

### For Developers

1. **MCP First**: Always use MCP tools instead of direct database connections
2. **Error Handling**: Implement comprehensive error handling with user-friendly messages
3. **Progress Feedback**: Show real-time progress for long-running operations
4. **Documentation**: Generate timestamped documentation files for reproducibility

---

## Troubleshooting

### Common Issues

1. **Agent Won't Start**
   - Check Node.js version (requires 18+)
   - Verify package dependencies are installed
   - Check environment variables

2. **Database Connection Fails**
   - Verify MCP server configurations
   - Check network connectivity
   - Validate credentials

3. **Commands Not Recognized**
   - Use natural language instead of technical terms
   - Check the help menu for supported commands
   - Ensure you're in interactive mode

4. **Schema Analysis Fails**
   - Verify PostgreSQL connection
   - Check user permissions
   - Ensure database has tables

### Getting Help

1. **Interactive Help**: Type `help` in the CLI
2. **Command Examples**: See the help menu for examples
3. **Error Messages**: Read error messages carefully for guidance
4. **Status Check**: Use "Show me the database status" to diagnose issues

---

## Conclusion

The PeerAI MongoMigrator provides a powerful, user-friendly interface for database operations through natural language commands. By leveraging MCP tools, it maintains security while providing flexibility and standardization across different database types.

The flow from credentials setup to complex operations like migration analysis demonstrates the agent's comprehensive capabilities and user-centric design. Whether you're performing simple CRUD operations or planning complex database migrations, the agent guides you through each step with clear feedback and detailed documentation.
