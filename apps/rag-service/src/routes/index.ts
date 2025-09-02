// ** import core packages
import { Hono } from 'hono'

// ** import apis
import knowledgeRoutes from './knowledge'
import knowledgeRetrieve from './knowledge/retrieve'
import knowledgeUpdate from './knowledge/update'
import knowledgeRemove from './knowledge/remove'
import knowledgeUpload from './knowledge/upload'
import webhookClerk from './webhooks/clerk'

const app = new Hono()

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'rag-service',
  })
})

// Mount knowledge routes
app.route('/knowledge', knowledgeRoutes)
app.route('/knowledge', knowledgeRetrieve)
app.route('/knowledge', knowledgeUpdate)
app.route('/knowledge', knowledgeRemove)
app.route('/knowledge', knowledgeUpload)

// Mount webhook routes
app.route('/webhook/clerk', webhookClerk)

export default app