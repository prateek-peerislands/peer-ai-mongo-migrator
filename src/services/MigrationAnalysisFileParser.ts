import fs from 'fs';
import path from 'path';

export interface MigrationAnalysis {
  transformationRules: TransformationRule[];
  dataMapping: DataMapping[];
  recommendations: Recommendation[];
  summary: {
    totalTransformations: number;
    totalMappings: number;
    totalRecommendations: number;
  };
}

export interface TransformationRule {
  id: string;
  sourceType: string;
  targetType: string;
  description: string;
  rationale: string;
  examples?: string[];
}

export interface DataMapping {
  sourceField: string;
  targetField: string;
  transformation: string;
  rationale: string;
  considerations?: string[];
}

export interface Recommendation {
  type: 'performance' | 'structure' | 'data' | 'index';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  rationale: string;
  implementation?: string;
}

export class MigrationAnalysisFileParser {
  /**
   * Find the latest migration analysis markdown file
   */
  findLatestMigrationAnalysisFile(directory: string = process.cwd()): string | null {
    try {
      const files = fs.readdirSync(directory);
      const migrationFiles = files
        .filter(file => file.includes('-analysis-') && file.endsWith('.md'))
        .sort()
        .reverse();
      
      return migrationFiles.length > 0 ? migrationFiles[0] : null;
    } catch (error) {
      console.error('Error finding migration analysis file:', error);
      return null;
    }
  }

