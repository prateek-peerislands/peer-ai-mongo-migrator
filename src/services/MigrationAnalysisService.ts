import { MigrationAnalysis, SourceCodeAnalysis, MigrationPlan, FileAnalysis } from '../types/migration-types.js';
import { CodeParserService } from './CodeParserService.js';
import { MigrationPlanGenerator } from './MigrationPlanGenerator.js';
import { DocumentationGenerator } from './DocumentationGenerator.js';
import * as fs from 'fs';
import * as path from 'path';

export class MigrationAnalysisService {
  private codeParser: CodeParserService;
  private planGenerator: MigrationPlanGenerator;
  private docGenerator: DocumentationGenerator;

  constructor() {
    this.codeParser = new CodeParserService();
    this.planGenerator = new MigrationPlanGenerator();
    this.docGenerator = new DocumentationGenerator();
  }

  /**
   * Detect all source-code-* folders in the workspace
   */
  async detectSourceCodeFolders(workspacePath: string = '.'): Promise<string[]> {
    try {
      const items = await fs.promises.readdir(workspacePath);
      const sourceCodeFolders = items.filter(item => {
        const fullPath = path.join(workspacePath, item);
        const stat = fs.statSync(fullPath);
        return stat.isDirectory() && item.startsWith('source-code-');
      });
      
      return sourceCodeFolders.sort();
    } catch (error) {
      console.error('Error detecting source code folders:', error);
      return [];
    }
  }

  /**
   * Analyze a specific source code folder
   */
  async analyzeSourceCode(sourceCodePath: string): Promise<SourceCodeAnalysis> {
    try {
      console.log(`🔍 Analyzing source code in: ${sourceCodePath}`);
      
      // Parse Java source files
      const javaFiles = await this.findJavaFiles(sourceCodePath);
      const entityAnalysis = await this.analyzeEntities(javaFiles);
      const repositoryAnalysis = await this.analyzeRepositories(javaFiles);
      const controllerAnalysis = await this.analyzeControllers(javaFiles);
      const serviceAnalysis = await this.analyzeServices(javaFiles);
      
      // Analyze configuration files
      const configAnalysis = await this.analyzeConfiguration(sourceCodePath);
      
      // Analyze project structure
      const structureAnalysis = await this.analyzeProjectStructure(sourceCodePath);
      
      const analysis: SourceCodeAnalysis = {
        sourcePath: sourceCodePath,
        projectName: path.basename(sourceCodePath),
        analysisDate: new Date(),
        entities: entityAnalysis,
        repositories: repositoryAnalysis,
        controllers: controllerAnalysis,
        services: serviceAnalysis,
        configuration: configAnalysis,
        projectStructure: structureAnalysis,
        totalFiles: javaFiles.length,
        migrationComplexity: this.calculateMigrationComplexity(entityAnalysis, repositoryAnalysis, serviceAnalysis)
      };
      
      console.log(`✅ Analysis complete for ${sourceCodePath}`);
      return analysis;
      
    } catch (error) {
      console.error(`❌ Error analyzing source code in ${sourceCodePath}:`, error);
      throw error;
    }
  }

  /**
   * Generate migration plan from analysis
   */
  async generateMigrationPlan(analysis: SourceCodeAnalysis): Promise<MigrationPlan> {
    try {
      console.log('📋 Generating migration plan...');
      
      const plan = await this.planGenerator.generatePlan(analysis);
      
      console.log('✅ Migration plan generated successfully');
      return plan;
      
    } catch (error) {
      console.error('❌ Error generating migration plan:', error);
      throw error;
    }
  }

  /**
   * Create comprehensive migration documentation with versioning
   */
  async createMigrationDocumentation(
    analysis: SourceCodeAnalysis, 
    plan: MigrationPlan, 
    outputPath: string
  ): Promise<string> {
    try {
      // Generate versioned filename
      const versionedOutputPath = await this.generateVersionedFilename(outputPath);
      
      console.log(`📝 Creating migration documentation at: ${versionedOutputPath}`);
      
      // Generate the markdown content
      const markdownContent = await this.docGenerator.generateMarkdownContent(analysis, plan);
      
      // Write the file directly
      const outputDir = path.dirname(versionedOutputPath);
      if (!fs.existsSync(outputDir)) {
        await fs.promises.mkdir(outputDir, { recursive: true });
      }
      await fs.promises.writeFile(versionedOutputPath, markdownContent, 'utf-8');
      
      console.log(`✅ Migration documentation created successfully at: ${versionedOutputPath}`);
      
      // Return the file path, not the content
      return versionedOutputPath;
      
    } catch (error) {
      console.error('❌ Error creating migration documentation:', error);
      throw error;
    }
  }

