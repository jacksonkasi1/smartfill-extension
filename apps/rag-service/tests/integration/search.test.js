#!/usr/bin/env node

/**
 * Knowledge Search Tests
 * 
 * Tests for semantic search functionality with OpenAI embeddings
 */

// ** import utils
import { 
  BASE_URL, 
  colors, 
  makeRequest, 
  logTest, 
  logSuccess, 
  logError, 
  checkHealth,
  testKnowledgeItems,
  testFileContent,
  testTiDBVectorFunctionality
} from '../utils/test-helpers.js';

// Store created IDs for cleanup
let testDataIds = [];

async function setupTestData() {
  logTest("Setting up test data for search");
  
  // Create knowledge entries
  for (const item of testKnowledgeItems) {
    const result = await makeRequest(`${BASE_URL}/api/v1/knowledge`, {
      method: 'POST',
      body: JSON.stringify(item),
    });
    
    if (result.success) {
      testDataIds.push(result.data.data.id);
      console.log(`  ✅ Created: "${item.title}"`);
    } else {
      logError(`Failed to create test data "${item.title}": ${result.error}`);
      return false;
    }
  }
  
  // Create file entry
  const fileResult = await makeRequest(`${BASE_URL}/api/v1/knowledge`, {
    method: 'POST',
    body: JSON.stringify({
      title: "API Documentation",
      content: testFileContent,
      type: "file",
      tags: ["documentation", "api"]
    }),
  });
  
  if (fileResult.success) {
    testDataIds.push(fileResult.data.data.id);
    console.log(`  ✅ Created: "API Documentation"`);
  }
  
  logSuccess(`Test data setup complete (${testDataIds.length} entries)`);
  
  // Wait a moment for embeddings to be processed
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return true;
}

async function testSemanticSearch() {
  logTest("Semantic Search Tests");
  
  const searchQueries = [
    {
      query: "How do React components work?",
      expectedTop: "React Components",
      description: "React-specific query should return React content first"
    },
    {
      query: "What are JavaScript functions?",
      expectedTop: "JavaScript Fundamentals", 
      description: "JavaScript query should return JavaScript content first"
    },
    {
      query: "Tell me about database relationships",
      expectedTop: "Database Design",
      description: "Database query should return database content first"
    },
    {
      query: "API authentication methods",
      expectedTop: "API Documentation",
      description: "API query should return API documentation first"
    }
  ];
  
  let passedQueries = 0;
  
  for (const testCase of searchQueries) {
    console.log(`\n  🔍 Query: "${testCase.query}"`);
    console.log(`     Expected top result: "${testCase.expectedTop}"`);
    
    const result = await makeRequest(`${BASE_URL}/api/v1/knowledge/query`, {
      method: 'POST',
      body: JSON.stringify({
        query: testCase.query,
        limit: 3,
        minScore: 0.1
      }),
    });
    
    if (result.success) {
      const results = result.data.data;
      if (results.length > 0) {
        const topResult = results[0];
        const topTitle = topResult.metadata.title;
        const topScore = topResult.score;
        
        console.log(`     Actual top result: "${topTitle}" (Score: ${topScore.toFixed(3)})`);
        
        if (topTitle === testCase.expectedTop) {
          logSuccess(`✅ Perfect match! "${topTitle}" returned first`);
          console.log(`     Preview: ${topResult.content.substring(0, 80)}...`);
          passedQueries++;
        } else {
          logError(`❌ Expected "${testCase.expectedTop}" but got "${topTitle}"`);
          console.log(`     All results:`);
          results.forEach((item, index) => {
            console.log(`       ${index + 1}. "${item.metadata.title}" (${item.score.toFixed(3)})`);
          });
        }
      } else {
        logError(`❌ No results found for query: "${testCase.query}"`);
      }
    } else {
      logError(`❌ Search failed for "${testCase.query}": ${result.error}`);
    }
  }
  
  console.log(`\n  📊 Search Accuracy: ${passedQueries}/${searchQueries.length} queries returned expected results`);
  
  return passedQueries === searchQueries.length;
}

async function testSearchFiltering() {
  logTest("Search Filtering and Parameters");
  
  // Test with different score thresholds
  const strictResult = await makeRequest(`${BASE_URL}/api/v1/knowledge/query`, {
    method: 'POST',
    body: JSON.stringify({
      query: "React components",
      limit: 5,
      minScore: 0.6  // High threshold
    }),
  });
  
  const relaxedResult = await makeRequest(`${BASE_URL}/api/v1/knowledge/query`, {
    method: 'POST',
    body: JSON.stringify({
      query: "React components", 
      limit: 5,
      minScore: 0.1  // Low threshold
    }),
  });
  
  if (strictResult.success && relaxedResult.success) {
    const strictCount = strictResult.data.data.length;
    const relaxedCount = relaxedResult.data.data.length;
    
    logSuccess(`Strict filtering (minScore: 0.6): ${strictCount} results`);
    logSuccess(`Relaxed filtering (minScore: 0.1): ${relaxedCount} results`);
    
    if (relaxedCount >= strictCount) {
      logSuccess(`✅ Filtering works correctly (relaxed >= strict)`);
      return true;
    } else {
      logError(`❌ Filtering issue: relaxed (${relaxedCount}) < strict (${strictCount})`);
      return false;
    }
  } else {
    logError(`Search filtering test failed`);
    return false;
  }
}

/**
 * Cleanup function
 */
async function cleanup() {
  console.log(`\n${colors.yellow}🧹 Cleaning up test data...${colors.reset}`);
  
  for (const id of testDataIds) {
    try {
      await makeRequest(`${BASE_URL}/api/v1/knowledge/${id}`, { method: 'DELETE' });
      console.log(`Deleted: ${id}`);
    } catch (error) {
      console.log(`Failed to delete ${id}: ${error.message}`);
    }
  }
}

/**
 * Main test runner
 */
async function runSearchTests() {
  console.log(`${colors.magenta}🚀 Running Knowledge Search Tests${colors.reset}`);
  console.log(`${colors.cyan}Base URL: ${BASE_URL}${colors.reset}`);
  console.log(`${colors.cyan}OpenAI Embeddings: Enabled${colors.reset}`);
  console.log(`${colors.cyan}TiDB Vector Database: Enabled${colors.reset}`);
  console.log(`${colors.cyan}Expected Accuracy: 95-100%${colors.reset}\n`);
  
  const tests = [
    checkHealth,
    testTiDBVectorFunctionality,
    setupTestData,
    testSemanticSearch,
    testSearchFiltering,
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const result = await test();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      logError(`Test failed with exception: ${error.message}`);
      failed++;
    }
  }
  
  // Summary
  console.log(`\n${colors.magenta}📊 Search Tests Summary${colors.reset}`);
  console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
  console.log(`${colors.cyan}Total: ${passed + failed}${colors.reset}`);
  
  if (failed === 0) {
    console.log(`\n${colors.green}🎉 All search tests passed! Perfect semantic accuracy!${colors.reset}`);
  } else {
    console.log(`\n${colors.red}❌ Some search tests failed. Check semantic search accuracy.${colors.reset}`);
  }
  
  await cleanup();
  process.exit(failed === 0 ? 0 : 1);
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log(`\n${colors.yellow}⚠️  Tests interrupted. Cleaning up...${colors.reset}`);
  await cleanup();
  process.exit(0);
});

// Start tests
runSearchTests().catch(async (error) => {
  logError(`Search test runner failed: ${error.message}`);
  await cleanup();
  process.exit(1);
});