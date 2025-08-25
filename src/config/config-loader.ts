import { DatabaseConfig } from '../types/index.js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

/**
 * Configuration loader utility for database credentials
 * Loads from environment variables with proper fallbacks
 */
export class ConfigLoader {
  private static instance: ConfigLoader;
  private config: DatabaseConfig | null = null;

  private constructor() {}

  static getInstance(): ConfigLoader {
    if (!ConfigLoader.instance) {
      ConfigLoader.instance = new ConfigLoader();
    }
    return ConfigLoader.instance;
  }

  /**
   * Load configuration from environment variables
   */
  loadFromEnvironment(): DatabaseConfig {
    // Load environment variables
    dotenv.config();

    const config: DatabaseConfig = {
      postgresql: {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_PORT || '5432'),
        database: process.env.POSTGRES_DB || 'default',
        username: process.env.POSTGRES_USER || 'postgres',
        password: this.getRequiredEnvVar('POSTGRES_PASSWORD', 'PostgreSQL password')
      },
      mongodb: {
        connectionString: this.buildMongoDBConnectionString(
          this.getRequiredEnvVar('MONGO_CONNECTION_STRING', 'MongoDB connection string'),
          process.env.MONGO_DB || 'default'
        ),
        database: process.env.MONGO_DB || 'default'
      }
    };

    this.validateConfig(config);
    this.config = config;
    return config;
  }

  /**
   * Load configuration from config file
   */
  loadFromFile(configPath?: string): DatabaseConfig {
    const filePath = configPath || process.env.MCP_CONFIG_PATH || './mcp-config.json';
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Configuration file not found: ${filePath}`);
    }

    try {
      const configFile = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      console.log(`📁 MCP Configuration loaded from: ${filePath}`);
      
      // Validate the loaded config
      this.validateConfig(configFile);
      this.config = configFile;
      return configFile;
    } catch (error) {
      throw new Error(`Failed to parse MCP config file ${filePath}: ${error}`);
    }
  }

  /**
   * Load configuration with fallback strategy
   */
  loadConfig(configPath?: string): DatabaseConfig {
    try {
      // Try to load from config file first
      return this.loadFromFile(configPath);
    } catch (error) {
      console.log('📁 Config file not found, falling back to environment variables');
      return this.loadFromEnvironment();
    }
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
   * Get required environment variable or throw error
   */
  private getRequiredEnvVar(name: string, description: string): string {
    const value = process.env[name];
    if (!value) {
      throw new Error(`Missing required environment variable: ${name} (${description})`);
    }
    return value;
  }

  /**
   * Validate configuration object
   */
  private validateConfig(config: any): void {
    if (!config.postgresql && !config.mongodb) {
      throw new Error('Configuration must include at least one database (PostgreSQL or MongoDB)');
    }

    if (config.postgresql) {
      const pg = config.postgresql;
      if (!pg.host || !pg.port || !pg.database || !pg.username || !pg.password) {
        throw new Error('PostgreSQL configuration is incomplete. Required: host, port, database, username, password');
      }
    }

    if (config.mongodb) {
      const mongo = config.mongodb;
      if (!mongo.connectionString) {
        throw new Error('MongoDB configuration is incomplete. Required: connectionString');
      }
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): DatabaseConfig | null {
    return this.config;
  }

  /**
   * Create sample configuration file
   */
  createSampleConfig(outputPath: string = './mcp-config.json'): void {
    const sampleConfig = {
      postgresql: {
        host: "localhost",
        port: 5432,
        database: "your_postgresql_database_name",
        username: "postgres",
        password: "your_password_here"
      },
      mongodb: {
        connectionString: "mongodb://localhost:27017/your_mongodb_database_name",
        database: "your_mongodb_database_name"
      },
      mcp: {
        enabled: true,
        servers: {
          postgresql: {
            tools: ["mcp_postgresql_read_query", "mcp_postgresql_write_query", "mcp_postgresql_list_tables"],
            enabled: true
          },
          mongodb: {
            tools: ["mcp_MongoDB_connect", "mcp_MongoDB_find", "mcp_MongoDB_list-collections"],
            enabled: true
          }
        }
      }
    };

    fs.writeFileSync(outputPath, JSON.stringify(sampleConfig, null, 2));
    console.log(`📝 Sample MCP configuration created at: ${outputPath}`);
    console.log('⚠️ Please update the configuration with your actual database credentials');
  }

  /**
   * Check if running in test environment
   */
  isTestEnvironment(): boolean {
    return process.env.NODE_ENV === 'test' || 
           process.env.NODE_ENV === 'testing' ||
           process.argv.includes('--test') ||
           process.argv.includes('--testing');
  }

  /**
   * Get test configuration (with mock credentials)
   */
  getTestConfig(): DatabaseConfig {
    return {
      postgresql: {
        host: 'localhost',
        port: 5432,
        database: 'test_db',
        username: 'test_user',
        password: 'test_password'
      },
      mongodb: {
        connectionString: 'mongodb://localhost:27017/test_db',
        database: 'test_db'
      }
    };
  }
}

/**
 * Convenience function to load configuration
 */
export function loadConfiguration(configPath?: string): DatabaseConfig {
  return ConfigLoader.getInstance().loadConfig(configPath);
}

/**
 * Convenience function to get test configuration
 */
export function getTestConfiguration(): DatabaseConfig {
  return ConfigLoader.getInstance().getTestConfig();
}
