import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
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

export class InteractiveSetup {
  private static instance: InteractiveSetup;

  private constructor() {}

  static getInstance(): InteractiveSetup {
    if (!InteractiveSetup.instance) {
      InteractiveSetup.instance = new InteractiveSetup();
    }
    return InteractiveSetup.instance;
  }

  /**
   * Check if configuration exists
   */
  hasConfiguration(): boolean {
    const configPath = process.env.MCP_CONFIG_PATH || './mcp-config.json';
    return fs.existsSync(configPath);
  }

  /**
   * Interactive credential setup
   */
  async setupCredentials(): Promise<DatabaseConfig> {
    console.log(chalk.blue.bold('🔐 Database Configuration Setup\n'));
    console.log(chalk.gray('Please provide your database credentials to get started.\n'));

    const credentials = await this.promptCredentials();
    const config = this.buildConfig(credentials);
    
    await this.saveConfiguration(config);
    
    console.log(chalk.green.bold('\n✅ Configuration saved successfully!'));
    console.log(chalk.gray('Your credentials are now stored in mcp-config.json'));
    console.log(chalk.yellow('⚠️  Keep this file secure and never commit it to version control.\n'));
    
    return config;
  }

  /**
   * Reconfigure existing credentials
   */
  async reconfigureCredentials(): Promise<DatabaseConfig> {
    console.log(chalk.blue.bold('🔄 Reconfiguring Database Credentials\n'));
    console.log(chalk.gray('Please provide new database credentials.\n'));

    const credentials = await this.promptCredentials();
    const config = this.buildConfig(credentials);
    
    await this.saveConfiguration(config);
    
    console.log(chalk.green.bold('\n✅ Configuration updated successfully!'));
    console.log(chalk.gray('Your new credentials are now stored in mcp-config.json\n'));
    
    return config;
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
        type: 'password',
        name: 'pgDatabase',
        message: 'PostgreSQL Database:',
        mask: '*',
        default: 'default',
        validate: (input: string) => input.trim() ? true : 'Database name is required'
      },
      {
        type: 'password',
        name: 'pgUsername',
        message: 'PostgreSQL Username:',
        mask: '*',
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
        type: 'password',
        name: 'mongoConnectionString',
        message: 'MongoDB Connection String:',
        mask: '*',
        default: 'mongodb://localhost:27017',
        validate: (input: string) => {
          if (!input.trim()) return 'Connection string is required';
          if (!input.includes('mongodb://') && !input.includes('mongodb+srv://')) {
            return 'Connection string must start with mongodb:// or mongodb+srv://';
          }
          return true;
        }
      },
      {
        type: 'password',
        name: 'mongoDatabase',
        message: 'MongoDB Database:',
        mask: '*',
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
    return {
      postgresql: {
        host: credentials.postgresql.host,
        port: credentials.postgresql.port,
        database: credentials.postgresql.database,
        username: credentials.postgresql.username,
        password: credentials.postgresql.password
      },
      mongodb: {
        connectionString: credentials.mongodb.connectionString,
        database: credentials.mongodb.database
      }
    };
  }

  /**
   * Save configuration to file
   */
  private async saveConfiguration(config: DatabaseConfig): Promise<void> {
    const configPath = process.env.MCP_CONFIG_PATH || './mcp-config.json';
    const configDir = path.dirname(configPath);
    
    // Ensure directory exists
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    // Add MCP server configuration
    const fullConfig = {
      ...config,
      mcp: {
        enabled: true,
        servers: {
          postgresql: {
            tools: [
              'mcp_postgresql_read_query',
              'mcp_postgresql_write_query',
              'mcp_postgresql_create_table',
              'mcp_postgresql_alter_table',
              'mcp_postgresql_drop_table',
              'mcp_postgresql_export_query',
              'mcp_postgresql_list_tables',
              'mcp_postgresql_describe_table',
              'mcp_postgresql_append_insight',
              'mcp_postgresql_list_insights'
            ],
            enabled: true
          },
          mongodb: {
            tools: [
              'mcp_MongoDB_connect',
              'mcp_MongoDB_list-databases',
              'mcp_MongoDB_list-collections',
              'mcp_MongoDB_find',
              'mcp_MongoDB_insert-many',
              'mcp_MongoDB_update-many',
              'mcp_MongoDB_delete-many',
              'mcp_MongoDB_aggregate',
              'mcp_MongoDB_count',
              'mcp_MongoDB_create-collection',
              'mcp_MongoDB_drop-collection',
              'mcp_MongoDB_create-index',
              'mcp_MongoDB_collection-schema',
              'mcp_MongoDB_explain'
            ],
            enabled: true
          }
        }
      }
    };

    fs.writeFileSync(configPath, JSON.stringify(fullConfig, null, 2));
    console.log(chalk.gray(`📁 Configuration saved to: ${configPath}`));
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
 * Convenience function to check if setup is needed
 */
export function needsSetup(): boolean {
  return !InteractiveSetup.getInstance().hasConfiguration();
}

/**
 * Convenience function to run setup
 */
export function runSetup(): Promise<DatabaseConfig> {
  return InteractiveSetup.getInstance().setupCredentials();
}

/**
 * Convenience function to reconfigure
 */
export function runReconfigure(): Promise<DatabaseConfig> {
  return InteractiveSetup.getInstance().reconfigureCredentials();
}
