// ** import utils
import { MessageListener, MessagingTypes, MESSAGE_ACTIONS } from "@/lib/utils/messaging"

// ** import services
import { ragClient } from '@/services/rag'

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
        // Try to get auth token from storage
        const result = await chrome.storage.local.get(['authToken', 'authTokenExpiry'])
        
        if (result.authToken && result.authTokenExpiry) {
          const now = Date.now()
          const expiry = parseInt(result.authTokenExpiry)
          
          if (now < expiry) {
            return { success: true, token: result.authToken }
          } else {
            // Token expired, clean up
            await chrome.storage.local.remove(['authToken', 'authTokenExpiry'])
          }
        }
        
        return { success: false, error: 'No valid auth token available' }
      } catch (error) {
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