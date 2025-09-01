// ** import types
import type { CreateKnowledge } from '@/types/knowledge'

// ** import validation
import { knowledgeResponseSchema, knowledgeStatsSchema } from '@/types/knowledge'

// ** import config
import { httpClient } from './config'

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

  const response = await httpClient.get(`/knowledge?${params.toString()}`)
  return knowledgeResponseSchema.parse(response.data)
}

export async function createKnowledge(knowledgeData: CreateKnowledge) {
  const response = await httpClient.post('/knowledge', knowledgeData)
  return response.data
}

export async function uploadKnowledgeFile(file: File, title: string) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('title', title)

  const response = await httpClient.post('/knowledge/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

export async function deleteKnowledge(id: string) {
  const response = await httpClient.delete(`/knowledge/${id}`)
  return response.data
}

export async function fetchKnowledgeStats() {
  const response = await httpClient.get('/knowledge/stats')
  return knowledgeStatsSchema.parse(response.data)
}