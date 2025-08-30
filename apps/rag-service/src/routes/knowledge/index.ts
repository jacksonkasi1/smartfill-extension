// ** import core packages
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'

// ** import middleware
import { authMiddleware } from '@/middleware'

// ** import services
import { KnowledgeService } from '@/services/knowledge'

// ** import schema
import { createKnowledgeSchema, queryKnowledgeSchema, paginationSchema } from '@/schema'

// ** import utils
import { response } from '@/utils'

const app = new Hono<{ Variables: { userId: string } }>()
const knowledgeService = new KnowledgeService()

app.use('*', authMiddleware)

app.get('/', zValidator('query', paginationSchema), async (c) => {
  const { page, limit } = c.req.valid('query')
  const userId = c.get('userId')

  try {
    const result = await knowledgeService.getUserKnowledge(userId, { page, limit })
    return response.paginated(c, result.data, page, limit, result.total)
  } catch (error) {
    return response.error(c, 'Failed to fetch knowledge', 500, error)
  }
})

app.post('/', async (c) => {
  const body = await c.req.json()
  console.log('Raw request body:', JSON.stringify(body, null, 2))
  
  // Manual validation to see what's failing
  const validation = createKnowledgeSchema.safeParse(body)
  if (!validation.success) {
    console.error('Validation failed:', validation.error.issues)
    return response.error(c, 'Validation failed', 400, validation.error.issues)
  }
  
  const data = validation.data
  const userId = c.get('userId')

  try {
    const knowledge = await knowledgeService.createKnowledge({
      userId,
      title: data.title,
      content: data.content,
      type: data.type,
      tags: data.tags,
    })
    console.log('Created knowledge:', JSON.stringify(knowledge, null, 2))
    return response.success(c, knowledge, 'Knowledge created successfully', 201)
  } catch (error) {
    console.error('Knowledge creation error:', error)
    return response.error(c, 'Failed to create knowledge', 500, error)
  }
})

// Add error handler for validation failures
app.onError((err, c) => {
  console.error('Route validation error:', err)
  return response.error(c, 'Validation error', 400, err)
})

app.post('/query', async (c) => {
  const body = await c.req.json()
  console.log('Raw query request body:', JSON.stringify(body, null, 2))
  
  // Manual validation to see what's failing
  const validation = queryKnowledgeSchema.safeParse(body)
  if (!validation.success) {
    console.error('Query validation failed:', validation.error.issues)
    return response.error(c, 'Query validation failed', 400, validation.error.issues)
  }
  
  const { query, limit, minScore } = validation.data
  const userId = c.get('userId')

  try {
    const results = await knowledgeService.queryKnowledge(userId, query, {
      limit,
      minScore,
    })
    return response.success(c, results, `Found ${results.length} relevant results`)
  } catch (error) {
    console.error('Query knowledge error:', error)
    return response.error(c, 'Failed to query knowledge', 500, error)
  }
})

export default app