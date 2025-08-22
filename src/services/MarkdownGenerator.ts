import fs from 'fs';
import path from 'path';
import { ComprehensivePostgreSQLSchema, ViewSchema, FunctionSchema, TriggerSchema, RelationshipSchema } from './SchemaService.js';
import { TableSchema, IndexSchema, ColumnSchema, ForeignKeySchema } from '../types/index.js';

export class MarkdownGenerator {
  private projectRoot: string;

  constructor() {
    this.projectRoot = process.cwd();
  }

  /**
   * Generate comprehensive PostgreSQL schema documentation
   */
  async generatePostgreSQLSchemaMarkdown(schema: ComprehensivePostgreSQLSchema): Promise<string> {
    try {
      console.log('📝 Generating PostgreSQL schema documentation...');
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `postgres-schema-${timestamp}.md`;
      const filepath = path.join(this.projectRoot, filename);
      
      const markdown = this.buildMarkdownContent(schema);
      
      // Write to file
      fs.writeFileSync(filepath, markdown, 'utf8');
      
      console.log(`✅ Schema documentation generated: ${filename}`);
      return filepath;
    } catch (error) {
      console.error('❌ Failed to generate schema documentation:', error);
      throw error;
    }
  }

  /**
   * Build the complete Markdown content
   */
  private buildMarkdownContent(schema: ComprehensivePostgreSQLSchema): string {
    let content = '';

    // Header
    content += this.generateHeader(schema);
    
    // Table of Contents
    content += this.generateTableOfContents(schema);
    
    // Schema Overview
    content += this.generateSchemaOverview(schema);
    
    // Tables Section
    content += this.generateTablesSection(schema.tables);
    
    // Views Section
    content += this.generateViewsSection(schema.views);
    
    // Functions Section
    content += this.generateFunctionsSection(schema.functions);
    
    // Triggers Section
    content += this.generateTriggersSection(schema.triggers);
    
    // Indexes Section
    content += this.generateIndexesSection(schema.indexes);
    
    // Relationships Section
    content += this.generateRelationshipsSection(schema.relationships);
    
    // DDL Section
    content += this.generateDDLSection(schema);
    
    // Mermaid Diagrams
    content += this.generateMermaidDiagrams(schema);
    
    // Footer
    content += this.generateFooter();

    return content;
  }

  /**
   * Generate document header
   */
  private generateHeader(schema: ComprehensivePostgreSQLSchema): string {
    return `# PostgreSQL Schema Documentation

**Generated:** ${schema.summary.lastAnalyzed.toLocaleString()}
**Database:** PostgreSQL
**Analysis Type:** Comprehensive Schema Analysis

---

`;
  }

  /**
   * Generate table of contents
   */
  private generateTableOfContents(schema: ComprehensivePostgreSQLSchema): string {
    let toc = '## 📋 Table of Contents\n\n';

    if (schema.tables.length > 0) {
      toc += '- [Tables](#tables)\n';
      schema.tables.forEach(table => {
        toc += `  - [${table.name}](#table-${table.name.toLowerCase()})\n`;
      });
    }

    if (schema.views.length > 0) {
      toc += '- [Views](#views)\n';
      schema.views.forEach(view => {
        toc += `  - [${view.name}](#view-${view.name.toLowerCase()})\n`;
      });
    }

    if (schema.functions.length > 0) {
      toc += '- [Functions](#functions)\n';
      schema.functions.forEach(func => {
        toc += `  - [${func.name}](#function-${func.name.toLowerCase()})\n`;
      });
    }

    if (schema.triggers.length > 0) {
      toc += '- [Triggers](#triggers)\n';
      schema.triggers.forEach(trigger => {
        toc += `  - [${trigger.name}](#trigger-${trigger.name.toLowerCase()})\n`;
      });
    }

    if (schema.indexes.length > 0) {
      toc += '- [Indexes](#indexes)\n';
    }

    if (schema.relationships.length > 0) {
      toc += '- [Relationships](#relationships)\n';
    }

    toc += '- [DDL Statements](#ddl-statements)\n';
    toc += '- [Database Diagrams](#database-diagrams)\n\n---\n\n';

    return toc;
  }

