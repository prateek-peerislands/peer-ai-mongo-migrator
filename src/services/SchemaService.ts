import { TableSchema, ColumnSchema, ForeignKeySchema, CollectionSchema, FieldSchema, IndexSchema } from '../types/index.js';
import { PostgreSQLService } from './PostgreSQLService.js';
import { MongoDBService } from './MongoDBService.js';

export interface ComprehensivePostgreSQLSchema {
  tables: TableSchema[];
  views: ViewSchema[];
  functions: FunctionSchema[];
  triggers: TriggerSchema[];
  indexes: IndexSchema[];
  relationships: RelationshipSchema[];
  summary: SchemaSummary;
}

export interface ViewSchema {
  name: string;
  definition: string;
  columns: ColumnSchema[];
  dependencies: string[];
  description?: string;
}

export interface FunctionSchema {
  name: string;
  schema: string;
  returnType: string;
  parameters: FunctionParameter[];
  definition: string;
  language: string;
  volatility: string;
  description?: string;
}

export interface FunctionParameter {
  name: string;
  type: string;
  mode: string;
  default?: any;
}

export interface TriggerSchema {
  name: string;
  table: string;
  event: string;
  timing: string;
  function: string;
  definition: string;
  description?: string;
}

export interface RelationshipSchema {
  sourceTable: string;
  sourceColumn: string;
  targetTable: string;
  targetColumn: string;
  constraintName: string;
  deleteRule: string;
  updateRule: string;
}

export interface SchemaSummary {
  totalTables: number;
  totalViews: number;
  totalFunctions: number;
  totalTriggers: number;
  totalIndexes: number;
  totalRelationships: number;
  databaseSize?: string;
  lastAnalyzed: Date;
}

export class SchemaService {
  private postgresqlService!: PostgreSQLService;

  constructor() {}

  /**
   * Get comprehensive PostgreSQL schema including tables, views, functions, triggers, and indexes
   */
  async getComprehensivePostgreSQLSchema(): Promise<ComprehensivePostgreSQLSchema> {
    try {
      console.log('🔍 Starting comprehensive PostgreSQL schema analysis...');
      
      // Extract all schema components in parallel
      const [tables, views, functions, triggers, indexes, relationships] = await Promise.all([
        this.extractTables(),
        this.extractViews(),
        this.extractFunctions(),
        this.extractTriggers(),
        this.extractIndexes(),
        this.extractRelationships()
      ]);

      // Generate summary
      const summary: SchemaSummary = {
        totalTables: tables.length,
        totalViews: views.length,
        totalFunctions: functions.length,
        totalTriggers: triggers.length,
        totalIndexes: indexes.length,
        totalRelationships: relationships.length,
        lastAnalyzed: new Date()
      };

      console.log('✅ Comprehensive schema analysis completed');
      
      return {
        tables,
        views,
        functions,
        triggers,
        indexes,
        relationships,
        summary
      };
    } catch (error) {
      console.error('❌ Comprehensive schema analysis failed:', error);
      throw error;
    }
  }

  /**
   * Extract detailed table information
   */
  private async extractTables(): Promise<TableSchema[]> {
    try {
      console.log('📋 Extracting table information...');
      
      // Get list of tables
      const tableNames = await this.postgresqlService.listTables();
      const tables: TableSchema[] = [];

      for (const tableName of tableNames) {
        const tableSchema = await this.postgresqlService.getTableSchema(tableName);
        if (tableSchema) {
          tables.push(tableSchema);
        }
      }

      return tables;
    } catch (error) {
      console.error('Failed to extract tables:', error);
      return [];
    }
  }

  /**
   * Extract view information
   */
  private async extractViews(): Promise<ViewSchema[]> {
    try {
      console.log('👁️ Extracting view information...');
      
      const query = `
        SELECT 
          v.viewname as name,
          v.definition,
          c.column_name,
          c.data_type,
          c.is_nullable,
          c.column_default
        FROM pg_views v
        LEFT JOIN information_schema.columns c 
          ON c.table_name = v.viewname 
          AND c.table_schema = 'public'
        WHERE v.schemaname = 'public'
        ORDER BY v.viewname, c.ordinal_position
      `;

      const result = await this.postgresqlService.executeQuery(query);
      
      // Group by view name
      const viewMap = new Map<string, ViewSchema>();
      
      for (const row of result.data || []) {
        if (!viewMap.has(row.name)) {
          viewMap.set(row.name, {
            name: row.name,
            definition: row.definition,
            columns: [],
            dependencies: this.extractViewDependencies(row.definition)
          });
        }
        
        if (row.column_name) {
          viewMap.get(row.name)!.columns.push({
            name: row.column_name,
            type: row.data_type,
            nullable: row.is_nullable === 'YES',
            defaultValue: row.column_default
          });
        }
      }

      return Array.from(viewMap.values());
    } catch (error) {
      console.error('Failed to extract views:', error);
      return [];
    }
  }

