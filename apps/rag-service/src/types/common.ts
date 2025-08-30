export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  details?: any
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}