  /**
   * Generate schema overview
   */
  private generateSchemaOverview(schema: ComprehensivePostgreSQLSchema): string {
    return `## 🏗️ Schema Overview

This database contains a comprehensive set of database objects designed for efficient data management and application support.

### 📊 Statistics
- **Total Tables:** ${schema.summary.totalTables}
- **Total Views:** ${schema.summary.totalViews}
- **Total Functions:** ${schema.summary.totalFunctions}
- **Total Triggers:** ${schema.summary.totalTriggers}
- **Total Indexes:** ${schema.summary.totalIndexes}
- **Total Relationships:** ${schema.summary.totalRelationships}
- **Last Analyzed:** ${schema.summary.lastAnalyzed.toLocaleString()}

### 🎯 Purpose
This database appears to be designed for ${this.inferDatabasePurpose(schema)}. The schema demonstrates ${this.analyzeSchemaCharacteristics(schema)}.

---

`;
  }

  /**
   * Generate tables section
   */
  private generateTablesSection(tables: TableSchema[]): string {
    if (tables.length === 0) return '';

    let content = '## 📋 Tables\n\n';
    content += 'The following tables form the core data structure of the database:\n\n';

    tables.forEach(table => {
      content += this.generateTableDocumentation(table);
    });

    return content;
  }

  /**
   * Generate individual table documentation
   */
  private generateTableDocumentation(table: TableSchema): string {
    let content = `### Table: \`${table.name}\`\n\n`;

    // Purpose inference
    content += `**Purpose:** ${this.inferTablePurpose(table.name)}\n\n`;

    // Columns
    content += '**Columns:**\n\n';
    content += '| Column | Type | Nullable | Default | Primary | Foreign | Description |\n';
    content += '|--------|------|----------|---------|---------|---------|-------------|\n';

    table.columns.forEach((column: ColumnSchema) => {
      const primary = column.isPrimary ? '🔑' : '';
      const foreign = column.isForeign ? '🔗' : '';
      const nullable = column.nullable ? 'YES' : 'NO';
      const defaultValue = column.defaultValue || '';
      
      content += `| \`${column.name}\` | \`${column.type}\` | ${nullable} | ${defaultValue} | ${primary} | ${foreign} | ${this.inferColumnPurpose(column.name, table.name)} |\n`;
    });

    content += '\n';

    // Primary Key
    if (table.primaryKey) {
      content += `**Primary Key:** \`${table.primaryKey}\`\n\n`;
    }

    // Foreign Keys
    if (table.foreignKeys && table.foreignKeys.length > 0) {
      content += '**Foreign Keys:**\n\n';
      table.foreignKeys.forEach((fk: ForeignKeySchema) => {
        content += `- \`${fk.column}\` → \`${fk.referencedTable}.${fk.referencedColumn}\`\n`;
      });
      content += '\n';
    }

    // DDL
    content += '**DDL:**\n\n';
    content += '```sql\n';
    content += this.generateTableDDL(table);
    content += '\n```\n\n';

    content += '---\n\n';
    return content;
  }