  /**
   * Parse a migration analysis markdown file
   */
  async parseAnalysisFile(filePath: string): Promise<MigrationAnalysis> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return this.parseMigrationAnalysisContent(content);
    } catch (error) {
      console.error('Error parsing migration analysis file:', error);
      throw new Error(`Failed to parse migration analysis file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse migration analysis information from markdown content
   */
  private parseMigrationAnalysisContent(content: string): MigrationAnalysis {
    const transformationRules = this.extractTransformationRules(content);
    const dataMapping = this.extractDataMapping(content);
    const recommendations = this.extractRecommendations(content);
    const summary = this.extractSummary(content);

    console.log(`📊 Parsed ${transformationRules.length} transformation rules from migration analysis`);

    return {
      transformationRules,
      dataMapping,
      recommendations,
      summary
    };
  }

  /**
   * Extract transformation rules from markdown content
   */
  private extractTransformationRules(content: string): TransformationRule[] {
    const rules: TransformationRule[] = [];
    const rulesRegex = /## Transformation Rules[\s\S]*?(?=##|$)/;
    const rulesMatch = content.match(rulesRegex);
    
    if (!rulesMatch) return rules;

    const rulesSection = rulesMatch[0];
    const ruleRegex = /### (.+?)(?=###|$)/gs;
    let match;

    while ((match = ruleRegex.exec(rulesSection)) !== null) {
      const ruleSection = match[1];
      const lines = ruleSection.split('\n');
      const title = lines[0].trim();
      
      // Extract rule details
      const sourceTypeMatch = ruleSection.match(/Source Type: (.+)/);
      const targetTypeMatch = ruleSection.match(/Target Type: (.+)/);
      const descriptionMatch = ruleSection.match(/Description: (.+?)(?:\n|$)/);
      const rationaleMatch = ruleSection.match(/Rationale: (.+?)(?:\n|$)/);
      
      const sourceType = sourceTypeMatch ? sourceTypeMatch[1].trim() : 'Unknown';
      const targetType = targetTypeMatch ? targetTypeMatch[1].trim() : 'Unknown';
      const description = descriptionMatch ? descriptionMatch[1].trim() : '';
      const rationale = rationaleMatch ? rationaleMatch[1].trim() : '';
      
      // Extract examples
      const examples = this.extractExamples(ruleSection);

      rules.push({
        id: this.generateRuleId(title),
        sourceType,
        targetType,
        description,
        rationale,
        examples
      });
    }

    return rules;
  }

  /**
   * Extract data mapping from markdown content
   */
  private extractDataMapping(content: string): DataMapping[] {
    const mappings: DataMapping[] = [];
    const mappingRegex = /## Data Mapping[\s\S]*?(?=##|$)/;
    const mappingMatch = content.match(mappingRegex);
    
    if (!mappingMatch) return mappings;

    const mappingSection = mappingMatch[0];
    const tableRegex = /\| (.+?) \| (.+?) \| (.+?) \| (.+?) \|/g;
    let match;

    while ((match = tableRegex.exec(mappingSection)) !== null) {
      const [, sourceField, targetField, transformation, rationale] = match;
      
      mappings.push({
        sourceField: sourceField.trim(),
        targetField: targetField.trim(),
        transformation: transformation.trim(),
        rationale: rationale.trim(),
        considerations: this.extractConsiderations(rationale)
      });
    }

    return mappings;
  }

  /**
   * Extract recommendations from markdown content
   */
  private extractRecommendations(content: string): Recommendation[] {
    const recommendations: Recommendation[] = [];
    const recRegex = /## Recommendations[\s\S]*?(?=##|$)/;
    const recMatch = content.match(recRegex);
    
    if (!recMatch) return recommendations;

    const recSection = recMatch[0];
    const recItemRegex = /### (.+?)(?=###|$)/gs;
    let match;

    while ((match = recItemRegex.exec(recSection)) !== null) {
      const recSection = match[1];
      const lines = recSection.split('\n');
      const title = lines[0].trim();
      
      // Extract recommendation details
      const typeMatch = recSection.match(/Type: (.+)/);
      const priorityMatch = recSection.match(/Priority: (.+)/);
      const descriptionMatch = recSection.match(/Description: (.+?)(?:\n|$)/);
      const rationaleMatch = recSection.match(/Rationale: (.+?)(?:\n|$)/);
      const implementationMatch = recSection.match(/Implementation: (.+?)(?:\n|$)/);
      
      const type = typeMatch ? typeMatch[1].trim().toLowerCase() as Recommendation['type'] : 'structure';
      const priority = priorityMatch ? priorityMatch[1].trim().toLowerCase() as Recommendation['priority'] : 'medium';
      const description = descriptionMatch ? descriptionMatch[1].trim() : '';
      const rationale = rationaleMatch ? rationaleMatch[1].trim() : '';
      const implementation = implementationMatch ? implementationMatch[1].trim() : undefined;

      recommendations.push({
        type,
        priority,
        title,
        description,
        rationale,
        implementation
      });
    }

    return recommendations;
  }

  /**
   * Extract summary information from markdown content
   */
  private extractSummary(content: string): MigrationAnalysis['summary'] {
    const summaryMatch = content.match(/## Summary[\s\S]*?Total Transformations: (\d+)[\s\S]*?Total Mappings: (\d+)[\s\S]*?Total Recommendations: (\d+)/);
    
    if (summaryMatch) {
      return {
        totalTransformations: parseInt(summaryMatch[1]),
        totalMappings: parseInt(summaryMatch[2]),
        totalRecommendations: parseInt(summaryMatch[3])
      };
    }

    // Fallback: count from parsed data
    const transformationRules = this.extractTransformationRules(content);
    const dataMapping = this.extractDataMapping(content);
    const recommendations = this.extractRecommendations(content);

    return {
      totalTransformations: transformationRules.length,
      totalMappings: dataMapping.length,
      totalRecommendations: recommendations.length
    };
  }

  /**
   * Extract examples from a rule section
   */
  private extractExamples(ruleSection: string): string[] {
    const examples: string[] = [];
    const exampleRegex = /Example: (.+?)(?:\n|$)/g;
    let match;

    while ((match = exampleRegex.exec(ruleSection)) !== null) {
      examples.push(match[1].trim());
    }

    return examples;
  }

  /**
   * Extract considerations from rationale text
   */
  private extractConsiderations(rationale: string): string[] {
    const considerations: string[] = [];
    const considerationRegex = /Consideration: (.+?)(?:\n|$)/g;
    let match;

    while ((match = considerationRegex.exec(rationale)) !== null) {
      considerations.push(match[1].trim());
    }

    return considerations;
  }

  /**
   * Generate a unique ID for a transformation rule
   */
  private generateRuleId(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
  }
}