  /**
   * Extract function information
   */
  private async extractFunctions(): Promise<FunctionSchema[]> {
    try {
      console.log('⚙️ Extracting function information...');
      
      const query = `
        SELECT 
          p.proname as name,
          p.prosrc as definition,
          pg_get_function_result(p.oid) as return_type,
          p.prolang as language,
          p.provolatile as volatility,
          array_agg(
            CASE 
              WHEN p.proargtypes[i] != 0 
              THEN format_type(p.proargtypes[i], -1)
              ELSE 'unknown'
            END
          ) as parameter_types
        FROM pg_proc p
        CROSS JOIN generate_series(0, array_length(p.proargtypes, 1)) i
        WHERE p.pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        GROUP BY p.oid, p.proname, p.prosrc, p.prolang, p.provolatile
        ORDER BY p.proname
      `;

      const result = await this.postgresqlService.executeQuery(query);
      
      return (result.data || []).map((row: any) => ({
        name: row.name,
        schema: 'public',
        returnType: row.return_type,
        parameters: this.parseFunctionParameters(row.parameter_types),
        definition: row.definition,
        language: this.getLanguageName(row.language),
        volatility: this.getVolatilityName(row.volatility)
      }));
    } catch (error) {
      console.error('Failed to extract functions:', error);
      return [];
    }
  }

  /**
   * Extract trigger information
   */
  private async extractTriggers(): Promise<TriggerSchema[]> {
    try {
      console.log('🔔 Extracting trigger information...');
      
      const query = `
        SELECT 
          t.tgname as name,
          c.relname as table_name,
          p.proname as function_name,
          t.tgtype,
          t.tgenabled,
          t.tgdeferrable,
          t.tginitdeferred,
          pg_get_triggerdef(t.oid) as definition
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_proc p ON t.tgfoid = p.oid
        WHERE t.tgisinternal = false
        AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        ORDER BY c.relname, t.tgname
      `;

      const result = await this.postgresqlService.executeQuery(query);
      
      return (result.data || []).map((row: any) => ({
        name: row.name,
        table: row.table_name,
        event: this.parseTriggerEvent(row.tgtype),
        timing: this.parseTriggerTiming(row.tgtype),
        function: row.function_name,
        definition: row.definition
      }));
    } catch (error) {
      console.error('Failed to extract triggers:', error);
      return [];
    }
  }

  /**
   * Extract index information
   */
  private async extractIndexes(): Promise<IndexSchema[]> {
    try {
      console.log('🔑 Extracting index information...');
      
      const query = `
        SELECT 
          i.relname as name,
          t.relname as table_name,
          array_agg(a.attname ORDER BY array_position(ix.indkey, a.attnum)) as fields,
          ix.indisunique as unique,
          ix.indisprimary as primary,
          am.amname as access_method,
          ix.indisclustered as clustered
        FROM pg_index ix
        JOIN pg_class i ON i.oid = ix.indexrelid
        JOIN pg_class t ON t.oid = ix.indrelid
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
        JOIN pg_am am ON i.relam = am.oid
        WHERE t.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        AND i.relname NOT LIKE 'pg_%'
        GROUP BY i.relname, t.relname, ix.indisunique, ix.indisprimary, am.amname, ix.indisclustered
        ORDER BY t.relname, i.relname
      `;

      const result = await this.postgresqlService.executeQuery(query);
      
      return (result.data || []).map((row: any) => ({
        name: row.name,
        fields: row.fields,
        unique: row.unique,
        table: row.table_name,
        accessMethod: row.access_method,
        clustered: row.clustered,
        primary: row.primary
      }));
    } catch (error) {
      console.error('Failed to extract indexes:', error);
      return [];
    }
  }

