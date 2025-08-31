// ** import utils
import { MessageListener, MessagingTypes, MESSAGE_ACTIONS } from "@/lib/utils/messaging"

// Type-safe message listener for popup operations
chrome.runtime.onMessage.addListener(
  MessageListener.createAsync<any, MessagingTypes.OpenPopupResponse>(async (message, sender) => {
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
    
    return {
      success: false,
      error: `Unknown action: ${message.action}`
    }
  })
)