// ** import types
import type { FormField } from '@/types/extension'
import type { AxiosInstance, AxiosResponse } from 'axios'

// ** import core packages
import axios from 'axios'

// ** import config
import { ENV } from '@/config/env'

interface RAGQueryRequest {
  query: string
  limit?: number
  minScore?: number
  tags?: string[]
}

interface RAGQueryResponse {
  success: boolean
  data: Array<{
    id: string
    title: string
    content: string
    score: number
    tags: string[]
  }>
  message?: string
}

interface KnowledgeStatsResponse {
  success: boolean
  data: {
    total: number
    uniqueTags: string[]
    averageLength: number
    lastUpdated: string
  }
}

interface UserRAGSettings {
  ragEnabled: boolean
  autoRag: boolean
  selectedTags: string[]
}


async function getAuthToken(): Promise<string | null> {
  try {
    console.log('RAG Client: Requesting auth token from background...')
    const response = await chrome.runtime.sendMessage({ action: 'GET_AUTH_TOKEN' })
    
    if (response?.success && response.token) {
      console.log('RAG Client: Token received successfully')
      console.log('RAG Client: Token preview:', response.token.substring(0, 50) + '...')
      console.log('RAG Client: Full token length:', response.token.length)
      return response.token
    } else {
      console.warn('RAG Client: No token received:', response)
      return null
    }
  } catch (error) {
    console.error('RAG Client: Failed to get auth token from background:', error)
    return null
  }
}

// API Error Class
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public details?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export class RAGClient {
  private httpClient: AxiosInstance

  constructor() {
    this.httpClient = this.createAxiosInstance()
  }

  private createAxiosInstance(): AxiosInstance {
    const instance = axios.create({
      baseURL: ENV.RAG_SERVICE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Request interceptor for auth
    instance.interceptors.request.use(
      async (config) => {
        try {
          console.log('RAG Client: Making API request to:', config.url)
          const token = await getAuthToken()
          if (token) {
            config.headers.Authorization = `Bearer ${token}`
            console.log('RAG Client: Authorization header added to request')
          } else {
            console.warn('RAG Client: No auth token available for RAG API request')
          }
        } catch (error) {
          console.error('RAG Client: Auth token retrieval failed:', error)
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor for error handling
    instance.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error) => {
        if (error.response) {
          const { status, data } = error.response
          throw new ApiError(
            data?.message || `HTTP ${status}: ${error.response.statusText}`,
            status,
            data
          )
        } else if (error.request) {
          throw new ApiError('Network error: No response received', undefined, error)
        } else {
          throw new ApiError(error.message || 'Request failed', undefined, error)
        }
      }
    )

    return instance
  }

  private async makeRequest<T>(endpoint: string, options: any = {}): Promise<T> {
    try {
      const response = await this.httpClient({
        url: endpoint,
        ...options,
      })
      return response.data
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }
      throw new ApiError(`Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`, undefined, error)
    }
  }

  async queryKnowledge(request: RAGQueryRequest): Promise<RAGQueryResponse> {
    return this.makeRequest<RAGQueryResponse>('/knowledge/query', {
      method: 'POST',
      data: request,
    })
  }

  async getKnowledgeStats(): Promise<KnowledgeStatsResponse> {
    return this.makeRequest<KnowledgeStatsResponse>('/knowledge/stats', {
      method: 'GET',
    })
  }

  async getAvailableTags(): Promise<string[]> {
    try {
      const statsResponse = await this.getKnowledgeStats()
      if (statsResponse.success && statsResponse.data.uniqueTags) {
        return statsResponse.data.uniqueTags
      }
      return []
    } catch (error) {
      console.error('Failed to fetch available tags:', error)
      return []
    }
  }

  async generateRAGPrompt(fields: FormField[], customPrompt?: string, ragSettings?: UserRAGSettings): Promise<string> {
    if (!ragSettings?.ragEnabled) {
      return customPrompt || ''
    }

    try {
      // Generate search query based on form field patterns
      const fieldPatterns = fields
        .filter(field => field.label || field.name)
        .map(field => (field.label || field.name || '').toLowerCase())
      
      const hasPersonalFields = fieldPatterns.some(pattern => 
        pattern.includes('name') || pattern.includes('email') || pattern.includes('phone')
      )
      const hasWorkFields = fieldPatterns.some(pattern => 
        pattern.includes('company') || pattern.includes('job') || pattern.includes('work')
      )
      
      let searchQuery = 'personal information profile contact details'
      if (hasWorkFields) {
        searchQuery = 'work employment company job title'
      } else if (hasPersonalFields) {
        searchQuery = 'personal information contact details'
      }
      
      const queryRequest: RAGQueryRequest = {
        query: searchQuery,
        limit: 3,
        minScore: 0.5,
      }

      // Add tag filtering if not using auto RAG
      if (!ragSettings.autoRag && ragSettings.selectedTags.length > 0) {
        queryRequest.tags = ragSettings.selectedTags
      }

      const ragResponse = await this.queryKnowledge(queryRequest)
      
      if (ragResponse.success && ragResponse.data.length > 0) {
        const knowledgeContext = ragResponse.data
          .map((item, index) => `${index + 1}. ${item.title}: ${item.content.substring(0, 200)}${item.content.length > 200 ? '...' : ''}`)
          .join('\n\n')

        const enhancedPrompt = [
          customPrompt || '',
          '\n\n--- Relevant Knowledge ---',
          knowledgeContext,
          '\n--- End Knowledge ---\n',
          'Use the above knowledge to fill the form appropriately. Match the information from the knowledge base to the form fields.'
        ].filter(Boolean).join('\n')

        return enhancedPrompt
      }
    } catch (error) {
      console.error('RAG prompt generation failed:', error)
    }

    return customPrompt || ''
  }
}

export const ragClient = new RAGClient()