  /**
   * Create split migration documentation - summary and detail files
   */
  async createSplitMigrationDocumentation(
    analysis: SourceCodeAnalysis, 
    plan: MigrationPlan, 
    outputPath: string
  ): Promise<{summaryPath: string, detailPath: string}> {
    try {
      // Generate versioned filenames for both files
      const baseName = path.basename(outputPath, '.md');
      const dir = path.dirname(outputPath);
      
      const summaryPath = path.join(dir, `${baseName}-summary.md`);
      const detailPath = path.join(dir, `${baseName}-detail.md`);
      
      const versionedSummaryPath = await this.generateVersionedFilename(summaryPath);
      const versionedDetailPath = await this.generateVersionedFilename(detailPath);
      
      console.log(`📝 Creating split migration documentation:`);
      console.log(`   📄 Summary: ${versionedSummaryPath}`);
      console.log(`   📄 Detail: ${versionedDetailPath}`);
      
      // Generate the split markdown content
      const { summary, detail } = await this.docGenerator.generateSplitMarkdownContent(analysis, plan);
      
      // Write both files
      const outputDir = path.dirname(versionedSummaryPath);
      if (!fs.existsSync(outputDir)) {
        await fs.promises.mkdir(outputDir, { recursive: true });
      }
      
      await fs.promises.writeFile(versionedSummaryPath, summary, 'utf-8');
      await fs.promises.writeFile(versionedDetailPath, detail, 'utf-8');
      
      console.log(`✅ Split migration documentation created successfully:`);
      console.log(`   📄 Summary: ${versionedSummaryPath}`);
      console.log(`   📄 Detail: ${versionedDetailPath}`);
      
      return {
        summaryPath: versionedSummaryPath,
        detailPath: versionedDetailPath
      };
      
    } catch (error) {
      console.error('❌ Error creating split migration documentation:', error);
      throw error;
    }
  }

  /**
   * Generate versioned filename to avoid overwriting existing files
   */
  private async generateVersionedFilename(basePath: string): Promise<string> {
    try {
      const dir = path.dirname(basePath);
      const baseName = path.basename(basePath, '.md');
      
      // Find existing analysis files in the directory
      const existingFiles = await this.findExistingAnalysisFiles(dir, baseName);
      
      // Calculate next version number
      const nextVersion = this.calculateNextVersion(existingFiles);
      
      // Generate new filename
      const versionedFilename = `${baseName}-v${nextVersion}.md`;
      const fullPath = path.join('/Users/prateek/Desktop/peer-ai-mongo-documents', versionedFilename);
      
      console.log(`📋 Version ${nextVersion} detected, creating: ${versionedFilename}`);
      
      return fullPath;
      
    } catch (error) {
      console.error('❌ Error generating versioned filename:', error);
      // Fallback to original path if versioning fails
      return basePath;
    }
  }

  /**
   * Find existing analysis files in the directory
   */
  private async findExistingAnalysisFiles(dir: string, baseName: string): Promise<string[]> {
    try {
      const files = await fs.promises.readdir('/Users/prateek/Desktop/peer-ai-mongo-documents');
      
      // Filter for analysis files matching the pattern
      const analysisFiles = files.filter(file => {
        const pattern = new RegExp(`^${baseName}-v\\d+\\.md$`);
        return pattern.test(file);
      });
      
      return analysisFiles;
      
    } catch (error) {
      console.warn('⚠️ Could not read directory for version detection:', error);
      return [];
    }
  }

  /**
   * Calculate next version number based on existing files
   */
  private calculateNextVersion(existingFiles: string[]): number {
    if (existingFiles.length === 0) {
      return 1; // First version
    }
    
    // Extract version numbers from existing files
    const versions = existingFiles.map(file => {
      const match = file.match(/-v(\d+)\.md$/);
      return match ? parseInt(match[1]) : 0;
    });
    
    // Find the highest version number
    const maxVersion = Math.max(...versions, 0);
    
    // Return next version
    return maxVersion + 1;
  }

