#!/usr/bin/env node

/**
 * Shared Test Utilities for RAG Service
 */

// Configuration
export const BASE_URL = 'http://localhost:3001';
export const TEST_USER_ID = 'test-user-12345';

// Colors for console output
export const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

/**
 * Generate a mock JWT token for testing
 */
export function generateMockToken(userId = TEST_USER_ID) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ 
    sub: userId,
    userId: userId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
  }));
  const signature = btoa('mock-signature');
  return `${header}.${payload}.${signature}`;
}

/**
 * Get authorization header
 */
export function getAuthHeader() {
  const token = generateMockToken();
  return { 'Authorization': `Bearer ${token}` };
}

/**
 * Make HTTP request with proper error handling
 */
export async function makeRequest(url, options = {}) {
  try {
    const defaultHeaders = {
      'Content-Type': 'application/json',
      ...(!options.headers?.Authorization ? getAuthHeader() : {}),
    }
    
    const response = await fetch(url, {
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();
    
    if (!response.ok) {
      const errorMessage = data.error || data.message || JSON.stringify(data) || 'Unknown error';
      throw new Error(`HTTP ${response.status}: ${errorMessage}`);
    }
    
    return { success: true, data, status: response.status };
  } catch (error) {
    return { success: false, error: error.message, status: error.status };
  }
}

/**
 * Test helper functions
 */
export function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

export function logTest(testName) {
  console.log(`\n${colors.blue}🧪 Testing: ${testName}${colors.reset}`);
}

export function logSuccess(message) {
  console.log(`${colors.green}✅ ${message}${colors.reset}`);
}

export function logError(message) {
  console.log(`${colors.red}❌ ${message}${colors.reset}`);
}

export function logWarning(message) {
  console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
}

/**
 * Test data
 */
export const testKnowledgeItems = [
  {
    title: "JavaScript Fundamentals",
    content: "JavaScript is a programming language that runs in web browsers and on servers. It supports object-oriented, functional, and procedural programming paradigms. Key concepts include variables, functions, objects, arrays, and asynchronous programming with promises and async/await.",
    tags: ["javascript", "programming", "web-development"]
  },
  {
    title: "React Components",
    content: "React components are reusable pieces of UI that can be composed together to build complex applications. They can be functional components using hooks or class components. Props are used to pass data down from parent to child components, while state manages component-specific data.",
    tags: ["react", "frontend", "components"]
  },
  {
    title: "Database Design",
    content: "Good database design involves normalizing data to reduce redundancy, establishing proper relationships between tables, and creating efficient indexes. Consider data types, constraints, and query patterns when designing schemas. Use foreign keys to maintain referential integrity.",
    tags: ["database", "design", "sql"]
  }
];

export const testFileContent = `# API Documentation

## Authentication
All API endpoints require authentication using Bearer tokens.

## Rate Limiting
API calls are limited to 1000 requests per hour per user.

## Error Handling
The API returns standard HTTP status codes:
- 200: Success
- 400: Bad Request
- 401: Unauthorized
- 404: Not Found
- 500: Internal Server Error

## Data Formats
All requests and responses use JSON format.
Dates are in ISO 8601 format.
`;

/**
 * Health check utility
 */
export async function checkHealth() {
  logTest("Health Check");
  const result = await makeRequest(`${BASE_URL}/api/v1/health`);
  
  if (result.success) {
    logSuccess(`Service is healthy: ${JSON.stringify(result.data)}`);
    return true;
  } else {
    logError(`Health check failed: ${result.error}`);
    return false;
  }
}

/**
 * TiDB Vector Database Testing Utilities
 */

/**
 * Load environment variables from .env file
 */
async function loadEnv() {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const envPath = path.resolve('.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          envVars[key] = valueParts.join('=').replace(/^["']|["']$/g, '');
        }
      }
    });
    
    return envVars;
  } catch (error) {
    logWarning(`Could not load .env file: ${error.message}`);
    return {};
  }
}

/**
 * Test TiDB vector database functionality
 */
