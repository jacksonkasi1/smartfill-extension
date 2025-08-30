// ** import core packages
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'

// ** import middleware
import { authMiddleware } from '@/middleware'

// ** import services
import { KnowledgeService } from '@/services/knowledge'

// ** import schema
import { idParamSchema } from '@/schema'

// ** import utils
import { response } from '@/utils'

const app = new Hono<{ Variables: { userId: string } }>()
const knowledgeService = new KnowledgeService()

app.use('*', authMiddleware)

app.delete('/:id', zValidator('param', idParamSchema), async (c) => {
  const { id } = c.req.valid('param')
  const userId = c.get('userId')

  try {
    const deleted = await knowledgeService.deleteKnowledge(userId, id)
    
    if (!deleted) {
      return response.error(c, 'Knowledge not found', 404)
    }

    return response.success(c, { id }, 'Knowledge deleted successfully')
  } catch (error) {
    return response.error(c, 'Failed to delete knowledge', 500, error)
  }
})

export default app