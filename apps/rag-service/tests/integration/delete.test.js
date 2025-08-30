#!/usr/bin/env node

/**
 * Knowledge Deletion Tests
 * 
 * Tests for deleting knowledge entries and verifying cleanup
 */

import { 
  BASE_URL, 
  colors, 
  makeRequest, 
  logTest, 
  logSuccess, 
  logError, 
  checkHealth,
  testKnowledgeItems 
} from '../utils/test-helpers.js';

// Store created IDs for testing
let testDataIds = [];

async function setupTestData() {
  logTest("Setting up test data for deletion tests");
  
  // Create knowledge entries
  for (const item of testKnowledgeItems) {
    const result = await makeRequest(`${BASE_URL}/api/v1/knowledge`, {
      method: 'POST',
      body: JSON.stringify(item),
    });
    
    if (result.success) {
      testDataIds.push({
        id: result.data.data.id,
        title: item.title
      });
      console.log(`  ✅ Created: "${item.title}"`);
    } else {
      logError(`Failed to create test data "${item.title}": ${result.error}`);
      return false;
    }
  }
  
  logSuccess(`Test data setup complete (${testDataIds.length} entries)`);
  return true;
}

async function testSingleDeletion() {
  logTest("Single Knowledge Deletion");
  
  if (testDataIds.length === 0) {
    logError("No test data available for deletion");
    return false;
  }
  
  const itemToDelete = testDataIds.pop(); // Remove last item from array
  
  // Delete the knowledge entry
  const deleteResult = await makeRequest(`${BASE_URL}/api/v1/knowledge/${itemToDelete.id}`, {
    method: 'DELETE',
  });
  
  if (deleteResult.success) {
    logSuccess(`Deleted knowledge entry: "${itemToDelete.title}" (ID: ${itemToDelete.id})`);
    
    // Verify it's actually deleted by trying to retrieve it
    const retrieveResult = await makeRequest(`${BASE_URL}/api/v1/knowledge/${itemToDelete.id}`);
    
    if (!retrieveResult.success && retrieveResult.error.includes('400')) {
      logSuccess(`✅ Confirmed deletion: Entry no longer exists`);
      return true;
    } else {
      logError(`❌ Deletion verification failed: Entry still exists or unexpected error`);
      return false;
    }
  } else {
    logError(`Deletion failed: ${deleteResult.error}`);
    return false;
  }
}

async function testBulkDeletion() {
  logTest("Bulk Knowledge Deletion");
  
  let deletedCount = 0;
  const remainingItems = [...testDataIds]; // Copy array
  
  for (const item of remainingItems) {
    const deleteResult = await makeRequest(`${BASE_URL}/api/v1/knowledge/${item.id}`, {
      method: 'DELETE',
    });
    
    if (deleteResult.success) {
      deletedCount++;
      console.log(`  ✅ Deleted: "${item.title}"`);
    } else {
      logError(`  ❌ Failed to delete: "${item.title}" - ${deleteResult.error}`);
    }
  }
  
  // Clear the array since we deleted everything
  testDataIds = [];
  
  logSuccess(`Bulk deletion completed: ${deletedCount}/${remainingItems.length} entries deleted`);
  return deletedCount === remainingItems.length;
}

async function testDeleteNonExistent() {
  logTest("Delete Non-Existent Knowledge");
  
  const fakeId = 'fake-id-that-does-not-exist';
  
  const deleteResult = await makeRequest(`${BASE_URL}/api/v1/knowledge/${fakeId}`, {
    method: 'DELETE',
  });
  
  if (!deleteResult.success) {
    logSuccess(`✅ Correctly handled non-existent ID: ${deleteResult.error}`);
    return true;
  } else {
    logError(`❌ Expected deletion of non-existent item to fail, but it succeeded`);
    return false;
  }
}

async function testKnowledgeListAfterDeletion() {
  logTest("Verify Knowledge List After Deletion");
  
  const listResult = await makeRequest(`${BASE_URL}/api/v1/knowledge?page=1&limit=10`);
  
  if (listResult.success) {
    const { data, pagination } = listResult.data;
    const totalCount = pagination.total;
    
    logSuccess(`Current knowledge entries in database: ${totalCount}`);
    
    if (data.length > 0) {
      console.log(`  Remaining entries:`);
      data.forEach((item, index) => {
        console.log(`    ${index + 1}. ${item.title} (${item.type})`);
      });
    } else {
      logSuccess(`✅ Database is clean - no entries remain`);
    }
    
    return true;
  } else {
    logError(`Failed to list knowledge after deletion: ${listResult.error}`);
    return false;
  }
}

/**
 * Cleanup function (in case tests fail)
 */
async function cleanup() {
  console.log(`\n${colors.yellow}🧹 Final cleanup...${colors.reset}`);
  
  for (const item of testDataIds) {
    try {
      await makeRequest(`${BASE_URL}/api/v1/knowledge/${item.id}`, { method: 'DELETE' });
      console.log(`Cleaned up: ${item.title}`);
    } catch (error) {
      console.log(`Failed to clean up ${item.title}: ${error.message}`);
    }
  }
}

/**
 * Main test runner
 */
async function runDeleteTests() {
  console.log(`${colors.magenta}🚀 Running Knowledge Deletion Tests${colors.reset}`);
  console.log(`${colors.cyan}Base URL: ${BASE_URL}${colors.reset}`);
  console.log(`${colors.cyan}Testing: Single deletion, bulk deletion, edge cases${colors.reset}\n`);
  
  const tests = [
    checkHealth,
    setupTestData,
    testSingleDeletion,
    testBulkDeletion,
    testDeleteNonExistent,
    testKnowledgeListAfterDeletion,
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
  console.log(`\n${colors.magenta}📊 Delete Tests Summary${colors.reset}`);
  console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
  console.log(`${colors.cyan}Total: ${passed + failed}${colors.reset}`);
  
  if (failed === 0) {
    console.log(`\n${colors.green}🎉 All deletion tests passed! Cleanup is working perfectly!${colors.reset}`);
  } else {
    console.log(`\n${colors.red}❌ Some deletion tests failed. Check deletion logic.${colors.reset}`);
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
runDeleteTests().catch(async (error) => {
  logError(`Delete test runner failed: ${error.message}`);
  await cleanup();
  process.exit(1);
});