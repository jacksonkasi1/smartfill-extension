import { MessageListener, MessagingTypes, MESSAGE_ACTIONS } from "@/lib/utils/messaging"

console.log("SmartFill background script loaded")

// Type-safe message listener for popup operations
chrome.runtime.onMessage.addListener(
  MessageListener.createAsync<any, MessagingTypes.OpenPopupResponse>(async (message, sender) => {
    if (message.action === MESSAGE_ACTIONS.POPUP.OPEN) {
      console.log('SmartFill: Background received open popup request', message.data)
      
      try {
        // Try to open the popup
        await chrome.action.openPopup()
        console.log('SmartFill: Popup opened successfully')
        return { success: true }
      } catch (error) {
        console.error('SmartFill: Failed to open popup:', error)
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
    
    // Return error for unknown actions
    return {
      success: false,
      error: `Unknown action: ${message.action}`
    }
  })
)

// Optional: Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  console.log('SmartFill: Extension icon clicked')
  // This won't be called if popup is set in manifest, but good to have
})