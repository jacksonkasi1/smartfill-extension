#!/usr/bin/env node

/**
 * User Isolation Tests
 * 
 * Tests that user data is completely isolated - users can never see each other's data
 */

import { 
  BASE_URL, 
  colors, 
  makeRequest, 
  logTest, 
  logSuccess, 
  logError, 
  checkHealth,
} from '../utils/test-helpers.js';

// Two different test users
const USER_ALICE = {
  id: 'user-alice-123',
  name: 'Alice',
  email: 'alice@example.com'
};

const USER_BOB = {
  id: 'user-bob-456', 
  name: 'Bob',
  email: 'bob@example.com'
};

// Test data for each user
const ALICE_KNOWLEDGE = [
  {
    title: "Alice's React Knowledge",
    content: "Alice learns React: Components are the building blocks of React applications. Alice prefers functional components with hooks.",
    tags: ["alice", "react", "personal"]
  },
  {
    title: "Alice's JavaScript Notes",
    content: "Alice's JavaScript notes: Functions are first-class citizens. Alice loves arrow functions and async/await patterns.",
    tags: ["alice", "javascript", "notes"]
  }
];

const BOB_KNOWLEDGE = [
  {
    title: "Bob's Python Guide", 
    content: "Bob's Python expertise: Python is great for data science and web development. Bob prefers Django framework.",
    tags: ["bob", "python", "expertise"]
  },
  {
    title: "Bob's Database Design",
    content: "Bob's database knowledge: Proper normalization prevents data redundancy. Bob recommends PostgreSQL for complex applications.",
    tags: ["bob", "database", "postgresql"]
  }
];

// Store created IDs for cleanup
let aliceKnowledgeIds = [];
let bobKnowledgeIds = [];

/**
 * Generate mock token for specific user
 */
function generateUserToken(userId) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ 
    sub: userId,
    userId: userId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (60 * 60)
  }));
  const signature = btoa('mock-signature');
  return `${header}.${payload}.${signature}`;
}

/**
 * Make request as specific user
 */
async function makeUserRequest(userId, url, options = {}) {
  const token = generateUserToken(userId);
  return await makeRequest(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
    ...options,
  });
}

async function setupAliceData() {
  logTest("Setting up Alice's data");
  
  for (const item of ALICE_KNOWLEDGE) {
    const result = await makeUserRequest(USER_ALICE.id, `${BASE_URL}/api/v1/knowledge`, {
      method: 'POST',
      body: JSON.stringify(item),
    });
    
    if (result.success) {
      aliceKnowledgeIds.push(result.data.data.id);
      console.log(`  ✅ Alice created: "${item.title}"`);
    } else {
      logError(`Failed to create Alice's knowledge "${item.title}": ${result.error}`);
      return false;
    }
  }
  
  logSuccess(`Alice's data setup complete (${aliceKnowledgeIds.length} entries)`);
  return true;
}

async function setupBobData() {
  logTest("Setting up Bob's data");
  
  for (const item of BOB_KNOWLEDGE) {
    const result = await makeUserRequest(USER_BOB.id, `${BASE_URL}/api/v1/knowledge`, {
      method: 'POST',
      body: JSON.stringify(item),
    });
    
    if (result.success) {
      bobKnowledgeIds.push(result.data.data.id);
      console.log(`  ✅ Bob created: "${item.title}"`);
    } else {
      logError(`Failed to create Bob's knowledge "${item.title}": ${result.error}`);
      return false;
    }
  }
  
  logSuccess(`Bob's data setup complete (${bobKnowledgeIds.length} entries)`);
  return true;
}