  /**
   * Generate views section
   */
  private generateViewsSection(views: ViewSchema[]): string {
    if (views.length === 0) return '';

    let content = '## 👁️ Views\n\n';
    content += 'The following views provide simplified access to complex data relationships:\n\n';

    views.forEach(view => {
      content += `### View: \`${view.name}\`\n\n`;
      content += `**Purpose:** ${this.inferViewPurpose(view.name)}\n\n`;
      content += `**Dependencies:** ${view.dependencies.join(', ') || 'None'}\n\n`;
      
      if (view.columns.length > 0) {
        content += '**Columns:**\n\n';
        content += '| Column | Type | Nullable | Default |\n';
        content += '|--------|------|----------|---------|\n';
        view.columns.forEach((col: ColumnSchema) => {
          const nullable = col.nullable ? 'YES' : 'NO';
          const defaultValue = col.defaultValue || '';
          content += `| \`${col.name}\` | \`${col.type}\` | ${nullable} | ${defaultValue} |\n`;
        });
        content += '\n';
      }

      content += '**Definition:**\n\n';
      content += '```sql\n';
      content += view.definition;
      content += '\n```\n\n';
      content += '---\n\n';
    });

    return content;
  }

  /**
   * Generate functions section
   */
  private generateFunctionsSection(functions: FunctionSchema[]): string {
    if (functions.length === 0) return '';

    let content = '## ⚙️ Functions\n\n';
    content += 'The following functions provide business logic and data manipulation capabilities:\n\n';

    functions.forEach(func => {
      content += `### Function: \`${func.name}\`\n\n`;
      content += `**Purpose:** ${this.inferFunctionPurpose(func.name)}\n\n`;
      content += `**Return Type:** \`${func.returnType}\`\n`;
      content += `**Language:** ${func.language}\n`;
      content += `**Volatility:** ${func.volatility}\n\n`;

      if (func.parameters.length > 0) {
        content += '**Parameters:**\n\n';
        content += '| Parameter | Type | Mode | Default |\n';
        content += '|-----------|------|------|---------|\n';
        func.parameters.forEach(param => {
          const defaultValue = param.default || '';
          content += `| \`${param.name}\` | \`${param.type}\` | ${param.mode} | ${defaultValue} |\n`;
        });
        content += '\n';
      }

      content += '**Definition:**\n\n';
      content += '```sql\n';
      content += func.definition;
      content += '\n```\n\n';
      content += '---\n\n';
    });

    return content;
  }

  /**
   * Generate triggers section
   */
  private generateTriggersSection(triggers: TriggerSchema[]): string {
    if (triggers.length === 0) return '';

    let content = '## 🔔 Triggers\n\n';
    content += 'The following triggers automate data integrity and business logic:\n\n';

    triggers.forEach(trigger => {
      content += `### Trigger: \`${trigger.name}\`\n\n`;
      content += `**Table:** \`${trigger.table}\`\n`;
      content += `**Event:** ${trigger.event}\n`;
      content += `**Timing:** ${trigger.timing}\n`;
      content += `**Function:** \`${trigger.function}\`\n`;
      content += `**Purpose:** ${this.inferTriggerPurpose(trigger.name, trigger.table)}\n\n`;

      content += '**Definition:**\n\n';
      content += '```sql\n';
      content += trigger.definition;
      content += '\n```\n\n';
      content += '---\n\n';
    });

    return content;
  }

  /**
   * Generate indexes section
   */
  private generateIndexesSection(indexes: IndexSchema[]): string {
    if (indexes.length === 0) return '';

    let content = '## 🔑 Indexes\n\n';
    content += 'The following indexes optimize query performance and enforce data integrity:\n\n';

    // Group by table
    const tableIndexes = new Map<string, IndexSchema[]>();
    indexes.forEach(index => {
      const tableName = index.table || 'unknown';
      if (!tableIndexes.has(tableName)) {
        tableIndexes.set(tableName, []);
      }
      tableIndexes.get(tableName)!.push(index);
    });

    for (const [tableName, tableIndexList] of tableIndexes) {
      content += `### Table: \`${tableName}\`\n\n`;
      
      content += '| Index Name | Fields | Type | Purpose |\n';
      content += '|------------|--------|------|---------|\n';
      
      tableIndexList.forEach(index => {
        const type = this.getIndexType(index);
        const purpose = this.inferIndexPurpose(index);
        
        // Ensure fields is an array and handle it safely
        let fieldsDisplay = 'Unknown';
        if (index.fields && Array.isArray(index.fields)) {
          fieldsDisplay = index.fields.join(', ');
        } else if (index.fields && typeof index.fields === 'string') {
          fieldsDisplay = index.fields;
        } else if (index.fields && typeof index.fields === 'object') {
          // Handle PostgreSQL array types that might not be properly converted
          try {
            fieldsDisplay = JSON.stringify(index.fields);
          } catch (e) {
            fieldsDisplay = 'Complex field structure';
          }
        }
        
        content += `| \`${index.name}\` | \`${fieldsDisplay}\` | ${type} | ${purpose} |\n`;
      });
      
      content += '\n---\n\n';
    }

    return content;
  }

