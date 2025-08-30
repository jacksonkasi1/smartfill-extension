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
   - Gemini API key (for extension)

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
- **GEMINI_API_KEY** - Google Gemini API for extension
- **NODE_ENV** - Development/production environment

## Apps Details

### Browser Extension (`apps/smartfill-extension-clerk`)
- Built with **Plasmo** framework
- **Clerk** authentication integration
- Chrome extension with form-filling capabilities
- TypeScript + React

### Website (`apps/website`) 
- **Next.js 15** application
- **Clerk** authentication
- **Radix UI** components with **Tailwind CSS**
- **TypeScript** support

### RAG Service (`apps/rag-service`)
- **Hono** web framework
- **Drizzle ORM** with **TiDB** database
- **TiDB Vector** for RAG embeddings storage
- **OpenAI** embeddings and completions
- User-specific knowledge management
- **TypeScript** with ESM support

## Features

- **AI-Powered Form Filling** - Intelligent form completion using RAG
- **User Authentication** - Secure login with Clerk across all apps
- **Knowledge Management** - Personal RAG service for each user
- **Cross-platform** - Browser extension + web dashboard
- **Type-safe** - Full TypeScript support across all apps


---

# TODO: 
        - https://www.featurebase.app/pricing (integrate support ticket in the websites)