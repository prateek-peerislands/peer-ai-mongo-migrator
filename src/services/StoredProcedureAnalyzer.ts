import { PostgreSQLService } from './PostgreSQLService.js';

export interface StoredProcedure {
  name: string;
  schema: string;
  parameters: ProcedureParameter[];
  returnType: string;
  definition: string;
  language: string;
  volatility: string;
  security: string;
  description?: string;
}

export interface ProcedureParameter {
  name: string;
  type: string;
  mode: 'IN' | 'OUT' | 'INOUT';
  default?: any;
  description?: string;
}

export interface StoredProcedureAnalysis {
  procedure: StoredProcedure;
  complexity: 'LOW' | 'MEDIUM' | 'HIGH';
  businessPurpose: string;
  migrationStrategy: 'FUNCTION' | 'SERVICE' | 'UTILITY' | 'MIDDLEWARE';
  estimatedEffort: number; // hours
  dependencies: string[];
  testCases: string[];
  migrationCode: string;
  businessLogic: string;
  performanceConsiderations: string[];
  securityImplications: string[];
}

export interface MigrationStrategy {
  procedures: StoredProcedureAnalysis[];
  totalEffort: number;
  complexityBreakdown: {
    low: number;
    medium: number;
    high: number;
  };
  recommendations: string[];
  migrationOrder: string[];
}

export class StoredProcedureAnalyzer {
  private postgresqlService: PostgreSQLService;

  constructor(postgresqlService: PostgreSQLService) {
    this.postgresqlService = postgresqlService;
  }

  /**
   * Analyze all stored procedures in the database
   */
  async analyzeAllStoredProcedures(): Promise<MigrationStrategy> {
    try {
      console.log('🔍 Starting stored procedure analysis...');
      
      // Extract all stored procedures
      const procedures = await this.extractStoredProcedures();
      console.log(`✅ Found ${procedures.length} stored procedures`);
      
      // Analyze each procedure
      const analyses: StoredProcedureAnalysis[] = [];
      for (const procedure of procedures) {
        const analysis = await this.analyzeProcedure(procedure);
        analyses.push(analysis);
      }
      
      // Generate migration strategy
      const strategy = await this.generateMigrationStrategy(analyses);
      
      console.log('🎉 Stored procedure analysis completed successfully');
      return strategy;
      
    } catch (error) {
      console.error('❌ Stored procedure analysis failed:', error);
      throw error;
    }
  }

  /**
   * Extract all stored procedures from PostgreSQL
   */
  private async extractStoredProcedures(): Promise<StoredProcedure[]> {
    try {
      const query = `
        SELECT 
          p.proname as name,
          p.proschema as schema,
          p.prosrc as definition,
          pg_get_function_result(p.oid) as return_type,
          p.prolang as language,
          p.provolatile as volatility,
          p.prosecdef as security,
          pg_get_function_arguments(p.oid) as arguments
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        ORDER BY p.proname
      `;

      const result = await this.postgresqlService.executeQuery(query);
      
      if (!result.success || !result.data) {
        return [];
      }

      const procedures: StoredProcedure[] = [];
      
      for (const row of result.data) {
        const parameters = this.parseProcedureParameters(row.arguments || '');
        
        const procedure: StoredProcedure = {
          name: row.name,
          schema: row.schema || 'public',
          parameters,
          returnType: row.return_type || 'void',
          definition: row.definition || '',
          language: row.language || 'sql',
          volatility: row.volatility || 'VOLATILE',
          security: row.security ? 'SECURITY DEFINER' : 'SECURITY INVOKER',
          description: this.generateProcedureDescription(row.name, parameters, row.definition)
        };
        
        procedures.push(procedure);
      }
      
      return procedures;
      
    } catch (error) {
      console.error('Failed to extract stored procedures:', error);
      return [];
    }
  }

