// ** import types
import { Context, Next } from 'hono'

// ** import config
import { logger as log } from '@/config'

export const requestLogger = async (c: Context, next: Next) => {
  const start = Date.now()
  const method = c.req.method
  const url = c.req.url

  await next()

  const duration = Date.now() - start
  const status = (c.res as any)?.status || 200

  log.info(`${method} ${url} - ${status} (${duration}ms)`)
}