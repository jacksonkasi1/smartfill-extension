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