  /**
   * Generate relationships section
   */
  private generateRelationshipsSection(relationships: RelationshipSchema[]): string {
    if (relationships.length === 0) return '';

    let content = '## 🔗 Relationships\n\n';
    content += 'The following relationships define referential integrity between tables:\n\n';

    content += '| Source Table | Source Column | Target Table | Target Column | Delete Rule | Update Rule |\n';
    content += '|--------------|---------------|--------------|---------------|-------------|-------------|\n';

    relationships.forEach(rel => {
      content += `| \`${rel.sourceTable}\` | \`${rel.sourceColumn}\` | \`${rel.targetTable}\` | \`${rel.targetColumn}\` | ${rel.deleteRule} | ${rel.updateRule} |\n`;
    });

    content += '\n**Relationship Diagram:**\n\n';
    content += '```mermaid\nerDiagram\n';
    
    // Group by source table
    const tableRelationships = new Map<string, RelationshipSchema[]>();
    relationships.forEach(rel => {
      if (!tableRelationships.has(rel.sourceTable)) {
        tableRelationships.set(rel.sourceTable, []);
      }
      tableRelationships.get(rel.sourceTable)!.push(rel);
    });

    for (const [sourceTable, rels] of tableRelationships) {
      rels.forEach(rel => {
        content += `    ${rel.sourceTable} ||--o{ ${rel.targetTable} : "${rel.sourceColumn} -> ${rel.targetColumn}"\n`;
      });
    }

    content += '```\n\n---\n\n';
    return content;
  }

  /**
   * Generate DDL section
   */
  private generateDDLSection(schema: ComprehensivePostgreSQLSchema): string {
    let content = '## 📝 DDL Statements\n\n';
    content += 'Complete Data Definition Language statements for all database objects:\n\n';

    // Tables DDL
    if (schema.tables.length > 0) {
      content += '### Tables\n\n';
      schema.tables.forEach(table => {
        content += `#### Table: \`${table.name}\`\n\n`;
        content += '```sql\n';
        content += this.generateTableDDL(table);
        content += '\n```\n\n';
      });
    }

    // Views DDL
    if (schema.views.length > 0) {
      content += '### Views\n\n';
      schema.views.forEach(view => {
        content += `#### View: \`${view.name}\`\n\n`;
        content += '```sql\n';
        content += view.definition;
        content += '\n```\n\n';
      });
    }

    // Functions DDL
    if (schema.functions.length > 0) {
      content += '### Functions\n\n';
      schema.functions.forEach(func => {
        content += `#### Function: \`${func.name}\`\n\n`;
        content += '```sql\n';
        content += func.definition;
        content += '\n```\n\n';
      });
    }

    // Triggers DDL
    if (schema.triggers.length > 0) {
      content += '### Triggers\n\n';
      schema.triggers.forEach(trigger => {
        content += `#### Trigger: \`${trigger.name}\`\n\n`;
        content += '```sql\n';
        content += trigger.definition;
        content += '\n```\n\n';
      });
    }

    return content;
  }

