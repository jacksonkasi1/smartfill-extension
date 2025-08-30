// ** import types
import { Knowledge, QueryResult } from '@/types'

// ** import core packages
import { randomUUID } from 'crypto'

// ** import database
import { eq, and, desc, count } from 'drizzle-orm'
import { db, knowledge } from '@/db'

// ** import services
import { VectorService } from './vector'
import { UserService } from './user'

// ** import utils
import { TextProcessor } from '@/utils'

export class KnowledgeService {
  private vectorService: VectorService
  private userService: UserService

  constructor() {
    this.vectorService = new VectorService()
    this.userService = new UserService()
  }

  async createKnowledge(data: {
    userId: string
    title: string
    content: string
    type?: 'text' | 'file'
    tags?: string[]
  }): Promise<Knowledge> {
    // Ensure user exists before creating knowledge
    await this.userService.createOrUpdateUser({ id: data.userId })
    
    const sanitizedContent = TextProcessor.sanitizeText(data.content)
    const chunks = TextProcessor.chunkText(sanitizedContent)
    
    const id = randomUUID()

    const insertData = {
      id,
      userId: data.userId,
      title: data.title,
      content: sanitizedContent,
      type: data.type || 'text' as const,
      tags: data.tags || [],
    }
    
    await db.insert(knowledge).values(insertData)

    await this.vectorService.upsertKnowledgeChunks(
      data.userId,
      id,
      data.title,
      chunks,
      data.tags,
      data.type
    )

    const [created] = await db.select().from(knowledge).where(eq(knowledge.id, id)).limit(1)

    if (!created) {
      throw new Error('Failed to retrieve created knowledge entry')
    }

    return {
      ...created,
      tags: Array.isArray(created.tags) ? created.tags : [],
    } as Knowledge
  }

  async getKnowledgeById(userId: string, id: string): Promise<Knowledge | null> {
    const [result] = await db
      .select()
      .from(knowledge)
      .where(and(eq(knowledge.id, id), eq(knowledge.userId, userId)))

    return result ? {
      ...result,
      tags: Array.isArray(result.tags) ? result.tags : [],
    } as Knowledge : null
  }

  async getUserKnowledge(
    userId: string,
    options: { page?: number; limit?: number } = {}
  ): Promise<{ data: Knowledge[]; total: number }> {
    const { page = 1, limit = 10 } = options
    const offset = (page - 1) * limit

    const [data, totalResult] = await Promise.all([
      db
        .select()
        .from(knowledge)
        .where(eq(knowledge.userId, userId))
        .orderBy(desc(knowledge.updatedAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(knowledge)
        .where(eq(knowledge.userId, userId))
    ])

    return {
      data: data.map(item => ({
        ...item,
        tags: Array.isArray(item.tags) ? item.tags : [],
      })) as Knowledge[],
      total: totalResult[0]?.count || 0,
    }
  }

  async updateKnowledge(
    userId: string,
    id: string,
    updates: {
      title?: string | undefined
      content?: string | undefined
      tags?: string[] | undefined
    }
  ): Promise<Knowledge | null> {
    const existing = await this.getKnowledgeById(userId, id)
    if (!existing) return null

    if (updates.content) {
      const sanitizedContent = TextProcessor.sanitizeText(updates.content)
      const chunks = TextProcessor.chunkText(sanitizedContent)

      await this.vectorService.updateKnowledgeChunks(
        userId,
        id,
        updates.title || existing.title,
        chunks,
        updates.tags || existing.tags,
        existing.type
      )
    }

    await db
      .update(knowledge)
      .set({
        ...updates,
      })
      .where(and(eq(knowledge.id, id), eq(knowledge.userId, userId)))
      
    const [updated] = await db.select().from(knowledge).where(and(eq(knowledge.id, id), eq(knowledge.userId, userId))).limit(1)

    if (!updated) {
      throw new Error('Failed to update knowledge entry')
    }

    return {
      ...updated,
      tags: Array.isArray(updated.tags) ? updated.tags : [],
    } as Knowledge
  }

  async deleteKnowledge(userId: string, id: string): Promise<boolean> {
    const existing = await this.getKnowledgeById(userId, id)
    if (!existing) return false

    await this.vectorService.deleteKnowledge(userId, id)
    
    await db.delete(knowledge).where(
      and(eq(knowledge.id, id), eq(knowledge.userId, userId))
    )

    return true
  }

  async queryKnowledge(
    userId: string,
    query: string,
    options: {
      limit?: number
      minScore?: number
    } = {}
  ): Promise<QueryResult[]> {
    const { limit = 5, minScore = 0.7 } = options

    const results = await this.vectorService.queryKnowledge(userId, query, {
      topK: limit,
      includeMetadata: true,
      minScore,
    })

    return results.map(result => ({
      id: String(result.id),
      score: result.score,
      content: result.content,
      metadata: {
        knowledgeId: result.metadata?.knowledgeId || '',
        title: result.metadata?.title || '',
        tags: result.metadata?.tags || [],
        type: result.metadata?.type || 'text',
      },
    }))
  }

  async getKnowledgeStats(userId: string): Promise<{ total: number; recent: number }> {
    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(knowledge)
      .where(eq(knowledge.userId, userId))

    // Get recent count (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const [recentResult] = await db
      .select({ count: count() })
      .from(knowledge)
      .where(and(
        eq(knowledge.userId, userId),
        // Note: This would need proper date comparison based on your database
        // For now, returning 0 for recent count
      ))

    return {
      total: totalResult?.count || 0,
      recent: 0, // TODO: Implement proper date filtering based on database schema
    }
  }
}