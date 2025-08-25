#!/usr/bin/env node

/**
 * Debug script to test MongoDB connection string parsing
 */

// Test the regex pattern that was causing issues
function testConnectionStringParsing() {
  console.log('🧪 Testing MongoDB connection string parsing...\n');
  
  const testCases = [
    'mongodb://localhost:27017/testdb',
    'mongodb+srv://username:password@cluster.mongodb.net/testdb',
    'mongodb+srv://username:password@cluster.mongodb.net/testdb?retryWrites=true',
    'mongodb://localhost:27017/',
    'mongodb://localhost:27017',
    undefined,
    null,
    '',
    'invalid-string'
  ];
  
  testCases.forEach((connectionString, index) => {
    console.log(`Test ${index + 1}: ${JSON.stringify(connectionString)}`);
    
    try {
      if (!connectionString || typeof connectionString !== 'string') {
        console.log('  ❌ Invalid connection string (undefined/null/not string)');
        return;
      }
      
      const dbMatch = connectionString.match(/\/([^/?]+)(\?|$)/);
      const database = dbMatch ? dbMatch[1] : 'default';
      
      console.log(`  ✅ Parsed successfully`);
      console.log(`     Database: ${database}`);
      console.log(`     Match: ${JSON.stringify(dbMatch)}`);
      
    } catch (error) {
      console.log(`  ❌ Parsing failed: ${error.message}`);
    }
    
    console.log('');
  });
}

// Test the ER diagram generator with mock data
async function testERDiagramGenerator() {
  console.log('🧪 Testing ER Diagram Generator...\n');
  
  try {
    // Import the ER diagram generator
    const { ERDiagramGenerator } = await import('./src/services/ERDiagramGenerator.js');
    
    // Create mock schema data
    const mockSchema = {
      tables: [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'integer', isPrimary: true, isForeign: false, nullable: false, defaultValue: undefined },
            { name: 'username', type: 'varchar(50)', isPrimary: false, isForeign: false, nullable: false, defaultValue: undefined },
            { name: 'email', type: 'varchar(100)', isPrimary: false, isForeign: false, nullable: false, defaultValue: undefined }
          ],
          primaryKey: 'id',
          foreignKeys: []
        }
      ],
      views: [],
      functions: [],
      triggers: [],
      indexes: [],
      relationships: [],
      summary: {
        totalTables: 1,
        totalViews: 0,
        totalFunctions: 0,
        totalTriggers: 0,
        totalIndexes: 0,
        totalRelationships: 0,
        lastAnalyzed: new Date()
      }
    };
    
    const erGenerator = new ERDiagramGenerator();
    
    // Test Mermaid generation
    console.log('📊 Testing Mermaid ER diagram generation...');
    const mermaidResult = await erGenerator.generateERDiagram(mockSchema, {
      format: 'mermaid',
      includeIndexes: true,
      includeConstraints: true,
      includeDataTypes: true,
      includeCardinality: true,
      diagramStyle: 'detailed'
    });
    
    if (mermaidResult.success) {
      console.log('✅ Mermaid ER diagram generated successfully');
      console.log(`   File: ${mermaidResult.filePath}`);
      console.log(`   Tables: ${mermaidResult.metadata.tables}, Relationships: ${mermaidResult.metadata.relationships}`);
    } else {
      console.log('❌ Mermaid ER diagram generation failed:', mermaidResult.error);
    }
    
  } catch (error) {
    console.error('❌ ER diagram test failed:', error);
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting Debug Tests...\n');
  
  // Test 1: Connection string parsing
  testConnectionStringParsing();
  
  console.log('='.repeat(50) + '\n');
  
  // Test 2: ER diagram generator
  await testERDiagramGenerator();
  
  console.log('\n🎉 Debug tests completed!');
}

// Run the tests
runTests().catch(console.error);