  /**
   * Find all Java source files in the project
   */
  private async findJavaFiles(sourceCodePath: string): Promise<string[]> {
    const javaFiles: string[] = [];
    
    const scanDirectory = async (dirPath: string) => {
      try {
        const items = await fs.promises.readdir(dirPath);
        
        for (const item of items) {
          const fullPath = path.join(dirPath, item);
          const stat = await fs.promises.stat(fullPath);
          
          if (stat.isDirectory()) {
            // Skip certain directories
            if (!['target', '.git', 'node_modules', '.mvn'].includes(item)) {
              await scanDirectory(fullPath);
            }
          } else if (item.endsWith('.java')) {
            javaFiles.push(fullPath);
          }
        }
      } catch (error) {
        console.warn(`Warning: Could not scan directory ${dirPath}:`, error);
      }
    };
    
    await scanDirectory(sourceCodePath);
    return javaFiles;
  }

  /**
   * Analyze entity classes
   */
  private async analyzeEntities(javaFiles: string[]): Promise<FileAnalysis[]> {
    const entityFiles = javaFiles.filter(file => 
      file.includes('/entity/') || 
      file.includes('\\entity\\') ||
      file.toLowerCase().includes('entity')
    );
    
    return await Promise.all(
      entityFiles.map(async (file) => {
        const content = await fs.promises.readFile(file, 'utf-8');
        return this.codeParser.analyzeEntityFile(file, content);
      })
    );
  }

  /**
   * Analyze repository interfaces
   */
  private async analyzeRepositories(javaFiles: string[]): Promise<FileAnalysis[]> {
    const repositoryFiles = javaFiles.filter(file => 
      file.includes('/repository/') || 
      file.includes('\\repository\\') ||
      file.toLowerCase().includes('repository')
    );
    
    return await Promise.all(
      repositoryFiles.map(async (file) => {
        const content = await fs.promises.readFile(file, 'utf-8');
        return this.codeParser.analyzeRepositoryFile(file, content);
      })
    );
  }

  /**
   * Analyze controller classes
   */
  private async analyzeControllers(javaFiles: string[]): Promise<FileAnalysis[]> {
    const controllerFiles = javaFiles.filter(file => 
      file.includes('/controller/') || 
      file.includes('\\controller\\') ||
      file.toLowerCase().includes('controller')
    );
    
    return await Promise.all(
      controllerFiles.map(async (file) => {
        const content = await fs.promises.readFile(file, 'utf-8');
        return this.codeParser.analyzeControllerFile(file, content);
      })
    );
  }

  /**
   * Analyze service classes
   */
  private async analyzeServices(javaFiles: string[]): Promise<FileAnalysis[]> {
    const serviceFiles = javaFiles.filter(file => 
      file.includes('/service/') || 
      file.includes('\\service\\') ||
      file.toLowerCase().includes('service')
    );
    
    return await Promise.all(
      serviceFiles.map(async (file) => {
        const content = await fs.promises.readFile(file, 'utf-8');
        return this.codeParser.analyzeServiceFile(file, content);
      })
    );
  }

  /**
   * Analyze configuration files
   */
  private async analyzeConfiguration(sourceCodePath: string): Promise<any> {
    const config: any = {};
    
    try {
      // Check for application.properties
      const propertiesPath = path.join(sourceCodePath, 'src', 'main', 'resources', 'application.properties');
      if (fs.existsSync(propertiesPath)) {
        const content = await fs.promises.readFile(propertiesPath, 'utf-8');
        config.properties = this.parsePropertiesFile(content);
      }
      
      // Check for pom.xml
      const pomPath = path.join(sourceCodePath, 'pom.xml');
      if (fs.existsSync(pomPath)) {
        const content = await fs.promises.readFile(pomPath, 'utf-8');
        config.pom = this.parsePomFile(content);
      }
      
    } catch (error) {
      console.warn('Warning: Could not analyze configuration files:', error);
    }
    
    return config;
  }

