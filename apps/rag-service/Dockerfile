# Multi-stage build for monorepo deployment
FROM node:20-bookworm-slim AS base

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml ./

# Copy all package.json files for dependency resolution
COPY apps/rag-service/package.json ./apps/rag-service/
COPY packages/*/package.json ./packages/*/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build stage
FROM base AS build

# Build the application
RUN pnpm --filter @smartfill/rag-service build

# Production stage
FROM node:20-bookworm-slim AS production

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy built application
COPY --from=build /app/apps/rag-service/dist ./dist
COPY --from=build /app/apps/rag-service/package.json ./package.json
COPY --from=build /app/apps/rag-service/.env ./.env
COPY --from=build /app/pnpm-lock.yaml ./pnpm-lock.yaml

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Expose port
EXPOSE 8080

# Set production environment
ENV NODE_ENV=production
ENV PORT=8080

# Start the application with env file
CMD ["node", "--env-file=.env", "dist/server.js"]
