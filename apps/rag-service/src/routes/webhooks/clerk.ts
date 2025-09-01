// ** import core packages
import { Hono } from 'hono'

// ** import services
import { UserService } from '@/services/user'

// ** import schema
import { clerkWebhookSchema, clerkUserDeletedWebhookSchema } from '@/schema/webhooks'

// ** import utils
import { logger } from '@/config/logger'
import { response } from '@/utils/response'
import { verifyWebhook } from '@/utils/webhook'

const app = new Hono()
const userService = new UserService()

// Unified Clerk webhook endpoint
app.post('/', async (c) => {
  try {
    const body = await c.req.text()
    const headers = {
      'svix-id': c.req.header('svix-id'),
      'svix-timestamp': c.req.header('svix-timestamp'),
      'svix-signature': c.req.header('svix-signature'),
    }
    
    const payload = verifyWebhook(body, headers)
    
    // Handle different event types
    switch (payload.type) {
      case 'user.created':
      case 'user.updated': {
        const event = clerkWebhookSchema.parse(payload)
        const userData = event.data
        const primaryEmail = userData.email_addresses.find(email => 
          email.verification?.status === 'verified'
        )?.email_address

        await userService.createOrUpdateUser({
          id: userData.id,
          email: primaryEmail,
          name: userData.first_name && userData.last_name 
            ? `${userData.first_name} ${userData.last_name}` 
            : userData.first_name || userData.last_name || undefined
        })

        logger.info(`User ${payload.type === 'user.created' ? 'created' : 'updated'} via webhook`, { 
          userId: userData.id, 
          email: primaryEmail 
        })

        return response.success(c, null, `User ${payload.type === 'user.created' ? 'created' : 'updated'} successfully`)
      }

      case 'user.deleted': {
        const event = clerkUserDeletedWebhookSchema.parse(payload)
        const deleted = await userService.deleteUser(event.data.id)
        
        if (!deleted) {
          logger.warn('Attempted to delete non-existent user', { 
            userId: event.data.id 
          })
          return response.success(c, null, 'User not found (already deleted)')
        }

        logger.info('User deleted via webhook', { 
          userId: event.data.id 
        })

        return response.success(c, null, 'User deleted successfully')
      }

      default:
        logger.warn('Unhandled webhook event type', { type: payload.type })
        return response.success(c, null, 'Event type not handled')
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid webhook signature') {
      return response.error(c, 'Webhook verification failed', 401)
    }
    logger.error('Error handling Clerk webhook', { error })
    return response.error(c, 'Internal server error', 500)
  }
})

export default app