  /**
   * Analyze project structure dynamically
   */
  private async analyzeProjectStructure(sourceCodePath: string): Promise<{
    mainJavaPath: string;
    mainResourcesPath: string;
    testPath: string;
    configPath: string;
    layers: string[];
    hasSpringBoot: boolean;
    hasJPA: boolean;
    hasMongoDB: boolean;
  }> {
    const structure = {
      mainJavaPath: '',
      mainResourcesPath: '',
      testPath: '',
      configPath: '',
      layers: [] as string[],
      hasSpringBoot: false,
      hasJPA: false,
      hasMongoDB: false
    };

    try {
      const srcPath = path.join(sourceCodePath, 'src');
      if (fs.existsSync(srcPath)) {
        const mainPath = path.join(srcPath, 'main');
        const testPath = path.join(srcPath, 'test');
        
        if (fs.existsSync(mainPath)) {
          // Dynamically detect Java source path
          const javaPath = path.join(mainPath, 'java');
          if (fs.existsSync(javaPath)) {
            structure.mainJavaPath = javaPath;
          }
          
          // Dynamically detect resources path
          const resourcesPath = path.join(mainPath, 'resources');
          if (fs.existsSync(resourcesPath)) {
            structure.mainResourcesPath = resourcesPath;
          }
          
          // Detect layers dynamically based on actual directory structure
          if (structure.mainJavaPath) {
            const javaItems = await fs.promises.readdir(structure.mainJavaPath);
            structure.layers = javaItems.filter(item => {
              const fullPath = path.join(structure.mainJavaPath, item);
              return fs.statSync(fullPath).isDirectory();
            });
          }
        }
        
        if (fs.existsSync(testPath)) {
          structure.testPath = testPath;
        }
      }
      
    } catch (error) {
      console.warn('Warning: Could not analyze project structure:', error);
    }
    
    return structure;
  }

  /**
   * Parse properties file
   */
  private parsePropertiesFile(content: string): any {
    const properties: any = {};
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          properties[key.trim()] = valueParts.join('=').trim();
        }
      }
    }
    
    return properties;
  }

  /**
   * Parse pom.xml file
   */
  private parsePomFile(content: string): any {
    const pom: any = {
      groupId: '',
      artifactId: '',
      version: '',
      dependencies: [],
      properties: {}
    };
    
    // Extract basic info using regex (simplified parsing)
    const groupIdMatch = content.match(/<groupId>(.*?)<\/groupId>/);
    const artifactIdMatch = content.match(/<artifactId>(.*?)<\/artifactId>/);
    const versionMatch = content.match(/<version>(.*?)<\/version>/);
    
    if (groupIdMatch) pom.groupId = groupIdMatch[1];
    if (artifactIdMatch) pom.artifactId = artifactIdMatch[1];
    if (versionMatch) pom.version = versionMatch[1];
    
    // Extract dependencies
    const dependencyMatches = content.match(/<dependency>([\s\S]*?)<\/dependency>/g);
    if (dependencyMatches) {
      for (const dep of dependencyMatches) {
        const depGroupId = dep.match(/<groupId>(.*?)<\/groupId>/);
        const depArtifactId = dep.match(/<artifactId>(.*?)<\/artifactId>/);
        const depVersion = dep.match(/<version>(.*?)<\/version>/);
        
        if (depGroupId && depArtifactId) {
          pom.dependencies.push({
            groupId: depGroupId[1],
            artifactId: depArtifactId[1],
            version: depVersion ? depVersion[1] : ''
          });
        }
      }
    }
    
    return pom;
  }

  /**
   * Calculate overall migration complexity
   */
  private calculateMigrationComplexity(
    entities: FileAnalysis[], 
    repositories: FileAnalysis[], 
    services: FileAnalysis[]
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    let complexityScore = 0;
    
    // Entity complexity
    entities.forEach(entity => {
      if (entity.complexity === 'LOW') complexityScore += 1;
      else if (entity.complexity === 'MEDIUM') complexityScore += 2;
      else if (entity.complexity === 'HIGH') complexityScore += 3;
      else if (entity.complexity === 'CRITICAL') complexityScore += 4;
    });
    
    // Repository complexity
    repositories.forEach(repo => {
      if (repo.complexity === 'LOW') complexityScore += 1;
      else if (repo.complexity === 'MEDIUM') complexityScore += 2;
      else if (repo.complexity === 'HIGH') complexityScore += 3;
      else if (repo.complexity === 'CRITICAL') complexityScore += 4;
    });
    
    // Service complexity
    services.forEach(service => {
      if (service.complexity === 'LOW') complexityScore += 1;
      else if (service.complexity === 'MEDIUM') complexityScore += 2;
      else if (service.complexity === 'HIGH') complexityScore += 3;
      else if (service.complexity === 'CRITICAL') complexityScore += 4;
    });
    
    const totalFiles = entities.length + repositories.length + services.length;
    const averageScore = totalFiles > 0 ? complexityScore / totalFiles : 0;
    
    if (averageScore <= 1.5) return 'LOW';
    else if (averageScore <= 2.5) return 'MEDIUM';
    else if (averageScore <= 3.5) return 'HIGH';
    else return 'CRITICAL';
  }
}
