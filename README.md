# 🚀 PeerAI MongoMigrator

> **Intelligent Database Migration & Schema Management Agent**

A powerful TypeScript-based agent that provides comprehensive database orchestration, schema management, and intelligent migration capabilities between PostgreSQL and MongoDB. Built with Model Context Protocol (MCP) for real-time database interactions and enhanced business context analysis.

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![MCP](https://img.shields.io/badge/MCP-Protocol-00ADD8?style=for-the-badge&logo=modelcontextprotocol&logoColor=white)

## 🌟 **What Makes This Special?**

### 🧠 **"Relationship beyond DDL" - The Game Changer**
Unlike traditional database tools that only show structural relationships, PeerAI MongoMigrator analyzes your database schema to understand:

- **Business Context**: Why tables are related and their business purpose
- **Data Flow Patterns**: How data moves through business workflows
- **Business Processes**: Operational processes supported by your database
- **Business Rules**: Governance rules and data integrity constraints
- **Impact Matrix**: Risk assessment and business criticality analysis

### 🎯 **Core Capabilities**
- **🔍 Schema Analysis**: Comprehensive PostgreSQL and MongoDB schema introspection
- **🔄 Data Migration**: Intelligent migration from PostgreSQL to MongoDB
- **🗺️ ER Diagrams**: Multiple format support (Mermaid, PlantUML, DBML, JSON)
- **📚 Documentation**: Auto-generated comprehensive documentation
- **🌐 GitHub Integration**: Repository analysis and migration planning
- **💬 Natural Language**: Human-like interaction through natural language commands

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 18+ 
- PostgreSQL database access
- MongoDB database access (optional)
- Git (for GitHub features)

### **Installation**
```bash
# Clone the repository
git clone <your-repo-url>
cd cursor-database-v8

# Install dependencies
npm install

# Setup environment
cp env.template .env
# Edit .env with your database credentials

# Build the project
npm run build
```

### **First Run**
```bash
# Start interactive mode
npm start

# Or run specific commands
npm run dev
```

## 🎮 **Usage Examples**

### **Interactive Mode (Recommended)**
```bash
npm start
```

Then use natural language commands like:
```
🗺️ "Analyze my postgres schema with business context"
🧠 "Show me the business relationships in my database"
🌊 "What are the data flow patterns in my system?"
🏢 "Map the business processes in my database"
📋 "Extract business rules from my schema"
📊 "Generate impact matrix for my tables"
```

### **Command Line Interface**
```bash
# Enhanced schema analysis with business context
peer-ai-mongo-migrator schema --analyze --business-context

# Standard comprehensive analysis
peer-ai-mongo-migrator schema --analyze

# Generate ER diagrams
peer-ai-mongo-migrator er-diagram --format mermaid --style detailed
peer-ai-mongo-migrator er-diagram --format plantuml --output ./diagrams

# Data migration
peer-ai-mongo-migrator migrate --source users --target users --validate

# GitHub repository analysis
peer-ai-mongo-migrator analyze-github --repo owner/repo --output ./analysis
```

## 🏗️ **Architecture Overview**

```
┌─────────────────────────────────────────────────────────────┐
│                    PeerAI MongoMigrator                    │
├─────────────────────────────────────────────────────────────┤
│  🎯 CLI Interface (Commander.js)                          │
│  💬 Natural Language Processing                           │
│  🔧 MCP Agent (Core Orchestrator)                         │
├─────────────────────────────────────────────────────────────┤
│  📊 Schema Services                                        │
│  🔄 Migration Services                                     │
│  🗺️ ER Diagram Generation                                 │
│  📚 Documentation Services                                 │
│  🌐 GitHub Integration                                     │
├─────────────────────────────────────────────────────────────┤
│  🗄️ PostgreSQL Service (MCP)                              │
│  🍃 MongoDB Service (MCP)                                 │
│  🔌 Real MCP Server                                        │
└─────────────────────────────────────────────────────────────┘
```

## 🧠 **"Relationship beyond DDL" Features**

### **1. Semantic Relationships**
Discover the business purpose and context of table relationships:
```markdown
### Customer → Payment → Rental → Inventory → Film
**Business Purpose:** Complete rental transaction workflow
**Data Flow:** Customer creates rental → Payment processed → Inventory updated
**Business Rules:** Customer must have valid address before rental
```

### **2. Data Flow Patterns**
Map how data moves through business workflows:
```markdown
### Film Rental Workflow
**Business Process:** Film Rental
**Frequency:** High
**Tables Involved:** customer, film, rental, inventory, payment
**Flow Sequence:**
1. **read** on `customer` - Customer identification
2. **write** on `rental` - Rental record creation
3. **write** on `payment` - Payment processing
```

### **3. Business Processes**
Identify operational processes supported by your database:
```markdown
### Film Rental Process
**Owner:** Store Staff
**Criticality:** HIGH
**Estimated Duration:** 5-10 minutes
**Stakeholders:** Customer, Store Staff, Management
```

### **4. Business Rules**
Extract governance rules and constraints:
```markdown
### Data Integrity Rules
- **Customer Validation:** Address required before rental
- **Payment Processing:** Payment must be completed before inventory update
- **Film Availability:** Check availability before rental creation
```

### **5. Impact Matrix**
Risk assessment and business criticality:
```markdown
### Table: customer
**Business Criticality:** HIGH
**Data Quality Impact:** Customer data integrity affects all transactions
**Business Process Impact:** Core to rental workflow
**Risk Factors:** Data corruption, validation failures
```

## 🔧 **Configuration**

### **Environment Variables**
```bash
# PostgreSQL Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DATABASE=your_db
POSTGRES_USER=your_user
POSTGRES_PASSWORD=your_password

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=your_db

# GitHub Configuration (Optional)
GITHUB_TOKEN=your_github_token
GITHUB_USERNAME=your_username
```

### **Configuration Files**
- `github-config.json` - GitHub API configuration
- `default-config.ts` - Default MCP server settings
- `tsconfig.json` - TypeScript configuration

## 📚 **API Reference**

### **Core Commands**

#### **Schema Analysis**
```bash
peer-ai-mongo-migrator schema --analyze [--business-context]
```
- `--analyze`: Comprehensive schema analysis
- `--business-context`: Include enhanced business relationship analysis

#### **ER Diagram Generation**
```bash
peer-ai-mongo-migrator er-diagram [options]
```
- `--format`: mermaid, plantuml, dbml, json
- `--style`: detailed, simplified, minimal
- `--output`: Output directory path
- `--html`: Generate HTML viewer (Mermaid only)

#### **Data Migration**
```bash
peer-ai-mongo-migrator migrate --source <table> --target <collection> [options]
```
- `--source`: Source PostgreSQL table
- `--target`: Target MongoDB collection
- `--batch-size`: Migration batch size
- `--validate`: Validate migration after completion

#### **GitHub Analysis**
```bash
peer-ai-mongo-migrator analyze-github --repo <owner/repo> [options]
```
- `--repo`: GitHub repository (owner/repo format)
- `--branch`: Branch to analyze
- `--output`: Output path for analysis
- `--ssh`: Use SSH for cloning

### **Natural Language Commands**

#### **Schema Analysis**
```
"Analyze my postgres schema"
"Show me the database structure"
"Generate comprehensive documentation"
```

#### **Business Context Analysis**
```
"Analyze my postgres schema with business context"
"Show me the business relationships in my database"
"What are the data flow patterns in my system?"
"Map the business processes in my database"
"Extract business rules from my schema"
"Generate impact matrix for my tables"
```

#### **ER Diagrams**
```
"Generate ER diagram for my postgres database"
"Create database diagram in mermaid format"
"Show me the entity relationships"
```

#### **Migration**
```
"Migrate users table to MongoDB"
"Convert postgres schema to mongo"
"Generate migration plan"
```

## 🏗️ **Project Structure**

```
cursor-database-v8/
├── src/
│   ├── cli/                    # Command-line interface
│   │   ├── CLI.ts             # Main CLI implementation
│   │   └── GitHubCLI.ts       # GitHub-specific commands
│   ├── config/                 # Configuration management
│   │   ├── config-loader.ts   # Configuration loading
│   │   ├── default-config.ts  # Default settings
│   │   └── github-config.ts   # GitHub configuration
│   ├── core/                   # Core application logic
│   │   ├── MCPAgent.ts        # Main orchestrator
│   │   ├── MCPBridge.ts       # MCP protocol bridge
│   │   └── MCPClient.ts       # MCP client implementation
│   ├── server/                 # MCP server implementation
│   │   └── RealMCPServer.ts   # Real database connections
│   ├── services/               # Business logic services
│   │   ├── SchemaService.ts   # Schema analysis & management
│   │   ├── MigrationService.ts # Data migration logic
│   │   ├── ERDiagramGenerator.ts # Diagram generation
│   │   ├── MarkdownGenerator.ts # Documentation generation
│   │   ├── GitHubAnalysisService.ts # GitHub integration
│   │   └── ...                 # Other services
│   ├── types/                  # TypeScript type definitions
│   │   └── index.ts           # Core type definitions
│   └── utils/                  # Utility functions
│       └── MermaidRenderer.ts # Mermaid diagram rendering
├── diagrams/                    # Generated ER diagrams
├── scripts/                     # Setup and utility scripts
├── package.json                 # Project dependencies
└── README.md                   # This file
```

## 🚀 **Development**

### **Available Scripts**
```bash
npm run build          # Build the project
npm run start          # Start the application
npm run dev            # Development mode with hot reload
npm run test           # Run tests
npm run lint           # Lint the code
npm run clean          # Clean build artifacts
npm run setup          # Setup development environment
```

### **Building from Source**
```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run the built application
npm start
```

### **Development Mode**
```bash
# Start development mode with hot reload
npm run dev

# The application will restart automatically on file changes
```

## 🧪 **Testing**

### **Running Tests**
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### **Test Structure**
- Unit tests for individual services
- Integration tests for MCP interactions
- End-to-end tests for CLI commands

## 🤝 **Contributing**

### **Development Setup**
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Add tests for new functionality
5. Run the test suite: `npm test`
6. Commit your changes: `git commit -m 'Add amazing feature'`
7. Push to the branch: `git push origin feature/amazing-feature`
8. Open a Pull Request

### **Code Style**
- Follow TypeScript best practices
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Follow the existing code structure

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 **Acknowledgments**

- **Model Context Protocol (MCP)** - For enabling real-time database interactions
- **Commander.js** - For the robust CLI framework
- **Mermaid** - For beautiful diagram generation
- **TypeScript** - For type safety and developer experience

## 📞 **Support**

### **Getting Help**
- **Issues**: [GitHub Issues](https://github.com/your-username/cursor-database-v8/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/cursor-database-v8/discussions)
- **Documentation**: Check the generated schema documentation

### **Common Issues**
1. **Connection Errors**: Verify database credentials in `.env`
2. **Permission Issues**: Ensure database user has proper permissions
3. **MCP Errors**: Check MCP server configuration and connectivity

## 🔮 **Roadmap**

### **Upcoming Features**
- [ ] **Enhanced ER Diagrams**: Interactive diagrams with business context
- [ ] **Migration Validation**: Advanced validation and rollback capabilities
- [ ] **Performance Analysis**: Query performance and optimization recommendations
- [ ] **Multi-Database Support**: Support for additional database types
- [ ] **Cloud Integration**: AWS RDS, Azure SQL, MongoDB Atlas support
- [ ] **API Server**: REST API for integration with other tools

### **Long-term Vision**
- **AI-Powered Analysis**: Machine learning for pattern recognition
- **Collaborative Features**: Team-based schema management
- **Version Control**: Schema versioning and change tracking
- **Compliance Tools**: GDPR, SOX, and other compliance features

---

**Built with ❤️ by the PeerAI Team**

*Transform your database management with intelligent insights and seamless migrations.*
