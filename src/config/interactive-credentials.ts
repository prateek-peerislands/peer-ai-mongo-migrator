import inquirer from 'inquirer';
import chalk from 'chalk';
import { DatabaseConfig } from '../types/index.js';

export interface CredentialPrompt {
  postgresql: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
  };
  mongodb: {
    connectionString: string;
    database: string;
  };
}

export class InteractiveCredentials {
  private static instance: InteractiveCredentials;
  private credentials: DatabaseConfig | null = null;

  private constructor() {}

  static getInstance(): InteractiveCredentials {
    if (!InteractiveCredentials.instance) {
      InteractiveCredentials.instance = new InteractiveCredentials();
    }
    return InteractiveCredentials.instance;
  }

  /**
   * Check if credentials are already set in memory
   */
  hasCredentials(): boolean {
    return this.credentials !== null;
  }

  /**
   * Get stored credentials (returns null if not set)
   */
  getCredentials(): DatabaseConfig | null {
    return this.credentials;
  }

  /**
   * Prompt user for credentials and store them in memory
   */
  async promptForCredentials(): Promise<DatabaseConfig> {
    // If credentials already exist in memory, return them
    if (this.credentials) {
      return this.credentials;
    }

    console.log(chalk.blue.bold('🔐 Database Credentials Required\n'));
    console.log(chalk.gray('Please provide your database credentials to get started.'));
    console.log(chalk.yellow('⚠️  These credentials will be stored in memory only and wiped when you exit.\n'));

    const credentials = await this.promptCredentials();
    this.credentials = this.buildConfig(credentials);
    
    console.log(chalk.green.bold('\n✅ Credentials loaded successfully!'));
    console.log(chalk.gray('Your credentials are now stored in memory.'));
    console.log(chalk.yellow('💡 Use "exit" or Ctrl+C to close the server and wipe credentials.\n'));
    
    return this.credentials;
  }

  /**
   * Clear stored credentials from memory
   */
  clearCredentials(): void {
    this.credentials = null;
    console.log(chalk.gray('🧹 Credentials cleared from memory.'));
  }

  /**
   * Prompt user for all required credentials
   */
  private async promptCredentials(): Promise<CredentialPrompt> {
    const answers = await inquirer.prompt([
      // PostgreSQL Configuration
      {
        type: 'input',
        name: 'pgHost',
        message: 'PostgreSQL Host:',
        default: 'localhost',
        validate: (input: string) => input.trim() ? true : 'Host is required'
      },
      {
        type: 'number',
        name: 'pgPort',
        message: 'PostgreSQL Port:',
        default: 5432,
        validate: (input: number) => input > 0 && input < 65536 ? true : 'Port must be between 1 and 65535'
      },
      {
        type: 'input',
        name: 'pgDatabase',
        message: 'PostgreSQL Database:',
        default: 'default',
        validate: (input: string) => input.trim() ? true : 'Database name is required'
      },
      {
        type: 'input',
        name: 'pgUsername',
        message: 'PostgreSQL Username:',
        default: 'postgres',
        validate: (input: string) => input.trim() ? true : 'Username is required'
      },
      {
        type: 'password',
        name: 'pgPassword',
        message: 'PostgreSQL Password:',
        mask: '*',
        validate: (input: string) => input.trim() ? true : 'Password is required'
      },
      
      // MongoDB Configuration
      {
        type: 'input',
        name: 'mongoConnectionString',
        message: 'MongoDB Connection String:',
        default: 'mongodb+srv://username:password@cluster.mongodb.net/',
        validate: (input: string) => {
          if (!input.trim()) return 'Connection string is required';
          if (!input.includes('mongodb://') && !input.includes('mongodb+srv://')) {
            return 'Connection string must start with mongodb:// or mongodb+srv://';
          }
          return true;
        }
      },
      {
        type: 'input',
        name: 'mongoDatabase',
        message: 'MongoDB Database:',
        default: 'default',
        validate: (input: string) => input.trim() ? true : 'Database name is required'
      }
    ]);

    // Transform flat answers to nested structure
    const credentials: CredentialPrompt = {
      postgresql: {
        host: answers.pgHost,
        port: answers.pgPort,
        database: answers.pgDatabase,
        username: answers.pgUsername,
        password: answers.pgPassword
      },
      mongodb: {
        connectionString: answers.mongoConnectionString,
        database: answers.mongoDatabase
      }
    };

    return credentials;
  }

  /**
   * Build complete configuration object
   */
  private buildConfig(credentials: CredentialPrompt): DatabaseConfig {
    // Build MongoDB connection string with database name
    const mongoConnectionString = this.buildMongoDBConnectionString(
      credentials.mongodb.connectionString,
      credentials.mongodb.database
    );
    
    return {
      postgresql: {
        host: credentials.postgresql.host,
        port: credentials.postgresql.port,
        database: credentials.postgresql.database,
        username: credentials.postgresql.username,
        password: credentials.postgresql.password
      },
      mongodb: {
        connectionString: mongoConnectionString,
        database: credentials.mongodb.database
      }
    };
  }

  /**
   * Build MongoDB connection string with database name
   */
  private buildMongoDBConnectionString(baseConnectionString: string, databaseName: string): string {
    // If the connection string already contains a database name, return as is
    if (baseConnectionString.includes('/' + databaseName) || baseConnectionString.endsWith('/' + databaseName)) {
      return baseConnectionString;
    }
    
    // For cluster connections, add database name after the host
    if (baseConnectionString.includes('mongodb+srv://')) {
      // mongodb+srv://username:password@cluster.mongodb.net/database
      if (baseConnectionString.endsWith('/')) {
        return baseConnectionString + databaseName;
      } else if (baseConnectionString.includes('?')) {
        // Has query parameters, insert database before ?
        const parts = baseConnectionString.split('?');
        return parts[0] + '/' + databaseName + '?' + parts[1];
      } else {
        return baseConnectionString + '/' + databaseName;
      }
    } else {
      // Standard MongoDB connection string
      if (baseConnectionString.endsWith('/')) {
        return baseConnectionString + databaseName;
      } else {
        return baseConnectionString + '/' + databaseName;
      }
    }
  }

  /**
   * Validate connection strings and provide feedback
   */
  validateConnectionStrings(config: DatabaseConfig): void {
    console.log(chalk.blue.bold('\n🔍 Connection String Validation:\n'));
    
    // PostgreSQL validation
    if (config.postgresql) {
      const pg = config.postgresql;
      console.log(chalk.gray('PostgreSQL:'));
      console.log(`  Host: ${pg.host}:${pg.port}`);
      console.log(`  Database: ${pg.database}`);
      console.log(`  Username: ${pg.username}`);
      console.log(`  Password: ${'*'.repeat(pg.password.length)}\n`);
    }

    // MongoDB validation
    if (config.mongodb) {
      const mongo = config.mongodb;
      console.log(chalk.gray('MongoDB:'));
      console.log(`  Connection: ${mongo.connectionString}`);
      console.log(`  Database: ${mongo.database}\n`);
    }
  }
}

/**
 * Convenience function to get credentials (prompts if not set)
 */
export async function getInteractiveCredentials(): Promise<DatabaseConfig> {
  return InteractiveCredentials.getInstance().promptForCredentials();
}

/**
 * Convenience function to clear credentials
 */
export function clearInteractiveCredentials(): void {
  InteractiveCredentials.getInstance().clearCredentials();
}

/**
 * Convenience function to check if credentials exist
 */
export function hasInteractiveCredentials(): boolean {
  return InteractiveCredentials.getInstance().hasCredentials();
}
