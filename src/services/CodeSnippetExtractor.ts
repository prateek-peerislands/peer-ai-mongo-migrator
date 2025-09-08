import * as fs from 'fs';
import * as path from 'path';

export interface CodeSnippet {
  fileName: string;
  filePath: string;
  snippet: string;
  lineStart: number;
  lineEnd: number;
  context: string;
  methodName?: string;
  className?: string;
}

export interface SnippetExtractionOptions {
  maxLines: number;
  includeComments: boolean;
  includeImports: boolean;
  contextLines: number;
}

export class CodeSnippetExtractor {
  private defaultOptions: SnippetExtractionOptions = {
    maxLines: 50,
    includeComments: true,
    includeImports: false,
    contextLines: 2
  };

  /**
   * Extract relevant code snippets from a source file
   */
  async extractSnippets(
    filePath: string,
    options: Partial<SnippetExtractionOptions> = {}
  ): Promise<CodeSnippet[]> {
    const opts = { ...this.defaultOptions, ...options };
    
    try {
      if (!fs.existsSync(filePath)) {
        console.warn(`File not found: ${filePath}`);
        return [];
      }

      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      return this.extractSnippetsFromContent(filePath, lines, opts);
    } catch (error) {
      console.error(`Error extracting snippets from ${filePath}:`, error);
      return [];
    }
  }

  /**
   * Extract snippets from file content
   */
  private extractSnippetsFromContent(
    filePath: string,
    lines: string[],
    options: SnippetExtractionOptions
  ): CodeSnippet[] {
    const snippets: CodeSnippet[] = [];
    const fileName = path.basename(filePath);

    // Extract only the most relevant snippets - class definition and key methods
    const classSnippet = this.extractClassDefinitionSnippet(filePath, fileName, lines, options);
    if (classSnippet) {
      snippets.push(classSnippet);
    }

    // Extract only the most important method snippets (max 3-4 methods)
    const methodSnippets = this.extractKeyMethodSnippets(filePath, fileName, lines, options);
    snippets.push(...methodSnippets.slice(0, 3)); // Limit to 3 most important methods

    return snippets;
  }

  /**
   * Extract a single, focused class definition snippet
   */
  private extractClassDefinitionSnippet(
    filePath: string,
    fileName: string,
    lines: string[],
    options: SnippetExtractionOptions
  ): CodeSnippet | null {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (this.isClassDefinition(line)) {
        const className = this.extractClassName(line);
        // Extract only the class declaration and opening brace (max 5 lines)
        const snippet = this.extractFocusedSnippet(
          filePath,
          fileName,
          lines,
          i,
          5, // max 5 lines for class definition
          `Class definition: ${className}`
        );
        
        if (snippet) {
          return {
            ...snippet,
            className,
            context: `Class definition: ${className}`
          };
        }
      }
    }
    
