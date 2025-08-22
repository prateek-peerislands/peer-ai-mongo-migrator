import { FileAnalysis, AnnotationAnalysis, MethodAnalysis, FieldAnalysis, RelationshipAnalysis } from '../types/migration-types.js';

export class CodeParserService {
  
  /**
   * Analyze an entity file
   */
  async analyzeEntityFile(filePath: string, content: string): Promise<FileAnalysis> {
    const fileName = this.extractFileName(filePath);
    const imports = this.extractImports(content);
    const annotations = this.extractAnnotations(content);
    const fields = this.extractFields(content);
    const methods = this.extractMethods(content);
    const relationships = this.extractRelationships(content);
    
    const complexity = this.calculateEntityComplexity(annotations, relationships, methods);
    const migrationNotes = this.generateEntityMigrationNotes(annotations, relationships);
    const estimatedEffort = this.estimateEntityMigrationEffort(complexity, fields.length, relationships.length);
    
    return {
      filePath,
      fileName,
      fileType: 'ENTITY',
      complexity,
      annotations,
      imports,
      dependencies: this.extractDependencies(imports),
      methods,
      fields,
      relationships,
      migrationNotes,
      estimatedEffort
    };
  }

  /**
   * Analyze a repository file
   */
  async analyzeRepositoryFile(filePath: string, content: string): Promise<FileAnalysis> {
    const fileName = this.extractFileName(filePath);
    const imports = this.extractImports(content);
    const annotations = this.extractAnnotations(content);
    const methods = this.extractMethods(content);
    
    const complexity = this.calculateRepositoryComplexity(methods, annotations);
    const migrationNotes = this.generateRepositoryMigrationNotes(methods, annotations);
    const estimatedEffort = this.estimateRepositoryMigrationEffort(complexity, methods.length);
    
    return {
      filePath,
      fileName,
      fileType: 'REPOSITORY',
      complexity,
      annotations,
      imports,
      dependencies: this.extractDependencies(imports),
      methods,
      fields: [],
      relationships: [],
      migrationNotes,
      estimatedEffort
    };
  }

  /**
   * Analyze a controller file
   */
  async analyzeControllerFile(filePath: string, content: string): Promise<FileAnalysis> {
    const fileName = this.extractFileName(filePath);
    const imports = this.extractImports(content);
    const annotations = this.extractAnnotations(content);
    const methods = this.extractMethods(content);
    
    const complexity = this.calculateControllerComplexity(methods, annotations);
    const migrationNotes = this.generateControllerMigrationNotes(methods, annotations);
    const estimatedEffort = this.estimateControllerMigrationEffort(complexity, methods.length);
    
    return {
      filePath,
      fileName,
      fileType: 'CONTROLLER',
      complexity,
      annotations,
      imports,
      dependencies: this.extractDependencies(imports),
      methods,
      fields: [],
      relationships: [],
      migrationNotes,
      estimatedEffort
    };
  }

  /**
   * Analyze a service file
   */
  async analyzeServiceFile(filePath: string, content: string): Promise<FileAnalysis> {
    const fileName = this.extractFileName(filePath);
    const imports = this.extractImports(content);
    const annotations = this.extractAnnotations(content);
    const methods = this.extractMethods(content);
    
    const complexity = this.calculateServiceComplexity(methods, annotations);
    const migrationNotes = this.generateServiceMigrationNotes(methods, annotations);
    const estimatedEffort = this.estimateServiceMigrationEffort(complexity, methods.length);
    
    return {
      filePath,
      fileName,
      fileType: 'SERVICE',
      complexity,
      annotations,
      imports,
      dependencies: this.extractDependencies(imports),
      methods,
      fields: [],
      relationships: [],
      migrationNotes,
      estimatedEffort
    };
  }

  /**
   * Extract file name from path
   */
  private extractFileName(filePath: string): string {
    return filePath.split(/[\/\\]/).pop() || '';
  }