  /**
   * Extract relationship information
   */
  private async extractRelationships(): Promise<RelationshipSchema[]> {
    try {
      console.log('🔗 Extracting relationship information...');
      
      const query = `
        SELECT 
          tc.constraint_name,
          tc.table_name as source_table,
          kcu.column_name as source_column,
          ccu.table_name as target_table,
          ccu.column_name as target_column,
          rc.delete_rule,
          rc.update_rule
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu 
          ON ccu.constraint_name = tc.constraint_name
        JOIN information_schema.referential_constraints rc 
          ON tc.constraint_name = rc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        ORDER BY tc.table_name, kcu.column_name
      `;

      const result = await this.postgresqlService.executeQuery(query);
      
      return (result.data || []).map((row: any) => ({
        sourceTable: row.source_table,
        sourceColumn: row.source_column,
        targetTable: row.target_table,
        targetColumn: row.target_column,
        constraintName: row.constraint_name,
        deleteRule: row.delete_rule,
        updateRule: row.update_rule
      }));
    } catch (error) {
      console.error('Failed to extract relationships:', error);
      return [];
    }
  }

  /**
   * Extract view dependencies from view definition
   */
  private extractViewDependencies(definition: string): string[] {
    const dependencies: string[] = [];
    const tableMatches = definition.match(/FROM\s+(\w+)/gi) || [];
    const joinMatches = definition.match(/JOIN\s+(\w+)/gi) || [];
    
    [...tableMatches, ...joinMatches].forEach(match => {
      const tableName = match.replace(/FROM\s+|JOIN\s+/i, '').trim();
      if (tableName && !dependencies.includes(tableName)) {
        dependencies.push(tableName);
      }
    });
    
    return dependencies;
  }

  /**
   * Parse function parameters
   */
  private parseFunctionParameters(parameterTypes: string[]): FunctionParameter[] {
    return parameterTypes.map((type, index) => ({
      name: `param${index + 1}`,
      type: type,
      mode: 'IN'
    }));
  }

  /**
   * Get language name from OID
   */
  private getLanguageName(langOid: number): string {
    const languages: { [key: number]: string } = {
      12: 'internal',
      13: 'c',
      14: 'sql',
      15: 'plpgsql'
    };
    return languages[langOid] || 'unknown';
  }

  /**
   * Get volatility name
   */
  private getVolatilityName(volatility: string): string {
    const volatilities: { [key: string]: string } = {
      'i': 'immutable',
      's': 'stable',
      'v': 'volatile'
    };
    return volatilities[volatility] || 'unknown';
  }

  /**
   * Parse trigger event from type
   */
  private parseTriggerEvent(tgtype: number): string {
    const events: string[] = [];
    if (tgtype & 66) events.push('INSERT');
    if (tgtype & 130) events.push('DELETE');
    if (tgtype & 258) events.push('UPDATE');
    if (tgtype & 8192) events.push('TRUNCATE');
    return events.join(' OR ');
  }

  /**
   * Parse trigger timing from type
   */
  private parseTriggerTiming(tgtype: number): string {
    if (tgtype & 1) return 'BEFORE';
    if (tgtype & 2) return 'AFTER';
    if (tgtype & 64) return 'INSTEAD OF';
    return 'UNKNOWN';
  }

  /**
   * Get PostgreSQL schema (existing method)
   */
  async getPostgreSQLSchema(): Promise<TableSchema[]> {
    try {
      return await this.extractTables();
    } catch (error) {
      console.error('Failed to get PostgreSQL schema:', error);
      return [];
    }
  }

  /**
   * Get MongoDB schema (existing method)
   */
  async getMongoDBSchema(mongodbService: MongoDBService, database: string): Promise<CollectionSchema[]> {
    try {
      const collections = await mongodbService.listCollections(database);
      const schemas: CollectionSchema[] = [];

      for (const collectionName of collections) {
        const schema = await mongodbService.getCollectionSchema(database, collectionName);
        if (schema) {
          schemas.push(schema);
        }
      }

      return schemas;
    } catch (error) {
      console.error('Failed to get MongoDB schema:', error);
      return [];
    }
  }

  /**
   * Set PostgreSQL service reference
   */
  setPostgreSQLService(service: PostgreSQLService): void {
    this.postgresqlService = service;
  }
}
