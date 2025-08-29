import { TableSchema, ColumnSchema, ForeignKeySchema, CollectionSchema, FieldSchema, IndexSchema } from '../types/index.js';
import { PostgreSQLService } from './PostgreSQLService.js';
import { MongoDBService } from './MongoDBService.js';
import { ERDiagramGenerator } from './ERDiagramGenerator.js';
import { SemanticRelationship, DataFlowPattern, BusinessProcess, BusinessRule, ImpactMatrix } from '../types/index.js';

export interface ComprehensivePostgreSQLSchema {
  tables: TableSchema[];
  views: ViewSchema[];
  functions: FunctionSchema[];
  triggers: TriggerSchema[];
  indexes: IndexSchema[];
  relationships: RelationshipSchema[];
  summary: SchemaSummary;
  // NEW: Enhanced relationship properties for "Relationship beyond DDL"
  semanticRelationships: SemanticRelationship[];
  dataFlowPatterns: DataFlowPattern[];
  businessProcesses: BusinessProcess[];
  businessRules: BusinessRule[];
  impactMatrix: ImpactMatrix[];
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
  private erDiagramGenerator: ERDiagramGenerator;

  constructor() {
    this.erDiagramGenerator = new ERDiagramGenerator();
  }

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

      // NEW: Extract enhanced relationship information
      const [semanticRelationships, dataFlowPatterns, businessProcesses, businessRules, impactMatrix] = await Promise.all([
        this.analyzeSemanticRelationships(tables, relationships),
        this.analyzeDataFlowPatterns(tables, relationships),
        this.extractBusinessProcesses(tables, relationships),
        this.analyzeBusinessRules(tables, relationships, triggers, functions),
        this.generateImpactMatrix(tables, relationships)
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
      console.log('🧠 Enhanced business relationship analysis completed');
      
      return {
        tables,
        views,
        functions,
        triggers,
        indexes,
        relationships,
        summary,
        // NEW: Enhanced relationship data
        semanticRelationships,
        dataFlowPatterns,
        businessProcesses,
        businessRules,
        impactMatrix
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
      
      const schemaName = this.getSchemaName();
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
          AND c.table_schema = '${schemaName}'
        WHERE v.schemaname = '${schemaName}'
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
   * Extract relationships information
   */
  private async extractRelationships(): Promise<RelationshipSchema[]> {
    try {
      console.log('🔗 Extracting relationship information...');
      
      const schemaName = this.getSchemaName();
      const query = `
        SELECT 
          tc.table_name as source_table,
          kcu.column_name as source_column,
          ccu.table_name as target_table,
          ccu.column_name as target_column,
          tc.constraint_name,
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
        AND tc.table_schema = '${schemaName}'
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
   * NEW: Analyze semantic relationships beyond DDL
   */
  private async analyzeSemanticRelationships(tables: TableSchema[], relationships: RelationshipSchema[]): Promise<SemanticRelationship[]> {
    try {
      console.log('🧠 Analyzing semantic relationships...');
      
      const semanticRelationships: SemanticRelationship[] = [];
      
      // Analyze foreign key relationships for business context
      for (const rel of relationships) {
        const sourceTable = tables.find(t => t.name === rel.sourceTable);
        const targetTable = tables.find(t => t.name === rel.targetTable);
        
        if (sourceTable && targetTable) {
          const semanticRel = this.inferSemanticRelationship(rel, sourceTable, targetTable);
          if (semanticRel) {
            semanticRelationships.push(semanticRel);
          }
        }
      }
      
      // Analyze table naming patterns for business relationships
      const businessRelationships = this.analyzeBusinessNamingPatterns(tables);
      semanticRelationships.push(...businessRelationships);
      
      console.log(`✅ Discovered ${semanticRelationships.length} semantic relationships`);
      return semanticRelationships;
      
    } catch (error) {
      console.error('Failed to analyze semantic relationships:', error);
      return [];
    }
  }

  /**
   * NEW: Analyze business naming patterns for relationships
   */
  private analyzeBusinessNamingPatterns(tables: TableSchema[]): SemanticRelationship[] {
    const relationships: SemanticRelationship[] = [];

    // Example: If a table name contains "customer" and another table name contains "order",
    // it might indicate a customer-order relationship.
    for (const table1 of tables) {
      for (const table2 of tables) {
        if (table1.name !== table2.name) {
          if (table1.name.toLowerCase().includes('customer') && table2.name.toLowerCase().includes('order')) {
            relationships.push({
              sourceTable: table1.name,
              targetTable: table2.name,
              relationshipType: 'business',
              businessPurpose: `Customer order management relationship`,
              dataFlowDirection: 'unidirectional',
              businessRules: [
                `Customer must exist before order can be created`,
                `Order history maintained per customer`
              ],
              usagePatterns: [
                `Customer order lookup`,
                `Order history by customer`
              ],
              impactAnalysis: {
                criticality: 'HIGH',
                businessImpact: `Core business process for order management`,
                dataIntegrityRisk: 'MEDIUM - Business logic dependent'
              },
              confidence: 0.7
            });
          }
        }
      }
    }
    return relationships;
  }

  /**
   * NEW: Infer semantic relationship from foreign key
   */
  private inferSemanticRelationship(rel: RelationshipSchema, sourceTable: TableSchema, targetTable: TableSchema): SemanticRelationship | null {
    const sourceColumns = sourceTable.columns.filter(col => col.name === rel.sourceColumn);
    const targetColumns = targetTable.columns.filter(col => col.name === rel.targetColumn);

    if (sourceColumns.length === 1 && targetColumns.length === 1) {
      const sourceCol = sourceColumns[0];
      const targetCol = targetColumns[0];

      // Determine relationship type based on table names and column types
      let relationshipType: 'business' | 'logical' | 'temporal' | 'hierarchical' | 'workflow' = 'business';
      let businessPurpose = `Data relationship between ${sourceTable.name} and ${targetTable.name}`;
      
      if (sourceCol.type.includes('timestamp') || targetCol.type.includes('timestamp')) {
        relationshipType = 'temporal';
        businessPurpose = `Temporal relationship between ${sourceTable.name} and ${targetTable.name}`;
      } else if (sourceTable.name.toLowerCase().includes('parent') || targetTable.name.toLowerCase().includes('child')) {
        relationshipType = 'hierarchical';
        businessPurpose = `Hierarchical relationship between ${sourceTable.name} and ${targetTable.name}`;
      } else if (sourceTable.name.toLowerCase().includes('workflow') || targetTable.name.toLowerCase().includes('process')) {
        relationshipType = 'workflow';
        businessPurpose = `Workflow relationship between ${sourceTable.name} and ${targetTable.name}`;
      }

      return {
        sourceTable: sourceTable.name,
        targetTable: targetTable.name,
        relationshipType,
        businessPurpose,
        dataFlowDirection: 'unidirectional',
        businessRules: [
          `Data integrity maintained through foreign key constraint`,
          `Referential integrity enforced between ${sourceTable.name} and ${targetTable.name}`
        ],
        usagePatterns: [
          `JOIN operations between ${sourceTable.name} and ${targetTable.name}`,
          `Data validation and consistency checks`
        ],
        impactAnalysis: {
          criticality: 'MEDIUM',
          businessImpact: `Ensures data consistency between ${sourceTable.name} and ${targetTable.name}`,
          dataIntegrityRisk: 'LOW - Foreign key constraints enforced'
        },
        confidence: 0.9
      };
    }
    return null;
  }

  /**
   * NEW: Extract business processes dynamically based on actual schema
   */
  private async extractBusinessProcesses(tables: TableSchema[], relationships: RelationshipSchema[]): Promise<BusinessProcess[]> {
    try {
      console.log('🏢 Extracting business processes dynamically...');
      
      const processes: BusinessProcess[] = [];
      
      // Analyze table patterns dynamically based on actual schema
      const tableNames = tables.map(t => t.name.toLowerCase());
      const tableRelationships = this.analyzeTableRelationships(tables, relationships);
      
      // Generate business processes based on actual table relationships and patterns
      const detectedProcesses = this.detectBusinessProcessesFromSchema(tables, relationships, tableRelationships);
      processes.push(...detectedProcesses);
      
      // If no specific processes detected, create a generic one based on schema characteristics
      if (processes.length === 0) {
        processes.push(this.createGenericBusinessProcess(tables, relationships));
      }
      
      console.log(`✅ Extracted ${processes.length} business processes dynamically`);
      return processes;
      
    } catch (error) {
      console.error('Failed to extract business processes:', error);
      return [];
    }
  }

  /**
   * NEW: Analyze table relationships to understand business context
   */
  private analyzeTableRelationships(tables: TableSchema[], relationships: RelationshipSchema[]): Map<string, string[]> {
    const tableRelationships = new Map<string, string[]>();
    
    for (const table of tables) {
      const relatedTables: string[] = [];
      
      // Find tables that reference this table
      relationships.forEach(rel => {
        if (rel.targetTable === table.name) {
          relatedTables.push(rel.sourceTable);
        }
        if (rel.sourceTable === table.name) {
          relatedTables.push(rel.targetTable);
        }
      });
      
      tableRelationships.set(table.name, relatedTables);
    }
    
    return tableRelationships;
  }

  /**
   * NEW: Detect business processes based on actual schema patterns
   */
  private detectBusinessProcessesFromSchema(
    tables: TableSchema[], 
    relationships: RelationshipSchema[], 
    tableRelationships: Map<string, string[]>
  ): BusinessProcess[] {
    const processes: BusinessProcess[] = [];
    
    // Analyze tables with high connectivity (many foreign keys) as potential core entities
    const coreTables = this.identifyCoreTables(tables, relationships);
    
    // Generate processes based on core tables and their relationships
    for (const coreTable of coreTables) {
      const process = this.createProcessFromCoreTable(coreTable, tables, relationships, tableRelationships);
      if (process) {
        processes.push(process);
      }
    }
    
    return processes;
  }

  /**
   * NEW: Identify core tables based on foreign key relationships
   */
  private identifyCoreTables(tables: TableSchema[], relationships: RelationshipSchema[]): TableSchema[] {
    const tableConnectivity = new Map<string, number>();
    
    // Count foreign key relationships for each table
    for (const table of tables) {
      let connectivity = 0;
      relationships.forEach(rel => {
        if (rel.sourceTable === table.name || rel.targetTable === table.name) {
          connectivity++;
        }
      });
      tableConnectivity.set(table.name, connectivity);
    }
    
    // Return tables with highest connectivity (potential core entities)
    const sortedTables = [...tables].sort((a, b) => 
      (tableConnectivity.get(b.name) || 0) - (tableConnectivity.get(a.name) || 0)
    );
    
    // Return top 30% of tables as core entities
    const coreCount = Math.max(1, Math.ceil(sortedTables.length * 0.3));
    return sortedTables.slice(0, coreCount);
  }

  /**
   * NEW: Create business process from core table analysis
   */
  private createProcessFromCoreTable(
    coreTable: TableSchema, 
    tables: TableSchema[], 
    relationships: RelationshipSchema[], 
    tableRelationships: Map<string, string[]>
  ): BusinessProcess | null {
    const relatedTables = tableRelationships.get(coreTable.name) || [];
    
    if (relatedTables.length === 0) {
      return null;
    }
    
    // Analyze the workflow based on actual relationships
    const workflowSteps = this.analyzeWorkflowFromRelationships(coreTable, relatedTables, relationships);
    
    return {
      id: `${coreTable.name.toLowerCase()}_process`,
      name: `${this.capitalizeFirst(coreTable.name)} Management Process`,
      description: `Process for managing ${coreTable.name.toLowerCase()} and related operations`,
      owner: 'System Users',
      trigger: 'User request or system event',
      steps: workflowSteps,
      tables: [coreTable.name, ...relatedTables],
      businessRules: this.generateBusinessRulesForTable(coreTable, relatedTables, relationships),
      criticality: this.assessProcessCriticality(coreTable, relatedTables),
      estimatedDuration: this.estimateProcessDuration(relatedTables.length),
      stakeholders: ['Users', 'Administrators']
    };
  }

  /**
   * NEW: Generate business rules for a table based on its characteristics
   */
  private generateBusinessRulesForTable(
    coreTable: TableSchema, 
    relatedTables: string[], 
    relationships: RelationshipSchema[]
  ): string[] {
    const rules: string[] = [];
    
    // Add rules based on table characteristics
    if (coreTable.primaryKey) {
      rules.push(`${coreTable.name} must have a unique identifier`);
    }
    
    if (coreTable.foreignKeys && coreTable.foreignKeys.length > 0) {
      rules.push(`${coreTable.name} must maintain referential integrity with related tables`);
    }
    
    // Add rules based on relationships
    if (relatedTables.length > 0) {
      rules.push(`Changes to ${coreTable.name} may affect ${relatedTables.length} related tables`);
    }
    
    return rules;
  }

  /**
   * NEW: Analyze workflow from actual table relationships
   */
  private analyzeWorkflowFromRelationships(
    coreTable: TableSchema, 
    relatedTables: string[], 
    relationships: RelationshipSchema[]
  ): Array<{
    stepNumber: number;
    action: string;
    table: string;
    description: string;
    businessRules: string[];
    dependencies: string[];
  }> {
    const workflow: Array<{
      stepNumber: number;
      action: string;
      table: string;
      description: string;
      businessRules: string[];
      dependencies: string[];
    }> = [];
    let step = 1;
    
    // Start with core table
    workflow.push({
      stepNumber: step++,
      action: 'Access',
      table: coreTable.name,
      description: `Access ${coreTable.name.toLowerCase()} information`,
      businessRules: [`Ensure proper access permissions for ${coreTable.name}`],
      dependencies: []
    });
    
    // Add related tables based on actual relationships
    for (const relatedTable of relatedTables) {
      workflow.push({
        stepNumber: step++,
        action: this.determineActionForTable(relatedTable, relationships),
        table: relatedTable,
        description: `Process ${relatedTable.toLowerCase()} data`,
        businessRules: [`Maintain relationship integrity with ${coreTable.name}`],
        dependencies: [coreTable.name]
      });
    }
    
    return workflow;
  }

  /**
   * NEW: Determine appropriate action for table based on its role
   */
  private determineActionForTable(tableName: string, relationships: RelationshipSchema[]): string {
    // Check if this table is referenced by others (likely read-heavy)
    const isReferenced = relationships.some(rel => rel.targetTable === tableName);
    // Check if this table references others (likely write-heavy)
    const referencesOthers = relationships.some(rel => rel.sourceTable === tableName);
    
    if (isReferenced && !referencesOthers) return 'Read';
    if (referencesOthers && !isReferenced) return 'Write';
    return 'Access'; // Default to access for balanced tables
  }

  /**
   * NEW: Assess process criticality based on table characteristics
   */
  private assessProcessCriticality(coreTable: TableSchema, relatedTables: string[]): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (relatedTables.length > 5) return 'CRITICAL';
    if (relatedTables.length > 3) return 'HIGH';
    if (relatedTables.length > 1) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * NEW: Estimate process duration based on complexity
   */
  private estimateProcessDuration(relatedTableCount: number): string {
    if (relatedTableCount > 5) return '10-15 minutes';
    if (relatedTableCount > 3) return '5-10 minutes';
    if (relatedTableCount > 1) return '2-5 minutes';
    return '1-2 minutes';
  }

  /**
   * NEW: Assess process frequency based on table relationships
   */
  private assessProcessFrequency(relatedTableCount: number): string {
    if (relatedTableCount > 5) return 'high';
    if (relatedTableCount > 3) return 'medium';
    return 'low';
  }

  /**
   * NEW: Assess data volume based on table characteristics
   */
  private assessDataVolume(coreTable: TableSchema, relatedTables: string[]): string {
    const totalColumns = coreTable.columns.length + relatedTables.reduce((sum, tableName) => {
      const table = this.findTableByName(tableName);
      return sum + (table?.columns.length || 0);
    }, 0);
    
    if (totalColumns > 20) return 'large';
    if (totalColumns > 10) return 'medium';
    return 'small';
  }

  /**
   * NEW: Assess performance impact based on complexity
   */
  private assessPerformanceImpact(relatedTableCount: number): string {
    if (relatedTableCount > 5) return 'significant';
    if (relatedTableCount > 3) return 'moderate';
    return 'minimal';
  }

  /**
   * NEW: Find table by name
   */
  private findTableByName(tableName: string): TableSchema | undefined {
    // This would need access to the tables array - you might need to pass it as a parameter
    // or store it as a class property
    return undefined; // Placeholder
  }

  /**
   * NEW: Create generic business process when no specific patterns detected
   */
  private createGenericBusinessProcess(tables: TableSchema[], relationships: RelationshipSchema[]): BusinessProcess {
    const workflowSteps = this.createGenericWorkflow(tables);
    
    return {
      id: 'generic_business_process',
      name: 'General Business Operations',
      description: 'Standard business operations supported by the database schema',
      owner: 'System Users',
      trigger: 'General system operations',
      steps: workflowSteps,
      tables: tables.map(t => t.name),
      businessRules: ['Maintain data integrity across all tables', 'Follow standard database operations'],
      criticality: 'MEDIUM',
      estimatedDuration: '5-10 minutes',
      stakeholders: ['Users', 'Administrators']
    };
  }

  /**
   * NEW: Create generic workflow based on actual tables
   */
  private createGenericWorkflow(tables: TableSchema[]): Array<{
    stepNumber: number;
    action: string;
    table: string;
    description: string;
    businessRules: string[];
    dependencies: string[];
  }> {
    const workflow: Array<{
      stepNumber: number;
      action: string;
      table: string;
      description: string;
      businessRules: string[];
      dependencies: string[];
    }> = [];
    let step = 1;
    
    for (const table of tables) {
      workflow.push({
        stepNumber: step++,
        action: 'Access',
        table: table.name,
        description: `Access ${table.name.toLowerCase()} data`,
        businessRules: [`Ensure proper access permissions for ${table.name}`],
        dependencies: step > 1 ? [tables[step - 2].name] : []
      });
    }
    
    return workflow;
  }

  /**
   * NEW: Utility function to capitalize first letter
   */
  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  /**
   * NEW: Analyze business rules
   */
  private async analyzeBusinessRules(tables: TableSchema[], relationships: RelationshipSchema[], triggers: TriggerSchema[], functions: FunctionSchema[]): Promise<BusinessRule[]> {
    try {
      console.log('📋 Analyzing business rules...');
      
      const rules: BusinessRule[] = [];
      
      // Extract rules from triggers
      for (const trigger of triggers) {
        const rule = this.extractBusinessRuleFromTrigger(trigger, tables);
        if (rule) rules.push(rule);
      }
      
      // Extract rules from functions
      for (const func of functions) {
        const rule = this.extractBusinessRuleFromFunction(func, tables);
        if (rule) rules.push(rule);
      }
      
      // Extract rules from table constraints and relationships
      for (const table of tables) {
        const tableRules = this.extractBusinessRulesFromTable(table, relationships);
        rules.push(...tableRules);
      }
      
      // Infer business rules from naming patterns
      const inferredRules = this.inferBusinessRulesFromNaming(tables, relationships);
      rules.push(...inferredRules);
      
      console.log(`✅ Analyzed ${rules.length} business rules`);
      return rules;
      
    } catch (error) {
      console.error('Failed to analyze business rules:', error);
      return [];
    }
  }

  /**
   * NEW: Generate impact matrix
   */
  private async generateImpactMatrix(tables: TableSchema[], relationships: RelationshipSchema[]): Promise<ImpactMatrix[]> {
    try {
      console.log('📊 Generating impact matrix...');
      
      const impactMatrix: ImpactMatrix[] = [];
      
      for (const table of tables) {
        const impact = this.calculateTableImpact(table, relationships, tables);
        impactMatrix.push(impact);
      }
      
      console.log(`✅ Generated impact matrix for ${impactMatrix.length} tables`);
      return impactMatrix;
      
    } catch (error) {
      console.error('Failed to generate impact matrix:', error);
      return [];
    }
  }

  /**
   * NEW: Extract business rules from triggers
   */
  private extractBusinessRuleFromTrigger(trigger: TriggerSchema, tables: TableSchema[]): BusinessRule | null {
    const sourceTable = tables.find(t => t.name === trigger.table);
    if (!sourceTable) return null;

    const rule: BusinessRule = {
      id: `trigger_${trigger.name}`,
      name: `Trigger Rule: ${trigger.name}`,
      description: `Business rule inferred from trigger: ${trigger.name} on table ${sourceTable.name}`,
      category: 'data_integrity',
      tables: [sourceTable.name],
      columns: [],
      ruleType: 'validation',
      ruleDefinition: `Trigger ${trigger.name} on table ${sourceTable.name} fires when ${trigger.event} ${trigger.timing}`,
      enforcement: 'database',
      impact: 'MEDIUM',
      dependencies: [sourceTable.name]
    };
    return rule;
  }

  /**
   * NEW: Extract business rules from functions
   */
  private extractBusinessRuleFromFunction(func: FunctionSchema, tables: TableSchema[]): BusinessRule | null {
    const sourceTable = tables.find(t => t.name === func.schema); // Assuming schema is the table name for a function
    if (!sourceTable) return null;

    const rule: BusinessRule = {
      id: `function_${func.name}`,
      name: `Function Rule: ${func.name}`,
      description: `Business rule inferred from function: ${func.name} in schema ${sourceTable.name}`,
      category: 'business_logic',
      tables: [sourceTable.name],
      columns: [],
      ruleType: 'calculation',
      ruleDefinition: `Function ${func.name} in schema ${sourceTable.name} returns ${func.returnType}`,
      enforcement: 'database',
      impact: 'LOW',
      dependencies: [sourceTable.name]
    };
    return rule;
  }

  /**
   * NEW: Extract business rules from table constraints and relationships
   */
  private extractBusinessRulesFromTable(table: TableSchema, relationships: RelationshipSchema[]): BusinessRule[] {
    const rules: BusinessRule[] = [];

    // Example: If a table has a foreign key to another table, it might have a business rule.
    const foreignKeyRelationships = relationships.filter(rel => rel.sourceTable === table.name);
    if (foreignKeyRelationships.length > 0) {
      rules.push({
        id: `fk_${table.name}`,
        name: `Foreign Key Rule: ${table.name}`,
        description: `Business rule inferred from foreign key constraints on table ${table.name}`,
        category: 'data_integrity',
        tables: [table.name],
        columns: [],
        ruleType: 'constraint',
        ruleDefinition: `Table ${table.name} has foreign key constraints to other tables.`,
        enforcement: 'database',
        impact: 'MEDIUM',
        dependencies: [table.name]
      });
    }

    // Example: If a table has a unique constraint, it might have a business rule.
    if (table.primaryKey) {
      rules.push({
        id: `pk_${table.name}`,
        name: `Primary Key Rule: ${table.name}`,
        description: `Business rule inferred from primary key constraint on table ${table.name}`,
        category: 'data_integrity',
        tables: [table.name],
        columns: [table.primaryKey],
        ruleType: 'constraint',
        ruleDefinition: `Table ${table.name} has primary key constraint on column ${table.primaryKey}.`,
        enforcement: 'database',
        impact: 'HIGH',
        dependencies: [table.name]
      });
    }

    return rules;
  }

  /**
   * NEW: Infer business rules from naming patterns
   */
  private inferBusinessRulesFromNaming(tables: TableSchema[], relationships: RelationshipSchema[]): BusinessRule[] {
    const rules: BusinessRule[] = [];

    // Example: If a table name contains "customer" and another table name contains "order",
    // it might indicate a customer-order relationship.
    for (const table1 of tables) {
      for (const table2 of tables) {
        if (table1.name !== table2.name) {
          if (table1.name.toLowerCase().includes('customer') && table2.name.toLowerCase().includes('order')) {
            rules.push({
              id: `naming_${table1.name}_${table2.name}`,
              name: `Naming Rule: ${table1.name} and ${table2.name}`,
              description: `Business rule inferred from naming pattern: ${table1.name} and ${table2.name}`,
              category: 'business_logic',
              tables: [table1.name, table2.name],
              columns: [],
              ruleType: 'validation',
              ruleDefinition: `Naming pattern suggests a relationship between ${table1.name} and ${table2.name}`,
              enforcement: 'business_process',
              impact: 'LOW',
              dependencies: [table1.name, table2.name]
            });
          }
        }
      }
    }
    return rules;
  }

  /**
   * NEW: Calculate impact of a table on the system
   */
  private calculateTableImpact(table: TableSchema, relationships: RelationshipSchema[], allTables: TableSchema[]): ImpactMatrix {
    const dependencies = this.findTableDependencies(table, relationships, allTables);
    const foreignKeys = this.findForeignKeys(table, relationships);
    const uniqueConstraints = this.findUniqueConstraints(table);
    
    // Calculate business criticality based on table characteristics
    let businessCriticality: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (table.primaryKey && foreignKeys.length > 3) businessCriticality = 'CRITICAL';
    else if (table.primaryKey && foreignKeys.length > 1) businessCriticality = 'HIGH';
    else if (table.primaryKey || foreignKeys.length > 0) businessCriticality = 'MEDIUM';

    const impact: ImpactMatrix = {
      tableName: table.name,
      businessCriticality,
      dataQualityImpact: `Table ${table.name} has ${dependencies.length} dependencies and ${foreignKeys.length} foreign keys`,
      businessProcessImpact: `Affects ${dependencies.length} related business processes`,
      complianceImpact: `Primary key and constraint enforcement for data integrity`,
      riskFactors: [
        `High dependency count: ${dependencies.length}`,
        `Foreign key relationships: ${foreignKeys.length}`,
        `Data integrity constraints: ${uniqueConstraints.length}`
      ],
      mitigationStrategies: [
        'Regular data quality audits',
        'Backup and recovery procedures',
        'Change impact analysis before modifications'
      ]
    };
    return impact;
  }

  /**
   * NEW: Find tables with cascading updates
   */
  private findTablesWithCascadingUpdates(tables: TableSchema[], relationships: RelationshipSchema[]): string[] {
    const cascadingTables: string[] = [];
    relationships.forEach(rel => {
      if (rel.deleteRule?.toLowerCase() === 'cascade' || rel.updateRule?.toLowerCase() === 'cascade') {
        cascadingTables.push(rel.sourceTable);
        cascadingTables.push(rel.targetTable);
      }
    });
    return [...new Set(cascadingTables)];
  }

  /**
   * NEW: Find dependencies of a table (foreign keys and cascading updates)
   */
  private findTableDependencies(table: TableSchema, relationships: RelationshipSchema[], allTables: TableSchema[]): string[] {
    const dependencies: string[] = [];
    relationships.forEach(rel => {
      if (rel.sourceTable === table.name) {
        dependencies.push(rel.targetTable);
      }
      if (rel.targetTable === table.name) {
        dependencies.push(rel.sourceTable);
      }
    });
    
    // Find tables with cascading updates
    const cascadingTables = this.findTablesWithCascadingUpdates(allTables, relationships);
    const cascadingDeps = cascadingTables.filter((dep: string) => dep === table.name);
    
    return [...new Set([...dependencies, ...cascadingDeps])];
  }

  /**
   * NEW: Find foreign keys of a table
   */
  private findForeignKeys(table: TableSchema, relationships: RelationshipSchema[]): string[] {
    const foreignKeys: string[] = [];
    relationships.forEach(rel => {
      if (rel.sourceTable === table.name && rel.constraintName.toLowerCase().includes('fk')) {
        foreignKeys.push(rel.targetTable);
      }
    });
    return [...new Set(foreignKeys)];
  }

  /**
   * NEW: Find unique constraints of a table
   */
  private findUniqueConstraints(table: TableSchema): string[] {
    const uniqueConstraints: string[] = [];
    if (table.primaryKey) {
      uniqueConstraints.push(`Primary key on column ${table.primaryKey}`);
    }
    // Check for other unique constraints if available
    return uniqueConstraints;
  }

  /**
   * NEW: Analyze data flow patterns dynamically
   */
  private async analyzeDataFlowPatterns(tables: TableSchema[], relationships: RelationshipSchema[]): Promise<DataFlowPattern[]> {
    try {
      console.log('🌊 Analyzing data flow patterns dynamically...');
      
      const patterns: DataFlowPattern[] = [];
      
      // Analyze actual table relationships to identify data flow patterns
      const tableConnectivity = this.analyzeTableConnectivity(tables, relationships);
      const highConnectivityTables = this.getHighConnectivityTables(tableConnectivity);
      
      // Generate patterns based on actual connectivity
      for (const table of highConnectivityTables) {
        const pattern = this.createDataFlowPatternFromTable(table, tables, relationships, tableConnectivity);
        if (pattern) {
          patterns.push(pattern);
        }
      }
      
      // If no specific patterns, create a generic one
      if (patterns.length === 0) {
        patterns.push(this.createGenericDataFlowPattern(tables, relationships));
      }
      
      console.log(`✅ Analyzed ${patterns.length} data flow patterns dynamically`);
      return patterns;
      
    } catch (error) {
      console.error('Failed to analyze data flow patterns:', error);
      return [];
    }
  }

  /**
   * NEW: Analyze table connectivity for data flow analysis
   */
  private analyzeTableConnectivity(tables: TableSchema[], relationships: RelationshipSchema[]): Map<string, number> {
    const connectivity = new Map<string, number>();
    
    for (const table of tables) {
      let connections = 0;
      relationships.forEach(rel => {
        if (rel.sourceTable === table.name || rel.targetTable === table.name) {
          connections++;
        }
      });
      connectivity.set(table.name, connections);
    }
    
    return connectivity;
  }

  /**
   * NEW: Get tables with high connectivity
   */
  private getHighConnectivityTables(connectivity: Map<string, number>): string[] {
    const sortedTables = Array.from(connectivity.entries())
      .sort(([, a], [, b]) => b - a);
    
    // Return top 40% of tables as high connectivity
    const highConnectivityCount = Math.max(1, Math.ceil(sortedTables.length * 0.4));
    return sortedTables.slice(0, highConnectivityCount).map(([tableName]) => tableName);
  }

  /**
   * NEW: Create data flow pattern from table analysis
   */
  private createDataFlowPatternFromTable(
    tableName: string, 
    tables: TableSchema[], 
    relationships: RelationshipSchema[], 
    connectivity: Map<string, number>
  ): DataFlowPattern | null {
    const table = tables.find(t => t.name === tableName);
    if (!table) return null;
    
    const relatedTables = this.getRelatedTables(tableName, relationships);
    if (relatedTables.length === 0) return null;
    
    const flowSequence = this.createFlowSequence(tableName, relatedTables, relationships);
    
    return {
      id: `${tableName.toLowerCase()}_data_flow`,
      name: `${this.capitalizeFirst(tableName)} Data Flow`,
      description: `Data flow pattern for ${tableName.toLowerCase()} and related operations`,
      tables: [tableName, ...relatedTables],
      flowSequence,
      businessProcess: `${this.capitalizeFirst(tableName)} Management`,
      frequency: this.assessFlowFrequency(relatedTables.length) as 'low' | 'medium' | 'high' | 'continuous',
      dataVolume: this.assessFlowDataVolume(table, relatedTables) as 'small' | 'medium' | 'large',
      performanceImpact: this.assessFlowPerformanceImpact(relatedTables.length) as 'minimal' | 'moderate' | 'significant'
    };
  }

  /**
   * NEW: Get related tables for a given table
   */
  private getRelatedTables(tableName: string, relationships: RelationshipSchema[]): string[] {
    const related: string[] = [];
    
    relationships.forEach(rel => {
      if (rel.sourceTable === tableName) {
        related.push(rel.targetTable);
      }
      if (rel.targetTable === tableName) {
        related.push(rel.sourceTable);
      }
    });
    
    return [...new Set(related)];
  }

  /**
   * NEW: Create flow sequence based on actual relationships
   */
  private createFlowSequence(
    startTable: string, 
    relatedTables: string[], 
    relationships: RelationshipSchema[]
  ): any[] {
    const sequence: any[] = [];
    let step = 1;
    
    // Start with the main table
    sequence.push({
      step: step++,
      table: startTable,
      action: 'read',
      description: `Access ${startTable.toLowerCase()} information`,
      dependencies: []
    });
    
    // Add related tables in dependency order
    for (const relatedTable of relatedTables) {
      const dependencies = this.getTableDependencies(relatedTable, relationships);
      sequence.push({
        step: step++,
        table: relatedTable,
        action: this.determineFlowAction(relatedTable, relationships),
        description: `Process ${relatedTable.toLowerCase()} data`,
        dependencies
      });
    }
    
    return sequence;
  }

  /**
   * NEW: Get table dependencies for flow sequence
   */
  private getTableDependencies(tableName: string, relationships: RelationshipSchema[]): string[] {
    const dependencies: string[] = [];
    
    relationships.forEach(rel => {
      if (rel.targetTable === tableName) {
        dependencies.push(rel.sourceTable);
      }
    });
    
    return dependencies;
  }

  /**
   * NEW: Determine action for flow sequence
   */
  private determineFlowAction(tableName: string, relationships: RelationshipSchema[]): 'read' | 'write' {
    const isReferenced = relationships.some(rel => rel.targetTable === tableName);
    const referencesOthers = relationships.some(rel => rel.sourceTable === tableName);
    
    if (isReferenced && !referencesOthers) return 'read';
    if (referencesOthers && !isReferenced) return 'write';
    return 'read';
  }

  /**
   * NEW: Assess flow frequency
   */
  private assessFlowFrequency(relatedTableCount: number): string {
    if (relatedTableCount > 5) return 'high';
    if (relatedTableCount > 3) return 'medium';
    return 'low';
  }

  /**
   * NEW: Assess flow data volume
   */
  private assessFlowDataVolume(table: TableSchema, relatedTables: string[]): string {
    const totalColumns = table.columns.length + relatedTables.length * 5; // Estimate
    if (totalColumns > 30) return 'large';
    if (totalColumns > 15) return 'medium';
    return 'small';
  }

  /**
   * NEW: Assess flow performance impact
   */
  private assessFlowPerformanceImpact(relatedTableCount: number): string {
    if (relatedTableCount > 5) return 'significant';
    if (relatedTableCount > 3) return 'moderate';
    return 'minimal';
  }

  /**
   * NEW: Create generic data flow pattern
   */
  private createGenericDataFlowPattern(tables: TableSchema[], relationships: RelationshipSchema[]): DataFlowPattern {
    return {
      id: 'generic_data_flow',
      name: 'General Data Flow',
      description: 'Standard data flow pattern across the database schema',
      tables: tables.map(t => t.name),
      flowSequence: this.createGenericFlowSequence(tables),
      businessProcess: 'General Operations',
      frequency: 'medium',
      dataVolume: 'medium',
      performanceImpact: 'moderate'
    };
  }

  /**
   * NEW: Create generic flow sequence
   */
  private createGenericFlowSequence(tables: TableSchema[]): any[] {
    const sequence: any[] = [];
    let step = 1;
    
    for (const table of tables) {
      sequence.push({
        step: step++,
        table: table.name,
        action: 'read',
        description: `Access ${table.name.toLowerCase()} data`,
        dependencies: step > 1 ? [tables[step - 2].name] : []
      });
    }
    
    return sequence;
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

  /**
   * Generate comprehensive ER diagram with multiple formats
   */
  async generateERDiagram(
    format: 'mermaid' | 'plantuml' | 'dbml' | 'json' = 'mermaid',
    options?: {
      includeIndexes?: boolean;
      includeConstraints?: boolean;
      includeDataTypes?: boolean;
      includeCardinality?: boolean;
      includeDescriptions?: boolean;
      outputPath?: string;
      diagramStyle?: 'detailed' | 'simplified' | 'minimal';
    }
  ): Promise<any> {
    try {
      console.log(`🗺️ Generating ER diagram in ${format.toUpperCase()} format...`);
      
      const schema = await this.getComprehensivePostgreSQLSchema();
      
      const diagramOptions = {
        format,
        includeIndexes: options?.includeIndexes ?? true,
        includeConstraints: options?.includeConstraints ?? true,
        includeDataTypes: options?.includeDataTypes ?? true,
        includeCardinality: options?.includeCardinality ?? true,
        includeDescriptions: options?.includeDescriptions ?? false,
        outputPath: options?.outputPath,
        diagramStyle: options?.diagramStyle ?? 'detailed'
      };

      const result = await this.erDiagramGenerator.generateERDiagram(schema, diagramOptions);
      
      if (result.success) {
        console.log(`✅ ER diagram generated successfully in ${format.toUpperCase()} format`);
        return result;
      } else {
        throw new Error(result.error || 'Failed to generate ER diagram');
      }
      
    } catch (error) {
      console.error('❌ Failed to generate ER diagram:', error);
      throw error;
    }
  }

  /**
   * Generate comprehensive ER diagram documentation
   */
  async generateERDocumentation(): Promise<string> {
    try {
      console.log('📚 Generating comprehensive ER diagram documentation...');
      
      const schema = await this.getComprehensivePostgreSQLSchema();
      const documentationPath = await this.erDiagramGenerator.generateERDocumentation(schema);
      
      console.log('✅ ER diagram documentation generated successfully');
      return documentationPath;
      
    } catch (error) {
      console.error('❌ Failed to generate ER diagram documentation:', error);
      throw error;
    }
  }

  /**
   * Get the current schema name (e.g., 'public')
   */
  private getSchemaName(): string {
    // This would typically be retrieved from the PostgreSQLService or a configuration
    // For now, we'll use 'public' as a placeholder
    return 'public';
  }
}
