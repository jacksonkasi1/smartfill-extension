// ** import core packages
import { createClerkClient } from '@clerk/chrome-extension/background'

// ** import utils
import { MessageListener, MessagingTypes, MESSAGE_ACTIONS } from "@/lib/utils/messaging"

// ** import config
import { ENV } from '@/config/env'

// ** import services
import { ragClient } from '@/services/rag'

// Create Clerk client for background script
async function getClerkToken(): Promise<string | null> {
  try {
    console.log('Background: Creating Clerk client...')
    const clerk = await createClerkClient({
      publishableKey: ENV.CLERK_PUBLISHABLE_KEY
    })
    
    console.log('Background: Clerk client created, checking session...')
    if (!clerk.session) {
      console.warn('Background: No Clerk session available')
      return null
    }
    
    console.log('Background: Getting token from session...')
    const token = await clerk.session.getToken()
    
    if (token) {
      console.log('Background: Token retrieved successfully')
      console.log('Background: Token preview:', token.substring(0, 50) + '...')
      console.log('Background: Full token length:', token.length)
    } else {
      console.warn('Background: Token is null/empty')
    }
    
    return token
  } catch (error) {
    console.error('Background: Failed to get Clerk token:', error)
    return null
  }
}

// Type-safe message listener for popup operations
chrome.runtime.onMessage.addListener(
  MessageListener.createAsync<any, any>(async (message, sender) => {
    if (message.action === MESSAGE_ACTIONS.POPUP.OPEN) {
      try {
        // Store auth sync signal if provided
        if (message.data) {
          await chrome.storage.local.set({
            smartfill_auth_sync: {
              ...message.data,
              timestamp: Date.now()
            }
          })
        }
        
        // Open the popup
        await chrome.action.openPopup()
        return { success: true }
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }

    if (message.action === 'GET_AUTH_TOKEN') {
      try {
        console.log('Background: GET_AUTH_TOKEN request received')
        const token = await getClerkToken()
        
        if (token) {
          console.log('Background: Returning token to requester')
          return { success: true, token }
        }
        
        console.log('Background: No token available, returning error')
        return { success: false, error: 'No valid auth token available' }
      } catch (error) {
        console.error('Background: GET_AUTH_TOKEN error:', error)
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to get auth token'
        }
      }
    }

    if (message.action === 'GENERATE_RAG_PROMPT') {
      try {
        const { fields, customPrompt, ragSettings } = message
        const enhancedPrompt = await ragClient.generateRAGPrompt(fields, customPrompt, ragSettings)
        return { success: true, enhancedPrompt }
      } catch (error) {
        console.error('Background: RAG prompt generation failed:', error)
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'RAG prompt generation failed',
          fallbackPrompt: message.customPrompt || ''
        }
      }
    }
    
    return {
      success: false,
      error: `Unknown action: ${message.action}`
    }
  })
)