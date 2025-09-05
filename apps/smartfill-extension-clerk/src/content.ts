// ** import types
import type { PlasmoCSConfig } from "plasmo"
import type { ExtensionMessage, DetectResult, FillResult } from './types/extension'

// ** import utils
import { MessageListener, MessagingClient, WebsiteEvents, MessagingTypes, MESSAGE_ACTIONS } from "@/lib/utils/messaging"

// ** import lib
import { detectAllForms, fillForm } from './lib'

// ** import apis
import { generateFormData } from './api'

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"]
}

// Type-safe website event listeners
WebsiteEvents.onExtensionOpen((data) => {
  MessagingClient.openPopup({ data }).catch(console.error)
})

WebsiteEvents.onWebsiteMessage((eventData) => {
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

// Helper function to send status updates to popup
async function sendStatusUpdate(status: string, delay: number = 300) {
  try {
    chrome.runtime.sendMessage({ action: 'STATUS_UPDATE', status })
    // Small delay to let user see the status message
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  } catch (error) {
    // Could not send status update - this is expected in some contexts
  }
}

async function fillForms(customPrompt?: string): Promise<FillResult> {
  try {
    await sendStatusUpdate('Detecting forms on page...')
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

    await sendStatusUpdate('Loading RAG settings...')

    // Load RAG settings from storage
    let ragSettings
    try {
      const result = await chrome.storage.sync.get(['ragEnabled', 'autoRag', 'selectedTags'])
      ragSettings = {
        ragEnabled: result.ragEnabled ?? true,
        autoRag: result.autoRag ?? true,
        selectedTags: result.selectedTags ?? []
      }
    } catch (error) {
      console.error('Failed to load RAG settings:', error)
      ragSettings = { ragEnabled: false, autoRag: true, selectedTags: [] }
    }

    // Enhance prompt with RAG if enabled
    let enhancedPrompt = customPrompt || ''
    
    if (ragSettings.ragEnabled) {
      await sendStatusUpdate('🔍 Searching knowledge base...', 500)
      try {
        const response = await chrome.runtime.sendMessage({
          action: 'GENERATE_RAG_PROMPT',
          fields: allFields,
          customPrompt,
          ragSettings
        })
        
        if (response && response.success && response.enhancedPrompt) {
          enhancedPrompt = response.enhancedPrompt
          if (enhancedPrompt !== (customPrompt || '')) {
            await sendStatusUpdate('✅ Found relevant knowledge!', 400)
          } else {
            await sendStatusUpdate('⚠️ No relevant knowledge found', 400)
          }
        } else {
          await sendStatusUpdate('❌ Knowledge search failed', 400)
          enhancedPrompt = (response && response.fallbackPrompt) || customPrompt || ''
        }
      } catch (error) {
        await sendStatusUpdate('❌ Knowledge search failed', 400)
        enhancedPrompt = customPrompt || ''
      }
    }

    // Generate AI data using the enhanced prompt
    await sendStatusUpdate('🤖 Processing with AI...', 200)
    let aiData
    try {
      aiData = await generateFormData(allFields, enhancedPrompt)
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
    await sendStatusUpdate('📝 Filling form fields...', 200)
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


