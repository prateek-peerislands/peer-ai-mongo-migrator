import { SourceCodeAnalysis, MigrationPlan, MigrationSummary, MigrationPhase, RiskAssessment, RiskItem, CostEstimation, TimelineEstimation, PhaseTimeline, Milestone } from '../types/migration-types.js';

export class MigrationPlanGenerator {
  
  /**
   * Generate comprehensive migration plan
   */
  async generatePlan(analysis: SourceCodeAnalysis): Promise<MigrationPlan> {
    try {
      console.log('📋 Generating migration plan...');
      
      const summary = this.generateMigrationSummary(analysis);
      const phases = this.generateMigrationPhases(analysis);
      const riskAssessment = this.generateRiskAssessment(analysis);
      const costEstimation = this.generateCostEstimation(analysis);
      const timeline = this.generateTimeline(phases);
      const recommendations = this.generateRecommendations(analysis);
      
      const plan: MigrationPlan = {
        summary,
        phases,
        riskAssessment,
        costEstimation,
        recommendations,
        timeline
      };
      
      console.log('✅ Migration plan generated successfully');
      return plan;
      
    } catch (error) {
      console.error('❌ Error generating migration plan:', error);
      throw error;
    }
  }

  /**
   * Generate migration summary
   */
  private generateMigrationSummary(analysis: SourceCodeAnalysis): MigrationSummary {
    const totalEffort = this.calculateTotalEffort(analysis);
    const complexity = analysis.migrationComplexity;
    const estimatedDuration = this.estimateDuration(totalEffort);
    const riskLevel = this.assessRiskLevel(complexity, analysis);
    const businessImpact = this.assessBusinessImpact(analysis);
    
    return {
      complexity,
      riskLevel,
      businessImpact
    };
  }

  /**
   * Calculate total migration effort
   */
  private calculateTotalEffort(analysis: SourceCodeAnalysis): number {
    let total = 0;
    
    // Entity effort
    analysis.entities.forEach(entity => {
      total += entity.estimatedEffort;
    });
    
    // Repository effort
    analysis.repositories.forEach(repo => {
      total += repo.estimatedEffort;
    });
    
    // Controller effort
    analysis.controllers.forEach(controller => {
      total += controller.estimatedEffort;
    });
    
    // Service effort
    analysis.services.forEach(service => {
      total += service.estimatedEffort;
    });
    
    // Add configuration and setup effort
    total += 8; // Base configuration effort
    total += 16; // Testing and validation effort
    total += 8; // Documentation and training effort
    
    return Math.round(total * 10) / 10;
  }

  /**
   * Estimate project duration based on effort
   */
  private estimateDuration(totalEffort: number): string {
    // Assuming 8 hours per day, 5 days per week
    const workingDays = totalEffort / 8;
    const workingWeeks = workingDays / 5;
    
    if (workingWeeks <= 1) {
      return '1 week';
    } else if (workingWeeks <= 2) {
      return '1-2 weeks';
    } else if (workingWeeks <= 4) {
      return '2-4 weeks';
    } else if (workingWeeks <= 8) {
      return '4-8 weeks';
    } else if (workingWeeks <= 12) {
      return '8-12 weeks';
    } else {
      return '12+ weeks';
    }
  }

