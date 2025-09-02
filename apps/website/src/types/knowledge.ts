// ** import validation
import { z } from 'zod'

export const knowledgeSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  content: z.string(),
  type: z.enum(['text', 'file']),
  tags: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Knowledge = z.infer<typeof knowledgeSchema>

export const knowledgeResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(knowledgeSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total_pages: z.number(),
    total_items: z.number(),
  }),
})

export const createKnowledgeSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  type: z.enum(['text', 'file']).optional().default('text'),
  tags: z.array(z.string()).optional().default([]),
})

export type CreateKnowledge = z.infer<typeof createKnowledgeSchema>

export const knowledgeStatsSchema = z.object({
  success: z.boolean(),
  data: z.object({
    total: z.number(),
    recent: z.number(),
  }),
})