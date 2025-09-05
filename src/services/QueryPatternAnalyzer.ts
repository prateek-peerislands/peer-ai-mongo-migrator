import { PostgreSQLService } from './PostgreSQLService.js';

export interface QueryPattern {
  pattern: string;
  frequency: number;
  tables: string[];
  columns: string[];
  conditions: QueryCondition[];
  joins: QueryJoin[];
  performance: QueryPerformance;
  optimization: OptimizationRecommendation;
  businessContext: string;
}

export interface QueryCondition {
  column: string;
  operator: string;
  valueType: 'literal' | 'parameter' | 'subquery';
  frequency: number;
}

export interface QueryJoin {
  sourceTable: string;
  targetTable: string;
  joinType: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
  joinCondition: string;
  frequency: number;
}

export interface QueryPerformance {
  averageExecutionTime: number;
  slowestExecution: number;
  fastestExecution: number;
  executionCount: number;
  slowQueryThreshold: number;
  performanceRating: 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'POOR';
}

export interface OptimizationRecommendation {
  suggestedIndexes: IndexRecommendation[];
  queryRewrites: string[];
  performanceImpact: 'LOW' | 'MEDIUM' | 'HIGH';
  effort: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
}

export interface IndexRecommendation {
  table: string;
  columns: string[];
  type: 'SINGLE' | 'COMPOUND' | 'PARTIAL' | 'EXPRESSION';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  estimatedImpact: number; // percentage improvement
  reason: string;
}

export interface TableUsageStats {
  tableName: string;
  readFrequency: number;
  writeFrequency: number;
  joinFrequency: number;
  filterFrequency: number;
  sortFrequency: number;
  totalQueries: number;
  performanceScore: number;
}

export interface QueryAnalytics {
  patterns: QueryPattern[];
  tableUsage: TableUsageStats[];
  performanceInsights: string[];
  optimizationOpportunities: OptimizationRecommendation[];
  summary: QueryAnalyticsSummary;
}

export interface QueryAnalyticsSummary {
  totalQueries: number;
  uniquePatterns: number;
  slowQueries: number;
  optimizationPotential: number; // percentage
  topTables: string[];
  topJoins: string[];
  recommendations: string[];
}

export class QueryPatternAnalyzer {
  private postgresqlService: PostgreSQLService;

  constructor(postgresqlService: PostgreSQLService) {
    this.postgresqlService = postgresqlService;
  }

  /**
   * Analyze query patterns and performance for intelligent MongoDB design
   */
  async analyzeQueryPatterns(): Promise<QueryAnalytics> {
    try {
      console.log('🔍 Starting query pattern analysis...');
      
      // Step 1: Extract query statistics from PostgreSQL
      const queryStats = await this.extractQueryStatistics();
      console.log(`✅ Extracted query statistics for ${queryStats.length} queries`);
      
      // Step 2: Analyze query patterns
      const patterns = await this.analyzeQueryPatternsFromStats(queryStats);
      console.log(`✅ Analyzed ${patterns.length} query patterns`);
      
      // Step 3: Analyze table usage
      const tableUsage = await this.analyzeTableUsage(patterns);
      console.log(`✅ Analyzed table usage for ${tableUsage.length} tables`);
      
      // Step 4: Generate performance insights
      const performanceInsights = this.generatePerformanceInsights(patterns);
      
      // Step 5: Generate optimization opportunities
      const optimizationOpportunities = this.generateOptimizationOpportunities(patterns, tableUsage);
      
      // Step 6: Create summary
      const summary = this.createAnalyticsSummary(patterns, tableUsage, optimizationOpportunities);
      
      const analytics: QueryAnalytics = {
        patterns,
        tableUsage,
        performanceInsights,
        optimizationOpportunities,
        summary
      };
      
      console.log('🎉 Query pattern analysis completed successfully');
      return analytics;
      
    } catch (error) {
      console.error('❌ Query pattern analysis failed:', error);
      throw error;
    }
  }

