// ** import database
import { mysqlTable, text, timestamp, varchar, mysqlEnum, json, customType } from 'drizzle-orm/mysql-core'
import { sql } from 'drizzle-orm'

// User table for account management and cascade deletions
export const users = mysqlTable('users', {
  id: varchar('id', { length: 255 }).primaryKey(), // Clerk user ID or custom user ID
  email: varchar('email', { length: 255 }).unique(),
  name: varchar('name', { length: 255 }),
  createdAt: timestamp('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`).onUpdateNow(),
})

export const knowledgeTypeEnum = mysqlEnum('knowledge_type', ['text', 'file'])

export const knowledge = mysqlTable('knowledge', {
  id: varchar('id', { length: 36 }).primaryKey().default(sql`(UUID())`),
  userId: varchar('user_id', { length: 255 }).references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  type: knowledgeTypeEnum.notNull().default('text'),
  tags: json('tags'),
  createdAt: timestamp('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`).onUpdateNow(),
})

// Custom TiDB vector type
const vector = customType<{ data: number[]; driverData: string }>({
  dataType(config?: { length?: number }) {
    return `VECTOR(${config?.length ?? 1536})`
  },
  fromDriver(value: string): number[] {
    return JSON.parse(value)
  },
  toDriver(value: number[]): string {
    return JSON.stringify(value)
  },
})

export const knowledgeChunks = mysqlTable('knowledge_chunks', {
  id: varchar('id', { length: 36 }).primaryKey().default(sql`(UUID())`),
  knowledgeId: varchar('knowledge_id', { length: 36 }).references(() => knowledge.id, { onDelete: 'cascade' }).notNull(),
  content: text('content').notNull(),
  chunkIndex: varchar('chunk_index', { length: 10 }).notNull(),
  embedding: vector({ length: 1536 }).notNull(), // TiDB vector type for OpenAI embeddings
  createdAt: timestamp('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  // TiDB vector index for cosine distance search
  vectorIndex: sql`VECTOR INDEX ((VEC_COSINE_DISTANCE(embedding)))`
}))