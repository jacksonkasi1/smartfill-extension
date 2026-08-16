// ** import utils
import { MessageListener, MESSAGE_ACTIONS } from "@/lib/utils/messaging"

// Type-safe message listener for popup operations.
// In SmartFill Lite there is no auth and no RAG — the background script
// only exists to support a few utility message types that the popup or
// the content script might send.
chrome.runtime.onMessage.addListener(
  MessageListener.createAsync<any, any>(async (message, _sender) => {
    if (message.action === MESSAGE_ACTIONS.POPUP.OPEN) {
      try {
        if (message.data) {
          await chrome.storage.local.set({
            smartfill_auth_sync: {
              ...message.data,
              timestamp: Date.now()
            }
          })
        }

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
