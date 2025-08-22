import fs from 'fs';
import path from 'path';
import { TableSchema, ColumnSchema, ForeignKeySchema } from '../types/index.js';

export interface ParsedPostgreSQLSchema {
  tables: TableSchema[];
  views: any[];
  functions: any[];
  triggers: any[];
  indexes: any[];
  relationships: any[];
  summary: any;
  filepath: string;
  lastModified: Date;
}

export class PostgreSQLSchemaFileParser {
  private projectRoot: string;

  constructor() {
    this.projectRoot = process.cwd();
  }

  /**
   * Find the latest PostgreSQL schema markdown file
   */
  findLatestPostgreSQLSchemaFile(): string | null {
    try {
      const files = fs.readdirSync(this.projectRoot);
      
      // Filter for PostgreSQL schema files
      const schemaFiles = files.filter(file => 
        file.startsWith('postgres-schema-') && file.endsWith('.md')
      );
      
      if (schemaFiles.length === 0) {
        return null;
      }
      
      // Sort by creation time (newest first)
      const sortedFiles = schemaFiles.sort((a, b) => {
        const statsA = fs.statSync(path.join(this.projectRoot, a));
        const statsB = fs.statSync(path.join(this.projectRoot, b));
        return statsB.birthtime.getTime() - statsA.birthtime.getTime();
      });
      
      return sortedFiles[0];
    } catch (error) {
      console.error('Error finding PostgreSQL schema files:', error);
      return null;
    }
  }

  /**
   * Parse a PostgreSQL schema markdown file
   */
  async parsePostgreSQLSchemaFile(filepath: string): Promise<ParsedPostgreSQLSchema> {
    try {
      console.log(`📖 Parsing PostgreSQL schema file: ${filepath}`);
      
      const fullPath = path.join(this.projectRoot, filepath);
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Extract schema information from markdown content
      const tables = this.extractTablesFromMarkdown(content);
      const views = this.extractViewsFromMarkdown(content);
      const functions = this.extractFunctionsFromMarkdown(content);
      const triggers = this.extractTriggersFromMarkdown(content);
      const indexes = this.extractIndexesFromMarkdown(content);
      const relationships = this.extractRelationshipsFromMarkdown(content);
      const summary = this.extractSummaryFromMarkdown(content);
      
      const stats = fs.statSync(fullPath);
      
      console.log(`✅ Successfully parsed ${tables.length} tables from schema file`);
      
      return {
        tables,
        views,
        functions,
        triggers,
        indexes,
        relationships,
        summary,
        filepath,
        lastModified: stats.mtime
      };
    } catch (error) {
      console.error('Error parsing PostgreSQL schema file:', error);
      throw error;
    }
  }

  /**
   * Extract table information from markdown content
   */
  private extractTablesFromMarkdown(content: string): TableSchema[] {
    const tables: TableSchema[] = [];
    const seenTables = new Set<string>();
    
    // Split content into sections
    const sections = content.split('### Table: `');
    
    for (let i = 1; i < sections.length; i++) {
      const section = sections[i];
      
      try {
        const table = this.parseTableSection(section);
        if (table && !seenTables.has(table.name)) {
          tables.push(table);
          seenTables.add(table.name);
        }
      } catch (error) {
        console.warn(`Warning: Could not parse table section ${i}:`, error);
      }
    }
    
    // If we still have duplicates, also check for #### Table: sections
    const subSections = content.split('#### Table: `');
    for (let i = 1; i < subSections.length; i++) {
      const section = subSections[i];
      
      try {
        const table = this.parseTableSection(section);
        if (table && !seenTables.has(table.name)) {
          tables.push(table);
          seenTables.add(table.name);
        }
      } catch (error) {
        console.warn(`Warning: Could not parse sub-table section ${i}:`, error);
      }
    }
    
    console.log(`📊 Parsed ${tables.length} unique tables from markdown (deduplicated)`);
    return tables;
  }

