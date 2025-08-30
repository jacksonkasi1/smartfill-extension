// ** import validation
import { z } from "zod"

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

// Export-compatible type for data table
export type KnowledgeExportable = Omit<Knowledge, 'tags'> & {
  tags: string // converted to string for export
}

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