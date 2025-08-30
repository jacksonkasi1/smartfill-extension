// ** import core packages
import { Webhook } from 'svix'

// ** import config
import { env } from '@/config/env'

// ** import utils
import { logger } from '@/config/logger'

export const verifyWebhook = (body: string, headers: Record<string, string | undefined>) => {
  if (!env.CLERK_WEBHOOK_SIGNING_SECRET) {
    logger.warn('CLERK_WEBHOOK_SIGNING_SECRET not configured, skipping verification')
    return JSON.parse(body) // For development without secret
  }

  try {
    const wh = new Webhook(env.CLERK_WEBHOOK_SIGNING_SECRET)
    const payload = wh.verify(body, headers)
    logger.info('Webhook signature verified successfully')
    return payload
  } catch (err) {
    logger.error('Webhook signature verification failed', err)
    throw new Error('Invalid webhook signature')
  }
}