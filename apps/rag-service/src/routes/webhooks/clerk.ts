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

// User created webhook
app.post('/user/created', async (c) => {
  try {
    const body = await c.req.text()
    const headers = {
      'svix-id': c.req.header('svix-id'),
      'svix-timestamp': c.req.header('svix-timestamp'),
      'svix-signature': c.req.header('svix-signature'),
    }
    
    const payload = verifyWebhook(body, headers)
    const event = clerkWebhookSchema.parse(payload)
    
    if (event.type !== 'user.created') {
      return response.error(c, 'Invalid event type', 400)
    }

    const userData = event.data
    const primaryEmail = userData.email_addresses.find(email => 
      email.verification?.status === 'verified'
    )?.email_address

    // Create user in our database
    await userService.createOrUpdateUser({
      id: userData.id,
      email: primaryEmail,
      name: userData.first_name && userData.last_name 
        ? `${userData.first_name} ${userData.last_name}` 
        : userData.first_name || userData.last_name || undefined
    })

    logger.info('User created via webhook', { 
      userId: userData.id, 
      email: primaryEmail 
    })

    return response.success(c, null, 'User created successfully')
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid webhook signature') {
      return response.error(c, 'Webhook verification failed', 401)
    }
    logger.error('Error handling user.created webhook', error)
    return response.error(c, 'Internal server error', 500)
  }
})

// User updated webhook
app.post('/user/updated', async (c) => {
  try {
    const body = await c.req.text()
    const headers = {
      'svix-id': c.req.header('svix-id'),
      'svix-timestamp': c.req.header('svix-timestamp'),
      'svix-signature': c.req.header('svix-signature'),
    }
    
    const payload = verifyWebhook(body, headers)
    const event = clerkWebhookSchema.parse(payload)
    
    if (event.type !== 'user.updated') {
      return response.error(c, 'Invalid event type', 400)
    }

    const userData = event.data
    const primaryEmail = userData.email_addresses.find(email => 
      email.verification?.status === 'verified'
    )?.email_address

    // Update user in our database
    await userService.createOrUpdateUser({
      id: userData.id,
      email: primaryEmail,
      name: userData.first_name && userData.last_name 
        ? `${userData.first_name} ${userData.last_name}` 
        : userData.first_name || userData.last_name || undefined
    })

    logger.info('User updated via webhook', { 
      userId: userData.id, 
      email: primaryEmail 
    })

    return response.success(c, null, 'User updated successfully')
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid webhook signature') {
      return response.error(c, 'Webhook verification failed', 401)
    }
    logger.error('Error handling user.updated webhook', error)
    return response.error(c, 'Internal server error', 500)
  }
})

// User deleted webhook
app.post('/user/deleted', async (c) => {
  try {
    const body = await c.req.text()
    const headers = {
      'svix-id': c.req.header('svix-id'),
      'svix-timestamp': c.req.header('svix-timestamp'),
      'svix-signature': c.req.header('svix-signature'),
    }
    
    const payload = verifyWebhook(body, headers)
    const event = clerkUserDeletedWebhookSchema.parse(payload)

    if (event.type !== 'user.deleted') {
      return response.error(c, 'Invalid event type', 400)
    }

    // Delete user and all associated data
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
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid webhook signature') {
      return response.error(c, 'Webhook verification failed', 401)
    }
    logger.error('Error handling user.deleted webhook', error)
    return response.error(c, 'Internal server error', 500)
  }
})

export default app