// ** import core packages
import { Hono } from 'hono'

// ** import middleware
import { authMiddleware } from '@/middleware'

// ** import services
import { KnowledgeService } from '@/services/knowledge'

// ** import schema
import { uploadFileSchema } from '@/schema'

// ** import utils
import { response, TextProcessor } from '@/utils'

const app = new Hono<{ Variables: { userId: string } }>()
const knowledgeService = new KnowledgeService()

app.use('*', authMiddleware)

app.post('/upload', async (c) => {
  const userId = c.get('userId')
  
  try {
    const body = await c.req.parseBody()
    const file = body['file'] as File
    const title = body['title'] as string
    const tags = body['tags'] ? JSON.parse(body['tags'] as string) : []

    if (!file) {
      return response.error(c, 'No file provided', 400)
    }

    if (!title) {
      return response.error(c, 'Title is required', 400)
    }

    const validatedData = uploadFileSchema.parse({ title, tags })

    const supportedTypes = ['text/plain', 'application/json', 'text/markdown']
    const maxSize = 5 * 1024 * 1024 // 5MB

    if (!supportedTypes.includes(file.type)) {
      return response.error(c, 'Unsupported file type. Supported types: txt, json, md', 400)
    }

    if (file.size > maxSize) {
      return response.error(c, 'File too large. Maximum size is 5MB', 400)
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const content = TextProcessor.extractTextFromFile(buffer, file.name)

    if (!content.trim()) {
      return response.error(c, 'File appears to be empty or could not be processed', 400)
    }

    const knowledge = await knowledgeService.createKnowledge({
      userId,
      title: validatedData.title,
      content,
      type: 'file',
      tags: validatedData.tags,
    })

    return response.success(c, knowledge, 'File uploaded and processed successfully', 201)
  } catch (error) {
    return response.error(c, 'Failed to upload file', 500, error)
  }
})

export default app