  /**
   * Parse procedure parameters from PostgreSQL format
   */
  private parseProcedureParameters(argString: string): ProcedureParameter[] {
    if (!argString || argString === '') {
      return [];
    }

    const parameters: ProcedureParameter[] = [];
    const args = argString.split(',');
    
    for (const arg of args) {
      const trimmed = arg.trim();
      if (!trimmed) continue;
      
      // Parse parameter format: name type [mode]
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 2) {
        const name = parts[0];
        const type = parts[1];
        let mode: 'IN' | 'OUT' | 'INOUT' = 'IN';
        
        // Check for mode indicators
        if (parts.includes('OUT')) {
          mode = 'OUT';
        } else if (parts.includes('INOUT')) {
          mode = 'INOUT';
        }
        
        parameters.push({
          name,
          type,
          mode,
          description: this.generateParameterDescription(name, type, mode)
        });
      }
    }
    
    return parameters;
  }

  /**
   * Analyze a single stored procedure
   */
  private async analyzeProcedure(procedure: StoredProcedure): Promise<StoredProcedureAnalysis> {
    try {
      // Analyze complexity
      const complexity = this.analyzeComplexity(procedure);
      
      // Determine business purpose
      const businessPurpose = this.determineBusinessPurpose(procedure);
      
      // Determine migration strategy
      const migrationStrategy = this.determineMigrationStrategy(procedure, complexity);
      
      // Estimate effort
      const estimatedEffort = this.estimateEffort(procedure, complexity, migrationStrategy);
      
      // Identify dependencies
      const dependencies = await this.identifyDependencies(procedure);
      
      // Generate test cases
      const testCases = this.generateTestCases(procedure);
      
      // Generate migration code
      const migrationCode = this.generateMigrationCode(procedure, migrationStrategy);
      
      // Analyze business logic
      const businessLogic = this.analyzeBusinessLogic(procedure);
      
      // Performance considerations
      const performanceConsiderations = this.analyzePerformance(procedure);
      
      // Security implications
      const securityImplications = this.analyzeSecurity(procedure);
      
      return {
        procedure,
        complexity,
        businessPurpose,
        migrationStrategy,
        estimatedEffort,
        dependencies,
        testCases,
        migrationCode,
        businessLogic,
        performanceConsiderations,
        securityImplications
      };
      
    } catch (error) {
      console.error(`Failed to analyze procedure ${procedure.name}:`, error);
      throw error;
    }
  }

  /**
   * Analyze the complexity of a stored procedure
   */
  private analyzeComplexity(procedure: StoredProcedure): 'LOW' | 'MEDIUM' | 'HIGH' {
    let complexity = 0;
    
    // Parameter complexity
    complexity += procedure.parameters.length * 0.5;
    
    // Definition length complexity
    const definitionLength = procedure.definition.length;
    if (definitionLength > 1000) complexity += 3;
    else if (definitionLength > 500) complexity += 2;
    else if (definitionLength > 100) complexity += 1;
    
    // Language complexity
    if (procedure.language === 'plpgsql') complexity += 2;
    else if (procedure.language === 'sql') complexity += 1;
    
    // Return type complexity
    if (procedure.returnType !== 'void' && procedure.returnType !== 'integer') complexity += 1;
    
    // Volatility complexity
    if (procedure.volatility === 'IMMUTABLE') complexity += 1;
    else if (procedure.volatility === 'STABLE') complexity += 0.5;
    
    if (complexity < 3) return 'LOW';
    if (complexity < 6) return 'MEDIUM';
    return 'HIGH';
  }

  /**
   * Determine the business purpose of a stored procedure
   */
  private determineBusinessPurpose(procedure: StoredProcedure): string {
    const name = procedure.name.toLowerCase();
    const definition = procedure.definition.toLowerCase();
    
    // Analyze based on procedure name
    if (name.includes('get') || name.includes('fetch') || name.includes('select')) {
      return 'Data retrieval and querying';
    } else if (name.includes('insert') || name.includes('create') || name.includes('add')) {
      return 'Data creation and insertion';
    } else if (name.includes('update') || name.includes('modify') || name.includes('change')) {
      return 'Data modification and updates';
    } else if (name.includes('delete') || name.includes('remove') || name.includes('drop')) {
      return 'Data deletion and removal';
    } else if (name.includes('validate') || name.includes('check') || name.includes('verify')) {
      return 'Data validation and verification';
    } else if (name.includes('calculate') || name.includes('compute') || name.includes('sum')) {
      return 'Business calculations and computations';
    } else if (name.includes('report') || name.includes('summary') || name.includes('stats')) {
      return 'Reporting and analytics';
    } else if (name.includes('audit') || name.includes('log') || name.includes('track')) {
      return 'Auditing and logging';
    } else if (name.includes('notify') || name.includes('alert') || name.includes('email')) {
      return 'Notifications and alerts';
    } else if (name.includes('process') || name.includes('workflow') || name.includes('flow')) {
      return 'Business process and workflow management';
    }
    
    // Analyze based on definition content
    if (definition.includes('insert into')) return 'Data insertion operation';
    if (definition.includes('update ')) return 'Data update operation';
    if (definition.includes('delete from')) return 'Data deletion operation';
    if (definition.includes('select ')) return 'Data query operation';
    if (definition.includes('case when')) return 'Conditional business logic';
    if (definition.includes('sum(') || definition.includes('count(')) return 'Aggregation and calculation';
    
    return 'General business logic and data processing';
  }

  /**
   * Determine the best migration strategy for a stored procedure
   */
  private determineMigrationStrategy(
    procedure: StoredProcedure, 
    complexity: 'LOW' | 'MEDIUM' | 'HIGH'
  ): 'FUNCTION' | 'SERVICE' | 'UTILITY' | 'MIDDLEWARE' {
    
    const name = procedure.name.toLowerCase();
    const purpose = this.determineBusinessPurpose(procedure);
    
    // Simple utility functions
    if (complexity === 'LOW' && procedure.parameters.length <= 2) {
      return 'FUNCTION';
    }
    
    // Data access operations
    if (purpose.includes('Data retrieval') || purpose.includes('Data query')) {
      return 'SERVICE';
    }
    
    // Business logic and calculations
    if (purpose.includes('Business logic') || purpose.includes('calculation')) {
      return 'SERVICE';
    }
    
    // Validation and verification
    if (purpose.includes('validation') || purpose.includes('verification')) {
      return 'MIDDLEWARE';
    }
    
    // Complex operations
    if (complexity === 'HIGH') {
      return 'SERVICE';
    }
    
    // Default to service for most cases
    return 'SERVICE';
  }

  /**
   * Estimate the effort required for migration
   */
  private estimateEffort(
    procedure: StoredProcedure,
    complexity: 'LOW' | 'MEDIUM' | 'HIGH',
    strategy: 'FUNCTION' | 'SERVICE' | 'UTILITY' | 'MIDDLEWARE'
  ): number {
    let effort = 1; // Base effort
    
    // Complexity multiplier
    switch (complexity) {
      case 'LOW': effort += 0.5; break;
      case 'MEDIUM': effort += 1.5; break;
      case 'HIGH': effort += 3; break;
    }
    
    // Strategy multiplier
    switch (strategy) {
      case 'FUNCTION': effort += 0.5; break;
      case 'SERVICE': effort += 1; break;
      case 'UTILITY': effort += 0.5; break;
      case 'MIDDLEWARE': effort += 1.5; break;
    }
    
    // Parameter complexity
    effort += procedure.parameters.length * 0.2;
    
    // Definition complexity
    if (procedure.definition.length > 500) effort += 1;
    
    // Round to nearest 0.5 hour
    return Math.round(effort * 2) / 2;
  }

  /**
   * Identify dependencies for a stored procedure
   */
  private async identifyDependencies(procedure: StoredProcedure): Promise<string[]> {
    const dependencies: string[] = [];
    const definition = procedure.definition.toLowerCase();
    
    // Look for table references
    const tableMatches = definition.match(/from\s+(\w+)|join\s+(\w+)|into\s+(\w+)/g);
    if (tableMatches) {
      for (const match of tableMatches) {
        const tableName = match.replace(/from\s+|join\s+|into\s+/, '').trim();
        if (tableName && !dependencies.includes(tableName)) {
          dependencies.push(tableName);
        }
      }
    }
    
    // Look for function calls
    const functionMatches = definition.match(/(\w+)\(/g);
    if (functionMatches) {
      for (const match of functionMatches) {
        const functionName = match.replace('(', '').trim();
        if (functionName && !dependencies.includes(functionName) && functionName !== procedure.name) {
          dependencies.push(functionName);
        }
      }
    }
    
    return dependencies;
  }

  /**
   * Generate test cases for a stored procedure
   */
  private generateTestCases(procedure: StoredProcedure): string[] {
    const testCases: string[] = [];
    const purpose = this.determineBusinessPurpose(procedure);
    
    // Basic functionality test
    testCases.push(`Test ${procedure.name} with valid input parameters`);
    
    // Edge case tests
    if (procedure.parameters.length > 0) {
      testCases.push(`Test ${procedure.name} with null/undefined parameters`);
      testCases.push(`Test ${procedure.name} with boundary value parameters`);
    }
    
    // Business logic tests
    if (purpose.includes('validation')) {
      testCases.push(`Test ${procedure.name} with invalid data scenarios`);
    }
    
    if (purpose.includes('calculation')) {
      testCases.push(`Test ${procedure.name} with various calculation inputs`);
    }
    
    if (purpose.includes('Data retrieval')) {
      testCases.push(`Test ${procedure.name} with different query conditions`);
    }
    
    // Error handling tests
    testCases.push(`Test ${procedure.name} error handling and edge cases`);
    
    // Performance tests
    testCases.push(`Test ${procedure.name} performance with large datasets`);
    
    return testCases;
  }

  /**
   * Generate migration code for the stored procedure
   */
  private generateMigrationCode(
    procedure: StoredProcedure,
    strategy: 'FUNCTION' | 'SERVICE' | 'UTILITY' | 'MIDDLEWARE'
  ): string {
    
    const functionName = this.camelCase(procedure.name);
    const className = this.pascalCase(procedure.name);
    
    switch (strategy) {
      case 'FUNCTION':
        return this.generateFunctionCode(procedure, functionName);
      case 'SERVICE':
        return this.generateServiceCode(procedure, className);
      case 'UTILITY':
        return this.generateUtilityCode(procedure, functionName);
      case 'MIDDLEWARE':
        return this.generateMiddlewareCode(procedure, className);
      default:
        return this.generateServiceCode(procedure, className);
    }
  }

  /**
   * Generate Node.js function code
   */
  private generateFunctionCode(procedure: StoredProcedure, functionName: string): string {
    const params = procedure.parameters.map(p => `${p.name}: ${this.mapPostgreSQLToTypeScript(p.type)}`).join(', ');
    const returnType = this.mapPostgreSQLToTypeScript(procedure.returnType);
    
    return `/**
 * ${procedure.description || `Migrated from PostgreSQL stored procedure: ${procedure.name}`}
 * @param ${procedure.parameters.map(p => `${p.name} - ${p.description || p.type}`).join('\n * @param ')}
 * @returns ${returnType}
 */
export async function ${functionName}(${params}): Promise<${returnType}> {
  try {
    // TODO: Implement business logic migrated from PostgreSQL stored procedure
    // Original definition: ${procedure.definition.substring(0, 100)}...
    
    // Example implementation:
    const result = await performBusinessLogic(${procedure.parameters.map(p => p.name).join(', ')});
    
    return result;
  } catch (error) {
    console.error(\`Error in ${functionName}:\`, error);
    throw new Error(\`Failed to execute ${functionName}: \${error.message}\`);
  }
}

// Helper function to implement the actual business logic
async function performBusinessLogic(${params}): Promise<${returnType}> {
  // TODO: Implement the specific business logic here
  // This should replicate the functionality of the original stored procedure
  
  throw new Error('Business logic not yet implemented');
}`;
  }

  /**
   * Generate Node.js service class code
   */
  private generateServiceCode(procedure: StoredProcedure, className: string): string {
    const params = procedure.parameters.map(p => `${p.name}: ${this.mapPostgreSQLToTypeScript(p.type)}`).join(', ');
    const returnType = this.mapPostgreSQLToTypeScript(procedure.returnType);
    
    return `/**
 * ${className}Service - Migrated from PostgreSQL stored procedure: ${procedure.name}
 */
export class ${className}Service {
  constructor(
    // TODO: Inject required dependencies (database connections, other services, etc.)
    private readonly databaseService: DatabaseService,
    private readonly logger: Logger
  ) {}
  
  /**
   * ${procedure.description || `Execute business logic migrated from stored procedure: ${procedure.name}`}
   * @param ${procedure.parameters.map(p => `${p.name} - ${p.description || p.type}`).join('\n   * @param ')}
   * @returns ${returnType}
   */
  async execute(${params}): Promise<${returnType}> {
    try {
      this.logger.info(\`Executing ${className}Service.execute with params:\`, { ${procedure.parameters.map(p => p.name).join(', ')} });
      
      // TODO: Implement business logic migrated from PostgreSQL stored procedure
      // Original definition: ${procedure.definition.substring(0, 100)}...
      
      const result = await this.performBusinessLogic(${procedure.parameters.map(p => p.name).join(', ')});
      
      this.logger.info(\`${className}Service.execute completed successfully\`);
      return result;
      
    } catch (error) {
      this.logger.error(\`Error in ${className}Service.execute:\`, error);
      throw new Error(\`Failed to execute ${className}Service: \${error.message}\`);
    }
  }
  
  /**
   * Private method to implement the actual business logic
   */
  private async performBusinessLogic(${params}): Promise<${returnType}> {
    // TODO: Implement the specific business logic here
    // This should replicate the functionality of the original stored procedure
    
    throw new Error('Business logic not yet implemented');
  }
}`;
  }

  /**
   * Generate Node.js utility code
   */
  private generateUtilityCode(procedure: StoredProcedure, functionName: string): string {
    return this.generateFunctionCode(procedure, functionName);
  }

  /**
   * Generate Node.js middleware code
   */
  private generateMiddlewareCode(procedure: StoredProcedure, className: string): string {
    return `/**
 * ${className}Middleware - Migrated from PostgreSQL stored procedure: ${procedure.name}
 */
export class ${className}Middleware {
  /**
   * Middleware function for ${procedure.description || `validation migrated from stored procedure: ${procedure.name}`}
   */
  static validate(req: Request, res: Response, next: NextFunction): void {
    try {
      // TODO: Implement validation logic migrated from PostgreSQL stored procedure
      // Original definition: ${procedure.definition.substring(0, 100)}...
      
      // Example validation:
      const { ${procedure.parameters.map(p => p.name).join(', ')} } = req.body;
      
      // Perform validation
      const isValid = this.performValidation(${procedure.parameters.map(p => p.name).join(', ')});
      
      if (!isValid) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          message: 'Data validation failed based on business rules' 
        });
      }
      
      next();
      
    } catch (error) {
      console.error(\`Error in ${className}Middleware.validate:\`, error);
      res.status(500).json({ 
        error: 'Validation error', 
        message: 'Internal validation error occurred' 
      });
    }
  }
  
  /**
   * Private method to implement the actual validation logic
   */
  private static performValidation(${procedure.parameters.map(p => `${p.name}: ${this.mapPostgreSQLToTypeScript(p.type)}`).join(', ')}): boolean {
    // TODO: Implement the specific validation logic here
    // This should replicate the functionality of the original stored procedure
    
    return true; // Placeholder - implement actual validation
  }
}`;
  }

  /**
   * Analyze the business logic of a stored procedure
   */
  private analyzeBusinessLogic(procedure: StoredProcedure): string {
    const definition = procedure.definition.toLowerCase();
    let logic = '';
    
    if (definition.includes('insert into')) {
      logic += 'Data insertion operation. ';
    }
    if (definition.includes('update ')) {
      logic += 'Data modification operation. ';
    }
    if (definition.includes('delete from')) {
      logic += 'Data removal operation. ';
    }
    if (definition.includes('select ')) {
      logic += 'Data retrieval operation. ';
    }
    if (definition.includes('case when')) {
      logic += 'Conditional business logic with multiple decision paths. ';
    }
    if (definition.includes('sum(') || definition.includes('count(') || definition.includes('avg(')) {
      logic += 'Aggregation and calculation operations. ';
    }
    if (definition.includes('join ')) {
      logic += 'Data relationship processing across multiple tables. ';
    }
    if (definition.includes('where ')) {
      logic += 'Data filtering and conditional processing. ';
    }
    
    if (!logic) {
      logic = 'General business logic processing with custom operations.';
    }
    
    return logic;
  }

  /**
   * Analyze performance considerations
   */
  private analyzePerformance(procedure: StoredProcedure): string[] {
    const considerations: string[] = [];
    const definition = procedure.definition.toLowerCase();
    
    if (definition.includes('join ')) {
      considerations.push('Multiple table joins may impact performance - consider indexing strategy');
    }
    
    if (definition.includes('where ')) {
      considerations.push('WHERE clauses should be optimized with proper indexes');
    }
    
    if (definition.includes('order by')) {
      considerations.push('ORDER BY operations may benefit from compound indexes');
    }
    
    if (definition.includes('group by')) {
      considerations.push('GROUP BY operations may require aggregation optimization');
    }
    
    if (definition.includes('distinct')) {
      considerations.push('DISTINCT operations can be expensive - consider alternative approaches');
    }
    
    if (procedure.parameters.length > 5) {
      considerations.push('High parameter count may impact function call performance');
    }
    
    if (procedure.definition.length > 1000) {
      considerations.push('Complex procedure logic may benefit from optimization and refactoring');
    }
    
    return considerations;
  }

  /**
   * Analyze security implications
   */
  private analyzeSecurity(procedure: StoredProcedure): string[] {
    const implications: string[] = [];
    
    if (procedure.security === 'SECURITY DEFINER') {
      implications.push('Procedure runs with definer privileges - security review required');
    }
    
    if (procedure.definition.includes('dynamic sql') || procedure.definition.includes('execute')) {
      implications.push('Dynamic SQL execution may pose SQL injection risks');
    }
    
    if (procedure.definition.includes('file') || procedure.definition.includes('network')) {
      implications.push('File or network operations may have security implications');
    }
    
    if (procedure.parameters.some(p => p.mode === 'OUT' || p.mode === 'INOUT')) {
      implications.push('Output parameters may expose sensitive data');
    }
    
    implications.push('Ensure proper input validation and sanitization');
    implications.push('Implement appropriate access controls and authentication');
    
    return implications;
  }

  /**
   * Generate migration strategy
   */
  private async generateMigrationStrategy(analyses: StoredProcedureAnalysis[]): Promise<MigrationStrategy> {
    const totalEffort = analyses.reduce((sum, analysis) => sum + analysis.estimatedEffort, 0);
    
    const complexityBreakdown = {
      low: analyses.filter(a => a.complexity === 'LOW').length,
      medium: analyses.filter(a => a.complexity === 'MEDIUM').length,
      high: analyses.filter(a => a.complexity === 'HIGH').length
    };
    
    // Sort by complexity and effort for migration order
    const sortedAnalyses = analyses.sort((a, b) => {
      const complexityOrder = { 'LOW': 1, 'MEDIUM': 2, 'HIGH': 3 };
      if (complexityOrder[a.complexity] !== complexityOrder[b.complexity]) {
        return complexityOrder[a.complexity] - complexityOrder[b.complexity];
      }
      return a.estimatedEffort - b.estimatedEffort;
    });
    
    const migrationOrder = sortedAnalyses.map(a => a.procedure.name);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(analyses);
    
    return {
      procedures: analyses,
      totalEffort,
      complexityBreakdown,
      recommendations,
      migrationOrder
    };
  }

  /**
   * Generate migration recommendations
   */
  private generateRecommendations(analyses: StoredProcedureAnalysis[]): string[] {
    const recommendations: string[] = [];
    
    // Complexity-based recommendations
    const highComplexity = analyses.filter(a => a.complexity === 'HIGH');
    if (highComplexity.length > 0) {
      recommendations.push(`Focus on ${highComplexity.length} high-complexity procedures first - they require the most attention`);
    }
    
    // Strategy-based recommendations
    const serviceCount = analyses.filter(a => a.migrationStrategy === 'SERVICE').length;
    if (serviceCount > 0) {
      recommendations.push(`Create ${serviceCount} service classes for business logic procedures`);
    }
    
    const functionCount = analyses.filter(a => a.migrationStrategy === 'FUNCTION').length;
    if (functionCount > 0) {
      recommendations.push(`Implement ${functionCount} utility functions for simple operations`);
    }
    
    const middlewareCount = analyses.filter(a => a.migrationStrategy === 'MIDDLEWARE').length;
    if (middlewareCount > 0) {
      recommendations.push(`Develop ${middlewareCount} middleware components for validation and processing`);
    }
    
    // General recommendations
    recommendations.push('Implement comprehensive testing for all migrated procedures');
    recommendations.push('Use dependency injection for better testability and maintainability');
    recommendations.push('Consider implementing circuit breakers for complex operations');
    recommendations.push('Add proper logging and monitoring for all migrated procedures');
    
    return recommendations;
  }

  /**
   * Helper methods for code generation
   */
  private camelCase(str: string): string {
    return str.replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '');
  }

  private pascalCase(str: string): string {
    const camel = this.camelCase(str);
    return camel.charAt(0).toUpperCase() + camel.slice(1);
  }

  private mapPostgreSQLToTypeScript(postgresType: string): string {
    const typeMap: { [key: string]: string } = {
      'integer': 'number',
      'bigint': 'number',
      'smallint': 'number',
      'decimal': 'number',
      'numeric': 'number',
      'real': 'number',
      'double precision': 'number',
      'text': 'string',
      'varchar': 'string',
      'char': 'string',
      'boolean': 'boolean',
      'timestamp': 'Date',
      'timestamptz': 'Date',
      'date': 'Date',
      'time': 'string',
      'json': 'any',
      'jsonb': 'any',
      'uuid': 'string',
      'bytea': 'Buffer',
      'void': 'void'
    };
    
    return typeMap[postgresType.toLowerCase()] || 'any';
  }

  private generateProcedureDescription(name: string, parameters: ProcedureParameter[], definition: string): string {
    const paramCount = parameters.length;
    const hasReturn = definition.includes('return') || definition.includes('select');
    
    let description = `Stored procedure ${name}`;
    
    if (paramCount > 0) {
      description += ` with ${paramCount} parameter${paramCount > 1 ? 's' : ''}`;
    }
    
    if (hasReturn) {
      description += ' that returns data';
    } else {
      description += ' that performs operations';
    }
    
    return description;
  }

  private generateParameterDescription(name: string, type: string, mode: 'IN' | 'OUT' | 'INOUT'): string {
    let description = `${mode.toLowerCase()} parameter of type ${type}`;
    
    if (mode === 'OUT') {
      description += ' - value returned by the procedure';
    } else if (mode === 'INOUT') {
      description += ' - value passed in and potentially modified';
    }
    
    return description;
  }
}
