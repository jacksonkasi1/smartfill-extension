#!/usr/bin/env node

/**
 * Knowledge Update Tests
 * 
 * Tests for updating knowledge entries and retrieving single entries
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
  logTest("Setting up test data for update tests");
  
  // Create knowledge entries
  for (const item of testKnowledgeItems) {
    const result = await makeRequest(`${BASE_URL}/api/v1/knowledge`, {
      method: 'POST',
      body: JSON.stringify(item),
    });
    
    if (result.success) {
      testDataIds.push({
        id: result.data.data.id,
        title: item.title,
        originalTags: item.tags
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

async function testRetrieveSingle() {
  logTest("Retrieve Single Knowledge Entry");
  
  if (testDataIds.length === 0) {
    logError("No test data available for retrieval");
    return false;
  }
  
  const testItem = testDataIds[0];
  
  const result = await makeRequest(`${BASE_URL}/api/v1/knowledge/${testItem.id}`);
  
  if (result.success) {
    const knowledge = result.data.data;
    logSuccess(`Retrieved: "${knowledge.title}"`);
    console.log(`  Type: ${knowledge.type}`);
    console.log(`  Tags: [${knowledge.tags.join(', ')}]`);
    console.log(`  Created: ${new Date(knowledge.createdAt).toLocaleString()}`);
    
    // Verify data integrity
    if (knowledge.title === testItem.title) {
      logSuccess(`✅ Data integrity verified`);
      return true;
    } else {
      logError(`❌ Data integrity failed: expected "${testItem.title}", got "${knowledge.title}"`);
      return false;
    }
  } else {
    logError(`Retrieval failed: ${result.error}`);
    return false;
  }
}

async function testUpdateTitle() {
  logTest("Update Knowledge Title");
  
  if (testDataIds.length === 0) {
    logError("No test data available for update");
    return false;
  }
  
  const testItem = testDataIds[0];
  const newTitle = `Updated ${testItem.title}`;
  
  const updates = {
    title: newTitle
  };
  
  const result = await makeRequest(`${BASE_URL}/api/v1/knowledge/${testItem.id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  
  if (result.success) {
    const updatedKnowledge = result.data.data;
    logSuccess(`Updated knowledge title: "${updatedKnowledge.title}"`);
    
    if (updatedKnowledge.title === newTitle) {
      logSuccess(`✅ Title update successful`);
      testItem.title = newTitle; // Update our local reference
      return true;
    } else {
      logError(`❌ Title update failed: expected "${newTitle}", got "${updatedKnowledge.title}"`);
      return false;
    }
  } else {
    logError(`Update failed: ${result.error}`);
    return false;
  }
}

async function testUpdateContent() {
  logTest("Update Knowledge Content");
  
  if (testDataIds.length < 2) {
    logError("Need at least 2 test items for content update");
    return false;
  }
  
  const testItem = testDataIds[1]; // Use second item
  const newContent = `This is updated content for ${testItem.title}. It includes new information about advanced concepts, best practices, and real-world applications. This updated content should generate new embeddings for better semantic search.`;
  
  const updates = {
    content: newContent,
    tags: [...testItem.originalTags, "updated", "enhanced"]
  };
  
  const result = await makeRequest(`${BASE_URL}/api/v1/knowledge/${testItem.id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  
  if (result.success) {
    const updatedKnowledge = result.data.data;
    logSuccess(`Updated knowledge content for: "${updatedKnowledge.title}"`);
    console.log(`  New tags: [${updatedKnowledge.tags.join(', ')}]`);
    console.log(`  Content preview: ${updatedKnowledge.content.substring(0, 100)}...`);
    
    if (updatedKnowledge.content === newContent && updatedKnowledge.tags.includes("updated")) {
      logSuccess(`✅ Content and tags update successful`);
      return true;
    } else {
      logError(`❌ Content update verification failed`);
      return false;
    }
  } else {
    logError(`Content update failed: ${result.error}`);
    return false;
  }
}

async function testPartialUpdate() {
  logTest("Partial Knowledge Update (Tags Only)");
  
  if (testDataIds.length < 3) {
    logError("Need at least 3 test items for partial update");
    return false;
  }
  
  const testItem = testDataIds[2]; // Use third item
  const newTags = [...testItem.originalTags, "partial-update", "tags-only"];
  
  const updates = {
    tags: newTags
  };
  
  const result = await makeRequest(`${BASE_URL}/api/v1/knowledge/${testItem.id}`, {
    method: 'PUT', 
    body: JSON.stringify(updates),
  });
  
  if (result.success) {
    const updatedKnowledge = result.data.data;
    logSuccess(`Partial update successful: "${updatedKnowledge.title}"`);
    console.log(`  Updated tags: [${updatedKnowledge.tags.join(', ')}]`);
    
    if (updatedKnowledge.tags.includes("partial-update")) {
      logSuccess(`✅ Partial update (tags only) successful`);
      return true;
    } else {
      logError(`❌ Partial update failed: tags not updated correctly`);
      return false;
    }
  } else {
    logError(`Partial update failed: ${result.error}`);
    return false;
  }
}

async function testUpdateNonExistent() {
  logTest("Update Non-Existent Knowledge");
  
  const fakeId = 'fake-id-that-does-not-exist';
  const updates = {
    title: "This should not work"
  };
  
  const result = await makeRequest(`${BASE_URL}/api/v1/knowledge/${fakeId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  
  if (!result.success) {
    logSuccess(`✅ Correctly handled non-existent ID: ${result.error}`);
    return true;
  } else {
    logError(`❌ Expected update of non-existent item to fail, but it succeeded`);
    return false;
  }
}

/**
 * Cleanup function
 */
async function cleanup() {
  console.log(`\n${colors.yellow}🧹 Cleaning up test data...${colors.reset}`);
  
  for (const item of testDataIds) {
    try {
      await makeRequest(`${BASE_URL}/api/v1/knowledge/${item.id}`, { method: 'DELETE' });
      console.log(`Deleted: ${item.title}`);
    } catch (error) {
      console.log(`Failed to delete ${item.title}: ${error.message}`);
    }
  }
}

/**
 * Main test runner
 */
async function runUpdateTests() {
  console.log(`${colors.magenta}🚀 Running Knowledge Update Tests${colors.reset}`);
  console.log(`${colors.cyan}Base URL: ${BASE_URL}${colors.reset}`);
  console.log(`${colors.cyan}Testing: Retrieve, title update, content update, partial update${colors.reset}\n`);
  
  const tests = [
    checkHealth,
    setupTestData,
    testRetrieveSingle,
    testUpdateTitle,
    testUpdateContent,
    testPartialUpdate,
    testUpdateNonExistent,
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
  console.log(`\n${colors.magenta}📊 Update Tests Summary${colors.reset}`);
  console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
  console.log(`${colors.cyan}Total: ${passed + failed}${colors.reset}`);
  
  if (failed === 0) {
    console.log(`\n${colors.green}🎉 All update tests passed! CRUD operations working perfectly!${colors.reset}`);
  } else {
    console.log(`\n${colors.red}❌ Some update tests failed. Check update logic.${colors.reset}`);
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
runUpdateTests().catch(async (error) => {
  logError(`Update test runner failed: ${error.message}`);
  await cleanup();
  process.exit(1);
});