async function testUserDataIsolation() {
  logTest("User Data Isolation - List Knowledge");
  
  // Alice should only see her own data
  console.log('\n  🔍 Alice listing her knowledge:');
  const aliceList = await makeUserRequest(USER_ALICE.id, `${BASE_URL}/api/v1/knowledge?page=1&limit=10`);
  
  if (aliceList.success) {
    const aliceData = aliceList.data.data;
    console.log(`    Alice sees ${aliceData.length} entries`);
    
    let hasAliceData = false;
    let hasBobData = false;
    
    aliceData.forEach(item => {
      console.log(`    - "${item.title}" [${item.tags.join(', ')}]`);
      if (item.tags.includes('alice')) hasAliceData = true;
      if (item.tags.includes('bob')) hasBobData = true;
    });
    
    if (hasAliceData && !hasBobData) {
      logSuccess('✅ Alice sees only her own data');
    } else {
      logError(`❌ Data leak: Alice has Alice data: ${hasAliceData}, has Bob data: ${hasBobData}`);
      return false;
    }
  } else {
    logError(`Alice failed to list knowledge: ${aliceList.error}`);
    return false;
  }
  
  // Bob should only see his own data  
  console.log('\n  🔍 Bob listing his knowledge:');
  const bobList = await makeUserRequest(USER_BOB.id, `${BASE_URL}/api/v1/knowledge?page=1&limit=10`);
  
  if (bobList.success) {
    const bobData = bobList.data.data;
    console.log(`    Bob sees ${bobData.length} entries`);
    
    let hasAliceData = false;
    let hasBobData = false;
    
    bobData.forEach(item => {
      console.log(`    - "${item.title}" [${item.tags.join(', ')}]`);
      if (item.tags.includes('alice')) hasAliceData = true;
      if (item.tags.includes('bob')) hasBobData = true;
    });
    
    if (hasBobData && !hasAliceData) {
      logSuccess('✅ Bob sees only his own data');
      return true;
    } else {
      logError(`❌ Data leak: Bob has Alice data: ${hasAliceData}, has Bob data: ${hasBobData}`);
      return false;
    }
  } else {
    logError(`Bob failed to list knowledge: ${bobList.error}`);
    return false;
  }
}

async function testSearchIsolation() {
  logTest("User Isolation - Semantic Search");
  
  // Alice searches for "React" - should only find her React content
  console.log('\n  🔍 Alice searches for "React":');
  const aliceSearchResult = await makeUserRequest(USER_ALICE.id, `${BASE_URL}/api/v1/knowledge/query`, {
    method: 'POST',
    body: JSON.stringify({
      query: "React components and hooks",
      limit: 5,
      minScore: 0.1
    }),
  });
  
  if (aliceSearchResult.success) {
    const results = aliceSearchResult.data.data;
    console.log(`    Alice found ${results.length} results`);
    
    let foundAliceContent = false;
    let foundBobContent = false;
    
    results.forEach((result, index) => {
      console.log(`    ${index + 1}. "${result.metadata.title}" (Score: ${result.score.toFixed(3)})`);
      if (result.metadata.tags.includes('alice')) foundAliceContent = true;
      if (result.metadata.tags.includes('bob')) foundBobContent = true;
    });
    
    if (foundAliceContent && !foundBobContent) {
      logSuccess('✅ Alice search isolated - only her content returned');
    } else {
      logError(`❌ Search leak: Alice found her content: ${foundAliceContent}, found Bob's: ${foundBobContent}`);
      return false;
    }
  } else {
    logError(`Alice search failed: ${aliceSearchResult.error}`);
    return false;
  }
  
  // Bob searches for "Python" - should only find his Python content
  console.log('\n  🔍 Bob searches for "Python database":');
  const bobSearchResult = await makeUserRequest(USER_BOB.id, `${BASE_URL}/api/v1/knowledge/query`, {
    method: 'POST',
    body: JSON.stringify({
      query: "Python database PostgreSQL",
      limit: 5,
      minScore: 0.1
    }),
  });
  
  if (bobSearchResult.success) {
    const results = bobSearchResult.data.data;
    console.log(`    Bob found ${results.length} results`);
    
    let foundAliceContent = false;
    let foundBobContent = false;
    
    results.forEach((result, index) => {
      console.log(`    ${index + 1}. "${result.metadata.title}" (Score: ${result.score.toFixed(3)})`);
      if (result.metadata.tags.includes('alice')) foundAliceContent = true;
      if (result.metadata.tags.includes('bob')) foundBobContent = true;
    });
    
    if (foundBobContent && !foundAliceContent) {
      logSuccess('✅ Bob search isolated - only his content returned');
      return true;
    } else {
      logError(`❌ Search leak: Bob found Alice's content: ${foundAliceContent}, found his content: ${foundBobContent}`);
      return false;
    }
  } else {
    logError(`Bob search failed: ${bobSearchResult.error}`);
    return false;
  }
}

