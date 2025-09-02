// ** import types
import { Context } from 'hono'
import { ApiResponse, PaginatedResponse } from '@/types'

export const response = {
  success: <T>(c: Context, data: T, message?: string, status: number = 200) => {
    return c.json({
      success: true,
      data,
      message,
    } as ApiResponse<T>, status as any)
  },

  error: (c: Context, error: string, status: number = 400, details?: any) => {
    return c.json({
      success: false,
      error,
      details,
    } as ApiResponse, status as any)
  },

  paginated: <T>(
    c: Context,
    data: T[],
    page: number,
    limit: number,
    total: number,
    status: number = 200
  ) => {
    return c.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total_items: total,
        total_pages: Math.ceil(total / limit),
      },
    } as PaginatedResponse<T>, status as any)
  },
}