// Base API Configuration
import axios, { AxiosInstance, AxiosResponse } from 'axios';

// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_RAG_SERVICE_URL || 'http://localhost:3001',
  VERSION: 'v1',
  TIMEOUT: 30000, // 30 seconds
} as const;

// API Error Class
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Create axios instance
const createAxiosInstance = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: `${API_CONFIG.BASE_URL}/api/${API_CONFIG.VERSION}`,
    timeout: API_CONFIG.TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor for auth
  instance.interceptors.request.use(
    (config) => {
      // Auth token will be added by individual API functions
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor for error handling
  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      return response;
    },
    (error) => {
      if (error.response) {
        // Server responded with error status
        const { status, data } = error.response;
        throw new ApiError(
          data?.message || `HTTP ${status}: ${error.response.statusText}`,
          status,
          data
        );
      } else if (error.request) {
        // Request was made but no response received
        throw new ApiError('Network error: No response received', undefined, error);
      } else {
        // Something else happened
        throw new ApiError(error.message || 'Request failed', undefined, error);
      }
    }
  );

  return instance;
};

// Export axios instance
export const httpClient = createAxiosInstance();