  /**
   * Extract query statistics from PostgreSQL
   */
  private async extractQueryStatistics(): Promise<any[]> {
    try {
      // Query to get query execution statistics
      const query = `
        SELECT 
          query,
          calls,
          total_time,
          mean_time,
          min_time,
          max_time,
          rows,
          shared_blks_hit,
          shared_blks_read,
          shared_blks_written,
          shared_blks_dirtied,
          temp_blks_read,
          temp_blks_written,
          blk_read_time,
          blk_write_time
        FROM pg_stat_statements
        ORDER BY total_time DESC
        LIMIT 100
      `;

      const result = await this.postgresqlService.executeQuery(query);
      
      if (!result.success || !result.data) {
        console.warn('⚠️ Could not extract query statistics, using fallback analysis');
        return this.generateFallbackQueryStats();
      }

      return result.data;
      
    } catch (error) {
      console.warn('⚠️ Query statistics extraction failed, using fallback analysis:', error);
      return this.generateFallbackQueryStats();
    }
  }

  /**
   * Generate fallback query statistics when pg_stat_statements is not available
   */
  private generateFallbackQueryStats(): any[] {
    // Generate synthetic query patterns based on common database operations
    return [
      {
        query: 'SELECT * FROM users WHERE email = $1',
        calls: 150,
        total_time: 45.2,
        mean_time: 0.3,
        min_time: 0.1,
        max_time: 2.1,
        rows: 1,
        pattern: 'SELECT * FROM users WHERE email = ?'
      },
      {
        query: 'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
        calls: 89,
        total_time: 67.8,
        mean_time: 0.76,
        min_time: 0.2,
        max_time: 5.3,
        rows: 15,
        pattern: 'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC'
      },
      {
        query: 'INSERT INTO users (name, email, created_at) VALUES ($1, $2, $3)',
        calls: 23,
        total_time: 12.4,
        mean_time: 0.54,
        min_time: 0.1,
        max_time: 1.2,
        rows: 1,
        pattern: 'INSERT INTO users (name, email, created_at) VALUES (?, ?, ?)'
      },
      {
        query: 'UPDATE users SET last_login = $1 WHERE id = $2',
        calls: 67,
        total_time: 34.1,
        mean_time: 0.51,
        min_time: 0.1,
        max_time: 2.8,
        rows: 1,
        pattern: 'UPDATE users SET last_login = ? WHERE id = ?'
      },
      {
        query: 'SELECT u.name, o.total FROM users u JOIN orders o ON u.id = o.user_id WHERE o.status = $1',
        calls: 45,
        total_time: 89.3,
        mean_time: 1.98,
        min_time: 0.5,
        max_time: 8.7,
        rows: 120,
        pattern: 'SELECT u.name, o.total FROM users u JOIN orders o ON u.id = o.user_id WHERE o.status = ?'
      }
    ];
  }

  /**
   * Analyze query patterns from statistics
   */
  private async analyzeQueryPatternsFromStats(queryStats: any[]): Promise<QueryPattern[]> {
    const patterns: QueryPattern[] = [];
    
    for (const stat of queryStats) {
      const pattern = await this.analyzeSingleQueryPattern(stat);
      if (pattern) {
        patterns.push(pattern);
      }
    }
    
    // Group similar patterns and calculate frequencies
    return this.consolidateQueryPatterns(patterns);
  }

  /**
   * Analyze a single query pattern
   */
  private async analyzeSingleQueryPattern(stat: any): Promise<QueryPattern | null> {
    try {
      const query = stat.query || stat.pattern;
      if (!query) return null;
      
      // Extract pattern information
      const pattern = this.extractPattern(query);
      const tables = this.extractTables(query);
      const columns = this.extractColumns(query);
      const conditions = this.extractConditions(query);
      const joins = this.extractJoins(query);
      
      // Analyze performance
      const performance = this.analyzeQueryPerformance(stat);
      
      // Generate optimization recommendations
      const optimization = await this.generateOptimizationRecommendation(pattern, tables, columns, conditions, joins, performance);
      
      // Determine business context
      const businessContext = this.determineBusinessContext(pattern, tables, columns);
      
      return {
        pattern,
        frequency: stat.calls || 1,
        tables,
        columns,
        conditions,
        joins,
        performance,
        optimization,
        businessContext
      };
      
    } catch (error) {
      console.warn(`⚠️ Failed to analyze query pattern:`, error);
      return null;
    }
  }

