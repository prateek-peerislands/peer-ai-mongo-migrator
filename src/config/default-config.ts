import { MCPServerConfig } from '../types/index.js';

export const defaultMCPServerConfig: MCPServerConfig = {
  postgresql: {
    enabled: true,
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
    ]
  },
  mongodb: {
    enabled: true,
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
    ]
  }
};

export const defaultConfig = {
  mcpServers: defaultMCPServerConfig,
  cli: {
      prompt: 'peer-ai-mongo-migrator> ',
  historyFile: '.peer-ai-mongo-migrator-history',
    maxHistorySize: 1000
  },
  mcp: {
    defaultBatchSize: 1000,
    maxQueryTimeout: 30000,
    enableLogging: true,
    retryAttempts: 3,
    connectionPoolSize: 5
  }
};
