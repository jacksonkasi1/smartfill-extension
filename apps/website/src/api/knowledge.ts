// ** import types
import type { CreateKnowledge } from '@/types/knowledge'

// ** import validation
import { knowledgeResponseSchema, knowledgeStatsSchema } from '@/types/knowledge'

const API_BASE_URL = process.env.NEXT_PUBLIC_RAG_SERVICE_URL || 'http://localhost:3001/api/v1'

export async function fetchKnowledge({
  search = '',
  page = 1,
  limit = 10,
  from_date = '',
  to_date = '',
  sort_by = 'createdAt',
  sort_order = 'desc',
}: {
  search?: string
  page?: number
  limit?: number
  from_date?: string
  to_date?: string
  sort_by?: string
  sort_order?: string
  caseConfig?: any
} = {}) {
  const params = new URLSearchParams()
  if (search) params.append('search', search)
  if (from_date) params.append('from_date', from_date)
  if (to_date) params.append('to_date', to_date)
  if (sort_by) params.append('sort_by', sort_by)
  if (sort_order) params.append('sort_order', sort_order)
  params.append('page', page.toString())
  params.append('limit', limit.toString())

  const response = await fetch(`${API_BASE_URL}/knowledge?${params.toString()}`, {
    headers: {
      'Authorization': `Bearer ${await getAuthToken()}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch knowledge: ${response.statusText}`)
  }

  const data = await response.json()
  return knowledgeResponseSchema.parse(data)
}

export async function createKnowledge(knowledgeData: CreateKnowledge) {
  const response = await fetch(`${API_BASE_URL}/knowledge`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${await getAuthToken()}`,
    },
    body: JSON.stringify(knowledgeData),
  })

  if (!response.ok) {
    throw new Error(`Failed to create knowledge: ${response.statusText}`)
  }

  const data = await response.json()
  return data
}

export async function uploadKnowledgeFile(file: File, title: string) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('title', title)

  const response = await fetch(`${API_BASE_URL}/knowledge/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${await getAuthToken()}`,
    },
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`Failed to upload file: ${response.statusText}`)
  }

  const data = await response.json()
  return data
}

export async function deleteKnowledge(id: string) {
  const response = await fetch(`${API_BASE_URL}/knowledge/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${await getAuthToken()}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to delete knowledge: ${response.statusText}`)
  }

  const data = await response.json()
  return data
}

export async function fetchKnowledgeStats() {
  const response = await fetch(`${API_BASE_URL}/knowledge/stats`, {
    headers: {
      'Authorization': `Bearer ${await getAuthToken()}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch knowledge stats: ${response.statusText}`)
  }

  const data = await response.json()
  return knowledgeStatsSchema.parse(data)
}

// Helper function to get auth token from Clerk
async function getAuthToken(): Promise<string> {
  if (typeof window !== 'undefined') {
    // For client-side, we'll need to get the token from Clerk
    // For now, return empty string to allow development
    return ''
  }
  // For server-side, return empty string for now
  return ''
}