  /**
   * Parse a single table section from markdown
   */
  private parseTableSection(section: string): TableSchema | null {
    try {
      // Extract table name
      const nameMatch = section.match(/^([^`]+)`/);
      if (!nameMatch) return null;
      
      const tableName = nameMatch[1].trim();
      
      // Extract columns
      const columns = this.extractColumnsFromSection(section);
      
      // Extract primary key
      const primaryKey = this.extractPrimaryKeyFromSection(section);
      
      // Extract foreign keys
      const foreignKeys = this.extractForeignKeysFromSection(section);
      
      return {
        name: tableName,
        columns,
        primaryKey,
        foreignKeys
      };
    } catch (error) {
      console.warn(`Warning: Could not parse table section:`, error);
      return null;
    }
  }

  /**
   * Extract columns from a table section
   */
  private extractColumnsFromSection(section: string): ColumnSchema[] {
    const columns: ColumnSchema[] = [];
    
    // Look for the columns table - simpler approach
    const lines = section.split('\n');
    let inColumnsTable = false;
    let headerFound = false;
    
    for (const line of lines) {
      if (line.includes('**Columns:**')) {
        inColumnsTable = true;
        continue;
      }
      
      if (inColumnsTable) {
        if (line.includes('|') && line.includes('Column') && line.includes('Type')) {
          headerFound = true;
          continue;
        }
        
        if (headerFound && line.includes('|') && line.includes('---')) {
          continue; // Skip separator line
        }
        
        if (headerFound && line.includes('|') && !line.includes('---')) {
          const column = this.parseColumnRow(line);
          if (column) {
            columns.push(column);
          }
        }
        
        // Stop when we hit the next section
        if (headerFound && (line.includes('**Primary Key:**') || line.includes('**Foreign Keys:**') || line.includes('**DDL:**'))) {
          break;
        }
      }
    }
    
    console.log(`🔍 Found ${columns.length} columns for table`);
    return columns;
  }

  /**
   * Parse a single column row from the markdown table
   */
  private parseColumnRow(row: string): ColumnSchema | null {
    try {
      // Remove leading/trailing whitespace and pipe characters
      const cleanRow = row.trim().replace(/^\||\|$/g, '');
      const cells = cleanRow.split('|').map(cell => cell.trim());
      
      if (cells.length < 7) return null;
      
      const [name, type, nullable, defaultValue, primary, foreign, description] = cells;
      
      // Parse nullable
      const isNullable = nullable.toLowerCase() === 'yes';
      
      // Parse primary key
      const isPrimary = primary.includes('🔑');
      
      // Parse foreign key
      const isForeign = foreign.includes('🔗');
      
      return {
        name: name.replace(/`/g, ''),
        type: type.replace(/`/g, ''),
        nullable: isNullable,
        defaultValue: defaultValue === '' ? undefined : defaultValue,
        isPrimary,
        isForeign
      };
    } catch (error) {
      console.warn(`Warning: Could not parse column row: ${row}`, error);
      return null;
    }
  }

  /**
   * Extract primary key from table section
   */
  private extractPrimaryKeyFromSection(section: string): string | undefined {
    const primaryKeyMatch = section.match(/\*\*Primary Key:\*\*\s*`([^`]+)`/);
    return primaryKeyMatch ? primaryKeyMatch[1] : undefined;
  }

  /**
   * Extract foreign keys from table section
   */
  private extractForeignKeysFromSection(section: string): ForeignKeySchema[] {
    const foreignKeys: ForeignKeySchema[] = [];
    
    // Look for foreign keys section
    const foreignKeysMatch = section.match(/\*\*Foreign Keys:\*\*\s*\n((?:[^#]*\n)*?)(?=\*\*|$)/);
    
    if (foreignKeysMatch) {
      const foreignKeysText = foreignKeysMatch[1];
      const lines = foreignKeysText.split('\n');
      
      for (const line of lines) {
        const fkMatch = line.match(/\s*`([^`]+)`\s*→\s*`([^`]+)\.([^`]+)`/);
        if (fkMatch) {
          foreignKeys.push({
            column: fkMatch[1],
            referencedTable: fkMatch[2],
            referencedColumn: fkMatch[3]
          });
        }
      }
    }
    
    return foreignKeys;
  }

