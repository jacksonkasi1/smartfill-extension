// ** import core packages
import { Hono } from 'hono'
import { cors } from 'hono/cors'

// ** import config
import { env } from './config'

// ** import middleware
import { errorHandler, requestLogger } from './middleware'

// ** import apis
import routes from './routes'

const app = new Hono()

// Middleware
app.use('*', cors({
  origin: (origin) => {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return true
    
    // If ALLOWED_ORIGINS is *, allow all origins but return the actual origin for credentials
    if (env.ALLOWED_ORIGINS === '*') {
      return origin
    }
    
    // Otherwise check against allowed origins list
    const allowedOrigins = env.ALLOWED_ORIGINS.split(',')
    return allowedOrigins.includes(origin)
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}))

app.use('*', requestLogger)
app.use('*', errorHandler)

// Routes
app.route('/api/v1', routes)

// Root endpoint
app.get('/', (c) => {
  return c.json({
    name: 'RAG Service API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
  })
})

export default app

// For Vercel deployment
export const GET = app.fetch
export const POST = app.fetch
export const PUT = app.fetch
export const DELETE = app.fetch
export const PATCH = app.fetch
export const OPTIONS = app.fetch