    return null;
  }

  /**
   * Extract key method snippets (only the most important ones)
   */
  private extractKeyMethodSnippets(
    filePath: string,
    fileName: string,
    lines: string[],
    options: SnippetExtractionOptions
  ): CodeSnippet[] {
    const snippets: CodeSnippet[] = [];
    const methodCandidates: { line: number; name: string; importance: number }[] = [];
    
    // First pass: identify all methods and score their importance
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (this.isMethodDefinition(line)) {
        const methodName = this.extractMethodName(line);
        const importance = this.scoreMethodImportance(line, methodName);
        
        methodCandidates.push({
          line: i,
          name: methodName,
          importance
        });
      }
    }
    
    // Sort by importance and take only the most important ones
    methodCandidates
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 4) // Take top 4 methods
      .forEach(candidate => {
        const snippet = this.extractFocusedSnippet(
          filePath,
          fileName,
          lines,
          candidate.line,
          8, // max 8 lines per method
          `Method: ${candidate.name}`
        );
        
        if (snippet) {
          snippets.push({
            ...snippet,
            methodName: candidate.name,
            context: `Method: ${candidate.name}`
          });
        }
      });
    
    return snippets;
  }


  /**
   * Extract a focused snippet around a specific line (with limited lines)
   */
  private extractFocusedSnippet(
    filePath: string,
    fileName: string,
    lines: string[],
    centerLine: number,
    maxLines: number,
    context: string
  ): CodeSnippet | null {
    const startLine = Math.max(0, centerLine);
    const endLine = Math.min(lines.length - 1, centerLine + maxLines - 1);
    
    const snippetLines = lines.slice(startLine, endLine + 1);
    const snippet = snippetLines.join('\n');
    
    // Clean up the snippet - remove empty lines at start/end
    const cleanedSnippet = snippet.trim();
    
    return {
      fileName,
      filePath,
      snippet: cleanedSnippet,
      lineStart: startLine + 1,
      lineEnd: endLine + 1,
      context
    };
  }

  /**
   * Extract a snippet around a specific line
   */
  private extractSnippetAroundLine(
    filePath: string,
    fileName: string,
    lines: string[],
    centerLine: number,
    options: SnippetExtractionOptions,
    context: string
  ): CodeSnippet | null {
    const startLine = Math.max(0, centerLine - options.contextLines);
    const endLine = Math.min(lines.length - 1, centerLine + options.maxLines);
    
    const snippetLines = lines.slice(startLine, endLine + 1);
    const snippet = snippetLines.join('\n');
    
    // Filter out imports if not requested
    let filteredSnippet = snippet;
    if (!options.includeImports) {
      const snippetLinesArray = snippet.split('\n');
      const filteredLines = snippetLinesArray.filter(line => 
        !line.trim().startsWith('import ') && 
        !line.trim().startsWith('package ')
      );
      filteredSnippet = filteredLines.join('\n');
    }
    
    // Filter out comments if not requested
    if (!options.includeComments) {
      const snippetLinesArray = filteredSnippet.split('\n');
      const filteredLines = snippetLinesArray.filter(line => 
        !line.trim().startsWith('//') && 
        !line.trim().startsWith('/*') &&
        !line.trim().startsWith('*')
      );
      filteredSnippet = filteredLines.join('\n');
    }
    
    return {
      fileName,
      filePath,
      snippet: filteredSnippet,
      lineStart: startLine + 1,
      lineEnd: endLine + 1,
      context
    };
  }

  /**
   * Check if a line is a class definition
   */
  private isClassDefinition(line: string): boolean {
    return /^\s*(public|private|protected)?\s*(abstract\s+)?(class|interface|enum)\s+\w+/.test(line);
  }

  /**
   * Check if a line is a method definition
   */
  private isMethodDefinition(line: string): boolean {
    return /^\s*(public|private|protected)?\s*(static\s+)?\w+\s+\w+\s*\(/.test(line) &&
           !line.includes('class') &&
           !line.includes('interface') &&
           !line.includes('enum');
  }

  /**
   * Check if a line contains complex business logic
   */
  private isComplexBusinessLogic(line: string): boolean {
    const complexPatterns = [
      /if\s*\(.*\)\s*{/,  // if statements
      /for\s*\(.*\)\s*{/, // for loops
      /while\s*\(.*\)\s*{/, // while loops
      /switch\s*\(.*\)\s*{/, // switch statements
      /try\s*{/, // try blocks
      /catch\s*\(.*\)\s*{/, // catch blocks
      /@Transactional/, // Spring annotations
      /@Service/, // Spring service annotations
      /@Repository/, // Spring repository annotations
      /@Autowired/, // Spring autowired annotations
      /@Override/, // Override annotations
      /return\s+.*;/, // return statements
      /throw\s+new\s+\w+/, // throw statements
    ];
    
    return complexPatterns.some(pattern => pattern.test(line));
  }

  /**
   * Extract class name from class definition line
   */
  private extractClassName(line: string): string {
    const match = line.match(/(?:class|interface|enum)\s+(\w+)/);
    return match ? match[1] : 'Unknown';
  }

  /**
   * Extract method name from method definition line
   */
  private extractMethodName(line: string): string {
    const match = line.match(/(?:public|private|protected)?\s*(?:static\s+)?\w+\s+(\w+)\s*\(/);
    return match ? match[1] : 'Unknown';
  }

  /**
   * Extract snippets for a specific service file
   */
  async extractServiceSnippets(servicePath: string): Promise<CodeSnippet[]> {
    return this.extractSnippets(servicePath, {
      maxLines: 30,
      includeComments: true,
      includeImports: false,
      contextLines: 2
    });
  }

  /**
   * Extract snippets for stored procedures or SQL files
   */
  async extractStoredProcedureSnippets(procedurePath: string): Promise<CodeSnippet[]> {
    return this.extractSnippets(procedurePath, {
      maxLines: 40,
      includeComments: true,
      includeImports: false,
      contextLines: 3
    });
  }

  /**
   * Score method importance based on method name and annotations
   */
  private scoreMethodImportance(line: string, methodName: string): number {
    let score = 0;
    
    // Higher score for public methods
    if (line.includes('public')) score += 10;
    if (line.includes('private')) score -= 5;
    
    // Higher score for important method names
    const importantMethods = ['save', 'create', 'update', 'delete', 'find', 'get', 'process', 'handle', 'execute'];
    importantMethods.forEach(important => {
      if (methodName.toLowerCase().includes(important)) {
        score += 15;
      }
    });
    
    // Higher score for methods with important annotations
    if (line.includes('@Transactional')) score += 20;
    if (line.includes('@Override')) score += 5;
    if (line.includes('@Service')) score += 10;
    if (line.includes('@Autowired')) score += 5;
    
    // Higher score for methods that return important types
    if (line.includes('List<') || line.includes('Collection<')) score += 8;
    if (line.includes('Optional<')) score += 5;
    if (line.includes('ResponseEntity')) score += 10;
    
    // Lower score for getters/setters
    if (methodName.startsWith('get') || methodName.startsWith('set') || methodName.startsWith('is')) {
      score -= 10;
    }
    
    return score;
  }

  /**
   * Get the most relevant snippet for a specific context
   */
  getMostRelevantSnippet(snippets: CodeSnippet[], context: string): CodeSnippet | null {
    if (snippets.length === 0) return null;
    
    // Prioritize snippets based on context
    const contextLower = context.toLowerCase();
    
    // Find snippets that match the context
    const matchingSnippets = snippets.filter(snippet => 
      snippet.context.toLowerCase().includes(contextLower) ||
      snippet.methodName?.toLowerCase().includes(contextLower) ||
      snippet.className?.toLowerCase().includes(contextLower)
    );
    
    if (matchingSnippets.length > 0) {
      return matchingSnippets[0];
    }
    
    // Fallback to the first snippet
    return snippets[0];
  }
}
