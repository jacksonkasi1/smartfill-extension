// ** import types
import { randomUUID } from 'crypto'

interface ChunkRow {
  id: string
  content: string
  knowledge_id: string
  chunk_index: string | number
  embedding: number[] | string
  title: string
  tags: string[] | string
  knowledge_type: 'text' | 'file'
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
    _tags: string[] = [],
    _type: 'text' | 'file' = 'text'
  ) {
    // Combine title with each chunk for better semantic search
    const vectors = await Promise.all(chunks.map(async (chunk, index) => {
      const combinedText = `${title}: ${chunk}`
      return {
        id: randomUUID(),
        knowledgeId,
        content: chunk, // Store original chunk content
        chunkIndex: index.toString(),
        embedding: await this.generateEmbedding(combinedText), // Vectorize combined text
      }
    }))

    await db.insert(knowledgeChunks).values(vectors)
    
    return vectors.map((v, index) => ({
      vectorId: v.id,
      content: v.content,
      chunkIndex: index,
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
    
    // Get all chunks for the user (fallback approach without vector search)
    const chunks = await db.execute(
      sql`SELECT kc.id, kc.content, kc.knowledge_id, kc.chunk_index, kc.embedding,
                 k.title, k.tags, k.knowledge_type
          FROM knowledge_chunks kc
          INNER JOIN knowledge k ON k.id = kc.knowledge_id
          WHERE k.user_id = ${userId}`
    )

    // Calculate cosine similarity in-memory
    const results = chunks.rows
      .map((chunk: ChunkRow) => {
        const chunkEmbedding = Array.isArray(chunk.embedding) ? chunk.embedding : JSON.parse(chunk.embedding as string)
        const similarity = this.cosineSimilarity(queryEmbedding, chunkEmbedding)
        return {
          id: chunk.id,
          score: similarity,
          content: chunk.content,
          metadata: {
            knowledgeId: chunk.knowledge_id,
            chunkIndex: parseInt(String(chunk.chunk_index)),
            title: chunk.title,
            tags: Array.isArray(chunk.tags) ? chunk.tags : JSON.parse(chunk.tags || '[]'),
            type: chunk.knowledge_type,
          },
        }
      })
      .filter(result => result.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)

    return results
  }

  private cosineSimilarity(vectorA: number[], vectorB: number[]): number {
    const dotProduct = vectorA.reduce((sum, a, i) => sum + a * vectorB[i], 0)
    const magnitudeA = Math.sqrt(vectorA.reduce((sum, a) => sum + a * a, 0))
    const magnitudeB = Math.sqrt(vectorB.reduce((sum, b) => sum + b * b, 0))
    return magnitudeA && magnitudeB ? dotProduct / (magnitudeA * magnitudeB) : 0
  }

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