// ** import types
import { randomUUID } from 'crypto'

interface ChunkRow {
  id: string
  content: string
  knowledge_id: string
  chunk_index: string | number
  title: string
  tags: string[] | string
  knowledge_type: 'text' | 'file'
  similarity_score: number
}

// ** import core packages
import { OpenAI } from 'openai'

// ** import database
import { db, knowledgeChunks } from '@/db'
import { eq, sql } from 'drizzle-orm'

// ** import utils
import { env } from '@/config/env'

export class VectorService {
  private openai: OpenAI | null

  constructor() {
    this.openai = env.OPENAI_API_KEY ? new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    }) : null
  }

  async upsertKnowledgeChunks(
    userId: string,
    knowledgeId: string,
    title: string,
    chunks: string[],
    tags: string[] = [],
    type: 'text' | 'file' = 'text'
  ) {
    const chunkData = []
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const embedding = await this.generateEmbedding(chunk)
      
      chunkData.push({
        id: randomUUID(),
        knowledgeId,
        content: chunk,
        chunkIndex: i.toString(),
        embedding, // Direct array, TiDB will handle the conversion
        createdAt: new Date(),
      })
    }

    await db.insert(knowledgeChunks).values(chunkData)
    return chunkData.map(chunk => ({
      id: chunk.id,
      content: chunk.content,
      metadata: {
        knowledgeId,
        title,
        tags,
        type,
        chunkIndex: parseInt(chunk.chunkIndex),
        totalChunks: chunks.length,
      },
    }))
  }

  async queryKnowledge(
    userId: string,
    query: string,
    options: {
      topK?: number
      includeMetadata?: boolean
      minScore?: number
    } = {}
  ) {
    const { topK = 5, minScore = 0.3 } = options
    const queryEmbedding = await this.generateEmbedding(query)
    const queryVector = JSON.stringify(queryEmbedding)
    
    // Use TiDB's native vector search with cosine distance
    const chunks = await db.execute(
      sql`SELECT 
            kc.id, 
            kc.content, 
            kc.knowledge_id, 
            kc.chunk_index,
            k.title, 
            k.tags, 
            k.knowledge_type,
            (1 - VEC_COSINE_DISTANCE(kc.embedding, ${queryVector})) AS similarity_score
          FROM knowledge_chunks kc
          INNER JOIN knowledge k ON k.id = kc.knowledge_id
          WHERE k.user_id = ${userId}
            AND (1 - VEC_COSINE_DISTANCE(kc.embedding, ${queryVector})) >= ${minScore}
          ORDER BY VEC_COSINE_DISTANCE(kc.embedding, ${queryVector}) ASC
          LIMIT ${topK}`
    )

    // Format results
    const results = chunks.rows.map((chunk: any) => ({
      id: chunk.id,
      score: chunk.similarity_score,
      content: chunk.content,
      metadata: {
        knowledgeId: chunk.knowledge_id,
        chunkIndex: parseInt(String(chunk.chunk_index)),
        title: chunk.title,
        tags: Array.isArray(chunk.tags) ? chunk.tags : JSON.parse(chunk.tags || '[]'),
        type: chunk.knowledge_type,
      },
    }))

    return results
  }

  // Cosine similarity is now handled natively by TiDB's VEC_COSINE_DISTANCE function
  // This provides better performance and accuracy at scale

  async deleteKnowledge(userId: string, knowledgeId: string) {
    await db.delete(knowledgeChunks).where(eq(knowledgeChunks.knowledgeId, knowledgeId))
  }

  async deleteUserData(userId: string) {
    await db.delete(knowledgeChunks).where(
      sql`${knowledgeChunks.knowledgeId} IN (
        SELECT id FROM knowledge WHERE user_id = ${userId}
      )`
    )
  }

  async updateKnowledgeChunks(
    userId: string,
    knowledgeId: string,
    title: string,
    chunks: string[],
    tags: string[] = [],
    type: 'text' | 'file' = 'text'
  ) {
    await this.deleteKnowledge(userId, knowledgeId)
    return this.upsertKnowledgeChunks(userId, knowledgeId, title, chunks, tags, type)
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    if (this.openai) {
      try {
        const response = await this.openai.embeddings.create({
          model: 'text-embedding-3-small', // Fast and cost-effective model
          input: text,
        })
        
        const embedding = response.data[0].embedding
        return embedding
      } catch (error) {
        console.error('❌ OpenAI embedding failed, falling back to mock:', error.message)
        return this.generateMockEmbedding(text)
      }
    }
    
    return this.generateMockEmbedding(text)
  }

  private generateMockEmbedding(text: string): number[] {
    // Fallback mock embedding for development
    const embedDim = 1536 // Match OpenAI embedding dimension
    const mockEmbedding = new Array(embedDim).fill(0)
    
    const words = text.toLowerCase().split(/\s+/)
    const keywordWeights: Record<string, number[]> = {
      'react': [1, 0, 0, 0.8, 0.6],
      'component': [1, 0, 0, 0.9, 0.7],
      'javascript': [0, 1, 0, 0.8, 0.9],
      'function': [0, 1, 0, 0.7, 0.8],
      'database': [0, 0, 1, 0.6, 0.5],
      'design': [0, 0, 1, 0.5, 0.4],
      'sql': [0, 0, 1, 0.7, 0.6],
      'api': [0.5, 0.3, 0.2, 0.6, 0.4],
      'authentication': [0.4, 0.2, 0.4, 0.7, 0.5],
    }
    
    words.forEach(word => {
      if (keywordWeights[word]) {
        keywordWeights[word].forEach((weight, idx) => {
          if (idx < embedDim) mockEmbedding[idx] += weight
        })
      }
    })
    
    for (let i = 0; i < text.length && i < 100; i++) {
      const charCode = text.charCodeAt(i)
      mockEmbedding[i % embedDim] += charCode / 1000
    }
    
    return mockEmbedding
  }
}