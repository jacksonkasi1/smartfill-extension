#!/usr/bin/env node

/**
 * Knowledge Creation Tests
 * 
 * Tests for creating knowledge entries and file uploads
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { 
  BASE_URL, 
  colors, 
  makeRequest, 
  logTest, 
  logSuccess, 
  logError, 
  checkHealth,
  testKnowledgeItems,
  testFileContent 
} from '../utils/test-helpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Store created IDs for cleanup
let createdKnowledgeIds = [];
let uploadedFileId = null;

async function testCreateKnowledge() {
  logTest("Create Knowledge Entries");
  
  for (const item of testKnowledgeItems) {
    const result = await makeRequest(`${BASE_URL}/api/v1/knowledge`, {
      method: 'POST',
      body: JSON.stringify(item),
    });
    
    if (result.success) {
      const knowledgeId = result.data.data.id;
      createdKnowledgeIds.push(knowledgeId);
      logSuccess(`Created knowledge: "${item.title}" (ID: ${knowledgeId})`);
    } else {
      logError(`Failed to create knowledge "${item.title}": ${result.error}`);
      return false;
    }
  }
  
  return true;
}

async function testFileUpload() {
  logTest("File Upload");
  
  // Create a test file
  const testFilePath = path.join(__dirname, '../../test-file.md');
  fs.writeFileSync(testFilePath, testFileContent);
  
  try {
    // Note: This is a simplified file upload test
    // In a real scenario, you'd use FormData
    const result = await makeRequest(`${BASE_URL}/api/v1/knowledge`, {
      method: 'POST',
      body: JSON.stringify({
        title: "API Documentation",
        content: testFileContent,
        type: "file",
        tags: ["documentation", "api"]
      }),
    });
    
    if (result.success) {
      uploadedFileId = result.data.data.id;
      logSuccess(`Uploaded file as knowledge (ID: ${uploadedFileId})`);
      return true;
    } else {
      logError(`File upload failed: ${result.error}`);
      return false;
    }
  } finally {
    // Clean up test file
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  }
}

async function testListKnowledge() {
  logTest("List Knowledge Entries");
  
  const result = await makeRequest(`${BASE_URL}/api/v1/knowledge?page=1&limit=10`);
  
  if (result.success) {
    const { data, pagination } = result.data;
    logSuccess(`Retrieved ${data.length} knowledge entries (Total: ${pagination.total})`);
    
    data.forEach(item => {
      console.log(`  - ${item.title} (${item.type}) [${item.tags.join(', ')}]`);
    });
    
    return data.length > 0;
  } else {
    logError(`Failed to list knowledge: ${result.error}`);
    return false;
  }
}

/**
 * Cleanup function
 */
async function cleanup() {
  console.log(`\n${colors.yellow}🧹 Cleaning up created data...${colors.reset}`);
  
  // Delete created knowledge entries
  for (const id of createdKnowledgeIds) {
    try {
      await makeRequest(`${BASE_URL}/api/v1/knowledge/${id}`, { method: 'DELETE' });
      console.log(`Deleted: ${id}`);
    } catch (error) {
      console.log(`Failed to delete ${id}: ${error.message}`);
    }
  }
  
  // Delete uploaded file entry
  if (uploadedFileId) {
    try {
      await makeRequest(`${BASE_URL}/api/v1/knowledge/${uploadedFileId}`, { method: 'DELETE' });
      console.log(`Deleted uploaded file: ${uploadedFileId}`);
    } catch (error) {
      console.log(`Failed to delete uploaded file ${uploadedFileId}: ${error.message}`);
    }
  }
}

/**
 * Main test runner
 */
async function runCreateTests() {
  console.log(`${colors.magenta}🚀 Running Knowledge Creation Tests${colors.reset}`);
  console.log(`${colors.cyan}Base URL: ${BASE_URL}${colors.reset}`);
  console.log(`${colors.cyan}Test User: test-user-12345${colors.reset}\n`);
  
  const tests = [
    checkHealth,
    testCreateKnowledge,
    testFileUpload,
    testListKnowledge,
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
  console.log(`\n${colors.magenta}📊 Create Tests Summary${colors.reset}`);
  console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
  console.log(`${colors.cyan}Total: ${passed + failed}${colors.reset}`);
  
  if (failed === 0) {
    console.log(`\n${colors.green}🎉 All creation tests passed!${colors.reset}`);
    console.log(`${colors.yellow}💡 Created IDs: ${JSON.stringify(createdKnowledgeIds)}${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`\n${colors.red}❌ Some creation tests failed.${colors.reset}`);
    await cleanup();
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log(`\n${colors.yellow}⚠️  Tests interrupted. Cleaning up...${colors.reset}`);
  await cleanup();
  process.exit(0);
});

// Start tests
runCreateTests().catch(async (error) => {
  logError(`Test runner failed: ${error.message}`);
  await cleanup();
  process.exit(1);
});