  /**
   * Generate Mermaid diagrams
   */
  private generateMermaidDiagrams(schema: ComprehensivePostgreSQLSchema): string {
    let content = '## 🗺️ Database Diagrams\n\n';

    // ER Diagram
    content += '### Entity-Relationship Diagram\n\n';
    content += '```mermaid\nerDiagram\n';
    
    // Add tables as entities
    schema.tables.forEach(table => {
      content += `    ${table.name} {\n`;
      table.columns.forEach(col => {
        const primary = col.isPrimary ? ' 🔑' : '';
        const foreign = col.isForeign ? ' 🔗' : '';
        content += `        ${col.type} ${col.name}${primary}${foreign}\n`;
      });
      content += '    }\n';
    });

    // Add relationships
    schema.relationships.forEach(rel => {
      content += `    ${rel.sourceTable} ||--o{ ${rel.targetTable} : "${rel.sourceColumn} -> ${rel.targetColumn}"\n`;
    });

    content += '```\n\n';

    // Table Relationship Diagram
    content += '### Table Relationship Overview\n\n';
    content += '```mermaid\ngraph TD\n';
    
    // Create nodes for tables
    schema.tables.forEach(table => {
      content += `    ${table.name}[${table.name}]\n`;
    });

    // Create edges for relationships
    schema.relationships.forEach(rel => {
      content += `    ${rel.sourceTable} -->|FK| ${rel.targetTable}\n`;
    });

    content += '```\n\n';

    return content;
  }

  /**
   * Generate footer
   */
  private generateFooter(): string {
    return `---

## 📚 Additional Information

This documentation was automatically generated by the PeerAI MongoMigrator. For questions or updates, please refer to the database administrator or use the agent's interactive mode.

**Generated by:** PeerAI MongoMigrator v2.0
**Generation Date:** ${new Date().toLocaleString()}
`;
  }

  /**
   * Generate table DDL
   */
  private generateTableDDL(table: TableSchema): string {
    let ddl = `CREATE TABLE "${table.name}" (\n`;
    
    const columns = table.columns.map(col => {
      let colDef = `  "${col.name}" ${col.type}`;
      if (!col.nullable) colDef += ' NOT NULL';
      if (col.defaultValue !== undefined) colDef += ` DEFAULT ${col.defaultValue}`;
      return colDef;
    });

    ddl += columns.join(',\n');
    
    if (table.primaryKey) {
      ddl += `,\n  PRIMARY KEY ("${table.primaryKey}")`;
    }

    if (table.foreignKeys && table.foreignKeys.length > 0) {
      table.foreignKeys.forEach((fk: ForeignKeySchema) => {
        ddl += `,\n  CONSTRAINT "${fk.column}_fkey" FOREIGN KEY ("${fk.column}") REFERENCES "${fk.referencedTable}" ("${fk.referencedColumn}")`;
      });
    }

    ddl += '\n);';
    return ddl;
  }

  /**
   * Helper methods for inference
   */
  private inferDatabasePurpose(schema: ComprehensivePostgreSQLSchema): string {
    const tableNames = schema.tables.map(t => t.name.toLowerCase());
    
    if (tableNames.some(name => name.includes('user') || name.includes('customer'))) {
      return 'user management and customer relationship management';
    } else if (tableNames.some(name => name.includes('order') || name.includes('product'))) {
      return 'e-commerce and order management';
    } else if (tableNames.some(name => name.includes('film') || name.includes('actor'))) {
      return 'media and entertainment management';
    } else {
      return 'general business operations and data management';
    }
  }

  private analyzeSchemaCharacteristics(schema: ComprehensivePostgreSQLSchema): string {
    const characteristics = [];
    
    if (schema.relationships.length > 0) {
      characteristics.push('well-normalized structure with proper referential integrity');
    }
    if (schema.indexes.length > schema.tables.length) {
      characteristics.push('optimized for read performance with strategic indexing');
    }
    if (schema.views.length > 0) {
      characteristics.push('abstraction layers for complex data access');
    }
    if (schema.functions.length > 0) {
      characteristics.push('business logic encapsulation at the database level');
    }
    
    return characteristics.length > 0 ? characteristics.join(', ') : 'standard relational database design';
  }

