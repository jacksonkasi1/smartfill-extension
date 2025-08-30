// ** import database
import { eq, sql } from 'drizzle-orm'
import { db, users, knowledge, knowledgeChunks } from '@/db'

// ** import types
interface CreateUserData {
  id: string // Clerk user ID or custom ID
  email?: string
  name?: string
}

interface User {
  id: string
  email: string | null
  name: string | null
  createdAt: Date
  updatedAt: Date
}

export class UserService {
  constructor() {}

  /**
   * Create or update user (upsert for Clerk integration)
   */
  async createOrUpdateUser(userData: CreateUserData): Promise<User> {
    // Check if user exists
    const existingUser = await this.getUserById(userData.id)
    
    if (existingUser) {
      // Update existing user
      const updateData: Partial<CreateUserData> = {}
      if (userData.email) updateData.email = userData.email
      if (userData.name) updateData.name = userData.name
      
      if (Object.keys(updateData).length > 0) {
        await db
          .update(users)
          .set(updateData)
          .where(eq(users.id, userData.id))
      }
      
      // Return updated user
      return await this.getUserById(userData.id) as User
    } else {
      // Create new user
      const insertData = {
        id: userData.id,
        ...(userData.email && { email: userData.email }),
        ...(userData.name && { name: userData.name }),
      }
      await db.insert(users).values(insertData as any)
      
      return await this.getUserById(userData.id) as User
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
    
    return user || null
  }

  /**
   * Delete user and all associated data (cascade)
   */
  async deleteUser(userId: string): Promise<boolean> {
    const user = await this.getUserById(userId)
    if (!user) {
      return false
    }

    // Delete user - this will cascade delete all knowledge and chunks
    await db.delete(users).where(eq(users.id, userId))
    
    return true
  }

  /**
   * Get user stats (knowledge count, etc.)
   */
  async getUserStats(userId: string): Promise<{
    knowledgeCount: number
    totalChunks: number
  } | null> {
    const user = await this.getUserById(userId)
    if (!user) {
      return null
    }

    // Get knowledge count
    const [knowledgeResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(knowledge)
      .where(eq(knowledge.userId, userId))
    
    // Get total chunks count
    const [chunksResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(knowledgeChunks)
      .innerJoin(knowledge, eq(knowledgeChunks.knowledgeId, knowledge.id))
      .where(eq(knowledge.userId, userId))

    return {
      knowledgeCount: knowledgeResult?.count || 0,
      totalChunks: chunksResult?.count || 0,
    }
  }
}