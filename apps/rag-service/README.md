# RAG Service

A user-specific Retrieval-Augmented Generation (RAG) service built with Hono.js and Upstash Vector.

## Features

- 🔐 **User-specific knowledge management** - Each user has their own isolated knowledge base
- 📄 **Text and file upload support** - Add knowledge via text input or file upload
- 🔍 **Semantic search** - Query knowledge using natural language
- 🚀 **Fast vector operations** - Powered by Upstash Vector with built-in embeddings
- 📚 **Chunked text processing** - Automatic text chunking for optimal retrieval
- 🛡️ **JWT authentication** - Secure API endpoints
- 📊 **Database tracking** - PostgreSQL for metadata and chunk management

## API Endpoints

### Knowledge Management

- `GET /api/v1/knowledge` - List user's knowledge entries (paginated)
- `POST /api/v1/knowledge` - Create new knowledge entry from text
- `GET /api/v1/knowledge/:id` - Retrieve specific knowledge entry
- `PUT /api/v1/knowledge/:id` - Update knowledge entry
- `DELETE /api/v1/knowledge/:id` - Delete knowledge entry
- `POST /api/v1/knowledge/upload` - Upload text files (.txt, .md, .json)
- `POST /api/v1/knowledge/query` - Query knowledge base with semantic search

### Health Check

- `GET /api/v1/health` - Service health status
- `GET /` - API information

## Quick Start

1. **Install dependencies from the monorepo root**
   ```bash
   cd /path/to/smartfill-monorepo
   pnpm install
   ```

2. **Navigate to RAG service**
   ```bash
   cd apps/rag-service
   ```

3. **Environment is already configured with:**
   - ✅ **Neon PostgreSQL Database** - Production ready serverless database
   - ✅ **Upstash Vector** - Vector database for embeddings 
   - ✅ **Clerk Authentication** - Shared with website

4. **Generate and apply database schema**
   ```bash
   pnpm run db:generate
   pnpm run db:migrate
   # Choose "Yes, I want to execute all statements" when prompted
   ```

5. **Start development server**
   ```bash
   pnpm run dev
   ```

The service will be running at `http://localhost:3001`

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `UPSTASH_VECTOR_REST_URL` | Upstash Vector endpoint | Yes |
| `UPSTASH_VECTOR_REST_TOKEN` | Upstash Vector token | Yes |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key | Yes |
| `CLERK_SECRET_KEY` | Clerk secret key | Yes |
| `PORT` | Server port (default: 3001) | No |
| `CLERK_WEBHOOK_SECRET` | Clerk webhook secret (for webhooks) | No |
| `OPENAI_API_KEY` | OpenAI API key for custom embeddings | No |

## Usage Examples

### Create Knowledge from Text

```bash
curl -X POST http://localhost:3001/api/v1/knowledge \
  -H "Authorization: Bearer YOUR_CLERK_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Company Policies",
    "content": "Our company values innovation and collaboration...",
    "tags": ["policies", "hr"]
  }'
```

### Upload File

```bash
curl -X POST http://localhost:3001/api/v1/knowledge/upload \
  -H "Authorization: Bearer YOUR_CLERK_SESSION_TOKEN" \
  -F "file=@document.txt" \
  -F "title=Important Document" \
  -F "tags=[\"docs\", \"reference\"]"
```

### Query Knowledge Base

```bash
curl -X POST http://localhost:3001/api/v1/knowledge/query \
  -H "Authorization: Bearer YOUR_CLERK_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What are the company vacation policies?",
    "limit": 5,
    "minScore": 0.7
  }'
```

## Architecture

- **Hono.js** - Fast, lightweight web framework
- **Upstash Vector** - Serverless vector database with built-in embeddings
- **PostgreSQL + Drizzle ORM** - Metadata and chunk tracking
- **Zod** - Runtime type validation
- **Clerk** - User authentication and session management

## User Isolation

Each user's knowledge is completely isolated using:
- **Database isolation** - User ID filtering in all queries
- **Vector namespaces** - Each user gets their own Upstash Vector namespace
- **Clerk authentication** - Secure user identification and session management

## File Support

Currently supports:
- `.txt` - Plain text files
- `.md` - Markdown files  
- `.json` - JSON files (prettified)

Maximum file size: 5MB

## Text Processing

- **Automatic chunking** - Splits large texts into optimal chunks (~1000 chars)
- **Smart boundaries** - Respects sentence and paragraph boundaries
- **Overlap handling** - Maintains context between chunks
- **Content sanitization** - Normalizes whitespace and formatting