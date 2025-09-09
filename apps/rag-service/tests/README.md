# RAG Service Tests

Comprehensive test suite for the RAG (Retrieval-Augmented Generation) service, including TiDB vector database functionality, semantic search, and knowledge management operations.

## Test Structure

```
tests/
├── integration/           # Integration tests
│   ├── create.test.js     # Knowledge creation tests
│   ├── delete.test.js     # Knowledge deletion tests
│   ├── search.test.js     # Semantic search tests (includes TiDB vector tests)
│   ├── tidb-vectors.test.js # Comprehensive TiDB vector database tests
│   ├── update.test.js     # Knowledge update tests
│   └── user-isolation.test.js # User isolation tests
├── unit/                  # Unit tests (future)
└── utils/
    └── test-helpers.js    # Shared testing utilities
```

## Available Test Scripts

### Individual Test Suites

```bash
# Run TiDB vector database tests
npm run test:tidb-vectors

# Run knowledge creation tests
npm run test:create

# Run semantic search tests (includes basic TiDB vector validation)
npm run test:integration

# Run all integration tests in sequence
npm run test:all-integration
```

### Legacy Test Scripts

```bash
# Original RAG service tests
npm run test          # Mock mode
npm run test:mock     # Mock mode
npm run test:real     # Real API mode
npm run test:help     # Show help
```

## TiDB Vector Database Tests

### Overview

The `tidb-vectors.test.js` file provides comprehensive testing for TiDB's vector database functionality:

- **Database Configuration**: Validates environment variables and connection settings
- **Vector Functions**: Tests `VEC_COSINE_DISTANCE` function with various inputs
- **Table Structure**: Verifies vector column types and configurations
- **Vector Indexes**: Checks for proper vector indexing
- **Performance Testing**: Measures vector operations across different vector sizes
- **Data Integrity**: Tests edge cases like zero vectors, identical vectors, and opposite vectors
- **CRUD Operations**: Full vector insert, query, and cleanup operations

### Prerequisites

Ensure your `.env` file contains the required TiDB configuration:

```env
TIDB_HOST=your-tidb-host.tidbcloud.com
TIDB_USERNAME=your-username
TIDB_PASSWORD=your-password
TIDB_DATABASE=your-database-name
```

### Test Features

#### 1. Vector Function Testing
- Tests `VEC_COSINE_DISTANCE` with various vector sizes (128, 384, 768, 1536 dimensions)
- Performance benchmarking for vector operations
- Validates mathematical correctness of distance calculations

#### 2. Database Schema Validation
- Verifies `knowledge_chunks` table has proper vector column (`embedding`)
- Checks vector column type (should be `VECTOR(1536)` or similar)
- Validates foreign key relationships

#### 3. Vector Index Testing
- Searches for vector-specific indexes on embedding columns
- Reports index configuration for performance optimization

#### 4. Data Integrity Tests
- **Zero Vector Test**: Ensures zero vectors are handled correctly
- **Identical Vector Test**: Verifies identical vectors return distance ≈ 0
- **Opposite Vector Test**: Confirms opposite vectors return distance ≈ 2

#### 5. Full CRUD Operations
- Creates test user, knowledge, and vector data
- Performs vector similarity queries
- Cleans up all test data to maintain database integrity

## Search Integration Tests

The `search.test.js` file now includes TiDB vector validation as part of the semantic search testing:

- **Basic Vector Validation**: Quick check of TiDB vector functionality
- **Semantic Search Accuracy**: Tests search relevance with real embeddings
- **Search Filtering**: Validates score thresholds and result limiting
- **End-to-End Workflow**: Complete knowledge creation → embedding → search cycle

## Test Utilities

### `test-helpers.js`

Provides shared utilities for all tests:

- **HTTP Request Handling**: `makeRequest()` with proper error handling
- **Authentication**: Mock JWT token generation for testing
- **Logging**: Colored console output for test results
- **Test Data**: Predefined knowledge items and file content
- **TiDB Vector Testing**: `testTiDBVectorFunctionality()` for comprehensive vector validation

