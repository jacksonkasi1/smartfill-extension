# SmartFill Monorepo

A browser extension with memory RAG capabilities for intelligent form filling.

## Architecture

This monorepo contains:

- **apps/extension** - Browser extension built with WXT
- **apps/website** - Next.js dashboard
- **packages/shared-types** - Shared TypeScript types
- **packages/auth-client** - Clerk authentication utilities
- **packages/config** - Shared configuration

## Setup

1. Copy environment variables:
```bash
cp .env.example .env.local
```

2. Fill in your API keys in `.env.local`

3. Install dependencies:
```bash
npm install
```

4. Build all packages:
```bash
npm run build
```

## Development

- Run all apps: `npm run dev`
- Build all: `npm run build`
- Lint all: `npm run lint`
- Type check: `npm run typecheck`

## Environment Variables

- **CLERK_PUBLISHABLE_KEY** & **CLERK_SECRET_KEY** - Clerk authentication
- **OPENAI_API_KEY** - OpenAI API

## Features

- **User Authentication** - Secure login with Clerk
- **Cross-platform** - Browser extension + web dashboard
- **Type-safe** - Full TypeScript support across packages


---

# TODO: 
        - https://www.featurebase.app/pricing (integrate support ticket in the websites)