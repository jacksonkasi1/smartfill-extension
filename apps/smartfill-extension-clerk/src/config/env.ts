export const ENV = {
  CLERK_PUBLISHABLE_KEY: process.env.PLASMO_PUBLIC_CLERK_PUBLISHABLE_KEY!,
  CLERK_SYNC_HOST: process.env.PLASMO_PUBLIC_CLERK_SYNC_HOST!,
  CLERK_FRONTEND_API: process.env.CLERK_FRONTEND_API!,
  RAG_SERVICE_URL: process.env.PLASMO_PUBLIC_RAG_SERVICE_URL || 'http://localhost:3001/api/v1'
} as const

// Validate required environment variables
if (!ENV.CLERK_PUBLISHABLE_KEY) {
  throw new Error("PLASMO_PUBLIC_CLERK_PUBLISHABLE_KEY is required")
}

if (!ENV.CLERK_SYNC_HOST) {
  throw new Error("PLASMO_PUBLIC_CLERK_SYNC_HOST is required")
}