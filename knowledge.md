# SmartFill RAG System & Database Architecture

## Overview
The SmartFill monorepo contains a RAG (Retrieval-Augmented Generation) service that provides knowledge management capabilities for the browser form filler extension. The system stores, chunks, vectorizes, and retrieves user knowledge to enhance form filling capabilities.

## Architecture Components

### 1. Database Layer (PostgreSQL + Drizzle ORM)

**Connection**: Neon PostgreSQL via `@neondatabase/serverless`
- **File**: `apps/rag-service/src/db/client.ts:9`
- **Provider**: Neon Database (serverless-optimized)
- **ORM**: Drizzle with connection caching enabled

**Schema** (`apps/rag-service/src/db/schema.ts`):

#### `knowledge` table:
- `id`: UUID primary key (auto-generated)
- `userId`: User identifier (text, not null) 
- `title`: Knowledge entry title (text, not null)
- `content`: Full text content (text, not null)
- `type`: Enum ['text', 'file'] - knowledge source type
- `tags`: Array of text tags (defaults to empty array)
- `createdAt`/`updatedAt`: Timestamps with timezone

#### `knowledgeChunks` table:
- `id`: UUID primary key (auto-generated)
- `knowledgeId`: Foreign key to knowledge table (cascading delete)
- `content`: Chunk text content
- `chunkIndex`: Index of chunk within knowledge entry
- `vectorId`: Reference to vector in Upstash Vector DB
- `createdAt`: Timestamp

### 2. Vector Store (Upstash Vector)

**Service**: `apps/rag-service/src/services/vector.ts`
- **Provider**: Upstash Vector Database
- **Embedding**: Automatic via Upstash (or optional OpenAI)
- **Organization**: User-namespaced vectors for data isolation

**Key Operations**:
- `upsertKnowledgeChunks()`: Store vectorized chunks with metadata
- `queryKnowledge()`: Semantic search with similarity scoring
- `deleteKnowledge()`: Remove vectors by knowledge ID
- `updateKnowledgeChunks()`: Replace existing vectors

**Metadata Structure**:
```typescript
{
  knowledgeId: string,
  userId: string, 
  title: string,
  tags: string[],
  type: 'text' | 'file',
  chunkIndex: number,
  totalChunks: number
}
```

### 3. Knowledge Service Layer

**Service**: `apps/rag-service/src/services/knowledge.ts`
- **Purpose**: Orchestrates database and vector operations
- **Text Processing**: Chunking, sanitization via TextProcessor

**Core Methods**:
- `createKnowledge()`: Create + chunk + vectorize new knowledge
- `updateKnowledge()`: Update with re-chunking/re-vectorization  
- `queryKnowledge()`: Semantic search across user's knowledge
- `getUserKnowledge()`: Paginated knowledge listing
- `deleteKnowledge()`: Remove from both DB and vector store

### 4. Text Processing

**Utility**: `apps/rag-service/src/utils/text-processor.ts`

**Chunking Algorithm** (`chunkText()`):
- Default: 1000 chars per chunk with 100 char overlap
- Smart boundary detection (spaces, newlines, punctuation)
- Ensures chunks don't break mid-sentence when possible

**File Processing** (`extractTextFromFile()`):
- Supports: .txt, .md, .json files
- UTF-8 encoding with JSON formatting for structured data

**Text Sanitization** (`sanitizeText()`):
- Normalizes line endings (CRLF → LF)
- Removes excessive whitespace
- Trims content

## API Endpoints

**Base Route**: `/knowledge` (apps/rag-service/src/routes/knowledge/)

- `POST /upload` - Create new knowledge entry
- `GET /:id` - Retrieve specific knowledge by ID
- `PUT /:id` - Update existing knowledge 
- `DELETE /:id` - Remove knowledge entry
- `POST /query` - Semantic search across knowledge

**Authentication**: Clerk middleware validates all requests
**Response Format**: Standardized success/error responses via `response` utility

## Environment Configuration

**Required Variables** (`apps/rag-service/src/config/env.ts`):
- `DATABASE_URL`: Neon PostgreSQL connection string
- `UPSTASH_VECTOR_REST_URL`: Vector database endpoint
- `UPSTASH_VECTOR_REST_TOKEN`: Vector database auth token  
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Clerk public key
- `CLERK_SECRET_KEY`: Clerk server-side key
- `OPENAI_API_KEY`: Optional for custom embeddings

## Data Flow

1. **Knowledge Creation**:
   - User uploads text/file via API
   - Content sanitized and chunked by TextProcessor
   - Knowledge record created in PostgreSQL
   - Chunks vectorized and stored in Upstash Vector
   - Chunk references stored in knowledgeChunks table

2. **Knowledge Query**:
   - User query vectorized by Upstash Vector
   - Similarity search performed against user's namespace
   - Results filtered by minimum score (default 0.7)
   - Metadata enriched and returned

3. **Knowledge Update**:
   - Existing vectors deleted from Upstash
   - Content re-chunked and re-vectorized
   - Database records updated atomically
   - New chunk references inserted

## Key Features

- **User Isolation**: Namespaced vectors prevent cross-user data access
- **Chunking Strategy**: Intelligent text splitting preserves semantic boundaries  
- **Metadata Rich**: Vectors include comprehensive context (tags, titles, types)
- **Atomic Operations**: Database and vector operations coordinated for consistency
- **Serverless Optimized**: Connection pooling and caching for performance
- **File Support**: Multiple file formats with appropriate text extraction
- **Similarity Scoring**: Configurable minimum relevance thresholds