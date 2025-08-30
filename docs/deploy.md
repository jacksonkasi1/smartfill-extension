Option 1: Update Leapcell Settings (Recommended)

  1. Change Root Directory: Set to . (monorepo root) instead of ./apps/rag-service
  2. Update Build Command: npm install -g pnpm && pnpm install --frozen-lockfile && pnpm --filter @smartfill/rag-service build
  3. Update Start Command: node apps/rag-service/dist/server.js
  4. Set Port: 8080

  Option 2: Use Dockerfile

  Created apps/rag-service/Dockerfile with multi-stage build for monorepo deployment.

  Option 3: Standalone Deployment

  Run ./apps/rag-service/deploy.sh to prepare a standalone version without workspace dependencies.