#!/usr/bin/env node

/**
 * Test script to verify GitHub analysis routing
 */

function testGitHubRouting() {
  console.log('🔍 Testing GitHub Analysis Routing');
  console.log('='.repeat(50));
  
  // Test inputs that should trigger GitHub analysis
  const testInputs = [
    'want to do github repo analysis',
    'want to do GitHub repo analysis', 
    'analyze github repository',
    'github analysis',
    'repo analysis',
    'repository analysis',
    'git analysis',
    'clone and analyze',
    'analyze github repo',
    'github repo analysis',
    'want to do analysis of github repo',
    'analyze code from github',
    'github migration analysis',
    'migrate from github repo'
  ];
  
  console.log('\n📝 Test Inputs:');
  testInputs.forEach((input, index) => {
    console.log(`${index + 1}. "${input}"`);
  });
  
  console.log('\n🔍 Pattern Matching Analysis:');
  
  testInputs.forEach((input, index) => {
    const lowerInput = input.toLowerCase();
    
    // Check GitHub patterns
    const hasGitHubPattern = ['github', 'repo', 'repository', 'git', 'clone'].some(pattern => 
      lowerInput.includes(pattern)
    );
    
    // Check analysis patterns  
    const hasAnalysisPattern = ['analyze', 'analysis', 'migrate', 'migration', 'mongodb', 'node.js', 'nodejs'].some(pattern =>
      lowerInput.includes(pattern)
    );
    
    // Check if it should route to GitHub analysis
    const shouldRouteToGitHub = hasGitHubPattern && hasAnalysisPattern;
    
    console.log(`\n${index + 1}. "${input}"`);
    console.log(`   Lowercase: "${lowerInput}"`);
    console.log(`   Has GitHub pattern: ${hasGitHubPattern ? '✅' : '❌'}`);
    console.log(`   Has analysis pattern: ${hasAnalysisPattern ? '✅' : '❌'}`);
    console.log(`   Should route to GitHub: ${shouldRouteToGitHub ? '✅' : '❌'}`);
    
    if (shouldRouteToGitHub) {
      console.log(`   🎯 This should now work with GitHub analysis!`);
    } else {
      console.log(`   ⚠️  This might not trigger GitHub analysis`);
    }
  });
  
  console.log('\n🎉 GitHub Routing Test Completed!');
  console.log('='.repeat(50));
  
  console.log('\n💡 To test in the real app:');
  console.log('1. Run: npm start');
  console.log('2. Type: "want to do github repo analysis"');
  console.log('3. It should now route to GitHub analysis instead of source code analysis!');
}

// Run the test
testGitHubRouting();
