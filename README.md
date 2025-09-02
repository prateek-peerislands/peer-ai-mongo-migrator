# 🧠 PeerAI MongoMigrator - Intelligent Database Migration & Analysis Agent

> **The world's first LLM-powered database migration agent with semantic intent understanding**

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Azure OpenAI](https://img.shields.io/badge/Azure_OpenAI-0078D4?style=for-the-badge&logo=microsoft&logoColor=white)](https://azure.microsoft.com/en-us/products/ai-services/openai-service)

## 🚀 What Makes This Special?

**PeerAI MongoMigrator** is not just another database migration tool. It's an **intelligent agent** that understands your intent through advanced LLM-based semantic analysis, making database operations as natural as having a conversation with a database expert.

### 🧠 **LLM-Powered Intent Understanding**
- **Semantic Intent Recognition**: Understands what you want even without exact keywords
- **Context-Aware Processing**: Remembers conversation history and previous intents
- **Intelligent Fallback**: Gracefully handles edge cases with keyword matching
- **Confidence Scoring**: Provides transparency in decision-making

### 🎯 **Natural Language Interface**
Instead of complex commands, just tell the agent what you want:
- *"I need to understand my postgres database"* → Comprehensive schema analysis
- *"Want similar schema for mongodb"* → Automatic PostgreSQL to MongoDB conversion
- *"Analyze my codes for migration"* → Intelligent source code analysis
- *"Create ER diagram"* → Beautiful visual database relationships

## ✨ Core Features

### 🗄️ **Multi-Database Support**
- **PostgreSQL** ↔ **MongoDB** bidirectional migration
- **Schema Analysis** with comprehensive documentation
- **Relationship Mapping** and dependency analysis
- **Performance Optimization** recommendations

### 📊 **Intelligent Schema Analysis**
- **Comprehensive Documentation** generation
- **ER Diagram Creation** with Mermaid visualization
- **Business Process Extraction** from database structure
- **Migration Impact Analysis** with risk assessment

### 🔍 **Advanced Code Analysis**
- **Local Code Analysis** - Analyze your current directory
- **GitHub Repository Analysis** - Clone and analyze remote repositories
- **Source Code Parsing** - Extract database patterns and relationships
- **Migration Recommendations** based on code structure

### 🚀 **Migration Planning & Execution**
- **Dependency Analysis** - Smart migration ordering
- **Phase-based Migration** - Break complex migrations into manageable steps
- **Risk Assessment** - Identify potential issues before migration
- **Rollback Planning** - Safety-first approach

### 🎨 **Visualization & Documentation**
- **Interactive ER Diagrams** - Beautiful database relationship visualizations
- **Migration Flow Charts** - Visual migration planning
- **Comprehensive Reports** - Detailed analysis with recommendations
- **Markdown Documentation** - Professional-grade documentation generation

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 18+ 
- PostgreSQL database access
- MongoDB database access
- Azure OpenAI API key (for intelligent features)

### Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd cursor-database

# Install dependencies
npm install

# Set up environment variables
cp env.example .env
# Edit .env with your database credentials and Azure OpenAI API key

# Start the intelligent agent
npm run dev interactive
```

### Environment Configuration

Create a `.env` file with your credentials:

```env
# Database Connections
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DATABASE=your_database
POSTGRES_USERNAME=your_username
POSTGRES_PASSWORD=your_password

MONGODB_CONNECTION_STRING=mongodb://localhost:27017
MONGODB_DATABASE=your_mongodb_database

# Azure OpenAI (for intelligent features)
AZURE_OPENAI_API_KEY=your_api_key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o
```

## 🎮 Usage Examples

### Interactive Mode (Recommended)
```bash
npm run dev interactive
```

Then simply chat with the agent:
```
? peer-ai-mongo-migrator> I need to understand my postgres database
🧠 Intent: postgresql_schema_analysis (95% confidence)
🔍 Processing comprehensive PostgreSQL schema analysis...
🎉 Analysis completed! Documentation generated.

? peer-ai-mongo-migrator> Want similar schema for mongodb
🧠 Intent: mongodb_schema_generation (90% confidence)
🔍 Converting PostgreSQL to MongoDB schema...
🎉 MongoDB schema generated with migration recommendations!

? peer-ai-mongo-migrator> Analyze my codes for migration
🧠 Intent: github_repository_analysis (95% confidence)
📁 Choose source location:
  1. Local machine (current directory)
  2. GitHub repository
```

### Command Line Mode
```bash
# Schema analysis
npm run dev schema --analyze

# ER diagram generation
npm run dev er-diagram

# Migration planning
npm run dev migration --plan

# GitHub repository analysis
npm run dev github --analyze <repository-url>
```

## 🧠 Intelligent Features

### Intent Classification
The agent uses advanced LLM-based intent recognition to understand your requests:

| User Input | Detected Intent | Confidence |
|------------|----------------|------------|
| "understand my database" | `postgresql_schema_analysis` | 95% |
| "similar schema for mongodb" | `mongodb_schema_generation` | 90% |
| "analyze my codes" | `github_repository_analysis` | 95% |
| "create ER diagram" | `er_diagram_generation` | 85% |
| "plan migration" | `migration_planning` | 90% |

### Context Awareness
- **Conversation History**: Remembers previous requests and context
- **Previous Intents**: Builds understanding from past interactions
- **Smart Suggestions**: Provides relevant next steps based on current state

### Fallback Intelligence
- **LLM Primary**: Uses Azure OpenAI for semantic understanding
- **Keyword Fallback**: Falls back to pattern matching if LLM fails
- **Graceful Degradation**: Always provides a response, even in edge cases

## 📁 Project Structure

```
src/
├── cli/                    # Command-line interface
│   ├── CLI.ts             # Main CLI with LLM integration
│   └── GitHubCLI.ts       # GitHub-specific commands
├── core/                   # Core agent functionality
│   ├── MCPAgent.ts        # Main agent orchestrator
│   ├── MCPBridge.ts       # MCP protocol bridge
│   └── MCPClient.ts       # MCP client implementation
├── services/               # Business logic services
│   ├── LLMClient.ts       # Azure OpenAI integration
│   ├── IntentMappingService.ts  # Intent classification
│   ├── PostgreSQLService.ts     # PostgreSQL operations
│   ├── MongoDBService.ts        # MongoDB operations
│   ├── SchemaService.ts         # Schema analysis
│   ├── ERDiagramGenerator.ts    # Diagram generation
│   ├── MigrationService.ts      # Migration planning
│   └── GitHubAnalysisService.ts # GitHub integration
├── config/                 # Configuration management
│   ├── llm-config.ts      # LLM configuration
│   └── interactive-setup.ts # Interactive setup
└── types/                  # TypeScript definitions
    ├── intent-types.ts    # Intent classification types
    └── migration-types.ts # Migration-related types
```

## 🔧 Advanced Configuration

### LLM Configuration
The agent uses Azure OpenAI for intelligent features. Configure in `src/config/llm-config.ts`:

```typescript
interface AzureOpenAIConfig {
  apiKey: string;
  endpoint: string;
  deploymentName: string;
  maxTokens?: number;
  temperature?: number;
}
```

### Intent Mapping
Customize intent recognition in `src/types/intent-types.ts`:

```typescript
enum IntentType {
  postgresql_schema_analysis = 'postgresql_schema_analysis',
  mongodb_schema_generation = 'mongodb_schema_generation',
  github_repository_analysis = 'github_repository_analysis',
  migration_planning = 'migration_planning',
  er_diagram_generation = 'er_diagram_generation',
  // ... more intents
}
```

## 🚀 Performance & Scalability

- **Caching**: Intelligent response caching for better performance
- **Async Processing**: Non-blocking operations for large datasets
- **Memory Management**: Efficient memory usage with cleanup
- **Error Handling**: Robust error handling with graceful degradation

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Setup
```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Azure OpenAI** for providing the intelligent LLM capabilities
- **PostgreSQL** and **MongoDB** communities for excellent database support
- **MCP (Model Context Protocol)** for enabling seamless AI integration
- **TypeScript** for type safety and developer experience

## 📞 Support

- **Documentation**: Check the `/docs` folder for detailed guides
- **Issues**: Report bugs and request features on GitHub Issues
- **Discussions**: Join our community discussions for help and ideas

---

**Built with ❤️ by the PeerAI team**

*Making database migration as intelligent as the databases themselves.*
