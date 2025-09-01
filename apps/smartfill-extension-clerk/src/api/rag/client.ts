// ** import types
import type { FormField } from '@/types/extension'

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

// Create a mock token for development/testing
function createMockToken(userId: string = 'test-user-123'): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = btoa(JSON.stringify({ 
    sub: userId, 
    userId: userId, 
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour expiry
  }))
  const signature = 'bW9jay1zaWduYXR1cmU=' // base64 encoded 'mock-signature'
  
  return `${header}.${payload}.${signature}`
}

async function getAuthToken(): Promise<string | null> {
  try {
    // Try to get auth token from storage (set by popup)
    const result = await chrome.storage.local.get(['authToken', 'authTokenExpiry'])
    
    if (result.authToken && result.authTokenExpiry) {
      const now = Date.now()
      const expiry = parseInt(result.authTokenExpiry)
      
      if (now < expiry) {
        return result.authToken
      } else {
        // Token expired, clean up
        await chrome.storage.local.remove(['authToken', 'authTokenExpiry'])
      }
    }
    
    // Try to communicate with popup to get fresh token
    try {
      const response = await chrome.runtime.sendMessage({ action: 'GET_AUTH_TOKEN' })
      if (response?.token) {
        return response.token
      }
    } catch (error) {
      // Silently handle communication errors
    }

    // Fallback: create mock token for development
    return createMockToken('test-user-123')
  } catch (error) {
    console.error('Failed to get auth token:', error)
    return null
  }
}

export class RAGClient {
  private baseURL: string

  constructor() {
    this.baseURL = ENV.RAG_SERVICE_URL
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await getAuthToken()
    
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`RAG API error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    return response.json()
  }

  async queryKnowledge(request: RAGQueryRequest): Promise<RAGQueryResponse> {
    return this.makeRequest<RAGQueryResponse>('/knowledge/query', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  async getKnowledgeStats(): Promise<KnowledgeStatsResponse> {
    return this.makeRequest<KnowledgeStatsResponse>('/knowledge/stats')
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