  /**
   * Extract import statements
   */
  private extractImports(content: string): string[] {
    const importRegex = /import\s+([^;]+);/g;
    const imports: string[] = [];
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1].trim());
    }
    
    return imports;
  }

  /**
   * Extract annotations from content
   */
  private extractAnnotations(content: string): AnnotationAnalysis[] {
    const annotations: AnnotationAnalysis[] = [];
    
    // Find all annotations
    const annotationRegex = /@(\w+)(?:\(([^)]*)\))?/g;
    let match;
    
    while ((match = annotationRegex.exec(content)) !== null) {
      const name = match[1];
      const params = match[2] || '';
      
      const parameters = this.parseAnnotationParameters(params);
      const impact = this.assessAnnotationImpact(name);
      const migrationAction = this.getAnnotationMigrationAction(name, parameters);
      
      annotations.push({
        name,
        parameters,
        impact,
        migrationAction
      });
    }
    
    return annotations;
  }

  /**
   * Parse annotation parameters
   */
  private parseAnnotationParameters(params: string): Record<string, any> {
    const result: Record<string, any> = {};
    
    if (!params.trim()) return result;
    
    // Handle key-value pairs
    const keyValueRegex = /(\w+)\s*=\s*([^,\s]+)/g;
    let match;
    
    while ((match = keyValueRegex.exec(params)) !== null) {
      const key = match[1];
      let value = match[2];
      
      // Remove quotes if present
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      
      result[key] = value;
    }
    
    return result;
  }

  /**
   * Assess annotation impact on migration
   */
  private assessAnnotationImpact(annotationName: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const criticalAnnotations = ['@Entity', '@Table', '@Column', '@Id', '@GeneratedValue', '@OneToMany', '@ManyToOne', '@ManyToMany', '@OneToOne'];
    const highAnnotations = ['@Repository', '@Service', '@Controller', '@RestController', '@RequestMapping', '@GetMapping', '@PostMapping', '@PutMapping', '@DeleteMapping'];
    const mediumAnnotations = ['@Autowired', '@Value', '@Configuration', '@Component', '@Transactional'];
    
    if (criticalAnnotations.includes(annotationName)) return 'CRITICAL';
    if (highAnnotations.includes(annotationName)) return 'HIGH';
    if (mediumAnnotations.includes(annotationName)) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Get migration action for annotation
   */
  private getAnnotationMigrationAction(annotationName: string, parameters: Record<string, any>): string {
    switch (annotationName) {
      case '@Entity':
        return 'Convert to MongoDB @Document collection';
      case '@Table':
        return 'Remove @Table annotation, use @Document instead';
      case '@Column':
        return 'Remove @Column annotation, MongoDB fields are dynamic';
      case '@Id':
        return 'Convert to MongoDB @Id with ObjectId type';
      case '@GeneratedValue':
        return 'Remove @GeneratedValue, MongoDB auto-generates ObjectIds';
      case '@OneToMany':
        return 'Convert to embedded documents or ObjectId references';
      case '@ManyToOne':
        return 'Convert to embedded document or ObjectId reference';
      case '@ManyToMany':
        return 'Convert to embedded documents or ObjectId arrays';
      case '@OneToOne':
        return 'Convert to embedded document or ObjectId reference';
      case '@Repository':
        return 'Convert to MongoDB repository or service class';
      case '@Service':
        return 'Convert to Node.js service class';
      case '@Controller':
      case '@RestController':
        return 'Convert to Express.js route handlers';
      case '@RequestMapping':
        return 'Convert to Express.js app.use() or router.use()';
      case '@GetMapping':
        return 'Convert to Express.js app.get() or router.get()';
      case '@PostMapping':
        return 'Convert to Express.js app.post() or router.post()';
      case '@PutMapping':
        return 'Convert to Express.js app.put() or router.put()';
      case '@DeleteMapping':
        return 'Convert to Express.js app.delete() or router.delete()';
      case '@Autowired':
        return 'Convert to dependency injection or require() statements';
      case '@Value':
        return 'Convert to environment variables or config files';
      case '@Configuration':
        return 'Convert to Node.js configuration module';
      case '@Component':
        return 'Convert to Node.js module or class';
      case '@Transactional':
        return 'Convert to MongoDB transaction handling';
      default:
        return 'Review and adapt as needed';
    }
  }

  /**
   * Extract fields from entity content
   */
  private extractFields(content: string): FieldAnalysis[] {
    const fields: FieldAnalysis[] = [];
    
    // Find field declarations
    const fieldRegex = /(?:private|protected|public)\s+(\w+(?:<[^>]+>)?)\s+(\w+)(?:\s*=\s*([^;]+))?;/g;
    let match;
    
    while ((match = fieldRegex.exec(content)) !== null) {
      const type = match[1];
      const name = match[2];
      const defaultValue = match[3];
      
      // Find annotations for this field
      const fieldAnnotations = this.findFieldAnnotations(content, name);
      
      fields.push({
        name,
        type,
        annotations: fieldAnnotations,
        nullable: this.isFieldNullable(fieldAnnotations),
        defaultValue: defaultValue ? defaultValue.trim() : undefined,
        migrationAction: this.getFieldMigrationAction(type, fieldAnnotations)
      });
    }
    
    return fields;
  }

  /**
   * Find annotations for a specific field
   */
  private findFieldAnnotations(content: string, fieldName: string): AnnotationAnalysis[] {
    const annotations: AnnotationAnalysis[] = [];
    
    // Look for annotations before the field declaration
    const fieldPattern = new RegExp(`(@[^\\s]+(?:\\([^)]*\\))?\\s*)*\\s*(?:private|protected|public)\\s+\\w+(?:<[^>]+>)?\\s+${fieldName}\\b`);
    const match = content.match(fieldPattern);
    
    if (match) {
      const annotationPart = match[0].replace(new RegExp(`\\s*(?:private|protected|public)\\s+\\w+(?:<[^>]+>)?\\s+${fieldName}\\b`), '');
      const annotationMatches = annotationPart.match(/@(\w+)(?:\(([^)]*)\))?/g);
      
      if (annotationMatches) {
        for (const annMatch of annotationMatches) {
          const name = annMatch.match(/@(\w+)/)?.[1] || '';
          const params = annMatch.match(/\(([^)]*)\)/)?.[1] || '';
          
          const parameters = this.parseAnnotationParameters(params);
          const impact = this.assessAnnotationImpact(name);
          const migrationAction = this.getAnnotationMigrationAction(name, parameters);
          
          annotations.push({ name, parameters, impact, migrationAction });
        }
      }
    }
    
    return annotations;
  }

  /**
   * Check if field is nullable
   */
  private isFieldNullable(annotations: AnnotationAnalysis[]): boolean {
    return !annotations.some(ann => ann.name === 'NotNull' || ann.name === 'Required');
  }

  /**
   * Get field migration action
   */
  private getFieldMigrationAction(type: string, annotations: AnnotationAnalysis[]): string {
    if (type.includes('List<') || type.includes('Set<')) {
      return 'Convert to MongoDB array field';
    }
    
    if (type === 'String') {
      return 'Convert to MongoDB String type';
    }
    
    if (type === 'Integer' || type === 'int' || type === 'Long' || type === 'long') {
      return 'Convert to MongoDB Number type';
    }
    
    if (type === 'Double' || type === 'double' || type === 'Float' || type === 'float') {
      return 'Convert to MongoDB Number type';
    }
    
    if (type === 'Boolean' || type === 'boolean') {
      return 'Convert to MongoDB Boolean type';
    }
    
    if (type === 'Date' || type === 'LocalDateTime' || type === 'LocalDate') {
      return 'Convert to MongoDB Date type';
    }
    
    if (type.includes('BigDecimal')) {
      return 'Convert to MongoDB Decimal128 type';
    }
    
    return 'Review and adapt type mapping';
  }

  /**
   * Extract methods from content
   */
  private extractMethods(content: string): MethodAnalysis[] {
    const methods: MethodAnalysis[] = [];
    
    // Find method declarations
    const methodRegex = /(?:public|private|protected)?\s*(?:static\s+)?(\w+(?:<[^>]+>)?)\s+(\w+)\s*\(([^)]*)\)/g;
    let match;
    
    while ((match = methodRegex.exec(content)) !== null) {
      const returnType = match[1];
      const name = match[2];
      const params = match[3];
      
      const parameters = this.parseMethodParameters(params);
      const complexity = this.calculateMethodComplexity(name, returnType, parameters);
      const migrationAction = this.getMethodMigrationAction(name, returnType, parameters);
      
      methods.push({
        name,
        returnType,
        parameters,
        complexity,
        migrationAction
      });
    }
    
    return methods;
  }

  /**
   * Parse method parameters
   */
  private parseMethodParameters(params: string): any[] {
    if (!params.trim()) return [];
    
    const parameters: any[] = [];
    const paramList = params.split(',');
    
    for (const param of paramList) {
      const trimmed = param.trim();
      if (trimmed) {
        const parts = trimmed.split(/\s+/);
        if (parts.length >= 2) {
          const type = parts[0];
          const name = parts[1];
          const required = !name.includes('?');
          
          parameters.push({
            name: name.replace('?', ''),
            type,
            required
          });
        }
      }
    }
    
    return parameters;
  }

  /**
   * Calculate method complexity
   */
  private calculateMethodComplexity(name: string, returnType: string, parameters: any[]): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    // Simple getters/setters
    if ((name.startsWith('get') || name.startsWith('set') || name.startsWith('is')) && parameters.length <= 1) {
      return 'LOW';
    }
    
    // CRUD operations
    if (['save', 'find', 'findAll', 'delete', 'update', 'create'].includes(name)) {
      return 'MEDIUM';
    }
    
    // Complex business logic
    if (name.includes('process') || name.includes('calculate') || name.includes('validate')) {
      return 'HIGH';
    }
    
    // Custom queries or complex operations
    if (name.includes('Query') || name.includes('Custom') || parameters.length > 3) {
      return 'CRITICAL';
    }
    
    return 'MEDIUM';
  }

  /**
   * Get method migration action
   */
  private getMethodMigrationAction(name: string, returnType: string, parameters: any[]): string {
    if (name.startsWith('get') || name.startsWith('find')) {
      return 'Convert to MongoDB find() operations';
    }
    
    if (name.startsWith('save') || name.startsWith('create')) {
      return 'Convert to MongoDB insertOne() or save() operations';
    }
    
    if (name.startsWith('update') || name.startsWith('modify')) {
      return 'Convert to MongoDB updateOne() or updateMany() operations';
    }
    
    if (name.startsWith('delete') || name.startsWith('remove')) {
      return 'Convert to MongoDB deleteOne() or deleteMany() operations';
    }
    
    if (name.includes('Query')) {
      return 'Convert to MongoDB aggregation pipeline or find() with filters';
    }
    
    return 'Review and adapt business logic';
  }

  /**
   * Extract relationships from entity content
   */
  private extractRelationships(content: string): RelationshipAnalysis[] {
    const relationships: RelationshipAnalysis[] = [];
    
    // Find relationship annotations
    const relationshipRegex = /@(OneToMany|ManyToOne|ManyToMany|OneToOne)(?:\(([^)]*)\))?/g;
    let match;
    
    while ((match = relationshipRegex.exec(content)) !== null) {
      const type = match[1] as any;
      const params = match[2] || '';
      
      const parameters = this.parseAnnotationParameters(params);
      const targetEntity = this.findTargetEntity(content, match.index);
      const mappedBy = parameters.mappedBy || '';
      const cascade = parameters.cascade ? parameters.cascade.split(',') : [];
      const fetch = parameters.fetch || 'LAZY';
      
      relationships.push({
        type,
        targetEntity,
        mappedBy,
        cascade,
        fetch,
        migrationStrategy: this.getRelationshipMigrationStrategy(type, parameters)
      });
    }
    
    return relationships;
  }

  /**
   * Find target entity for relationship
   */
  private findTargetEntity(content: string, annotationIndex: number): string {
    // Look for the field declaration after the annotation
    const afterAnnotation = content.substring(annotationIndex);
    const fieldMatch = afterAnnotation.match(/(?:private|protected|public)\s+(\w+(?:<[^>]+>)?)\s+(\w+)/);
    
    if (fieldMatch) {
      const type = fieldMatch[1];
      // Extract the actual entity type from generics if present
      if (type.includes('<')) {
        const genericMatch = type.match(/<([^>]+)>/);
        return genericMatch ? genericMatch[1] : type;
      }
      return type;
    }
    
    return 'Unknown';
  }

  /**
   * Get relationship migration strategy
   */
  private getRelationshipMigrationStrategy(type: string, parameters: Record<string, any>): string {
    switch (type) {
      case 'OneToMany':
        return 'Convert to embedded documents or ObjectId array with $lookup';
      case 'ManyToOne':
        return 'Convert to embedded document or ObjectId reference';
      case 'ManyToMany':
        return 'Convert to embedded documents or ObjectId arrays with $lookup';
      case 'OneToOne':
        return 'Convert to embedded document or ObjectId reference';
      default:
        return 'Review and adapt relationship strategy';
    }
  }

  /**
   * Extract dependencies from imports
   */
  private extractDependencies(imports: string[]): string[] {
    return imports.map(imp => {
      const parts = imp.split('.');
      return parts[parts.length - 1];
    });
  }

  /**
   * Calculate entity complexity
   */
  private calculateEntityComplexity(
    annotations: AnnotationAnalysis[], 
    relationships: RelationshipAnalysis[], 
    methods: MethodAnalysis[]
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    let score = 0;
    
    // Annotation complexity
    annotations.forEach(ann => {
      if (ann.impact === 'LOW') score += 1;
      else if (ann.impact === 'MEDIUM') score += 2;
      else if (ann.impact === 'HIGH') score += 3;
      else if (ann.impact === 'CRITICAL') score += 4;
    });
    
          // Relationship complexity
      relationships.forEach(rel => {
        if (rel.type === 'ONE_TO_ONE') score += 1;
        else if (rel.type === 'MANY_TO_ONE') score += 2;
        else if (rel.type === 'ONE_TO_MANY') score += 3;
        else if (rel.type === 'MANY_TO_MANY') score += 4;
      });
    
    // Method complexity
    methods.forEach(method => {
      if (method.complexity === 'LOW') score += 1;
      else if (method.complexity === 'MEDIUM') score += 2;
      else if (method.complexity === 'HIGH') score += 3;
      else if (method.complexity === 'CRITICAL') score += 4;
    });
    
    const total = annotations.length + relationships.length + methods.length;
    const average = total > 0 ? score / total : 0;
    
    if (average <= 1.5) return 'LOW';
    else if (average <= 2.5) return 'MEDIUM';
    else if (average <= 3.5) return 'HIGH';
    else return 'CRITICAL';
  }

  /**
   * Calculate repository complexity
   */
  private calculateRepositoryComplexity(methods: MethodAnalysis[], annotations: AnnotationAnalysis[]): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    let score = 0;
    
    methods.forEach(method => {
      if (method.complexity === 'LOW') score += 1;
      else if (method.complexity === 'MEDIUM') score += 2;
      else if (method.complexity === 'HIGH') score += 3;
      else if (method.complexity === 'CRITICAL') score += 4;
    });
    
    annotations.forEach(ann => {
      if (ann.impact === 'LOW') score += 1;
      else if (ann.impact === 'MEDIUM') score += 2;
      else if (ann.impact === 'HIGH') score += 3;
      else if (ann.impact === 'CRITICAL') score += 4;
    });
    
    const total = methods.length + annotations.length;
    const average = total > 0 ? score / total : 0;
    
    if (average <= 1.5) return 'LOW';
    else if (average <= 2.5) return 'MEDIUM';
    else if (average <= 3.5) return 'HIGH';
    else return 'CRITICAL';
  }

  /**
   * Calculate controller complexity
   */
  private calculateControllerComplexity(methods: MethodAnalysis[], annotations: AnnotationAnalysis[]): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    let score = 0;
    
    methods.forEach(method => {
      if (method.complexity === 'LOW') score += 1;
      else if (method.complexity === 'MEDIUM') score += 2;
      else if (method.complexity === 'HIGH') score += 3;
      else if (method.complexity === 'CRITICAL') score += 4;
    });
    
    annotations.forEach(ann => {
      if (ann.impact === 'LOW') score += 1;
      else if (ann.impact === 'MEDIUM') score += 2;
      else if (ann.impact === 'HIGH') score += 3;
      else if (ann.impact === 'CRITICAL') score += 4;
    });
    
    const total = methods.length + annotations.length;
    const average = total > 0 ? score / total : 0;
    
    if (average <= 1.5) return 'LOW';
    else if (average <= 2.5) return 'MEDIUM';
    else if (average <= 3.5) return 'HIGH';
    else return 'CRITICAL';
  }

  /**
   * Calculate service complexity
   */
  private calculateServiceComplexity(methods: MethodAnalysis[], annotations: AnnotationAnalysis[]): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    let score = 0;
    
    methods.forEach(method => {
      if (method.complexity === 'LOW') score += 1;
      else if (method.complexity === 'MEDIUM') score += 2;
      else if (method.complexity === 'HIGH') score += 3;
      else if (method.complexity === 'CRITICAL') score += 4;
    });
    
    annotations.forEach(ann => {
      if (ann.impact === 'LOW') score += 1;
      else if (ann.impact === 'MEDIUM') score += 2;
      else if (ann.impact === 'HIGH') score += 3;
      else if (ann.impact === 'CRITICAL') score += 4;
    });
    
    const total = methods.length + annotations.length;
    const average = total > 0 ? score / total : 0;
    
    if (average <= 1.5) return 'LOW';
    else if (average <= 2.5) return 'MEDIUM';
    else if (average <= 3.5) return 'HIGH';
    else return 'CRITICAL';
  }

  /**
   * Generate entity migration notes
   */
  private generateEntityMigrationNotes(annotations: AnnotationAnalysis[], relationships: RelationshipAnalysis[]): string[] {
    const notes: string[] = [];
    
    if (annotations.some(ann => ann.name === 'Entity')) {
      notes.push('Convert JPA @Entity to MongoDB @Document');
    }
    
    if (annotations.some(ann => ann.name === 'Table')) {
      notes.push('Remove @Table annotation, MongoDB uses collection names');
    }
    
    if (relationships.length > 0) {
      notes.push(`Handle ${relationships.length} relationship(s) - consider denormalization strategy`);
    }
    
    if (annotations.some(ann => ann.name === 'Id')) {
      notes.push('Convert primary key to MongoDB ObjectId');
    }
    
    return notes;
  }

  /**
   * Generate repository migration notes
   */
  private generateRepositoryMigrationNotes(methods: MethodAnalysis[], annotations: AnnotationAnalysis[]): string[] {
    const notes: string[] = [];
    
    if (annotations.some(ann => ann.name === 'Repository')) {
      notes.push('Convert Spring Data repository to MongoDB operations');
    }
    
    const customMethods = methods.filter(m => m.complexity === 'HIGH' || m.complexity === 'CRITICAL');
    if (customMethods.length > 0) {
      notes.push(`Rewrite ${customMethods.length} custom method(s) for MongoDB`);
    }
    
    return notes;
  }

  /**
   * Generate controller migration notes
   */
  private generateControllerMigrationNotes(methods: MethodAnalysis[], annotations: AnnotationAnalysis[]): string[] {
    const notes: string[] = [];
    
    if (annotations.some(ann => ann.name === 'RestController')) {
      notes.push('Convert @RestController to Express.js route handlers');
    }
    
    const mappingMethods = methods.filter(m => m.name.includes('Mapping') || m.name.includes('Request'));
    if (mappingMethods.length > 0) {
      notes.push(`Convert ${mappingMethods.length} HTTP mapping method(s) to Express.js routes`);
    }
    
    return notes;
  }

  /**
   * Generate service migration notes
   */
  private generateServiceMigrationNotes(methods: MethodAnalysis[], annotations: AnnotationAnalysis[]): string[] {
    const notes: string[] = [];
    
    if (annotations.some(ann => ann.name === 'Service')) {
      notes.push('Convert Spring @Service to Node.js service class');
    }
    
    const businessMethods = methods.filter(m => m.complexity === 'HIGH' || m.complexity === 'CRITICAL');
    if (businessMethods.length > 0) {
      notes.push(`Adapt ${businessMethods.length} business logic method(s) for Node.js`);
    }
    
    return notes;
  }

  /**
   * Estimate migration effort for entity
   */
  private estimateEntityMigrationEffort(complexity: string, fieldCount: number, relationshipCount: number): number {
    let baseHours = 2; // Base time for simple conversion
    
    // Complexity multiplier
    if (complexity === 'LOW') baseHours *= 1;
    else if (complexity === 'MEDIUM') baseHours *= 1.5;
    else if (complexity === 'HIGH') baseHours *= 2;
    else if (complexity === 'CRITICAL') baseHours *= 3;
    
    // Field count adjustment
    baseHours += fieldCount * 0.1;
    
    // Relationship adjustment
    baseHours += relationshipCount * 0.5;
    
    return Math.round(baseHours * 10) / 10; // Round to 1 decimal place
  }

  /**
   * Estimate migration effort for repository
   */
  private estimateRepositoryMigrationEffort(complexity: string, methodCount: number): number {
    let baseHours = 1; // Base time for simple conversion
    
    // Complexity multiplier
    if (complexity === 'LOW') baseHours *= 1;
    else if (complexity === 'MEDIUM') baseHours *= 1.5;
    else if (complexity === 'HIGH') baseHours *= 2;
    else if (complexity === 'CRITICAL') baseHours *= 3;
    
    // Method count adjustment
    baseHours += methodCount * 0.3;
    
    return Math.round(baseHours * 10) / 10;
  }

  /**
   * Estimate migration effort for controller
   */
  private estimateControllerMigrationEffort(complexity: string, methodCount: number): number {
    let baseHours = 1; // Base time for simple conversion
    
    // Complexity multiplier
    if (complexity === 'LOW') baseHours *= 1;
    else if (complexity === 'MEDIUM') baseHours *= 1.5;
    else if (complexity === 'HIGH') baseHours *= 2;
    else if (complexity === 'CRITICAL') baseHours *= 3;
    
    // Method count adjustment
    baseHours += methodCount * 0.2;
    
    return Math.round(baseHours * 10) / 10;
  }

  /**
   * Estimate migration effort for service
   */
  private estimateServiceMigrationEffort(complexity: string, methodCount: number): number {
    let baseHours = 1.5; // Base time for simple conversion
    
    // Complexity multiplier
    if (complexity === 'LOW') baseHours *= 1;
    else if (complexity === 'MEDIUM') baseHours *= 1.5;
    else if (complexity === 'HIGH') baseHours *= 2;
    else if (complexity === 'CRITICAL') baseHours *= 3;
    
    // Method count adjustment
    baseHours += methodCount * 0.4;
    
    return Math.round(baseHours * 10) / 10;
  }
}
