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
    const clerk = await createClerkClient({
      publishableKey: ENV.CLERK_PUBLISHABLE_KEY
    })
    
    if (!clerk.session) {
      return null
    }
    
    const token = await clerk.session.getToken()
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
        const token = await getClerkToken()
        
        if (token) {
          return { success: true, token }
        }
        
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