export async function testTiDBVectorFunctionality() {
  logTest('TiDB Vector Database Tests');
  
  try {
    // Dynamic imports to avoid module loading issues
    const { connect } = await import('@tidbcloud/serverless');
    const { drizzle } = await import('drizzle-orm/tidb-serverless');
    const { sql } = await import('drizzle-orm');
    
    // Load environment variables
    const env = await loadEnv();
    
    if (!env.DATABASE_URL) {
      logError('❌ Missing DATABASE_URL environment variable');
      return false;
    }
    
    // Create TiDB connection
    const client = connect({ url: env.DATABASE_URL });
    
    const db = drizzle(client);
    logSuccess('✅ TiDB connection established');
    
    // Test 1: Check VEC_COSINE_DISTANCE function
    try {
      const vectorTest = await db.execute(sql`SELECT VEC_COSINE_DISTANCE('[1,2,3]', '[4,5,6]') as distance`);
      const distance = vectorTest.rows[0].distance;
      logSuccess(`✅ VEC_COSINE_DISTANCE function works (distance: ${distance})`);
    } catch (error) {
      logError(`❌ VEC_COSINE_DISTANCE function failed: ${error.message}`);
      return false;
    }
    
    // Test 2: Check knowledge_chunks table structure
    try {
      const tableInfo = await db.execute(sql`DESCRIBE knowledge_chunks`);
      const vectorColumn = tableInfo.rows.find(row => row.Field === 'embedding');
      
      if (vectorColumn) {
        logSuccess(`✅ Vector column found: ${vectorColumn.Type}`);
        if (vectorColumn.Type.toLowerCase().includes('vector')) {
          logSuccess('✅ Correct vector column type detected');
        } else {
          logWarning(`⚠️  Vector column type may not be optimal: ${vectorColumn.Type}`);
        }
      } else {
        logError('❌ Vector column not found in knowledge_chunks table');
        return false;
      }
    } catch (error) {
      logError(`❌ Table structure check failed: ${error.message}`);
      return false;
    }
    
    // Test 3: Check for vector indexes
    try {
      const indexes = await db.execute(sql`SHOW INDEX FROM knowledge_chunks WHERE Key_name LIKE '%vector%' OR Key_name LIKE '%embedding%'`);
      if (indexes.rows.length > 0) {
        logSuccess(`✅ Vector indexes found: ${indexes.rows.length}`);
        indexes.rows.forEach(idx => {
          console.log(`     Index: ${idx.Key_name} on column ${idx.Column_name}`);
        });
      } else {
        logWarning('⚠️  No vector-specific indexes detected');
      }
    } catch (error) {
      logWarning(`⚠️  Could not check vector indexes: ${error.message}`);
    }
    
    // Test 4: Test vector operations with actual data
    try {
      // Create test data
      const testUserId = 'tidb-test-user';
      const testKnowledgeId = 'tidb-test-knowledge';
      const testVector = Array.from({length: 1536}, (_, i) => Math.random());
      
      // Insert test user
      await db.execute(sql`
        INSERT IGNORE INTO users (id, email, name) 
        VALUES (${testUserId}, 'test@tidb.com', 'TiDB Test User')
      `);
      
      // Insert test knowledge
      await db.execute(sql`
        INSERT IGNORE INTO knowledge (id, title, content, user_id, created_at, updated_at) 
        VALUES (${testKnowledgeId}, 'TiDB Vector Test', 'Test content for TiDB vectors', ${testUserId}, NOW(), NOW())
      `);
      
      // Insert test vector
      await db.execute(sql`
        INSERT INTO knowledge_chunks (id, knowledge_id, content, embedding, chunk_index, created_at) 
        VALUES ('tidb-test-chunk', ${testKnowledgeId}, 'Test chunk content', ${JSON.stringify(testVector)}, 0, NOW())
        ON DUPLICATE KEY UPDATE embedding = VALUES(embedding)
      `);
      
      logSuccess('✅ Test vector data inserted successfully');
      
      // Test vector similarity query
      const queryVector = Array.from({length: 1536}, (_, i) => Math.random());
      const similarityQuery = await db.execute(sql`
        SELECT 
          id,
          content,
          VEC_COSINE_DISTANCE(embedding, ${JSON.stringify(queryVector)}) as distance
        FROM knowledge_chunks 
        WHERE id = 'tidb-test-chunk'
        ORDER BY distance ASC
        LIMIT 1
      `);
      
      if (similarityQuery.rows.length > 0) {
        const result = similarityQuery.rows[0];
        logSuccess(`✅ Vector similarity query successful (distance: ${result.distance})`);
      } else {
        logError('❌ Vector similarity query returned no results');
      }
      
      // Cleanup test data
      await db.execute(sql`DELETE FROM knowledge_chunks WHERE id = 'tidb-test-chunk'`);
      await db.execute(sql`DELETE FROM knowledge WHERE id = ${testKnowledgeId}`);
      await db.execute(sql`DELETE FROM users WHERE id = ${testUserId}`);
      
      logSuccess('✅ Test data cleanup completed');
      
    } catch (error) {
      logError(`❌ Vector operations test failed: ${error.message}`);
      return false;
    }
    
    logSuccess('✅ All TiDB vector tests passed');
    return true;
    
  } catch (error) {
    logError(`❌ TiDB vector test setup failed: ${error.message}`);
    return false;
  }
}