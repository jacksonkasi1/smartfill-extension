// ** import types
import { Context, Next } from 'hono'

// ** import core packages
import { HTTPException } from 'hono/http-exception'

// ** import config
import { logger } from '@/config'

// ** import validation
import { ZodError } from 'zod'

// ** import utils
import { response } from '@/utils'

export const errorHandler = async (c: Context, next: Next): Promise<Response | void> => {
  try {
    await next()
  } catch (error) {
    logger.error('Unhandled error:', error)

    if (error instanceof HTTPException) {
      return response.error(c, error.message, error.status)
    }

    if (error instanceof ZodError) {
      return response.error(c, 'Validation failed', 400, {
        issues: error.issues
      })
    }

    if (error instanceof Error) {
      return response.error(c, error.message, 500)
    }

    return response.error(c, 'Internal server error', 500)
  }
}