export interface Knowledge {
  id: string
  userId: string
  title: string
  content: string
  type: 'text' | 'file'
  tags: string[]
  createdAt: Date
  updatedAt: Date
}

export interface KnowledgeChunk {
  id: string
  knowledgeId: string
  content: string
  embedding?: number[]
  metadata?: Record<string, unknown>
}

export interface QueryResult {
  id: string
  score: number
  content: string
  metadata: {
    knowledgeId: string
    title: string
    tags: string[]
    type: 'text' | 'file'
  }
}

export interface VectorMetadata {
  knowledgeId: string
  userId: string
  title: string
  tags: string[]
  type: 'text' | 'file'
  chunkIndex: number
  totalChunks: number
  [key: string]: unknown
}