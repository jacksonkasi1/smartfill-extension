import type { PlasmoCSConfig } from "plasmo"
import type { ExtensionMessage, DetectResult, FillResult } from './types/extension'
import { detectAllForms, fillForm } from './lib'
import { generateFormData } from './api'
import { MessageListener, MessagingClient, WebsiteEvents, MessagingTypes, MESSAGE_ACTIONS } from "@/lib/utils/messaging"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"]
}

console.log("SmartFill content script loaded")

// Type-safe website event listeners
WebsiteEvents.onExtensionOpen((data) => {
  console.log('SmartFill: Received open extension event from website', data)
  // Send type-safe message to background script to open popup
  MessagingClient.openPopup({ data }).catch(console.error)
})

WebsiteEvents.onWebsiteMessage((eventData) => {
  console.log('SmartFill: Received open extension message from website', eventData.data)
  // Send type-safe message to background script to open popup
  MessagingClient.openPopup({ data: eventData.data }).catch(console.error)
})

// Type-safe message listener for popup communications
chrome.runtime.onMessage.addListener(
  MessageListener.createAsync<any, any>(async (message, sender) => {
    switch (message.action) {
      case MESSAGE_ACTIONS.FORMS.PING:
        return { success: true, status: "ready" }
        
      case MESSAGE_ACTIONS.FORMS.FILL:
        const result = await fillForms(message.prompt)
        // Convert FillResult to FillFormsResponse format
        return {
          success: result.success,
          filled: result.filled,
          formCount: result.filled, // Use filled count as form count
          errors: result.errors
        }
        
      default:
        return { 
          success: false, 
          status: "error",
          error: `Unknown action: ${message.action}` 
        }
    }
  })
)

async function detectForms(): Promise<DetectResult> {
  try {
    const result = await detectAllForms()
    return result
  } catch (error) {
    console.error('Form detection error:', error)
    return {
      success: false,
      formCount: 0,
      forms: []
    }
  }
}

async function fillForms(customPrompt?: string): Promise<FillResult> {
  try {
    const detectResult = await detectAllForms()
    
    if (!detectResult.success || detectResult.forms.length === 0) {
      return {
        success: false,
        filled: 0,
        errors: ['No forms detected on this page']
      }
    }

    const allFields = detectResult.forms.flatMap((form: import('@/types/extension').DetectedForm) => form.fields)
    
    if (allFields.length === 0) {
      return {
        success: false,
        filled: 0,
        errors: ['No fillable fields found']
      }
    }

    // Generate AI data using the real API
    let aiData
    try {
      aiData = await generateFormData(allFields, customPrompt)
    } catch (error) {
      console.error('AI generation error:', error)
      const errorMessage = error instanceof Error ? error.message : 'AI processing failed'
      return {
        success: false,
        filled: 0,
        errors: [errorMessage]
      }
    }
    
    // Fill the form using the real logic
    const fillResult = await fillForm(allFields, aiData)
    return fillResult
  } catch (error) {
    console.error('Form filling error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      success: false,
      filled: 0,
      errors: [errorMessage]
    }
  }
}


