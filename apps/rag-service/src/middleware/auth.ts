// ** import types
import { Context, Next } from 'hono'

// ** import core packages
import { verifyToken } from '@clerk/backend'

// ** import config
import { env } from '@/config/env'
import { CLERK_PEM_PUBLIC_KEY } from '@/config/clerk'

// ** import utils
import { response } from '@/utils'

export interface AuthContext extends Context {
  get: (key: 'userId') => string
}


export const authMiddleware = async (c: Context, next: Next): Promise<Response | void> => {
  try {
    const authHeader = c.req.header('Authorization')
    
    if (!authHeader?.startsWith('Bearer ')) {
      return response.error(c, 'Missing or invalid authorization header', 401)
    }

    const token = authHeader.split(' ')[1]
    
    if (!token) {
      return response.error(c, 'No token provided', 401)
    }
    
    // Check if this is a mock token for testing (base64 encoded 'mock-signature' = 'bW9jay1zaWduYXR1cmU=')
    if (token.includes('bW9jay1zaWduYXR1cmU=')) {
      try {
        // Mock token - extract user ID directly for development/testing
        const parts = token.split('.')
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1] as string))
          const userId = payload.sub || payload.userId
          if (userId) {
            c.set('userId', userId)
            await next()
            return
          }
        }
        return response.error(c, 'Invalid mock token', 401)
      } catch (error) {
        console.error('Mock token parsing error:', error)
        return response.error(c, 'Invalid mock token', 401)
      }
    }
    
    // Real Clerk token verification
    try {
      const payload = await verifyToken(token, {
        secretKey: env.CLERK_SECRET_KEY,
        // Use the PEM public key for verification
        jwtKey: CLERK_PEM_PUBLIC_KEY,
      })
      
      const userId = payload.sub
      
      if (!userId) {
        return response.error(c, 'Invalid token - no user ID', 401)
      }
      
      c.set('userId', userId)
      await next()
    } catch (error) {
      console.error('Token verification error:', error)
      return response.error(c, 'Invalid token', 401)
    }
  } catch (error) {
    console.error('Authentication error:', error)
    return response.error(c, 'Authentication error', 401)
  }
}