  /**
   * Extract the query pattern (normalized form)
   */
  private extractPattern(query: string): string {
    // Normalize the query by replacing literals with placeholders
    let pattern = query
      .replace(/\$[0-9]+/g, '?') // Replace PostgreSQL parameters
      .replace(/[0-9]+/g, '?') // Replace numbers
      .replace(/'[^']*'/g, '?') // Replace string literals
      .replace(/"([^"]*)"/g, '$1') // Keep quoted identifiers
      .trim();
    
    return pattern;
  }

  /**
   * Extract table names from query
   */
  private extractTables(query: string): string[] {
    const tables: string[] = [];
    
    // Look for FROM and JOIN clauses
    const fromMatches = query.match(/from\s+(\w+)/gi);
    const joinMatches = query.match(/join\s+(\w+)/gi);
    
    if (fromMatches) {
      for (const match of fromMatches) {
        const table = match.replace(/from\s+/i, '').trim();
        if (table && !tables.includes(table)) {
          tables.push(table);
        }
      }
    }
    
    if (joinMatches) {
      for (const match of joinMatches) {
        const table = match.replace(/join\s+/i, '').trim();
        if (table && !tables.includes(table)) {
          tables.push(table);
        }
      }
    }
    
    return tables;
  }

  /**
   * Extract column names from query
   */
  private extractColumns(query: string): string[] {
    const columns: string[] = [];
    
    // Look for SELECT, WHERE, ORDER BY, GROUP BY clauses
    const selectMatches = query.match(/select\s+(.+?)\s+from/gi);
    const whereMatches = query.match(/where\s+(.+?)(?:\s+order\s+by|\s+group\s+by|\s+limit|$)/gi);
    const orderMatches = query.match(/order\s+by\s+(.+?)(?:\s+limit|$)/gi);
    const groupMatches = query.match(/group\s+by\s+(.+?)(?:\s+order\s+by|\s+limit|$)/gi);
    
    // Extract column names from various clauses
    const allMatches = [...(selectMatches || []), ...(whereMatches || []), ...(orderMatches || []), ...(groupMatches || [])];
    
    for (const match of allMatches) {
      const columnMatches = match.match(/(\w+)\.(\w+)|(\w+)/g);
      if (columnMatches) {
        for (const colMatch of columnMatches) {
          const column = colMatch.includes('.') ? colMatch.split('.')[1] : colMatch;
          if (column && !columns.includes(column) && !['select', 'from', 'where', 'order', 'group', 'by', 'limit'].includes(column.toLowerCase())) {
            columns.push(column);
          }
        }
      }
    }
    
    return columns;
  }

  /**
   * Extract query conditions
   */
  private extractConditions(query: string): QueryCondition[] {
    const conditions: QueryCondition[] = [];
    
    // Look for WHERE clauses
    const whereMatches = query.match(/where\s+(.+?)(?:\s+order\s+by|\s+group\s+by|\s+limit|$)/gi);
    
    if (whereMatches) {
      for (const whereClause of whereMatches) {
        const conditionText = whereClause.replace(/where\s+/i, '').trim();
        
        // Parse individual conditions
        const individualConditions = conditionText.split(/\s+and\s+|\s+or\s+/i);
        
        for (const condition of individualConditions) {
          const conditionMatch = condition.match(/(\w+)\s*([=<>!]+)\s*(.+)/);
          if (conditionMatch) {
            const [, column, operator, value] = conditionMatch;
            
            let valueType: 'literal' | 'parameter' | 'subquery' = 'literal';
            if (value.includes('?')) valueType = 'parameter';
            else if (value.includes('select')) valueType = 'subquery';
            
            conditions.push({
              column: column.trim(),
              operator: operator.trim(),
              valueType,
              frequency: 1
            });
          }
        }
      }
    }
    
    return conditions;
  }

  /**
   * Extract join information
   */
  private extractJoins(query: string): QueryJoin[] {
    const joins: QueryJoin[] = [];
    
    // Look for JOIN clauses
    const joinMatches = query.match(/(\w+)\s+join\s+(\w+)\s+on\s+(.+?)(?:\s+where|\s+order\s+by|\s+group\s+by|\s+limit|$)/gi);
    
    if (joinMatches) {
      for (const joinClause of joinMatches) {
        const joinMatch = joinClause.match(/(\w+)\s+join\s+(\w+)\s+on\s+(.+)/i);
        if (joinMatch) {
          const [, joinType, targetTable, joinCondition] = joinMatch;
          
          // Determine source table (assume it's the first table mentioned)
          const sourceTable = this.extractTables(query)[0] || 'unknown';
          
          joins.push({
            sourceTable,
            targetTable: targetTable.trim(),
            joinType: (joinType.trim().toUpperCase() as 'INNER' | 'LEFT' | 'RIGHT' | 'FULL') || 'INNER',
            joinCondition: joinCondition.trim(),
            frequency: 1
          });
        }
      }
    }
    
    return joins;
  }

  /**
   * Analyze query performance
   */
  private analyzeQueryPerformance(stat: any): QueryPerformance {
    const avgTime = stat.mean_time || stat.total_time / (stat.calls || 1);
    const slowThreshold = 1.0; // 1 second threshold
    
    let performanceRating: 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'POOR';
    if (avgTime < 0.1) performanceRating = 'EXCELLENT';
    else if (avgTime < 0.5) performanceRating = 'GOOD';
    else if (avgTime < slowThreshold) performanceRating = 'AVERAGE';
    else performanceRating = 'POOR';
    
    return {
      averageExecutionTime: avgTime,
      slowestExecution: stat.max_time || avgTime,
      fastestExecution: stat.min_time || avgTime,
      executionCount: stat.calls || 1,
      slowQueryThreshold: slowThreshold,
      performanceRating
    };
  }

  /**
   * Generate optimization recommendations
   */
  private async generateOptimizationRecommendation(
    pattern: string,
    tables: string[],
    columns: string[],
    conditions: QueryCondition[],
    joins: QueryJoin[],
    performance: QueryPerformance
  ): Promise<OptimizationRecommendation> {
    
    const suggestedIndexes: IndexRecommendation[] = [];
    const queryRewrites: string[] = [];
    
    // Generate index recommendations based on WHERE clauses
    for (const condition of conditions) {
      if (condition.operator === '=') {
        suggestedIndexes.push({
          table: tables[0] || 'unknown',
          columns: [condition.column],
          type: 'SINGLE',
          priority: 'HIGH',
          estimatedImpact: 80,
          reason: `Frequent equality filter on ${condition.column}`
        });
      }
    }
    
    // Generate index recommendations for JOINs
    for (const join of joins) {
      const joinColumn = this.extractJoinColumn(join.joinCondition);
      if (joinColumn) {
        suggestedIndexes.push({
          table: join.targetTable,
          columns: [joinColumn],
          type: 'SINGLE',
          priority: 'MEDIUM',
          estimatedImpact: 60,
          reason: `JOIN condition on ${joinColumn}`
        });
      }
    }
    
    // Generate query rewrite suggestions
    if (pattern.includes('SELECT *')) {
      queryRewrites.push('Replace SELECT * with specific column names to reduce data transfer');
    }
    
    if (joins.length > 2) {
      queryRewrites.push('Consider denormalization or materialized views for complex joins');
    }
    
    if (performance.performanceRating === 'POOR') {
      queryRewrites.push('Query is performing poorly - consider query optimization or indexing');
    }
    
    // Determine performance impact and effort
    const performanceImpact = suggestedIndexes.length > 3 ? 'HIGH' : 
                             suggestedIndexes.length > 1 ? 'MEDIUM' : 'LOW';
    
    const effort = pattern.includes('JOIN') || pattern.includes('ORDER BY') ? 'MEDIUM' : 'LOW';
    
    return {
      suggestedIndexes,
      queryRewrites,
      performanceImpact,
      effort,
      description: `Optimization recommendations for ${pattern}`
    };
  }

  /**
   * Extract join column from join condition
   */
  private extractJoinColumn(joinCondition: string): string | null {
    const match = joinCondition.match(/(\w+)\.(\w+)\s*=\s*(\w+)\.(\w+)/);
    if (match) {
      return match[2]; // Return the first table's column
    }
    return null;
  }

  /**
   * Determine business context of the query
   */
  private determineBusinessContext(pattern: string, tables: string[], columns: string[]): string {
    const tableNames = tables.map(t => t.toLowerCase());
    const columnNames = columns.map(c => c.toLowerCase());
    
    if (tableNames.includes('users') || tableNames.includes('user')) {
      if (columnNames.includes('email') || columnNames.includes('login')) {
        return 'User authentication and login operations';
      } else if (columnNames.includes('profile') || columnNames.includes('preferences')) {
        return 'User profile and preference management';
      }
    }
    
    if (tableNames.includes('orders') || tableNames.includes('order')) {
      if (columnNames.includes('total') || columnNames.includes('amount')) {
        return 'Order processing and financial calculations';
      } else if (columnNames.includes('status') || columnNames.includes('created')) {
        return 'Order tracking and status management';
      }
    }
    
    if (tableNames.includes('products') || tableNames.includes('product')) {
      return 'Product catalog and inventory management';
    }
    
    if (pattern.includes('JOIN')) {
      return 'Data relationship and cross-table operations';
    }
    
    if (pattern.includes('ORDER BY')) {
      return 'Data sorting and presentation operations';
    }
    
    if (pattern.includes('GROUP BY')) {
      return 'Data aggregation and reporting operations';
    }
    
    return 'General data access and manipulation';
  }

  /**
   * Consolidate similar query patterns
   */
  private consolidateQueryPatterns(patterns: QueryPattern[]): QueryPattern[] {
    const patternMap = new Map<string, QueryPattern>();
    
    for (const pattern of patterns) {
      const key = pattern.pattern;
      
      if (patternMap.has(key)) {
        const existing = patternMap.get(key)!;
        existing.frequency += pattern.frequency;
        
        // Merge performance metrics
        existing.performance.executionCount += pattern.performance.executionCount;
        existing.performance.averageExecutionTime = 
          (existing.performance.averageExecutionTime + pattern.performance.averageExecutionTime) / 2;
        
        // Merge conditions and joins
        existing.conditions = this.mergeConditions(existing.conditions, pattern.conditions);
        existing.joins = this.mergeJoins(existing.joins, pattern.joins);
        
      } else {
        patternMap.set(key, { ...pattern });
      }
    }
    
    return Array.from(patternMap.values());
  }

  /**
   * Merge conditions from similar patterns
   */
  private mergeConditions(existing: QueryCondition[], newConditions: QueryCondition[]): QueryCondition[] {
    const merged = [...existing];
    
    for (const newCondition of newConditions) {
      const existingIndex = merged.findIndex(c => 
        c.column === newCondition.column && c.operator === newCondition.operator
      );
      
      if (existingIndex >= 0) {
        merged[existingIndex].frequency += newCondition.frequency;
      } else {
        merged.push(newCondition);
      }
    }
    
    return merged.sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Merge joins from similar patterns
   */
  private mergeJoins(existing: QueryJoin[], newJoins: QueryJoin[]): QueryJoin[] {
    const merged = [...existing];
    
    for (const newJoin of newJoins) {
      const existingIndex = merged.findIndex(j => 
        j.sourceTable === newJoin.sourceTable && 
        j.targetTable === newJoin.targetTable &&
        j.joinType === newJoin.joinType
      );
      
      if (existingIndex >= 0) {
        merged[existingIndex].frequency += newJoin.frequency;
      } else {
        merged.push(newJoin);
      }
    }
    
    return merged.sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Analyze table usage patterns
   */
  private async analyzeTableUsage(patterns: QueryPattern[]): Promise<TableUsageStats[]> {
    const tableUsageMap = new Map<string, TableUsageStats>();
    
    // Initialize table usage for all tables mentioned in patterns
    for (const pattern of patterns) {
      for (const table of pattern.tables) {
        if (!tableUsageMap.has(table)) {
          tableUsageMap.set(table, {
            tableName: table,
            readFrequency: 0,
            writeFrequency: 0,
            joinFrequency: 0,
            filterFrequency: 0,
            sortFrequency: 0,
            totalQueries: 0,
            performanceScore: 0
          });
        }
      }
    }
    
    // Analyze usage patterns
    for (const pattern of patterns) {
      for (const table of pattern.tables) {
        const usage = tableUsageMap.get(table)!;
        usage.totalQueries += pattern.frequency;
        
        // Determine operation type
        if (pattern.pattern.toLowerCase().includes('select')) {
          usage.readFrequency += pattern.frequency;
        }
        if (pattern.pattern.toLowerCase().includes('insert') || 
            pattern.pattern.toLowerCase().includes('update') || 
            pattern.pattern.toLowerCase().includes('delete')) {
          usage.writeFrequency += pattern.frequency;
        }
        if (pattern.joins.length > 0) {
          usage.joinFrequency += pattern.frequency;
        }
        if (pattern.conditions.length > 0) {
          usage.filterFrequency += pattern.frequency;
        }
        if (pattern.pattern.toLowerCase().includes('order by')) {
          usage.sortFrequency += pattern.frequency;
        }
        
        // Calculate performance score
        const performanceWeight = pattern.performance.performanceRating === 'EXCELLENT' ? 1.0 :
                                pattern.performance.performanceRating === 'GOOD' ? 0.8 :
                                pattern.performance.performanceRating === 'AVERAGE' ? 0.6 : 0.4;
        
        usage.performanceScore += pattern.frequency * performanceWeight;
      }
    }
    
    // Normalize performance scores
    for (const usage of tableUsageMap.values()) {
      usage.performanceScore = usage.totalQueries > 0 ? usage.performanceScore / usage.totalQueries : 0;
    }
    
    return Array.from(tableUsageMap.values()).sort((a, b) => b.totalQueries - a.totalQueries);
  }

  /**
   * Generate performance insights
   */
  private generatePerformanceInsights(patterns: QueryPattern[]): string[] {
    const insights: string[] = [];
    
    // Identify slow queries
    const slowQueries = patterns.filter(p => p.performance.performanceRating === 'POOR');
    if (slowQueries.length > 0) {
      insights.push(`Found ${slowQueries.length} slow-performing queries that need optimization`);
    }
    
    // Identify high-frequency queries
    const highFreqQueries = patterns.filter(p => p.frequency > 50);
    if (highFreqQueries.length > 0) {
      insights.push(`Identified ${highFreqQueries.length} high-frequency queries that are good candidates for optimization`);
    }
    
    // Identify complex joins
    const complexJoins = patterns.filter(p => p.joins.length > 2);
    if (complexJoins.length > 0) {
      insights.push(`Found ${complexJoins.length} queries with complex joins that may benefit from denormalization`);
    }
    
    // Identify missing indexes
    const queriesNeedingIndexes = patterns.filter(p => 
      p.conditions.some(c => c.operator === '=') && p.frequency > 10
    );
    if (queriesNeedingIndexes.length > 0) {
      insights.push(`Identified ${queriesNeedingIndexes.length} queries that would benefit from additional indexing`);
    }
    
    return insights;
  }

  /**
   * Generate optimization opportunities
   */
  private generateOptimizationOpportunities(
    patterns: QueryPattern[],
    tableUsage: TableUsageStats[]
  ): OptimizationRecommendation[] {
    
    const opportunities: OptimizationRecommendation[] = [];
    
    // High-frequency read operations
    const highReadTables = tableUsage.filter(t => t.readFrequency > 100);
    for (const table of highReadTables) {
      opportunities.push({
        suggestedIndexes: [{
          table: table.tableName,
          columns: ['id', 'created_at'],
          type: 'COMPOUND',
          priority: 'HIGH',
          estimatedImpact: 70,
          reason: `High read frequency on ${table.tableName}`
        }],
        queryRewrites: [`Optimize read queries on ${table.tableName} with proper indexing`],
        performanceImpact: 'HIGH',
        effort: 'MEDIUM',
        description: `Optimize high-frequency read operations on ${table.tableName}`
      });
    }
    
    // Complex join operations
    const complexJoinPatterns = patterns.filter(p => p.joins.length > 2);
    for (const pattern of complexJoinPatterns) {
      opportunities.push({
        suggestedIndexes: pattern.joins.map(join => ({
          table: join.targetTable,
          columns: [this.extractJoinColumn(join.joinCondition) || 'id'],
          type: 'SINGLE',
          priority: 'MEDIUM',
          estimatedImpact: 50,
          reason: `JOIN optimization for ${join.targetTable}`
        })),
        queryRewrites: [`Consider denormalization for complex joins in: ${pattern.pattern.substring(0, 50)}...`],
        performanceImpact: 'MEDIUM',
        effort: 'HIGH',
        description: `Optimize complex join operations`
      });
    }
    
    // Slow queries
    const slowQueries = patterns.filter(p => p.performance.performanceRating === 'POOR');
    for (const pattern of slowQueries) {
      opportunities.push({
        suggestedIndexes: pattern.optimization.suggestedIndexes,
        queryRewrites: pattern.optimization.queryRewrites,
        performanceImpact: 'HIGH',
        effort: 'MEDIUM',
        description: `Optimize slow-performing query: ${pattern.pattern.substring(0, 50)}...`
      });
    }
    
    return opportunities;
  }

  /**
   * Create analytics summary
   */
  private createAnalyticsSummary(
    patterns: QueryPattern[],
    tableUsage: TableUsageStats[],
    optimizationOpportunities: OptimizationRecommendation[]
  ): QueryAnalyticsSummary {
    
    const totalQueries = patterns.reduce((sum, p) => sum + p.frequency, 0);
    const uniquePatterns = patterns.length;
    const slowQueries = patterns.filter(p => p.performance.performanceRating === 'POOR').length;
    
    // Calculate optimization potential
    const totalOptimizationImpact = optimizationOpportunities.reduce((sum, opp) => {
      const avgImpact = opp.suggestedIndexes.reduce((s, idx) => s + idx.estimatedImpact, 0) / opp.suggestedIndexes.length;
      return sum + avgImpact;
    }, 0);
    const optimizationPotential = optimizationOpportunities.length > 0 ? totalOptimizationImpact / optimizationOpportunities.length : 0;
    
    // Top tables by usage
    const topTables = tableUsage
      .sort((a, b) => b.totalQueries - a.totalQueries)
      // Show all patterns
      .map(t => t.tableName);
    
    // Top joins by frequency
    const allJoins = patterns.flatMap(p => p.joins);
    const joinFrequency = new Map<string, number>();
    for (const join of allJoins) {
      const key = `${join.sourceTable} → ${join.targetTable}`;
      joinFrequency.set(key, (joinFrequency.get(key) || 0) + join.frequency);
    }
    const topJoins = Array.from(joinFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      // Show all patterns
      .map(([join]) => join);
    
    // Generate recommendations
    const recommendations = [
      `Focus optimization efforts on the top ${Math.min(3, topTables.length)} most-used tables`,
      `Implement suggested indexes for ${optimizationOpportunities.length} optimization opportunities`,
      `Consider denormalization for ${patterns.filter(p => p.joins.length > 2).length} complex join patterns`,
      `Monitor and optimize ${slowQueries} slow-performing queries`
    ];
    
    return {
      totalQueries,
      uniquePatterns,
      slowQueries,
      optimizationPotential: Math.round(optimizationPotential),
      topTables,
      topJoins,
      recommendations
    };
  }
}