  private inferTablePurpose(tableName: string): string {
    const name = tableName.toLowerCase();
    
    if (name.includes('user') || name.includes('customer')) return 'Stores user/customer information and profiles';
    if (name.includes('order') || name.includes('purchase')) return 'Manages order and transaction data';
    if (name.includes('product') || name.includes('item')) return 'Contains product catalog and inventory information';
    if (name.includes('film') || name.includes('movie')) return 'Stores media content and metadata';
    if (name.includes('actor') || name.includes('performer')) return 'Manages performer and talent information';
    if (name.includes('category') || name.includes('type')) return 'Defines classification and categorization data';
    if (name.includes('log') || name.includes('audit')) return 'Tracks system events and audit trails';
    
    return 'Stores business data and supports application functionality';
  }

  private inferColumnPurpose(columnName: string, tableName: string): string {
    const name = columnName.toLowerCase();
    const table = tableName.toLowerCase();
    
    if (name.includes('id')) return 'Unique identifier for the record';
    if (name.includes('name')) return 'Human-readable name or title';
    if (name.includes('created') || name.includes('date')) return 'Timestamp of record creation';
    if (name.includes('updated') || name.includes('modified')) return 'Timestamp of last modification';
    if (name.includes('status')) return 'Current state or condition';
    if (name.includes('type')) return 'Classification or categorization';
    if (name.includes('description')) return 'Detailed explanation or notes';
    
    return 'Business data field';
  }

  private inferViewPurpose(viewName: string): string {
    const name = viewName.toLowerCase();
    
    if (name.includes('summary') || name.includes('report')) return 'Provides aggregated or summarized data for reporting';
    if (name.includes('active') || name.includes('current')) return 'Shows only currently active or relevant records';
    if (name.includes('detail') || name.includes('full')) return 'Combines related data from multiple tables';
    
    return 'Simplifies access to complex data relationships';
  }

  private inferFunctionPurpose(functionName: string): string {
    const name = functionName.toLowerCase();
    
    if (name.includes('get') || name.includes('fetch')) return 'Retrieves data based on parameters';
    if (name.includes('insert') || name.includes('add')) return 'Creates new records';
    if (name.includes('update') || name.includes('modify')) return 'Modifies existing records';
    if (name.includes('delete') || name.includes('remove')) return 'Removes records';
    if (name.includes('validate') || name.includes('check')) return 'Performs data validation';
    if (name.includes('calculate') || name.includes('compute')) return 'Performs calculations or computations';
    
    return 'Executes business logic or data manipulation';
  }

  private inferTriggerPurpose(triggerName: string, tableName: string): string {
    const name = triggerName.toLowerCase();
    const table = tableName.toLowerCase();
    
    if (name.includes('audit') || name.includes('log')) return 'Tracks changes for audit purposes';
    if (name.includes('validate') || name.includes('check')) return 'Ensures data integrity and validation';
    if (name.includes('update') || name.includes('modify')) return 'Automatically updates related data';
    if (name.includes('notify') || name.includes('alert')) return 'Sends notifications or alerts';
    
    return 'Automates data integrity and business logic';
  }

  private getIndexType(index: IndexSchema): string {
    if (index.primary) return 'Primary Key';
    if (index.unique) return 'Unique';
    if (index.clustered) return 'Clustered';
    return 'Standard';
  }

  private inferIndexPurpose(index: IndexSchema): string {
    if (index.primary) return 'Enforces primary key constraint and optimizes joins';
    if (index.unique) return 'Ensures data uniqueness and optimizes equality searches';
    if (index.fields.length === 1) return 'Optimizes queries on single column';
    if (index.fields.length > 1) return 'Optimizes composite queries and sorting';
    return 'Improves query performance on indexed columns';
  }
}
