// ** import core packages
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'

// ** import middleware
import { authMiddleware } from '@/middleware'

// ** import services
import { KnowledgeService } from '@/services/knowledge'

// ** import schema
import { updateKnowledgeSchema, idParamSchema } from '@/schema'

// ** import utils
import { response } from '@/utils'

const app = new Hono<{ Variables: { userId: string } }>()
const knowledgeService = new KnowledgeService()

app.use('*', authMiddleware)

app.put('/:id', 
  zValidator('param', idParamSchema),
  zValidator('json', updateKnowledgeSchema),
  async (c) => {
    const { id } = c.req.valid('param')
    const updates = c.req.valid('json')
    const userId = c.get('userId')

    try {
      const knowledge = await knowledgeService.updateKnowledge(userId, id, updates)
      
      if (!knowledge) {
        return response.error(c, 'Knowledge not found', 404)
      }

      return response.success(c, knowledge, 'Knowledge updated successfully')
    } catch (error) {
      return response.error(c, 'Failed to update knowledge', 500, error)
    }
  }
)

export default app