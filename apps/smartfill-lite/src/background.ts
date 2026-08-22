// ** import utils
import { MessageListener, MESSAGE_ACTIONS } from "@/lib/utils/messaging"

// Type-safe message listener for popup operations.
// SmartFill Lite has no auth and no RAG — the background script is a
// minimal message router. The popup simply uses the action button
// default open, no extra state needs to be persisted in storage.

chrome.runtime.onMessage.addListener(
  MessageListener.createAsync<any, any>(async (message, _sender) => {
    if (message.action === MESSAGE_ACTIONS.POPUP.OPEN) {
      try {
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
