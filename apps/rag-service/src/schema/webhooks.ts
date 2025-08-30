// ** import validation
import { z } from 'zod'

export const clerkUserSchema = z.object({
  id: z.string(),
  email_addresses: z.array(z.object({
    email_address: z.string(),
    verification: z.object({
      status: z.string()
    }).optional()
  })),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  created_at: z.number(),
  updated_at: z.number()
})

export const clerkWebhookSchema = z.object({
  data: clerkUserSchema,
  object: z.literal('event'),
  type: z.enum(['user.created', 'user.updated', 'user.deleted']),
  timestamp: z.number()
})

export const clerkUserDeletedWebhookSchema = z.object({
  data: z.object({
    id: z.string()
  }),
  object: z.literal('event'),
  type: z.literal('user.deleted'),
  timestamp: z.number()
})

export type ClerkUser = z.infer<typeof clerkUserSchema>
export type ClerkWebhookEvent = z.infer<typeof clerkWebhookSchema>
export type ClerkUserDeletedWebhookEvent = z.infer<typeof clerkUserDeletedWebhookSchema>