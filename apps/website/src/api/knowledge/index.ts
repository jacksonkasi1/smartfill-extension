// Knowledge API Types and Functions
import { httpClient } from '../config';

// Knowledge API Types
export interface Knowledge {
  id: string;
  userId: string;
  title: string;
  content: string;
  type: 'text' | 'file' | 'url';
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface QueryResult {
  id: string;
  score: number;
  content: string;
  metadata: {
    knowledgeId: string;
    title: string;
    tags: string[];
    type: string;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: any;
}

export interface PaginatedResponse<T = any> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Request Types
export interface CreateKnowledgeRequest {
  title: string;
  content: string;
  type: 'text' | 'file' | 'url';
  tags?: string[];
}

export interface UpdateKnowledgeRequest {
  title?: string;
  content?: string;
  tags?: string[];
}

export interface QueryKnowledgeRequest {
  query: string;
  limit?: number;
  includeMetadata?: boolean;
  minScore?: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

// Knowledge API Functions
export const knowledgeApi = {
  /**
   * Get paginated list of user's knowledge
   * @param params - Pagination parameters
   * @param token - Authorization token
   * @returns Promise<PaginatedResponse<Knowledge>>
   */
  async getKnowledgeList(
    params: PaginationParams = {},
    token: string
  ): Promise<PaginatedResponse<Knowledge>> {
    const { page = 1, limit = 10 } = params;
    const response = await httpClient.get<PaginatedResponse<Knowledge>>(
      `/knowledge?page=${page}&limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  /**
   * Create new knowledge
   * @param data - Knowledge creation data
   * @param token - Authorization token
   * @returns Promise<ApiResponse<Knowledge>>
   */
  async createKnowledge(
    data: CreateKnowledgeRequest,
    token: string
  ): Promise<ApiResponse<Knowledge>> {
    const response = await httpClient.post<ApiResponse<Knowledge>>(
      '/knowledge',
      data,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  /**
   * Query knowledge using semantic search
   * @param data - Query parameters
   * @param token - Authorization token
   * @returns Promise<ApiResponse<QueryResult[]>>
   */
  async queryKnowledge(
    data: QueryKnowledgeRequest,
    token: string
  ): Promise<ApiResponse<QueryResult[]>> {
    const response = await httpClient.post<ApiResponse<QueryResult[]>>(
      '/knowledge/query',
      data,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  /**
   * Get knowledge by ID
   * @param id - Knowledge ID
   * @param token - Authorization token
   * @returns Promise<ApiResponse<Knowledge>>
   */
  async getKnowledgeById(
    id: string,
    token: string
  ): Promise<ApiResponse<Knowledge>> {
    const response = await httpClient.get<ApiResponse<Knowledge>>(
      `/knowledge/${id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  /**
   * Update knowledge by ID
   * @param id - Knowledge ID
   * @param data - Update data
   * @param token - Authorization token
   * @returns Promise<ApiResponse<Knowledge>>
   */
  async updateKnowledge(
    id: string,
    data: UpdateKnowledgeRequest,
    token: string
  ): Promise<ApiResponse<Knowledge>> {
    const response = await httpClient.put<ApiResponse<Knowledge>>(
      `/knowledge/${id}`,
      data,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  /**
   * Delete knowledge by ID
   * @param id - Knowledge ID
   * @param token - Authorization token
   * @returns Promise<ApiResponse<{ id: string }>>
   */
  async deleteKnowledge(
    id: string,
    token: string
  ): Promise<ApiResponse<{ id: string }>> {
    const response = await httpClient.delete<ApiResponse<{ id: string }>>(
      `/knowledge/${id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  /**
   * Upload file as knowledge
   * @param file - File to upload
   * @param title - Knowledge title
   * @param tags - Optional tags
   * @param token - Authorization token
   * @returns Promise<ApiResponse<Knowledge>>
   */
  async uploadFile(
    file: File,
    title: string,
    tags: string[] = [],
    token: string
  ): Promise<ApiResponse<Knowledge>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('tags', JSON.stringify(tags));

    const response = await httpClient.post<ApiResponse<Knowledge>>(
      '/knowledge/upload',
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },
};

// Default export
export default knowledgeApi;