async function testCrossUserAccess() {
  logTest("Cross-User Access Prevention");
  
  if (bobKnowledgeIds.length === 0) {
    logError("No Bob knowledge IDs available for testing");
    return false;
  }
  
  const bobKnowledgeId = bobKnowledgeIds[0];
  
  // Alice tries to access Bob's knowledge by ID - should fail
  console.log(`\n  🔍 Alice trying to access Bob's knowledge (ID: ${bobKnowledgeId}):`);
  const aliceAccessResult = await makeUserRequest(USER_ALICE.id, `${BASE_URL}/api/v1/knowledge/${bobKnowledgeId}`);
  
  if (!aliceAccessResult.success) {
    logSuccess('✅ Alice correctly blocked from accessing Bob\'s knowledge');
    console.log(`    Error: ${aliceAccessResult.error}`);
  } else {
    logError('❌ Security breach: Alice accessed Bob\'s knowledge!');
    return false;
  }
  
  // Alice tries to update Bob's knowledge - should fail
  console.log(`\n  🔍 Alice trying to update Bob's knowledge (ID: ${bobKnowledgeId}):`);
  const aliceUpdateResult = await makeUserRequest(USER_ALICE.id, `${BASE_URL}/api/v1/knowledge/${bobKnowledgeId}`, {
    method: 'PUT',
    body: JSON.stringify({
      title: "Alice trying to hijack Bob's data"
    }),
  });
  
  if (!aliceUpdateResult.success) {
    logSuccess('✅ Alice correctly blocked from updating Bob\'s knowledge');
    console.log(`    Error: ${aliceUpdateResult.error}`);
  } else {
    logError('❌ Security breach: Alice updated Bob\'s knowledge!');
    return false;
  }
  
  // Alice tries to delete Bob's knowledge - should fail
  console.log(`\n  🔍 Alice trying to delete Bob's knowledge (ID: ${bobKnowledgeId}):`);
  const aliceDeleteResult = await makeUserRequest(USER_ALICE.id, `${BASE_URL}/api/v1/knowledge/${bobKnowledgeId}`, {
    method: 'DELETE',
  });
  
  if (!aliceDeleteResult.success) {
    logSuccess('✅ Alice correctly blocked from deleting Bob\'s knowledge');
    console.log(`    Error: ${aliceDeleteResult.error}`);
    return true;
  } else {
    logError('❌ Security breach: Alice deleted Bob\'s knowledge!');
    return false;
  }
}

/**
 * Cleanup function
 */
async function cleanup() {
  console.log(`\n${colors.yellow}🧹 Cleaning up user isolation test data...${colors.reset}`);
  
  // Clean up Alice's data
  for (const id of aliceKnowledgeIds) {
    try {
      await makeUserRequest(USER_ALICE.id, `${BASE_URL}/api/v1/knowledge/${id}`, { method: 'DELETE' });
      console.log(`Deleted Alice's: ${id}`);
    } catch (error) {
      console.log(`Failed to delete Alice's ${id}: ${error.message}`);
    }
  }
  
  // Clean up Bob's data  
  for (const id of bobKnowledgeIds) {
    try {
      await makeUserRequest(USER_BOB.id, `${BASE_URL}/api/v1/knowledge/${id}`, { method: 'DELETE' });
      console.log(`Deleted Bob's: ${id}`);
    } catch (error) {
      console.log(`Failed to delete Bob's ${id}: ${error.message}`);
    }
  }
}

/**
 * Main test runner
 */
async function runUserIsolationTests() {
  console.log(`${colors.magenta}🚀 Running User Isolation Tests${colors.reset}`);
  console.log(`${colors.cyan}Base URL: ${BASE_URL}${colors.reset}`);
  console.log(`${colors.cyan}Testing: Data isolation between Alice and Bob${colors.reset}`);
  console.log(`${colors.cyan}Security Level: Maximum isolation - users must never see each other's data${colors.reset}\n`);
  
  const tests = [
    checkHealth,
    setupAliceData,
    setupBobData,
    testUserDataIsolation,
    testSearchIsolation,
    testCrossUserAccess,
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
  console.log(`\n${colors.magenta}📊 User Isolation Tests Summary${colors.reset}`);
  console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
  console.log(`${colors.cyan}Total: ${passed + failed}${colors.reset}`);
  
  if (failed === 0) {
    console.log(`\n${colors.green}🔒 Perfect user isolation! No data leaks detected!${colors.reset}`);
    console.log(`${colors.green}✅ RAG system is user-level secure${colors.reset}`);
  } else {
    console.log(`\n${colors.red}🚨 SECURITY ISSUE: User isolation failed!${colors.reset}`);
    console.log(`${colors.red}❌ Data leaks detected - immediate attention required${colors.reset}`);
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
runUserIsolationTests().catch(async (error) => {
  logError(`User isolation test runner failed: ${error.message}`);
  await cleanup();
  process.exit(1);
});