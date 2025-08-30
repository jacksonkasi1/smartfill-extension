// ** import validation
import { z } from 'zod'

const envSchema = z.object({
  PORT: z.string().default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // TiDB Database
  DATABASE_URL: z.string().url(),
  
  // OpenAI for embeddings (optional, using mock embeddings by default)
  OPENAI_API_KEY: z.string().optional(),
  
  // Clerk Authentication
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string(),
  CLERK_SECRET_KEY: z.string(),
  CLERK_WEBHOOK_SIGNING_SECRET: z.string().optional(),
  
  // CORS
  ALLOWED_ORIGINS: z.string().default('*'),
})

export const env = envSchema.parse(process.env)