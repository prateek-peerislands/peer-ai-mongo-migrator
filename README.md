# 🚀 PeerAI MongoMigrator v2.0

> **Intelligent Database Migration & Analysis Platform**  
> *AI-Powered PostgreSQL to MongoDB Migration with Advanced Schema Analysis*

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Azure OpenAI](https://img.shields.io/badge/Azure_OpenAI-0078D4?style=for-the-badge&logo=microsoft&logoColor=white)](https://azure.microsoft.com/en-us/products/ai-services/openai-service)

## 🎯 Overview

PeerAI MongoMigrator v2.0 is a sophisticated, AI-powered database migration platform that intelligently analyzes PostgreSQL schemas and generates comprehensive migration plans for MongoDB. Built with TypeScript and leveraging Azure OpenAI's GPT-4o, it provides enterprise-grade schema analysis, interactive ER diagrams, and automated migration documentation.

## ✨ Key Features

### 🤖 **AI-Powered Intent Mapping**
- **Natural Language Processing**: Understands complex migration requests in plain English
- **Azure OpenAI Integration**: Leverages GPT-4o for intelligent command interpretation
- **Context-Aware Conversations**: Maintains conversation history and user preferences
- **Confidence Scoring**: Provides reliability metrics for intent classification
- **Fallback System**: Keyword-based matching when AI classification fails

### 🔍 **Advanced Schema Analysis**
- **Beyond DDL Analysis**: Goes far beyond basic schema extraction
- **Semantic Relationship Discovery**: Identifies business relationships beyond foreign keys
- **Business Process Extraction**: Infers business processes from schema patterns
- **Data Flow Pattern Analysis**: Maps data movement and transformation patterns
- **Business Rule Inference**: Extracts implicit business rules from schema structure
- **Impact Matrix Generation**: Assesses business criticality and risk factors
- **Stored Procedure Analysis**: Comprehensive analysis of PostgreSQL stored procedures

### 📊 **Multi-Format ER Diagrams**
- **Interactive Mermaid Diagrams**: Zoom, pan, and explore relationships
- **Professional PlantUML**: Generate publication-ready UML diagrams
- **DBML Schema Definitions**: Export for dbdiagram.io integration
- **JSON Schema Representation**: Machine-readable schema format
- **HTML Interactive Viewer**: Browser-based diagram exploration with download capabilities
- **Multi-Diagram Support**: Handle complex schemas with multiple diagram views

### 🐙 **GitHub Repository Integration**
- **Repository Analysis**: Clone and analyze GitHub repositories automatically
- **Authentication Support**: Handle both public and private repositories
- **Source Code Analysis**: Extract migration insights from application code
- **Migration Planning**: Generate comprehensive migration strategies
- **Documentation Generation**: Create detailed migration documentation

### 🔧 **Modern Database Connectivity**
- **MCP Protocol Integration**: Uses Model Context Protocol for database connections
- **Dual Database Support**: Seamless PostgreSQL and MongoDB integration
- **Connection Pooling**: Efficient database connection management
- **Error Handling**: Robust retry logic and error recovery
- **Performance Optimization**: Parallel processing and caching mechanisms

### 📁 **Intelligent File Management**
- **Dual Location Storage**: Automatic sync between central and project directories
- **Central Repository**: `/Users/prateek/Desktop/peer-ai-mongo-documents`
- **Project Integration**: Local file management in current working directory
- **Diagram Organization**: Specialized handling for diagram files
- **Version Control**: Track changes and maintain file history

## 🏗️ Architecture

### **Core Components**

```
src/
├── 🧠 core/           # Intelligent agent and MCP integration
│   ├── MCPAgent.ts    # AI-powered intent mapping and orchestration
│   ├── MCPClient.ts   # Database connectivity layer
│   └── MCPBridge.ts   # Protocol bridge implementation
├── 🛠️ services/       # Business logic services (29 specialized services)
│   ├── SchemaService.ts        # Comprehensive schema analysis (2,450 lines)
│   ├── PostgreSQLService.ts    # PostgreSQL operations and analysis
│   ├── MongoDBService.ts       # MongoDB operations and management
│   ├── LLMClient.ts           # Azure OpenAI integration
│   ├── IntentMappingService.ts # Natural language intent processing
│   ├── ERDiagramGenerator.ts   # Multi-format diagram generation
│   ├── MarkdownGenerator.ts    # Documentation generation (1,861 lines)
│   └── GitHubAnalysisService.ts # Repository analysis and cloning
├── 🎯 types/          # Comprehensive TypeScript definitions
│   ├── index.ts       # Core database and schema types
│   ├── intent-types.ts # Intent classification interfaces
│   ├── github-types.ts # GitHub integration types
│   └── migration-types.ts # Migration planning types
├── 🔧 utils/          # Utility functions and helpers
│   ├── DualLocationFileWriter.ts # Dual location file management
│   └── MermaidRenderer.ts       # Interactive diagram rendering
├── 💻 cli/            # Command-line interface
│   ├── CLI.ts         # Main CLI implementation
│   └── GitHubCLI.ts   # GitHub-specific commands
└── 🌐 server/         # MCP server implementation
    └── RealMCPServer.ts # Production MCP server
```

### **Service Layer Architecture**

The platform includes **29 specialized services** covering:

- **Database Operations**: PostgreSQL and MongoDB CRUD operations
- **Schema Analysis**: Advanced metadata extraction and relationship analysis
- **AI Integration**: LLM-powered intent mapping and natural language processing
- **Documentation**: Comprehensive markdown and HTML generation
- **Visualization**: Multi-format ER diagram generation
- **GitHub Integration**: Repository analysis and source code processing
- **File Management**: Dual location storage and organization
- **Migration Planning**: Risk assessment and cost estimation

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ 
- **TypeScript** 5.0+
- **Azure OpenAI** API key
- **PostgreSQL** database access
- **MongoDB** database access

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd peer-ai-mongo-migrator-v13

# Install dependencies
npm install

# Build the project
npm run build

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration
```

### Environment Configuration

```env
# Azure OpenAI Configuration
AZURE_OPENAI_ENDPOINT=your_azure_openai_endpoint
AZURE_OPENAI_API_KEY=your_api_key
AZURE_OPENAI_DEPLOYMENT_NAME=your_deployment_name

# Database Connections
POSTGRES_CONNECTION_STRING=postgresql://user:password@host:port/database
MONGODB_CONNECTION_STRING=mongodb://user:password@host:port/database

# File Management
CENTRAL_DOCUMENTS_PATH=/Users/prateek/Desktop/peer-ai-mongo-documents
```

### Basic Usage

```bash
# Start the CLI
npm start

# Analyze a PostgreSQL schema
> analyze postgresql://user:pass@host:5432/mydb

# Generate ER diagrams
> generate er-diagram --format mermaid,plantuml,dbml

# Analyze GitHub repository
> analyze github https://github.com/user/repo

# Generate migration plan
> plan migration --source postgresql://... --target mongodb://...
```

## 📖 Advanced Features

### 🤖 Natural Language Commands

The platform understands natural language requests:

```bash
# Natural language examples
> "Show me all the tables in my PostgreSQL database"
> "Generate an ER diagram showing relationships between users and orders"
> "Analyze this GitHub repo and create a migration plan"
> "What are the business processes in this schema?"
> "Create documentation for migrating to MongoDB"
```

### 🔍 Comprehensive Schema Analysis

**Beyond Basic DDL Analysis:**
- **Semantic Relationships**: Identifies business relationships beyond foreign keys
- **Data Flow Patterns**: Maps how data moves through the system
- **Business Process Extraction**: Infers business workflows from schema structure
- **Impact Assessment**: Evaluates business criticality and migration risks
- **Performance Metrics**: Analyzes query patterns and optimization opportunities
- **Storage Analysis**: Evaluates data storage patterns and optimization

### 📊 Interactive Visualizations

**Multi-Format Diagram Support:**
- **Mermaid**: Interactive diagrams with zoom/pan capabilities
- **PlantUML**: Professional UML diagrams for documentation
- **DBML**: Database markup language for dbdiagram.io
- **HTML Viewer**: Browser-based interactive exploration
- **Download Options**: SVG, PNG, and PDF export capabilities

### 🐙 GitHub Integration

**Repository Analysis Features:**
- **Automatic Cloning**: Clone public and private repositories
- **Source Code Analysis**: Extract migration insights from application code
- **Authentication**: Handle GitHub tokens and SSH keys
- **Migration Planning**: Generate strategies based on code patterns
- **Documentation**: Create comprehensive migration guides

## 🛠️ Development

### Project Structure

The codebase follows enterprise-grade patterns:

- **TypeScript**: Full type safety with comprehensive interfaces
- **Modular Architecture**: Clear separation of concerns
- **Service-Oriented Design**: 29 specialized services
- **Error Handling**: Robust error handling throughout
- **Performance**: Parallel processing and caching
- **Extensibility**: Easy to add new database types or features

### Key Statistics

- **Total Files**: 50+ files
- **Lines of Code**: ~15,000+ lines
- **Largest Service**: SchemaService.ts (2,450 lines)
- **Type Definitions**: 4 comprehensive type files
- **Service Layer**: 29 specialized services
- **Utility Functions**: 2 utility classes

### Building and Testing

```bash
# Development build
npm run dev

# Production build
npm run build

# Run tests
npm test

# Lint code
npm run lint

# Type checking
npm run type-check
```

## 📚 API Reference

### Core Services

#### SchemaService
```typescript
// Comprehensive schema analysis
const schemaService = new SchemaService();
const analysis = await schemaService.analyzeSchema(connectionString);
```

#### LLMClient
```typescript
// AI-powered intent mapping
const llmClient = new LLMClient();
const intent = await llmClient.classifyIntent(userInput);
```

#### ERDiagramGenerator
```typescript
// Multi-format diagram generation
const diagramGenerator = new ERDiagramGenerator();
const diagrams = await diagramGenerator.generateDiagrams(schema, ['mermaid', 'plantuml']);
```

### Type Definitions

The platform includes comprehensive TypeScript definitions:

- **Database Types**: Tables, columns, relationships, indexes
- **Intent Types**: Classification, entities, confidence scores
- **Migration Types**: Plans, risks, costs, timelines
- **GitHub Types**: Repository analysis, authentication, workflows

## 🔧 Configuration

### Database Connections

**PostgreSQL:**
```typescript
const postgresConfig = {
  host: 'localhost',
  port: 5432,
  database: 'mydb',
  username: 'user',
  password: 'password'
};
```

**MongoDB:**
```typescript
const mongoConfig = {
  connectionString: 'mongodb://user:password@host:port/database',
  options: {
    useNewUrlParser: true,
    useUnifiedTopology: true
  }
};
```

### Azure OpenAI Configuration

```typescript
const openAIConfig = {
  endpoint: 'https://your-resource.openai.azure.com/',
  apiKey: 'your-api-key',
  deploymentName: 'gpt-4o',
  apiVersion: '2024-02-15-preview'
};
```

## 🚀 Deployment

### Production Deployment

```bash
# Build for production
npm run build

# Start production server
npm start

# Docker deployment
docker build -t peer-ai-migrator .
docker run -p 3000:3000 peer-ai-migrator
```

### Environment Variables

Required environment variables for production:

```env
NODE_ENV=production
AZURE_OPENAI_ENDPOINT=your_endpoint
AZURE_OPENAI_API_KEY=your_key
AZURE_OPENAI_DEPLOYMENT_NAME=your_deployment
CENTRAL_DOCUMENTS_PATH=/path/to/documents
```

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines:

1. **Fork the repository**
2. **Create a feature branch**
3. **Make your changes**
4. **Add tests**
5. **Submit a pull request**

### Development Setup

```bash
# Clone your fork
git clone https://github.com/your-username/peer-ai-mongo-migrator-v13.git

# Install dependencies
npm install

# Create feature branch
git checkout -b feature/your-feature

# Make changes and test
npm test

# Commit and push
git commit -m "Add your feature"
git push origin feature/your-feature
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Azure OpenAI** for providing the AI capabilities
- **MCP Protocol** for modern database connectivity
- **Mermaid** for beautiful diagram generation
- **TypeScript** for type safety and developer experience
- **Node.js** ecosystem for robust runtime environment

## 📞 Support

- **Documentation**: [Wiki](https://github.com/your-org/peer-ai-mongo-migrator-v13/wiki)
- **Issues**: [GitHub Issues](https://github.com/your-org/peer-ai-mongo-migrator-v13/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/peer-ai-mongo-migrator-v13/discussions)
- **Email**: support@peerai.com

---

**Built with ❤️ by the PeerAI Team**

*Empowering intelligent database migrations with AI*
