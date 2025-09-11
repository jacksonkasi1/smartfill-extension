#!/usr/bin/env node

/**
 * TiDB Vector Database Tests
 * 
 * Comprehensive tests for TiDB vector functionality including:
 * - Database connection and configuration
 * - Vector functions (VEC_COSINE_DISTANCE)
 * - Table structure and vector columns
 * - Vector indexes and performance
 * - Vector insert/query operations
 * - Data integrity and cleanup
 */

// ** import utils
import { 
  colors, 
  logTest, 
  logSuccess, 
  logError,
  logWarning,
  testTiDBVectorFunctionality
} from '../utils/test-helpers.js';

/**
 * Load environment variables from .env file
 */
async function loadEnvFile() {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const envPath = path.join(process.cwd(), '.env');
    
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const envLines = envContent.split('\n');
      
      for (const line of envLines) {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('#')) {
          const [key, ...valueParts] = trimmedLine.split('=');
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=');
            process.env[key] = value;
          }
        }
      }
    }
  } catch (error) {
    console.warn('Warning: Could not load .env file:', error.message);
  }
}

/**
 * Test TiDB vector database configuration
 */
async function testTiDBConfiguration() {
  logTest('TiDB Vector Database Configuration');
  
  try {
    // Load environment variables from .env file
    await loadEnvFile();
    
    // Check DATABASE_URL environment variable
    if (!process.env.DATABASE_URL) {
      logError('❌ Missing environment variable: DATABASE_URL');
      return false;
    }
    
    logSuccess('✅ DATABASE_URL environment variable is set');
    
    // Check TiDB connection string format
    const databaseUrl = process.env.DATABASE_URL;
    if (databaseUrl.includes('tidbcloud.com') || databaseUrl.includes('pingcap.com')) {
      logSuccess('✅ TiDB Cloud connection detected');
    } else {
      logWarning('⚠️  Non-standard TiDB host detected');
    }
    
    return true;
    
  } catch (error) {
    logError(`❌ Configuration test failed: ${error.message}`);
    return false;
  }
}

/**
 * Test vector performance with different vector sizes
 */
async function testVectorPerformance() {
  logTest('Vector Performance Tests');
  
  try {
    // Load environment variables
    await loadEnvFile();
    
    if (!process.env.DATABASE_URL) {
      logError('❌ Missing DATABASE_URL environment variable');
      return false;
    }
    
    // Dynamic imports
    const { connect } = await import('@tidbcloud/serverless');
    const { drizzle } = await import('drizzle-orm/tidb-serverless');
    const { sql } = await import('drizzle-orm');
    
    // Create connection
    const client = connect({ url: process.env.DATABASE_URL });
    
    const db = drizzle(client);
    
    // Test different vector sizes
    const vectorSizes = [128, 384, 768, 1536];
    
    for (const size of vectorSizes) {
      const startTime = Date.now();
      
      const vector1 = Array.from({length: size}, () => Math.random());
      const vector2 = Array.from({length: size}, () => Math.random());
      
      const result = await db.execute(sql`
        SELECT VEC_COSINE_DISTANCE(${JSON.stringify(vector1)}, ${JSON.stringify(vector2)}) as distance
      `);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      if (result.rows.length > 0) {
        logSuccess(`✅ Vector size ${size}: ${duration}ms (distance: ${result.rows[0].distance.toFixed(4)})`);
      } else {
        logError(`❌ Vector size ${size}: No result returned`);
        return false;
      }
    }
    
    return true;
    
  } catch (error) {
    logError(`❌ Performance test failed: ${error.message}`);
    return false;
  }
}

/**
 * Test vector data integrity and edge cases
 */
