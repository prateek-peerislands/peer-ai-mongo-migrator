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
        this.discoverDataFlowPatterns(tables, relationships),
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
   * NEW: Discover data flow patterns
   */
  private async discoverDataFlowPatterns(tables: TableSchema[], relationships: RelationshipSchema[]): Promise<DataFlowPattern[]> {
    try {
      console.log('🌊 Discovering data flow patterns...');
      
      const patterns: DataFlowPattern[] = [];
      
      // Analyze common business workflows
      const rentalWorkflow = this.analyzeRentalWorkflow(tables, relationships);
      if (rentalWorkflow) patterns.push(rentalWorkflow);
      
      const customerWorkflow = this.analyzeCustomerWorkflow(tables, relationships);
      if (customerWorkflow) patterns.push(customerWorkflow);
      
      const paymentWorkflow = this.analyzePaymentWorkflow(tables, relationships);
      if (paymentWorkflow) patterns.push(paymentWorkflow);
      
      // Generic workflow patterns
      const genericPatterns = this.analyzeGenericWorkflows(tables, relationships);
      patterns.push(...genericPatterns);
      
      console.log(`✅ Discovered ${patterns.length} data flow patterns`);
      return patterns;
      
    } catch (error) {
      console.error('Failed to discover data flow patterns:', error);
      return [];
    }
  }

  /**
   * NEW: Extract business processes
   */
  private async extractBusinessProcesses(tables: TableSchema[], relationships: RelationshipSchema[]): Promise<BusinessProcess[]> {
    try {
      console.log('🏢 Extracting business processes...');
      
      const processes: BusinessProcess[] = [];
      
      // Analyze table patterns to identify business processes
      const tableNames = tables.map(t => t.name.toLowerCase());
      
      // Film rental business process
      if (tableNames.some(name => name.includes('rental')) && 
          tableNames.some(name => name.includes('film'))) {
        processes.push(this.createFilmRentalProcess(tables, relationships));
      }
      
      // Customer management process
      if (tableNames.some(name => name.includes('customer'))) {
        processes.push(this.createCustomerManagementProcess(tables, relationships));
      }
      
      // Payment processing
      if (tableNames.some(name => name.includes('payment'))) {
        processes.push(this.createPaymentProcess(tables, relationships));
      }
      
      // Store management
      if (tableNames.some(name => name.includes('store'))) {
        processes.push(this.createStoreManagementProcess(tables, relationships));
      }
      
      console.log(`✅ Extracted ${processes.length} business processes`);
      return processes;
      
    } catch (error) {
      console.error('Failed to extract business processes:', error);
      return [];
    }
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
   * NEW: Analyze a specific business workflow (e.g., rental workflow)
   */
  private analyzeRentalWorkflow(tables: TableSchema[], relationships: RelationshipSchema[]): DataFlowPattern | null {
    const rentalTables = tables.filter(t => t.name.toLowerCase().includes('rental'));
    const filmTables = tables.filter(t => t.name.toLowerCase().includes('film'));
    const customerTables = tables.filter(t => t.name.toLowerCase().includes('customer'));

    if (rentalTables.length > 0 && filmTables.length > 0 && customerTables.length > 0) {
      return {
        id: 'rental_workflow',
        name: 'Film Rental Workflow',
        description: 'Process for renting a film by a customer.',
        tables: ['customer', 'film', 'rental', 'inventory', 'payment'],
        flowSequence: [
          {
            step: 1,
            table: 'customer',
            action: 'read',
            description: 'Customer identification and validation',
            dependencies: []
          },
          {
            step: 2,
            table: 'film',
            action: 'read',
            description: 'Film availability check',
            dependencies: ['customer']
          },
          {
            step: 3,
            table: 'rental',
            action: 'write',
            description: 'Rental record creation',
            dependencies: ['customer', 'film']
          },
          {
            step: 4,
            table: 'payment',
            action: 'write',
            description: 'Payment processing',
            dependencies: ['rental']
          },
          {
            step: 5,
            table: 'inventory',
            action: 'write',
            description: 'Inventory update',
            dependencies: ['rental', 'payment']
          }
        ],
        businessProcess: 'Film Rental',
        frequency: 'high',
        dataVolume: 'medium',
        performanceImpact: 'moderate'
      };
    }
    return null;
  }

  /**
   * NEW: Analyze a specific business workflow (e.g., customer management workflow)
   */
  private analyzeCustomerWorkflow(tables: TableSchema[], relationships: RelationshipSchema[]): DataFlowPattern | null {
    const customerTables = tables.filter(t => t.name.toLowerCase().includes('customer'));
    const paymentTables = tables.filter(t => t.name.toLowerCase().includes('payment'));
    const rentalTables = tables.filter(t => t.name.toLowerCase().includes('rental'));

    if (customerTables.length > 0 && paymentTables.length > 0 && rentalTables.length > 0) {
      return {
        id: 'customer_workflow',
        name: 'Customer Management Workflow',
        description: 'Process for managing customer information and payments.',
        tables: ['customer', 'payment', 'rental', 'address'],
        flowSequence: [
          {
            step: 1,
            table: 'customer',
            action: 'write',
            description: 'Customer account creation',
            dependencies: []
          },
          {
            step: 2,
            table: 'address',
            action: 'write',
            description: 'Address validation and storage',
            dependencies: ['customer']
          },
          {
            step: 3,
            table: 'payment',
            action: 'write',
            description: 'Payment method setup',
            dependencies: ['customer']
          },
          {
            step: 4,
            table: 'rental',
            action: 'read',
            description: 'Rental history access',
            dependencies: ['customer']
          }
        ],
        businessProcess: 'Customer Management',
        frequency: 'medium',
        dataVolume: 'small',
        performanceImpact: 'minimal'
      };
    }
    return null;
  }

  /**
   * NEW: Analyze a specific business workflow (e.g., payment processing workflow)
   */
  private analyzePaymentWorkflow(tables: TableSchema[], relationships: RelationshipSchema[]): DataFlowPattern | null {
    const paymentTables = tables.filter(t => t.name.toLowerCase().includes('payment'));
    const rentalTables = tables.filter(t => t.name.toLowerCase().includes('rental'));
    const customerTables = tables.filter(t => t.name.toLowerCase().includes('customer'));

    if (paymentTables.length > 0 && rentalTables.length > 0 && customerTables.length > 0) {
      return {
        id: 'payment_workflow',
        name: 'Payment Processing Workflow',
        description: 'Process for handling customer payments and rental transactions.',
        tables: ['customer', 'payment', 'rental'],
        flowSequence: [
          {
            step: 1,
            table: 'customer',
            action: 'read',
            description: 'Customer payment method validation',
            dependencies: []
          },
          {
            step: 2,
            table: 'payment',
            action: 'write',
            description: 'Payment transaction processing',
            dependencies: ['customer']
          },
          {
            step: 3,
            table: 'rental',
            action: 'write',
            description: 'Rental confirmation after payment',
            dependencies: ['payment']
          }
        ],
        businessProcess: 'Payment Processing',
        frequency: 'high',
        dataVolume: 'medium',
        performanceImpact: 'significant'
      };
    }
    return null;
  }

  /**
   * NEW: Analyze generic workflow patterns
   */
  private analyzeGenericWorkflows(tables: TableSchema[], relationships: RelationshipSchema[]): DataFlowPattern[] {
    const patterns: DataFlowPattern[] = [];

    // Example: If a table is frequently joined with another table, it might be part of a common workflow.
    const frequentlyJoinedTables = this.findFrequentlyJoinedTables(tables, relationships);
    if (frequentlyJoinedTables.length > 0) {
      patterns.push({
        id: 'generic_workflow',
        name: 'Generic Workflow',
        description: 'Common patterns observed across multiple tables.',
        tables: frequentlyJoinedTables,
        flowSequence: [
          {
            step: 1,
            table: 'user',
            action: 'read',
            description: 'Data entry and validation',
            dependencies: []
          },
          {
            step: 2,
            table: 'application',
            action: 'process',
            description: 'Data processing and transformation',
            dependencies: ['user']
          },
          {
            step: 3,
            table: 'database',
            action: 'write',
            description: 'Data storage and persistence',
            dependencies: ['application']
          }
        ],
        businessProcess: 'Generic Data Processing',
        frequency: 'continuous',
        dataVolume: 'large',
        performanceImpact: 'moderate'
      });
    }

    // Example: If a table is frequently updated and has a foreign key to another table,
    // it might be part of a cascading update/delete workflow.
    const tablesWithCascadingUpdates = this.findTablesWithCascadingUpdates(tables, relationships);
    if (tablesWithCascadingUpdates.length > 0) {
      patterns.push({
        id: 'cascading_workflow',
        name: 'Cascading Updates/Deletes',
        description: 'Common pattern where updates/deletes cascade across tables.',
        tables: tablesWithCascadingUpdates,
        flowSequence: [
          {
            step: 1,
            table: 'source',
            action: 'write',
            description: 'Update/Delete initiated on source table',
            dependencies: []
          },
          {
            step: 2,
            table: 'target',
            action: 'write',
            description: 'Cascading update/delete propagated',
            dependencies: ['source']
          },
          {
            step: 3,
            table: 'system',
            action: 'process',
            description: 'Data consistency maintenance',
            dependencies: ['target']
          }
        ],
        businessProcess: 'Data Consistency',
        frequency: 'medium',
        dataVolume: 'medium',
        performanceImpact: 'significant'
      });
    }

    return patterns;
  }

  /**
   * NEW: Find tables that are frequently joined together
   */
  private findFrequentlyJoinedTables(tables: TableSchema[], relationships: RelationshipSchema[]): string[] {
    const joinCount: { [key: string]: number } = {};
    relationships.forEach(rel => {
      if (rel.constraintName.toLowerCase().includes('fk')) { // Assuming foreign keys have 'fk' in their name
        joinCount[rel.sourceTable] = (joinCount[rel.sourceTable] || 0) + 1;
        joinCount[rel.targetTable] = (joinCount[rel.targetTable] || 0) + 1;
      }
    });

    const sortedTables = Object.entries(joinCount).sort(([, countA], [, countB]) => countB - countA);
    return sortedTables.map(([table]) => table).slice(0, 5); // Top 5 tables by join frequency
  }

  /**
   * NEW: Find tables that have cascading updates/deletes
   */
  private findTablesWithCascadingUpdates(tables: TableSchema[], relationships: RelationshipSchema[]): string[] {
    const cascadingUpdates: string[] = [];
    relationships.forEach(rel => {
      if (rel.deleteRule.toLowerCase() === 'cascade' || rel.updateRule.toLowerCase() === 'cascade') {
        cascadingUpdates.push(rel.sourceTable);
        cascadingUpdates.push(rel.targetTable);
      }
    });
    return [...new Set(cascadingUpdates)].slice(0, 5); // Top 5 tables by cascading frequency
  }

  /**
   * NEW: Create a business process object
   */
  private createFilmRentalProcess(tables: TableSchema[], relationships: RelationshipSchema[]): BusinessProcess {
    return {
      id: 'film_rental_process',
      name: 'Film Rental Process',
      description: 'Process for renting a film by a customer.',
      owner: 'Store Staff',
      trigger: 'Customer rental request',
      steps: [
        {
          stepNumber: 1,
          action: 'Customer identification and validation',
          table: 'customer',
          description: 'Verify customer identity and eligibility',
          businessRules: ['Customer must be active', 'Valid ID required'],
          dependencies: []
        },
        {
          stepNumber: 2,
          action: 'Film availability check',
          table: 'film',
          description: 'Check if requested film is available',
          businessRules: ['Film must be in stock', 'Age restrictions apply'],
          dependencies: ['customer']
        },
        {
          stepNumber: 3,
          action: 'Rental record creation',
          table: 'rental',
          description: 'Create rental transaction record',
          businessRules: ['Rental duration limits', 'Late fee policies'],
          dependencies: ['customer', 'film']
        },
        {
          stepNumber: 4,
          action: 'Payment processing',
          table: 'payment',
          description: 'Process rental payment',
          businessRules: ['Full payment required', 'Payment method validation'],
          dependencies: ['rental']
        },
        {
          stepNumber: 5,
          action: 'Inventory update',
          table: 'inventory',
          description: 'Update film inventory status',
          businessRules: ['Real-time inventory tracking', 'Stock level maintenance'],
          dependencies: ['payment']
        }
      ],
      tables: ['customer', 'film', 'rental', 'payment', 'inventory'],
      businessRules: [
        'Customer must be 18+ for adult films',
        'Rental duration maximum 30 days',
        'Late fees apply after due date',
        'Payment must be completed before rental'
      ],
      criticality: 'HIGH',
      estimatedDuration: '5-10 minutes',
      stakeholders: ['Customer', 'Store Staff', 'Management']
    };
  }

  /**
   * NEW: Create a business process object
   */
  private createCustomerManagementProcess(tables: TableSchema[], relationships: RelationshipSchema[]): BusinessProcess {
    return {
      id: 'customer_management_process',
      name: 'Customer Management Process',
      description: 'Process for managing customer information and payments.',
      owner: 'Customer Service',
      trigger: 'Customer registration or update request',
      steps: [
        {
          stepNumber: 1,
          action: 'Customer account creation',
          table: 'customer',
          description: 'Create new customer account',
          businessRules: ['Unique email required', 'Valid phone number'],
          dependencies: []
        },
        {
          stepNumber: 2,
          action: 'Address validation',
          table: 'address',
          description: 'Verify and store customer address',
          businessRules: ['Valid postal code', 'Supported region'],
          dependencies: ['customer']
        },
        {
          stepNumber: 3,
          action: 'Payment method setup',
          table: 'payment',
          description: 'Configure customer payment options',
          businessRules: ['Valid payment method', 'Security compliance'],
          dependencies: ['customer']
        },
        {
          stepNumber: 4,
          action: 'Account verification',
          table: 'customer',
          description: 'Verify customer account details',
          businessRules: ['Email verification', 'Phone verification'],
          dependencies: ['address', 'payment']
        }
      ],
      tables: ['customer', 'address', 'payment'],
      businessRules: [
        'Customer must provide valid contact information',
        'Address must be in supported regions',
        'Payment method must be verified',
        'Account verification required before activation'
      ],
      criticality: 'MEDIUM',
      estimatedDuration: '10-15 minutes',
      stakeholders: ['Customer', 'Customer Service', 'IT Support']
    };
  }

  /**
   * NEW: Create a business process object
   */
  private createPaymentProcess(tables: TableSchema[], relationships: RelationshipSchema[]): BusinessProcess {
    return {
      id: 'payment_process',
      name: 'Payment Processing Process',
      description: 'Process for handling customer payments and rental transactions.',
      owner: 'Finance Department',
      trigger: 'Payment transaction request',
      steps: [
        {
          stepNumber: 1,
          action: 'Payment validation',
          table: 'payment',
          description: 'Validate payment method and amount',
          businessRules: ['Valid payment method', 'Sufficient funds'],
          dependencies: []
        },
        {
          stepNumber: 2,
          action: 'Transaction processing',
          table: 'payment',
          description: 'Process payment through gateway',
          businessRules: ['Secure processing', 'Transaction logging'],
          dependencies: ['payment']
        },
        {
          stepNumber: 3,
          action: 'Confirmation generation',
          table: 'payment',
          description: 'Generate payment confirmation',
          businessRules: ['Receipt generation', 'Email notification'],
          dependencies: ['payment']
        },
        {
          stepNumber: 4,
          action: 'Record update',
          table: 'rental',
          description: 'Update rental status after payment',
          businessRules: ['Status synchronization', 'Audit trail'],
          dependencies: ['payment']
        }
      ],
      tables: ['payment', 'rental', 'customer'],
      businessRules: [
        'Payment must be processed securely',
        'Transaction must be logged for audit',
        'Confirmation must be sent to customer',
        'Rental status must be updated immediately'
      ],
      criticality: 'HIGH',
      estimatedDuration: '2-5 minutes',
      stakeholders: ['Customer', 'Finance', 'IT Security']
    };
  }

  /**
   * NEW: Create a business process object
   */
  private createStoreManagementProcess(tables: TableSchema[], relationships: RelationshipSchema[]): BusinessProcess {
    return {
      id: 'store_management_process',
      name: 'Store Management Process',
      description: 'Process for managing store inventory and customer interactions.',
      owner: 'Store Manager',
      trigger: 'Store operations or inventory changes',
      steps: [
        {
          stepNumber: 1,
          action: 'Inventory assessment',
          table: 'inventory',
          description: 'Review current inventory levels',
          businessRules: ['Regular stock counts', 'Threshold monitoring'],
          dependencies: []
        },
        {
          stepNumber: 2,
          action: 'Staff scheduling',
          table: 'staff',
          description: 'Manage staff schedules and assignments',
          businessRules: ['Minimum staffing requirements', 'Skill-based assignments'],
          dependencies: ['inventory']
        },
        {
          stepNumber: 3,
          action: 'Customer service',
          table: 'customer',
          description: 'Handle customer inquiries and issues',
          businessRules: ['Response time standards', 'Issue escalation'],
          dependencies: ['staff']
        },
        {
          stepNumber: 4,
          action: 'Performance monitoring',
          table: 'store',
          description: 'Track store performance metrics',
          businessRules: ['KPI monitoring', 'Report generation'],
          dependencies: ['customer', 'staff']
        }
      ],
      tables: ['inventory', 'staff', 'customer', 'store'],
      businessRules: [
        'Inventory must be checked daily',
        'Staff must be properly trained',
        'Customer issues must be resolved within 24 hours',
        'Performance reports must be generated weekly'
      ],
      criticality: 'MEDIUM',
      estimatedDuration: 'Ongoing',
      stakeholders: ['Store Manager', 'Staff', 'Customers', 'Management']
    };
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
    const cascadingUpdates = this.findTablesWithCascadingUpdates(allTables, relationships).filter(dep => dep === table.name);
    return [...new Set([...dependencies, ...cascadingUpdates])];
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
}