  /**
   * Extract views from markdown content
   */
  private extractViewsFromMarkdown(content: string): any[] {
    // This is a placeholder - implement view extraction if needed
    return [];
  }

  /**
   * Extract functions from markdown content
   */
  private extractFunctionsFromMarkdown(content: string): any[] {
    // This is a placeholder - implement function extraction if needed
    return [];
  }

  /**
   * Extract triggers from markdown content
   */
  private extractTriggersFromMarkdown(content: string): any[] {
    // This is a placeholder - implement trigger extraction if needed
    return [];
  }

  /**
   * Extract indexes from markdown content
   */
  private extractIndexesFromMarkdown(content: string): any[] {
    // This is a placeholder - implement index extraction if needed
    return [];
  }

  /**
   * Extract relationships from markdown content
   */
  private extractRelationshipsFromMarkdown(content: string): any[] {
    // This is a placeholder - implement relationship extraction if needed
    return [];
  }

  /**
   * Extract summary from markdown content
   */
  private extractSummaryFromMarkdown(content: string): any {
    const summary: any = {};
    
    // Extract basic statistics
    const tablesMatch = content.match(/\*\*Total Tables:\*\*\s*(\d+)/);
    if (tablesMatch) {
      summary.totalTables = parseInt(tablesMatch[1]);
    }
    
    const viewsMatch = content.match(/\*\*Total Views:\*\*\s*(\d+)/);
    if (viewsMatch) {
      summary.totalViews = parseInt(viewsMatch[1]);
    }
    
    const functionsMatch = content.match(/\*\*Total Functions:\*\*\s*(\d+)/);
    if (functionsMatch) {
      summary.totalFunctions = parseInt(functionsMatch[1]);
    }
    
    const triggersMatch = content.match(/\*\*Total Triggers:\*\*\s*(\d+)/);
    if (triggersMatch) {
      summary.totalTriggers = parseInt(triggersMatch[1]);
    }
    
    const indexesMatch = content.match(/\*\*Total Indexes:\*\*\s*(\d+)/);
    if (indexesMatch) {
      summary.totalIndexes = parseInt(indexesMatch[1]);
    }
    
    const relationshipsMatch = content.match(/\*\*Total Relationships:\*\*\s*(\d+)/);
    if (relationshipsMatch) {
      summary.totalRelationships = parseInt(relationshipsMatch[1]);
    }
    
    return summary;
  }

  /**
   * Check if a PostgreSQL schema file exists and is recent
   */
  isPostgreSQLSchemaFileAvailable(maxAgeHours: number = 24): { available: boolean; filepath?: string; age?: number } {
    const latestFile = this.findLatestPostgreSQLSchemaFile();
    
    if (!latestFile) {
      return { available: false };
    }
    
    const fullPath = path.join(this.projectRoot, latestFile);
    const stats = fs.statSync(fullPath);
    const ageHours = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);
    
    return {
      available: ageHours <= maxAgeHours,
      filepath: latestFile,
      age: ageHours
    };
  }

  /**
   * Get file information for the latest PostgreSQL schema file
   */
  getLatestPostgreSQLSchemaFileInfo(): { filepath: string; size: number; lastModified: Date } | null {
    const latestFile = this.findLatestPostgreSQLSchemaFile();
    
    if (!latestFile) {
      return null;
    }
    
    const fullPath = path.join(this.projectRoot, latestFile);
    const stats = fs.statSync(fullPath);
    
    return {
      filepath: latestFile,
      size: stats.size,
      lastModified: stats.mtime
    };
  }
}
