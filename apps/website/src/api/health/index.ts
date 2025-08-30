// Health API Types and Functions
import { httpClient } from '../config';

// Health API Types
export interface HealthResponse {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  version?: string;
  environment?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: any;
}

// Health API Functions
export const healthApi = {
  /**
   * Check the health status of the RAG service
   * @returns Promise<ApiResponse<HealthResponse>>
   */
  async checkHealth(): Promise<ApiResponse<HealthResponse>> {
    const response = await httpClient.get<ApiResponse<HealthResponse>>('/health');
    return response.data;
  },
};

// Default export
export default healthApi;