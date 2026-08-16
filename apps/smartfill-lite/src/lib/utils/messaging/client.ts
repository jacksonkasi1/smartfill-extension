// ** import types
import type { MessagingTypes, MessageAction } from "./types"

// ** import constants
import { MESSAGE_ACTIONS } from "./types"

/**
 * Centralized messaging client for type-safe communication between extension contexts
 */
export class MessagingClient {
  /**
   * Send a message to the background script
   */
  static async sendToBackground<T = any>(action: MessageAction, data?: T): Promise<any> {
    try {
      return await chrome.runtime.sendMessage({
        action,
        ...data
      })
    } catch (error) {
      console.error(`MessagingClient: Failed to send message to background (${action}):`, error)
      throw error
    }
  }

  /**
   * Send a message to content script
   */
  static async sendToContentScript<T = any>(tabId: number, action: MessageAction, data?: T): Promise<any> {
    try {
      return await chrome.tabs.sendMessage(tabId, {
        action,
        ...data
      })
    } catch (error) {
      console.error(`MessagingClient: Failed to send message to content script (${action}):`, error)
      throw error
    }
  }

  /**
   * Form Operations
   */
  static async fillForms(request: MessagingTypes.FillFormsRequest): Promise<MessagingTypes.FillFormsResponse> {
    return this.sendToBackground(MESSAGE_ACTIONS.FORMS.FILL, request)
  }

  static async detectForms(request: MessagingTypes.DetectFormsRequest = {}): Promise<MessagingTypes.DetectFormsResponse> {
    return this.sendToBackground(MESSAGE_ACTIONS.FORMS.DETECT, request)
  }

  static async ping(): Promise<MessagingTypes.PingResponse> {
    return this.sendToBackground(MESSAGE_ACTIONS.FORMS.PING)
  }

  /**
   * Popup Operations
   */
  static async openPopup(request: MessagingTypes.OpenPopupRequest = {}): Promise<MessagingTypes.OpenPopupResponse> {
    return this.sendToBackground(MESSAGE_ACTIONS.POPUP.OPEN, request)
  }

  /**
   * Content Script Operations
   */
  static async fillFormsInTab(tabId: number, request: MessagingTypes.FillFormsRequest): Promise<MessagingTypes.FillFormsResponse> {
    return this.sendToContentScript(tabId, MESSAGE_ACTIONS.FORMS.FILL, request)
  }

  static async detectFormsInTab(tabId: number, request: MessagingTypes.DetectFormsRequest = {}): Promise<MessagingTypes.DetectFormsResponse> {
    return this.sendToContentScript(tabId, MESSAGE_ACTIONS.FORMS.DETECT, request)
  }

  static async pingTab(tabId: number): Promise<MessagingTypes.PingResponse> {
    return this.sendToContentScript(tabId, MESSAGE_ACTIONS.FORMS.PING)
  }
}

/**
 * Message listener utility with type safety
 */
export class MessageListener {
  /**
   * Create a type-safe message listener
   */
  static create<TRequest = any, TResponse = any>(
    handler: (
      message: TRequest, 
      sender: chrome.runtime.MessageSender, 
      sendResponse: (response: TResponse) => void
    ) => boolean | void | Promise<void>
  ) {
    return (
      message: any, 
      sender: chrome.runtime.MessageSender, 
      sendResponse: (response?: any) => void
    ) => {
      return handler(message as TRequest, sender, sendResponse as (response: TResponse) => void)
    }
  }

  /**
   * Create an async message listener with automatic response handling
   */
  static createAsync<TRequest = any, TResponse = any>(
    handler: (
      message: TRequest, 
      sender: chrome.runtime.MessageSender
    ) => Promise<TResponse>
  ) {
    return MessageListener.create<TRequest, TResponse>((message, sender, sendResponse) => {
      (async () => {
        try {
          const response = await handler(message, sender)
          sendResponse(response)
        } catch (error) {
          console.error('MessageListener: Handler error:', error)
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          } as any)
        }
      })()
      
      return true // Keep the message channel open for async response
    })
  }
}

/**
 * Website event utilities for type-safe custom events
 */
export class WebsiteEvents {
  /**
   * Dispatch a custom event to trigger extension popup
   */
  static triggerExtensionOpen(data?: any): void {
    const event = new CustomEvent('smartfill-open-extension', {
      detail: data
    }) as MessagingTypes.SmartFillOpenExtensionEvent
    
    window.dispatchEvent(event)
  }

  /**
   * Send a message to the website
   */
  static sendToWebsite(data: MessagingTypes.WebsiteEventData): void {
    window.postMessage(data, '*')
  }

  /**
   * Listen for website events
   */
  static onExtensionOpen(callback: (data?: any) => void): () => void {
    const handler = (event: MessagingTypes.SmartFillOpenExtensionEvent) => {
      callback(event.detail)
    }

    window.addEventListener('smartfill-open-extension', handler as EventListener)

    // Return cleanup function
    return () => {
      window.removeEventListener('smartfill-open-extension', handler as EventListener)
    }
  }

  /**
   * Listen for website messages
   */
  static onWebsiteMessage(callback: (data: MessagingTypes.WebsiteEventData) => void): () => void {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'SMARTFILL_OPEN_EXTENSION' && event.data?.source === 'website') {
        callback(event.data)
      }
    }

    window.addEventListener('message', handler)

    // Return cleanup function
    return () => {
      window.removeEventListener('message', handler)
    }
  }
}