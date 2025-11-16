# SmartFill Monorepo

A browser extension with memory RAG capabilities for intelligent form filling using AI.

## Architecture

This monorepo contains:

- **apps/smartfill-extension-clerk** - Chrome extension built with Plasmo and Clerk auth
- **apps/website** - Next.js dashboard with Radix UI components  
- **apps/rag-service** - Hono-based RAG service with TiDB Vector database for knowledge management

## Setup

1. Copy environment variables:
```bash
cp .env.example .env.local
```

2. Fill in your API keys in `.env.local`:
   - Clerk authentication keys
   - OpenAI API key
   - AI provider keys for the extension (Gemini, Groq, OpenAI/OpenRouter)

3. Install dependencies:
```bash
bun install
```

4. Build all apps:
```bash
bun run build
```

## Development

- Run all apps: `bun run dev`
- Build all: `bun run build`
- Lint all: `bun run lint`
- Type check: `bun run typecheck`
- Test: `bun run test`
- Clean: `bun run clean`

## Environment Variables

- **NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY** & **CLERK_SECRET_KEY** - Clerk authentication
- **OPENAI_API_KEY** - OpenAI API for RAG service
- **GEMINI_API_KEY** - (Optional) legacy Gemini API for the extension. Current builds let you configure Gemini, Groq, OpenRouter, and OpenAI keys directly inside the extension settings.
- **NODE_ENV** - Development/production environment

## Apps Details

### Browser Extension (`apps/smartfill-extension-clerk`)
- Built with **Plasmo** framework
- **Clerk** authentication integration
- **Multi-provider AI (Gemini, Groq, OpenAI, OpenRouter)** for form data generation
- Chrome extension with form-filling capabilities
- **TypeScript** + **React**

### Website (`apps/website`) 
- **Next.js 15** application
- **Clerk** authentication
- **Radix UI** components with **Tailwind CSS**
- **TanStack Query** for server state management
- **TanStack Table** for data tables
- **React Hook Form** with **Zod** validation
- **Motion** for animations
- **TypeScript** support

### RAG Service (`apps/rag-service`)
- **Hono** web framework
- **Drizzle ORM** with **TiDB** database
- **TiDB Vector** for RAG embeddings storage
- **OpenAI** embeddings and completions
- **Zod** schema validation
- **Svix** webhooks
- **MySQL2** database driver
- User-specific knowledge management
- **TypeScript** with ESM support

## Tech Stack Summary

### Frontend Technologies
- **React 18** - UI library
- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Radix UI** - Component library
- **Motion** - Animation library

### Backend Technologies  
- **Hono** - Web framework
- **Drizzle ORM** - Database ORM
- **TiDB** - Database with vector support
- **MySQL2** - Database driver
- **Zod** - Schema validation

### AI & Authentication
- **OpenAI** - Embeddings and completions
- **Multi-provider AI** (Gemini, Groq, OpenRouter, OpenAI) - Form data generation
- **Clerk** - Authentication service

### Development Tools
- **Plasmo** - Browser extension framework
- **Bun** - Package manager and runtime
- **Turbo** - Monorepo build system
- **ESLint** - Code linting
- **Svix** - Webhook management

## Features

- **AI-Powered Form Filling** - Intelligent form completion using Gemini, Groq, OpenAI, or OpenRouter models combined with RAG
- **User Authentication** - Secure login with Clerk across all apps
- **Knowledge Management** - Personal RAG service for each user with vector embeddings
- **Cross-platform** - Browser extension + web dashboard
- **Type-safe** - Full TypeScript support across all apps

## How we built it - Multi-Step Agent Architecture

Our SmartFill agent chains together these automated steps:

1. **Data Ingestion & Indexing (TiDB Vector)**
   - Captures form data and user sessions
   - Generates embeddings via OpenAI API
   - Stores vectors in TiDB Serverless for semantic search

2. **Intelligent Search & Retrieval**
   - Vector similarity search in TiDB for relevant form data
   - Full-text search for exact matches
   - RAG pipeline combines both for context

3. **LLM Chain Processing**
   - OpenAI for embedding generation
   - Gemini, Groq, OpenRouter, or OpenAI models for form field interpretation
   - Multi-model approach for accuracy

4. **External Tool Integration**
   - Clerk API for authentication
   - Browser automation APIs
   - Session replay engine

5. **Automated Workflow Execution**
   - End-to-end: Form detection → Context retrieval → AI processing → Auto-fill → Validation
   - All steps execute automatically without user intervention

## Why TiDB?

SmartFill leverages TiDB Serverless for:
- Vector embeddings storage with lightning-fast retrieval
- Hybrid search combining semantic and keyword matching
- Scalable, serverless architecture
- Multi-tenant data isolation

## Testing Vector Operations

To test TiDB Vector functionality:

```bash
# Test TiDB vector operations
bun run test:tidb-vectors

# Test full integration with vector search
bun run test:integration

# Run all tests including vector performance
bun run test:all-integration
```

Requires:
- `DATABASE_URL` in `.env` file pointing to TiDB instance
- OpenAI API key for embeddings
- Running RAG service for integration tests
- OpenAI API key for embedding generation
- Running RAG service for integration tests

## Impact

SmartFill makes web automation accessible to everyone, particularly helping users with disabilities, elderly individuals, and small businesses automate tedious form-filling tasks & Q&A.

---

### Raw SQL Vector Query Example

```sql
-- Create table with vector column
CREATE TABLE documents (
  id INT PRIMARY KEY,
  content TEXT,
  embedding VECTOR(1536) -- OpenAI embedding dimension
);

-- Insert document with vector embedding
INSERT INTO documents (id, content, embedding) 
VALUES (1, 'Sample text', '[0.1, 0.2, 0.3, ...]');

-- Vector similarity search using cosine distance
SELECT id, content, 
       VEC_COSINE_DISTANCE(embedding, '[0.1, 0.2, 0.3, ...]') as distance
FROM documents 
ORDER BY distance ASC 
LIMIT 5;
```

---

# TODO: 
        - https://www.featurebase.app/pricing (integrate support ticket in the websites)