### Key Functions

```javascript
// HTTP requests with authentication
const result = await makeRequest('/api/v1/knowledge', {
  method: 'POST',
  body: JSON.stringify(data)
});

// TiDB vector functionality testing
const vectorTestResult = await testTiDBVectorFunctionality();

// Logging utilities
logSuccess('✅ Test passed');
logError('❌ Test failed');
logWarning('⚠️  Warning message');
```

## Running Tests

### Development Workflow

1. **Start the RAG service**:
   ```bash
   npm run dev
   ```

2. **Run TiDB vector tests** (recommended first):
   ```bash
   npm run test:tidb-vectors
   ```

3. **Run integration tests**:
   ```bash
   npm run test:all-integration
   ```

### Continuous Integration

For CI/CD pipelines, run tests in this order:

```bash
# 1. Validate TiDB vector database
npm run test:tidb-vectors

# 2. Test knowledge operations
npm run test:create

# 3. Test search functionality
npm run test:integration
```

## Test Output

### Successful TiDB Vector Test Output

```
🚀 Running TiDB Vector Database Tests
Testing comprehensive vector functionality
Including performance, integrity, and operations

🧪 TiDB Vector Database Configuration
✅ All required TiDB environment variables are set
✅ TiDB Cloud connection detected

🧪 TiDB Vector Database Tests
✅ TiDB connection established
✅ VEC_COSINE_DISTANCE function works (distance: 0.123)
✅ Vector column found: vector(1536)
✅ Correct vector column type detected
⚠️  No vector-specific indexes detected
✅ Test vector data inserted successfully
✅ Vector similarity query successful (distance: 0.456)
✅ Test data cleanup completed
✅ All TiDB vector tests passed

🧪 Vector Performance Tests
✅ Vector size 128: 45ms (distance: 0.1234)
✅ Vector size 384: 52ms (distance: 0.2345)
✅ Vector size 768: 68ms (distance: 0.3456)
✅ Vector size 1536: 89ms (distance: 0.4567)

🧪 Vector Data Integrity Tests
✅ Zero vector test passed (distance: 1.0000)
✅ Identical vector test passed (distance: 0.0000)
✅ Opposite vector test passed (distance: 2.0000)

📊 TiDB Vector Tests Summary
Passed: 4
Failed: 0
Total: 4

🎉 All TiDB vector tests passed! Database is ready for production!
```

## Troubleshooting

### Common Issues

1. **Missing Environment Variables**
   ```
   ❌ Missing TiDB environment variables
   ```
   **Solution**: Ensure `.env` file contains all required TiDB configuration

2. **Vector Function Not Available**
   ```
   ❌ VEC_COSINE_DISTANCE function failed
   ```
   **Solution**: Verify TiDB cluster supports vector functions (TiDB Cloud Serverless Tier)

3. **Vector Column Type Issues**
   ```
   ⚠️  Vector column type may not be optimal
   ```
   **Solution**: Run database migrations to ensure proper vector column types

4. **No Vector Indexes**
   ```
   ⚠️  No vector-specific indexes detected
   ```
   **Solution**: Consider adding vector indexes for better performance (optional)

### Performance Considerations

- Vector operations with 1536 dimensions typically take 50-100ms
- Consider vector indexes for large datasets (>10k vectors)
- Monitor TiDB Cloud resource usage during vector operations

## Contributing

When adding new tests:

1. Follow the existing test structure and naming conventions
2. Use the shared utilities in `test-helpers.js`
3. Include proper cleanup to avoid test data pollution
4. Add appropriate logging with `logSuccess`, `logError`, and `logWarning`
5. Update this README with new test descriptions

## Future Enhancements

- [ ] Unit tests for individual components
- [ ] Performance benchmarking suite
- [ ] Load testing for vector operations
- [ ] Integration with CI/CD pipelines
- [ ] Automated test reporting
- [ ] Vector index optimization tests