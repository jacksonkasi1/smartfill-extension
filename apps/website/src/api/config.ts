// ** import core packages
import axios, { AxiosInstance, AxiosResponse } from 'axios'

// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_RAG_SERVICE_URL || 'http://localhost:3001',
  VERSION: 'v1',
  TIMEOUT: 30000,
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
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor for auth
  instance.interceptors.request.use(
    async (config) => {
      if (typeof window !== 'undefined') {
        try {
          const clerkInstance = (window as any).Clerk;
          
          if (clerkInstance?.session) {
            const token = await clerkInstance.session.getToken();
            if (token) {
              config.headers.Authorization = `Bearer ${token}`;
            }
          }
        } catch (error) {
          // Silently fail - auth is optional
        }
      }
      
      config.withCredentials = true;
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor for error handling
  instance.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error) => {
      if (error.response) {
        const { status, data } = error.response;
        throw new ApiError(
          data?.message || `HTTP ${status}: ${error.response.statusText}`,
          status,
          data
        );
      } else if (error.request) {
        throw new ApiError('Network error: No response received', undefined, error);
      } else {
        throw new ApiError(error.message || 'Request failed', undefined, error);
      }
    }
  );

  return instance;
};

// Export axios instance
export const httpClient = createAxiosInstance();