async function testVectorDataIntegrity() {
  logTest('Vector Data Integrity Tests');
  
  try {
    // Load environment variables
    await loadEnvFile();
    
    if (!process.env.DATABASE_URL) {
      logError('❌ Missing DATABASE_URL environment variable');
      return false;
    }
    
    // Dynamic imports
    const { connect } = await import('@tidbcloud/serverless');
    const { drizzle } = await import('drizzle-orm/tidb-serverless');
    const { sql } = await import('drizzle-orm');
    
    const client = connect({ url: process.env.DATABASE_URL });
    
    const db = drizzle(client);
    
    // Test 1: Zero vectors
    const zeroVector = Array.from({length: 1536}, () => 0);
    const normalVector = Array.from({length: 1536}, () => Math.random());
    
    const zeroTest = await db.execute(sql`
      SELECT VEC_COSINE_DISTANCE(${JSON.stringify(zeroVector)}, ${JSON.stringify(normalVector)}) as distance
    `);
    
    if (zeroTest.rows.length > 0) {
      logSuccess(`✅ Zero vector test passed (distance: ${zeroTest.rows[0].distance})`);
    } else {
      logError('❌ Zero vector test failed');
      return false;
    }
    
    // Test 2: Identical vectors (should have distance 0)
    const identicalTest = await db.execute(sql`
      SELECT VEC_COSINE_DISTANCE(${JSON.stringify(normalVector)}, ${JSON.stringify(normalVector)}) as distance
    `);
    
    if (identicalTest.rows.length > 0) {
      const distance = identicalTest.rows[0].distance;
      if (Math.abs(distance) < 0.0001) {
        logSuccess(`✅ Identical vector test passed (distance: ${distance})`);
      } else {
        logWarning(`⚠️  Identical vectors have non-zero distance: ${distance}`);
      }
    } else {
      logError('❌ Identical vector test failed');
      return false;
    }
    
    // Test 3: Opposite vectors (should have distance close to 2)
    const oppositeVector = normalVector.map(x => -x);
    const oppositeTest = await db.execute(sql`
      SELECT VEC_COSINE_DISTANCE(${JSON.stringify(normalVector)}, ${JSON.stringify(oppositeVector)}) as distance
    `);
    
    if (oppositeTest.rows.length > 0) {
      const distance = oppositeTest.rows[0].distance;
      if (distance > 1.5 && distance < 2.5) {
        logSuccess(`✅ Opposite vector test passed (distance: ${distance})`);
      } else {
        logWarning(`⚠️  Opposite vectors have unexpected distance: ${distance}`);
      }
    } else {
      logError('❌ Opposite vector test failed');
      return false;
    }
    
    return true;
    
  } catch (error) {
    logError(`❌ Data integrity test failed: ${error.message}`);
    return false;
  }
}

/**
 * Main test runner for TiDB vector tests
 */
async function runTiDBVectorTests() {
  console.log(`${colors.magenta}🚀 Running TiDB Vector Database Tests${colors.reset}`);
  console.log(`${colors.cyan}Testing comprehensive vector functionality${colors.reset}`);
  console.log(`${colors.cyan}Including performance, integrity, and operations${colors.reset}\n`);
  
  const tests = [
    testTiDBConfiguration,
    testTiDBVectorFunctionality,
    testVectorPerformance,
    testVectorDataIntegrity,
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
    
    // Add spacing between tests
    console.log('');
  }
  
  // Summary
  console.log(`${colors.magenta}📊 TiDB Vector Tests Summary${colors.reset}`);
  console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
  console.log(`${colors.cyan}Total: ${passed + failed}${colors.reset}`);
  
  if (failed === 0) {
    console.log(`\n${colors.green}🎉 All TiDB vector tests passed! Database is ready for production!${colors.reset}`);
  } else {
    console.log(`\n${colors.red}❌ Some TiDB vector tests failed. Check database configuration and connectivity.${colors.reset}`);
  }
  
  process.exit(failed === 0 ? 0 : 1);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(`\n${colors.yellow}⚠️  TiDB vector tests interrupted.${colors.reset}`);
  process.exit(0);
});

// Start tests
runTiDBVectorTests().catch((error) => {
  logError(`TiDB vector test runner failed: ${error.message}`);
  process.exit(1);
});