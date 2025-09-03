import fs from 'fs';
import path from 'path';

export interface DualLocationOptions {
  centralLocation?: string;
  projectLocation?: string;
  createDirectories?: boolean;
}

export class DualLocationFileWriter {
  private static readonly DEFAULT_CENTRAL_LOCATION = '/Users/prateek/Desktop/peer-ai-mongo-documents';
  private static readonly DIAGRAMS_SUBDIR = 'diagrams';

  /**
   * Write file to both central location and current project directory
   */
  static writeToBothLocations(
    filename: string, 
    content: string, 
    options: DualLocationOptions = {}
  ): { centralPath: string; projectPath: string } {
    const centralLocation = options.centralLocation || this.DEFAULT_CENTRAL_LOCATION;
    const projectLocation = options.projectLocation || process.cwd();
    const createDirectories = options.createDirectories !== false; // Default to true

    // Central location path
    const centralPath = path.join(centralLocation, filename);
    
    // Project location path
    const projectPath = path.join(projectLocation, filename);

    // Ensure directories exist if requested
    if (createDirectories) {
      this.ensureDirectoryExists(path.dirname(centralPath));
      this.ensureDirectoryExists(path.dirname(projectPath));
    }

    // Write to both locations
    fs.writeFileSync(centralPath, content, 'utf8');
    fs.writeFileSync(projectPath, content, 'utf8');

    console.log(`📁 File written to both locations:`);
    console.log(`   📍 Central: ${centralPath}`);
    console.log(`   📍 Project: ${projectPath}`);

    return { centralPath, projectPath };
  }

  /**
   * Write diagram file to both central diagrams subdirectory and project directory
   */
  static writeDiagramToBothLocations(
    filename: string, 
    content: string, 
    options: DualLocationOptions = {}
  ): { centralPath: string; projectPath: string } {
    const centralLocation = options.centralLocation || this.DEFAULT_CENTRAL_LOCATION;
    const projectLocation = options.projectLocation || process.cwd();
    const createDirectories = options.createDirectories !== false;

    // Central location with diagrams subdirectory
    const centralPath = path.join(centralLocation, this.DIAGRAMS_SUBDIR, filename);
    
    // Project location (direct, no subdirectory)
    const projectPath = path.join(projectLocation, filename);

    // Ensure directories exist if requested
    if (createDirectories) {
      this.ensureDirectoryExists(path.dirname(centralPath));
      this.ensureDirectoryExists(path.dirname(projectPath));
    }

    // Write to both locations
    fs.writeFileSync(centralPath, content, 'utf8');
    fs.writeFileSync(projectPath, content, 'utf8');

    console.log(`🗺️ Diagram written to both locations:`);
    console.log(`   📍 Central: ${centralPath}`);
    console.log(`   📍 Project: ${projectPath}`);

    return { centralPath, projectPath };
  }

  /**
   * Ensure directory exists, create if it doesn't
   */
  private static ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Get both file paths without writing (useful for preview)
   */
  static getBothPaths(
    filename: string, 
    options: DualLocationOptions = {}
  ): { centralPath: string; projectPath: string } {
    const centralLocation = options.centralLocation || this.DEFAULT_CENTRAL_LOCATION;
    const projectLocation = options.projectLocation || process.cwd();

    const centralPath = path.join(centralLocation, filename);
    const projectPath = path.join(projectLocation, filename);

    return { centralPath, projectPath };
  }

  /**
   * Get both diagram paths without writing (useful for preview)
   */
  static getBothDiagramPaths(
    filename: string, 
    options: DualLocationOptions = {}
  ): { centralPath: string; projectPath: string } {
    const centralLocation = options.centralLocation || this.DEFAULT_CENTRAL_LOCATION;
    const projectLocation = options.projectLocation || process.cwd();

    const centralPath = path.join(centralLocation, this.DIAGRAMS_SUBDIR, filename);
    const projectPath = path.join(projectLocation, filename);

    return { centralPath, projectPath };
  }
}
