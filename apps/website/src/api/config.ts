// ** import core packages
import axios, { AxiosInstance, AxiosResponse } from 'axios'

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
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor for auth
  instance.interceptors.request.use(
    async (config) => {
      // Get auth token from Clerk if available
      if (typeof window !== 'undefined') {
        try {
          // Import Clerk dynamically to avoid SSR issues
          const { Clerk } = await import('@clerk/clerk-js');
          
          // Get the Clerk instance from window
          const clerkInstance = (window as any).Clerk;
          
          if (clerkInstance && clerkInstance.session) {
            // Get token from the current session
            const token = await clerkInstance.session.getToken();
            
            if (token) {
              config.headers.Authorization = `Bearer ${token}`;
              console.log('Added Bearer token to request:', {
                url: config.url,
                method: config.method,
                hasToken: true,
                withCredentials: config.withCredentials
              });
            } else {
              console.log('No token available for request:', {
                url: config.url,
                method: config.method,
                withCredentials: config.withCredentials
              });
            }
          } else {
            // Try alternative method using Clerk's client
            const clerkClient = (window as any).__clerk_client_jwt;
            if (clerkClient) {
              config.headers.Authorization = `Bearer ${clerkClient}`;
              console.log('Added Bearer token from clerk_client_jwt');
            } else {
              console.log('Clerk not initialized or no session:', {
                url: config.url,
                method: config.method,
                hasClerkInstance: !!clerkInstance,
                withCredentials: config.withCredentials
              });
            }
          }
        } catch (error) {
          console.error('Failed to get auth token:', error);
        }
      }
      
      // Ensure withCredentials is set for every request
      config.withCredentials = true;
      
      // Log the final config for debugging
      console.log('Request config:', {
        url: config.url,
        method: config.method,
        withCredentials: config.withCredentials,
        hasAuthHeader: !!config.headers.Authorization,
        headers: config.headers
      });
      
      return config;
    },
    (error) => {
      console.error('Request interceptor error:', error);
      return Promise.reject(error);
    }
  );

  // Response interceptor for error handling
  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      console.log('Response received:', {
        url: response.config.url,
        status: response.status,
        method: response.config.method
      });
      return response;
    },
    (error) => {
      console.error('Response error:', {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        message: error.message,
        responseData: error.response?.data
      });
      
      if (error.response) {
        // Server responded with error status
        const { status, data } = error.response;
        
        // Check if it's an auth error
        if (status === 401) {
          console.error('Authentication error - token might be invalid or missing');
          // You might want to redirect to login or refresh the token here
        }
        
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

// Helper function to get Clerk token directly (for debugging)
export const getClerkToken = async (): Promise<string | null> => {
  if (typeof window === 'undefined') return null;
  
  try {
    const clerkInstance = (window as any).Clerk;
    if (clerkInstance && clerkInstance.session) {
      return await clerkInstance.session.getToken();
    }
    
    // Alternative: try to get from localStorage or sessionStorage
    const clerkClientJwt = (window as any).__clerk_client_jwt;
    if (clerkClientJwt) {
      return clerkClientJwt;
    }
    
    // Another alternative: Check Clerk's cookie
    const cookies = document.cookie.split(';');
    const clerkSessionCookie = cookies.find(c => c.trim().startsWith('__session='));
    if (clerkSessionCookie) {
      return clerkSessionCookie.split('=')[1];
    }
    
    return null;
  } catch (error) {
    console.error('Error getting Clerk token:', error);
    return null;
  }
};

// Debug function to check authentication status
export const debugAuth = async () => {
  console.group('🔐 Authentication Debug');
  console.log('Window object:', typeof window !== 'undefined' ? 'Available' : 'Not available');
  
  if (typeof window !== 'undefined') {
    console.log('Clerk instance:', (window as any).Clerk ? 'Found' : 'Not found');
    console.log('Clerk session:', (window as any).Clerk?.session ? 'Active' : 'Not active');
    console.log('Clerk client JWT:', (window as any).__clerk_client_jwt ? 'Found' : 'Not found');
    
    const token = await getClerkToken();
    console.log('Token retrieved:', token ? `Yes (${token.substring(0, 20)}...)` : 'No');
    
    // Check cookies
    console.log('Cookies:', document.cookie ? 'Present' : 'None');
    if (document.cookie) {
      const cookieNames = document.cookie.split(';').map(c => c.trim().split('=')[0]);
      console.log('Cookie names:', cookieNames);
    }
  }
  
  console.groupEnd();
};

// Auto-debug in development
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  // Debug on load
  window.addEventListener('load', () => {
    setTimeout(() => {
      debugAuth();
    }, 1000);
  });
}