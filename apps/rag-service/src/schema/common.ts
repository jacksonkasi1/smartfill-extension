// ** import validation
import { z } from 'zod'

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
})

export const idParamSchema = z.object({
  id: z.string().uuid('Invalid UUID format'),
})

export const successResponseSchema = z.object({
  success: z.literal(true),
  data: z.any(),
  message: z.string().optional(),
})

export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  details: z.any().optional(),
})