// ** import validation
import { z } from 'zod'

export const createKnowledgeSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  type: z.enum(['text', 'file']).default('text'),
  tags: z.array(z.string()).optional().default([]),
})

export const updateKnowledgeSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  tags: z.array(z.string()).optional(),
})

export const queryKnowledgeSchema = z.object({
  query: z.string().min(1, 'Query is required'),
  limit: z.number().int().min(1).max(50).default(5),
  includeMetadata: z.boolean().default(true),
  minScore: z.number().min(0).max(1).default(0.3),
})

export const uploadFileSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  tags: z.array(z.string()).optional().default([]),
})