// ** import core packages
import { serve } from '@hono/node-server'

// ** import config
import { env, logger } from './config'

// ** import apis
import app from './index'

const port = parseInt(env.PORT)


serve({
  fetch: app.fetch,
  port,
})

logger.info(`🚀 RAG Service running on http://localhost:${port}`)
logger.info(`📚 API Documentation available at http://localhost:${port}/api/v1/health`)