  /**
   * Assess risk level based on complexity and analysis
   */
  private assessRiskLevel(complexity: string, analysis: SourceCodeAnalysis): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (complexity === 'CRITICAL' || analysis.totalFiles > 50) {
      return 'HIGH';
    } else if (complexity === 'HIGH' || analysis.totalFiles > 25) {
      return 'MEDIUM';
    } else {
      return 'LOW';
    }
  }

  /**
   * Assess business impact
   */
  private assessBusinessImpact(analysis: SourceCodeAnalysis): 'LOW' | 'MEDIUM' | 'HIGH' {
    const criticalEntities = analysis.entities.filter(e => e.complexity === 'CRITICAL').length;
    const criticalServices = analysis.services.filter(s => s.complexity === 'CRITICAL').length;
    
    if (criticalEntities > 5 || criticalServices > 3) {
      return 'HIGH';
    } else if (criticalEntities > 2 || criticalServices > 1) {
      return 'MEDIUM';
    } else {
      return 'LOW';
    }
  }

  /**
   * Generate migration phases
   */
  private generateMigrationPhases(analysis: SourceCodeAnalysis): MigrationPhase[] {
    const phases: MigrationPhase[] = [];
    
    // Phase 1: Foundation
    phases.push({
      name: 'Foundation & Setup',
      description: 'Set up Node.js environment, MongoDB, and basic project structure',
      duration: '1-2 weeks',
      dependencies: [],
      deliverables: [
        'Node.js project setup',
        'MongoDB connection configuration',
        'Basic project structure',
        'Package.json with dependencies'
      ],
      risks: [
        'Environment setup issues',
        'MongoDB connection problems',
        'Dependency conflicts'
      ],
      mitigation: [
        'Use Docker for consistent environment',
        'Test MongoDB connection early',
        'Use exact dependency versions'
      ]
    });
    
    // Phase 2: Data Model
    const dataModelEffort = this.calculateDataModelEffort(analysis);
    phases.push({
      name: 'Data Model Migration',
      description: 'Convert JPA entities to MongoDB schemas and handle relationships',
      duration: '2-4 weeks',
      dependencies: ['Foundation & Setup'],
      deliverables: [
        'MongoDB schemas for all entities',
        'Relationship handling strategy',
        'Data validation rules',
        'Index recommendations'
      ],
      risks: [
        'Complex relationship mapping',
        'Data type conversion issues',
        'Performance impact of denormalization'
      ],
      mitigation: [
        'Use embedded documents where appropriate',
        'Implement proper indexing strategy',
        'Test with sample data'
      ]
    });
    
    // Phase 3: Business Logic
    const businessLogicEffort = this.calculateBusinessLogicEffort(analysis);
    phases.push({
      name: 'Business Logic Migration',
      description: 'Convert Spring services and repositories to Node.js services',
      duration: '2-4 weeks',
      dependencies: ['Data Model Migration'],
      deliverables: [
        'Node.js service classes',
        'MongoDB data access layer',
        'Business logic implementation',
        'Error handling and validation'
      ],
      risks: [
        'Complex business logic conversion',
        'Transaction handling differences',
        'Performance optimization challenges'
      ],
      mitigation: [
        'Implement comprehensive testing',
        'Use MongoDB transactions where needed',
        'Profile and optimize critical paths'
      ]
    });
    
    // Phase 4: API Layer
    const apiLayerEffort = this.calculateAPILayerEffort(analysis);
    phases.push({
      name: 'API Layer Migration',
      description: 'Convert Spring controllers to Express.js routes',
      duration: '1-2 weeks',
      dependencies: ['Business Logic Migration'],
      deliverables: [
        'Express.js route handlers',
        'Request/response handling',
        'Middleware configuration',
        'API documentation'
      ],
      risks: [
        'API compatibility issues',
        'Authentication/authorization changes',
        'Request validation differences'
      ],
      mitigation: [
        'Maintain API versioning',
        'Implement proper middleware',
        'Add comprehensive validation'
      ]
    });
    
    // Phase 5: Testing & Validation
    phases.push({
      name: 'Testing & Validation',
      description: 'Comprehensive testing of migrated functionality',
      duration: '1-2 weeks',
      dependencies: ['API Layer Migration'],
      deliverables: [
        'Unit tests for all components',
        'Integration tests',
        'Performance tests',
        'User acceptance tests'
      ],
      risks: [
        'Incomplete test coverage',
        'Performance regressions',
        'Data integrity issues'
      ],
      mitigation: [
        'Implement automated testing',
        'Set performance benchmarks',
        'Validate data consistency'
      ]
    });
    
    // Phase 6: Deployment & Documentation
    phases.push({
      name: 'Deployment & Documentation',
      description: 'Deploy to production and create comprehensive documentation',
      duration: '1 week',
      dependencies: ['Testing & Validation'],
      deliverables: [
        'Production deployment',
        'Migration documentation',
        'User training materials',
        'Maintenance procedures'
      ],
      risks: [
        'Deployment issues',
        'User adoption challenges',
        'Knowledge transfer gaps'
      ],
      mitigation: [
        'Use blue-green deployment',
        'Provide comprehensive training',
        'Create detailed runbooks'
      ]
    });
    
    return phases;
  }

  /**
   * Calculate data model migration effort
   */
  private calculateDataModelEffort(analysis: SourceCodeAnalysis): number {
    let effort = 0;
    
    analysis.entities.forEach(entity => {
      effort += entity.estimatedEffort;
    });
    
    // Add relationship handling effort
    const totalRelationships = analysis.entities.reduce((sum, entity) => {
      return sum + entity.relationships.length;
    }, 0);
    
    effort += totalRelationships * 0.5;
    
    return Math.round(effort * 10) / 10;
  }

  /**
   * Calculate business logic migration effort
   */
  private calculateBusinessLogicEffort(analysis: SourceCodeAnalysis): number {
    let effort = 0;
    
    analysis.services.forEach(service => {
      effort += service.estimatedEffort;
    });
    
    analysis.repositories.forEach(repo => {
      effort += repo.estimatedEffort;
    });
    
    return Math.round(effort * 10) / 10;
  }

  /**
   * Calculate API layer migration effort
   */
  private calculateAPILayerEffort(analysis: SourceCodeAnalysis): number {
    let effort = 0;
    
    analysis.controllers.forEach(controller => {
      effort += controller.estimatedEffort;
    });
    
    return Math.round(effort * 10) / 10;
  }

  /**
   * Generate risk assessment
   */
  private generateRiskAssessment(analysis: SourceCodeAnalysis): RiskAssessment {
    const highRisks: RiskItem[] = [];
    const mediumRisks: RiskItem[] = [];
    const lowRisks: RiskItem[] = [];
    
    // High risks
    if (analysis.entities.some(e => e.complexity === 'CRITICAL')) {
      highRisks.push({
        description: 'Complex entity relationships requiring significant data model changes',
        probability: 'HIGH',
        impact: 'HIGH',
        mitigation: 'Implement phased migration with extensive testing'
      });
    }
    
    if (analysis.services.some(s => s.complexity === 'CRITICAL')) {
      highRisks.push({
        description: 'Complex business logic that may not translate directly to Node.js',
        probability: 'MEDIUM',
        impact: 'HIGH',
        mitigation: 'Rewrite critical business logic with comprehensive testing'
      });
    }
    
    // Medium risks
    if (analysis.totalFiles > 30) {
      mediumRisks.push({
        description: 'Large codebase requiring extensive migration effort',
        probability: 'HIGH',
        impact: 'MEDIUM',
        mitigation: 'Implement incremental migration with parallel development'
      });
    }
    
    if (analysis.entities.some(e => e.relationships.length > 5)) {
      mediumRisks.push({
        description: 'Complex entity relationships that may impact performance',
        probability: 'MEDIUM',
        impact: 'MEDIUM',
        mitigation: 'Implement proper indexing and consider denormalization'
      });
    }
    
    // Low risks
    lowRisks.push({
      description: 'Standard CRUD operations that translate easily',
      probability: 'LOW',
      impact: 'LOW',
      mitigation: 'Use standard patterns and templates'
    });
    
    const mitigationStrategies = [
      'Implement comprehensive testing strategy',
      'Use phased migration approach',
      'Maintain parallel systems during transition',
      'Create detailed rollback procedures',
      'Provide extensive team training',
      'Set up monitoring and alerting'
    ];
    
    return {
      highRisks,
      mediumRisks,
      lowRisks,
      mitigationStrategies
    };
  }

  /**
   * Generate cost estimation
   */
  private generateCostEstimation(analysis: SourceCodeAnalysis): CostEstimation {
    const totalEffort = this.calculateTotalEffort(analysis);
    
    // Assume $100/hour for development (adjust as needed)
    const hourlyRate = 100;
    const developmentCost = totalEffort * hourlyRate;
    
    // Infrastructure costs (MongoDB Atlas, hosting, etc.)
    const infrastructureCost = 500; // Monthly cost * project duration
    
    // Operational costs (testing, deployment, training)
    const operationalCost = developmentCost * 0.2; // 20% of development cost
    
    const totalCost = developmentCost + infrastructureCost + operationalCost;
    
    const assumptions = [
      'Development rate: $100/hour',
      'Infrastructure cost: $500/month',
      'Operational cost: 20% of development cost',
      'Project duration: Based on effort estimation',
      'Team size: 2-3 developers'
    ];
    
    return {
      developmentCost: Math.round(developmentCost),
      infrastructureCost: Math.round(infrastructureCost),
      operationalCost: Math.round(operationalCost),
      totalCost: Math.round(totalCost),
      currency: 'USD',
      assumptions
    };
  }

  /**
   * Generate timeline estimation
   */
  private generateTimeline(phases: MigrationPhase[]): TimelineEstimation {
    const startDate = new Date();
    let currentDate = new Date(startDate);
    
    const phaseTimelines: PhaseTimeline[] = [];
    
    for (const phase of phases) {
      const phaseStart = new Date(currentDate);
      
      // Calculate phase duration in days (assuming 5 working days per week)
      const phaseWeeks = parseFloat(phase.duration.split('-')[1] || phase.duration.split(' ')[0]);
      const phaseDays = Math.ceil(phaseWeeks * 5);
      
      // Add weekends
      const totalDays = Math.ceil(phaseDays * 1.4); // Account for weekends
      
      const phaseEnd = new Date(currentDate);
      phaseEnd.setDate(phaseEnd.getDate() + totalDays);
      
      const milestones: Milestone[] = [
        {
          name: `${phase.name} - Start`,
          date: new Date(phaseStart),
          description: `Begin ${phase.name.toLowerCase()}`,
          deliverables: []
        },
        {
          name: `${phase.name} - Complete`,
          date: new Date(phaseEnd),
          description: `Complete ${phase.name.toLowerCase()}`,
          deliverables: phase.deliverables
        }
      ];
      
      phaseTimelines.push({
        phaseName: phase.name,
        startDate: new Date(phaseStart),
        endDate: new Date(phaseEnd),
        duration: totalDays,
        milestones
      });
      
      // Move to next phase
      currentDate = new Date(phaseEnd);
      currentDate.setDate(currentDate.getDate() + 1); // Start next day
    }
    
    const endDate = new Date(currentDate);
    const bufferTime = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) * 0.2); // 20% buffer
    
    const criticalPath = phases.map(p => p.name);
    
    return {
      startDate,
      endDate,
      phases: phaseTimelines,
      criticalPath,
      bufferTime
    };
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(analysis: SourceCodeAnalysis): string[] {
    const recommendations: string[] = [];
    
    // General recommendations
    recommendations.push('Implement phased migration approach to minimize risk');
    recommendations.push('Maintain parallel systems during critical phases');
    recommendations.push('Create comprehensive testing strategy before migration');
    recommendations.push('Document all business logic thoroughly');
    recommendations.push('Plan for team training on Node.js and MongoDB');
    
    // Technology-specific recommendations
    if (analysis.entities.some(e => e.relationships.length > 0)) {
      recommendations.push('Consider denormalization strategy for complex relationships');
      recommendations.push('Implement proper MongoDB indexing strategy');
    }
    
    if (analysis.services.some(s => s.complexity === 'HIGH' || s.complexity === 'CRITICAL')) {
      recommendations.push('Rewrite complex business logic with Node.js best practices');
      recommendations.push('Implement proper error handling and logging');
    }
    
    if (analysis.controllers.length > 10) {
      recommendations.push('Use Express.js middleware for common functionality');
      recommendations.push('Implement API versioning strategy');
    }
    
    // Performance recommendations
    recommendations.push('Implement MongoDB connection pooling');
    recommendations.push('Use aggregation pipelines for complex queries');
    recommendations.push('Consider caching strategy for frequently accessed data');
    
    // Quality recommendations
    recommendations.push('Implement automated testing with Jest or Mocha');
    recommendations.push('Use ESLint and Prettier for code quality');
    recommendations.push('Implement CI/CD pipeline for deployment');
    
    return recommendations;
  }
}
