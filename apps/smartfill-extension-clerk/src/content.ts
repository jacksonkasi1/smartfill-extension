// ** import types
import type { PlasmoCSConfig } from "plasmo"
import type { ExtensionMessage, DetectResult, FillResult } from './types/extension'
import type { RecordingSession, RecordingStep } from './types/recording'

// ** import utils
import { MessageListener, MessagingClient, WebsiteEvents, MessagingTypes, MESSAGE_ACTIONS } from "@/lib/utils/messaging"

// ** import lib
import { detectAllForms, fillForm } from './lib'

// ** import apis
import { generateFormData } from './api'

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"]
}

// Recording state
let currentRecording: RecordingSession | null = null
let isRecording = false
let recordingStartTime = 0
let eventListeners: Array<{ element: Element, event: string, handler: EventListener }> = []

// Initialize recording state from storage on load
async function initializeRecordingState() {
  try {
    const result = await chrome.storage.local.get(['recordingState'])
    if (result.recordingState?.isRecording) {
      // Recording was in progress but content script reloaded
      // Reset to stopped state since we can't recover the session
      await chrome.storage.local.set({
        recordingState: {
          isRecording: false,
          status: 'Ready to record'
        }
      })
    }
  } catch (error) {
    console.error('Failed to initialize recording state:', error)
  }
}

// Initialize on content script load
initializeRecordingState()

// Type-safe website event listeners
WebsiteEvents.onExtensionOpen((data) => {
  MessagingClient.openPopup({ data }).catch(console.error)
})

WebsiteEvents.onWebsiteMessage((eventData) => {
  MessagingClient.openPopup({ data: eventData.data }).catch(console.error)
})

// Type-safe message listener for popup communications
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Content script received message:", message)
  
  const handleMessage = async () => {
    try {
      switch (message.action) {
        case MESSAGE_ACTIONS.FORMS.PING:
          return { success: true, status: "ready" }
          
        case MESSAGE_ACTIONS.FORMS.FILL:
          const result = await fillForms(message.prompt)
          return {
            success: result.success,
            filled: result.filled,
            formCount: result.filled,
            errors: result.errors
          }
          
        case MESSAGE_ACTIONS.RECORDING.START:
          console.log("Starting recording...")
          return await startRecording()
          
        case MESSAGE_ACTIONS.RECORDING.STOP:
          console.log("Stopping recording...")
          return await stopRecording()
          
        case MESSAGE_ACTIONS.RECORDING.PLAY:
          console.log("Playing session:", message.sessionId)
          return await playSession(message.sessionId)
          
        default:
          return { 
            success: false, 
            status: "error",
            error: `Unknown action: ${message.action}` 
          }
      }
    } catch (error) {
      console.error("Message handling error:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Handle async messages properly
  handleMessage()
    .then(response => {
      console.log("Sending response:", response)
      sendResponse(response)
    })
    .catch(error => {
      console.error("Async message handler error:", error)
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    })

  // Return true to indicate we will send a response asynchronously
  return true
})

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

// Recording Functions
function generateSelector(element: Element): string {
  // Try to generate a unique selector for the element
  if (element.id) {
    return `#${element.id}`
  }
  
  if (element.className) {
    const classes = element.className.split(' ').filter(c => c.trim()).join('.')
    if (classes) {
      return `.${classes}`
    }
  }
  
  // Fallback to tag name with nth-child if needed
  const tagName = element.tagName.toLowerCase()
  const parent = element.parentElement
  if (parent) {
    const siblings = Array.from(parent.children).filter(child => child.tagName === element.tagName)
    if (siblings.length > 1) {
      const index = siblings.indexOf(element) + 1
      return `${tagName}:nth-child(${index})`
    }
  }
  
  return tagName
}

async function startRecording(): Promise<{ success: boolean, error?: string }> {
  try {
    if (isRecording) {
      return { success: false, error: "Already recording" }
    }

    const domain = window.location.hostname
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const sessionName = `Session ${new Date().toLocaleTimeString()}`
    
    currentRecording = {
      id: sessionId,
      name: sessionName,
      domain: domain,
      createdAt: new Date(),
      updatedAt: new Date(),
      steps: []
    }
    
    isRecording = true
    recordingStartTime = Date.now()
    
    // Save recording state to storage for popup persistence
    await chrome.storage.local.set({
      recordingState: {
        isRecording: true,
        status: 'Recording in progress...'
      }
    })
    
    // Start listening for user interactions
    setupRecordingListeners()
    
    return { success: true }
  } catch (error) {
    console.error('Error starting recording:', error)
    return { success: false, error: 'Failed to start recording' }
  }
}

async function stopRecording(): Promise<{ success: boolean, error?: string }> {
  try {
    if (!isRecording || !currentRecording) {
      return { success: false, error: "Not recording" }
    }
    
    isRecording = false
    
    // Remove event listeners
    cleanupRecordingListeners()
    
    // Save session to storage
    const sessions = await getStoredSessions()
    sessions.push(currentRecording)
    await chrome.storage.local.set({ recordingSessions: sessions })
    
    // Clear recording state in storage
    await chrome.storage.local.set({
      recordingState: {
        isRecording: false,
        status: 'Ready to record'
      }
    })
    
    currentRecording = null
    recordingStartTime = 0
    
    return { success: true }
  } catch (error) {
    console.error('Error stopping recording:', error)
    return { success: false, error: 'Failed to stop recording' }
  }
}

function setupRecordingListeners() {
  // Setup comprehensive event listeners for all interaction types
  
  // 1. Document-level listeners for global events
  setupDocumentListeners()
  
  // 2. Element-specific listeners for form fields and buttons
  setupElementListeners()
  
  // 3. Mutation observer for dynamic content
  setupMutationObserver()
}

function setupDocumentListeners() {
  // Scroll tracking with throttling
  let scrollTimeout: number | null = null
  const scrollHandler = (event: Event) => {
    if (!isRecording) return
    
    if (scrollTimeout) {
      clearTimeout(scrollTimeout)
    }
    
    scrollTimeout = window.setTimeout(() => {
      recordInteraction('scroll', document.documentElement, JSON.stringify({
        x: window.scrollX,
        y: window.scrollY,
        target: event.target === document ? 'document' : 'element'
      }))
    }, 100) // Throttle scroll events
  }
  document.addEventListener('scroll', scrollHandler, true)
  eventListeners.push({ element: document as any, event: 'scroll', handler: scrollHandler })
  
  // Keydown events for individual keystroke capture
  const keydownHandler = (event: Event) => {
    if (!isRecording) return
    
    const keyboardEvent = event as KeyboardEvent
    // Skip recording if target is not a form field
    const target = keyboardEvent.target as Element
    if (!target.matches('input, textarea, [contenteditable="true"]')) {
      return
    }
    
    recordInteraction('keydown', target, JSON.stringify({
      key: keyboardEvent.key,
      code: keyboardEvent.code,
      ctrlKey: keyboardEvent.ctrlKey,
      altKey: keyboardEvent.altKey,
      shiftKey: keyboardEvent.shiftKey,
      metaKey: keyboardEvent.metaKey
    }))
  }
  document.addEventListener('keydown', keydownHandler, true)
  eventListeners.push({ element: document as any, event: 'keydown', handler: keydownHandler })
  
  // Focus events to track field navigation
  const focusHandler = (event: Event) => {
    if (!isRecording) return
    
    const focusEvent = event as FocusEvent
    const target = focusEvent.target as Element
    if (target.matches('input, textarea, select, [contenteditable="true"]')) {
      recordInteraction('focus', target, '')
    }
  }
  document.addEventListener('focusin', focusHandler, true)
  eventListeners.push({ element: document as any, event: 'focusin', handler: focusHandler })
  
  // Mouse events for more precise interaction tracking
  const mousedownHandler = (event: Event) => {
    if (!isRecording) return
    
    const mouseEvent = event as MouseEvent
    const target = mouseEvent.target as Element
    // Record mouse position for better replay accuracy
    recordInteraction('mousedown', target, JSON.stringify({
      x: mouseEvent.clientX,
      y: mouseEvent.clientY,
      button: mouseEvent.button
    }))
  }
  document.addEventListener('mousedown', mousedownHandler, true)
  eventListeners.push({ element: document as any, event: 'mousedown', handler: mousedownHandler })
}

function setupElementListeners() {
  // Get all interactive elements including dynamic ones
  const elements = document.querySelectorAll('input, textarea, select, button, [role="button"], [onclick], a, [tabindex]')
  
  elements.forEach(element => {
    setupSingleElementListeners(element)
  })
}

function setupSingleElementListeners(element: Element) {
  // Click events with enhanced data
  const clickHandler = (event: Event) => {
    if (!isRecording) return
    
    const mouseEvent = event as MouseEvent
    recordInteraction('click', element, JSON.stringify({
      x: mouseEvent.clientX,
      y: mouseEvent.clientY,
      button: mouseEvent.button,
      ctrlKey: mouseEvent.ctrlKey,
      shiftKey: mouseEvent.shiftKey
    }))
  }
  element.addEventListener('click', clickHandler)
  eventListeners.push({ element, event: 'click', handler: clickHandler })
  
  // Input events for form fields with character-level tracking
  if (element.matches('input, textarea, select, [contenteditable="true"]')) {
    const inputHandler = (event: Event) => {
      if (!isRecording) return
      
      const target = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      recordInteraction('input', element, JSON.stringify({
        value: target.value || (target as any).textContent,
        selectionStart: (target as HTMLInputElement).selectionStart,
        selectionEnd: (target as HTMLInputElement).selectionEnd
      }))
    }
    element.addEventListener('input', inputHandler)
    eventListeners.push({ element, event: 'input', handler: inputHandler })
    
    // Change events for selects and other form controls
    const changeHandler = (event: Event) => {
      if (!isRecording) return
      
      const target = event.target as HTMLSelectElement | HTMLInputElement
      recordInteraction('change', element, JSON.stringify({
        value: target.value,
        selectedIndex: (target as HTMLSelectElement).selectedIndex
      }))
    }
    element.addEventListener('change', changeHandler)
    eventListeners.push({ element, event: 'change', handler: changeHandler })
  }
  
  // Form submission events
  if (element.matches('form')) {
    const submitHandler = (event: Event) => {
      if (!isRecording) return
      
      recordInteraction('submit', element, '')
    }
    element.addEventListener('submit', submitHandler)
    eventListeners.push({ element, event: 'submit', handler: submitHandler })
  }
}

function setupMutationObserver() {
  // Enhanced mutation observer to track dynamic content changes
  const observer = new MutationObserver((mutations) => {
    if (!isRecording) return
    
    mutations.forEach((mutation) => {
      // Track added nodes
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element
          
          // Record modal/popup appearances
          if (element.matches('.modal, .popup, .dialog, [role="dialog"], .overlay')) {
            recordInteraction('modal_open', element, '')
          }
          
          // Setup listeners for new interactive elements
          const newElements = element.querySelectorAll('input, textarea, select, button, [role="button"], [onclick], a, [tabindex]')
          newElements.forEach(setupSingleElementListeners)
          
          // Also check if the added element itself is interactive
          if (element.matches('input, textarea, select, button, [role="button"], [onclick], a, [tabindex]')) {
            setupSingleElementListeners(element)
          }
        }
      })
      
      // Track removed nodes (modal/popup closures)
      mutation.removedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element
          if (element.matches('.modal, .popup, .dialog, [role="dialog"], .overlay')) {
            recordInteraction('modal_close', element, '')
          }
        }
      })
      
      // Track attribute changes (useful for state changes)
      if (mutation.type === 'attributes') {
        const element = mutation.target as Element
        if (mutation.attributeName === 'class' || mutation.attributeName === 'style') {
          // Check if this indicates a modal/popup state change
          if (element.matches('.modal, .popup, .dialog, [role="dialog"], .overlay')) {
            const isVisible = element.checkVisibility?.() ?? getComputedStyle(element).display !== 'none'
            recordInteraction(isVisible ? 'modal_show' : 'modal_hide', element, '')
          }
        }
      }
    })
  })
  
  observer.observe(document.body, { 
    childList: true, 
    subtree: true, 
    attributes: true, 
    attributeFilter: ['class', 'style', 'hidden']
  })
  
  // Store observer reference for cleanup
  ;(window as any).__recordingObserver = observer
}


function recordInteraction(
  type: 'click' | 'input' | 'select' | 'keydown' | 'focus' | 'mousedown' | 'scroll' | 'modal_open' | 'modal_close' | 'modal_show' | 'modal_hide' | 'submit' | 'change', 
  element: Element, 
  value: string
) {
  if (!isRecording || !currentRecording) return
  
  const selector = generateSelector(element)
  const timestamp = Date.now() - recordingStartTime
  
  const step: RecordingStep = {
    id: `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: normalizeStepType(type),
    selector: selector,
    value: value || undefined,
    timestamp: timestamp,
    data: value ? (isJsonString(value) ? JSON.parse(value) : undefined) : undefined
  }
  
  currentRecording.steps.push(step)
  currentRecording.updatedAt = new Date()
}

function normalizeStepType(type: string): 'click' | 'input' | 'select' | 'keydown' | 'focus' | 'mousedown' | 'scroll' | 'modal' | 'submit' {
  switch (type) {
    case 'modal_open':
    case 'modal_close':
    case 'modal_show':
    case 'modal_hide':
      return 'modal'
    case 'change':
      return 'select'
    default:
      return type as 'click' | 'input' | 'select' | 'keydown' | 'focus' | 'mousedown' | 'scroll' | 'submit'
  }
}

function isJsonString(str: string): boolean {
  try {
    JSON.parse(str)
    return true
  } catch (e) {
    return false
  }
}

function cleanupRecordingListeners() {
  eventListeners.forEach(({ element, event, handler }) => {
    element.removeEventListener(event, handler)
  })
  eventListeners = []
  
  // Cleanup mutation observer
  const observer = (window as any).__recordingObserver
  if (observer) {
    observer.disconnect()
    delete (window as any).__recordingObserver
  }
}

async function getStoredSessions(): Promise<RecordingSession[]> {
  try {
    const result = await chrome.storage.local.get(['recordingSessions'])
    return result.recordingSessions || []
  } catch (error) {
    console.error('Error loading sessions:', error)
    return []
  }
}

async function playSession(sessionId: string): Promise<{ success: boolean, error?: string }> {
  try {
    const sessions = await getStoredSessions()
    const session = sessions.find(s => s.id === sessionId)
    
    if (!session) {
      return { success: false, error: 'Session not found' }
    }
    
    // Sort steps by timestamp to ensure correct order
    const sortedSteps = [...session.steps].sort((a, b) => a.timestamp - b.timestamp)
    
    // Play back the session steps with proper timing
    let lastTimestamp = 0
    for (const step of sortedSteps) {
      // Calculate delay based on original timing
      const delay = Math.max(0, step.timestamp - lastTimestamp)
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, Math.min(delay, 2000))) // Cap at 2 seconds
      }
      
      await playStep(step)
      lastTimestamp = step.timestamp
    }
    
    return { success: true }
  } catch (error) {
    console.error('Error playing session:', error)
    return { success: false, error: 'Playback failed' }
  }
}

async function playStep(step: RecordingStep): Promise<void> {
  try {
    const element = document.querySelector(step.selector)
    if (!element) {
      console.warn(`Element not found for selector: ${step.selector}`)
      return
    }
    
    switch (step.type) {
      case 'click':
        // Handle click with position data if available
        if (step.data && typeof step.data === 'object' && 'x' in step.data && 'y' in step.data) {
          const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            clientX: step.data.x as number,
            clientY: step.data.y as number,
            button: (step.data.button as number) || 0
          })
          element.dispatchEvent(clickEvent)
        } else {
          (element as HTMLElement).click()
        }
        break
        
      case 'input':
        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element.matches('[contenteditable="true"]')) {
          // Focus the element
          if (element instanceof HTMLElement) {
            element.focus()
          }
          
          // Handle structured input data
          if (step.data && typeof step.data === 'object' && 'value' in step.data) {
            const inputData = step.data as any
            if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
              element.value = inputData.value || ''
              // Restore cursor position if available
              if (typeof inputData.selectionStart === 'number') {
                element.setSelectionRange(inputData.selectionStart, inputData.selectionEnd || inputData.selectionStart)
              }
            } else {
              // For contenteditable elements
              ;(element as any).textContent = inputData.value || ''
            }
          } else {
            // Fallback to simple value
            if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
              element.value = step.value || ''
            } else {
              ;(element as any).textContent = step.value || ''
            }
          }
          
          element.dispatchEvent(new Event('input', { bubbles: true }))
          element.dispatchEvent(new Event('change', { bubbles: true }))
        }
        break
        
      case 'select':
        if (element instanceof HTMLSelectElement) {
          if (step.data && typeof step.data === 'object' && 'value' in step.data) {
            element.value = (step.data as any).value || ''
          } else {
            element.value = step.value || ''
          }
          element.dispatchEvent(new Event('change', { bubbles: true }))
        }
        break
        
      case 'keydown':
        // Replay individual keystrokes
        if (step.data && typeof step.data === 'object') {
          const keyData = step.data as any
          const keyEvent = new KeyboardEvent('keydown', {
            key: keyData.key,
            code: keyData.code,
            ctrlKey: keyData.ctrlKey,
            altKey: keyData.altKey,
            shiftKey: keyData.shiftKey,
            metaKey: keyData.metaKey,
            bubbles: true
          })
          element.dispatchEvent(keyEvent)
        }
        break
        
      case 'focus':
        if (element instanceof HTMLElement) {
          element.focus()
        }
        break
        
      case 'mousedown':
        if (step.data && typeof step.data === 'object') {
          const mouseData = step.data as any
          const mouseEvent = new MouseEvent('mousedown', {
            bubbles: true,
            cancelable: true,
            clientX: mouseData.x,
            clientY: mouseData.y,
            button: mouseData.button || 0
          })
          element.dispatchEvent(mouseEvent)
        }
        break
        
      case 'scroll':
        // Handle scroll events
        if (step.data && typeof step.data === 'object') {
          const scrollData = step.data as any
          window.scrollTo({
            left: scrollData.x || 0,
            top: scrollData.y || 0,
            behavior: 'smooth'
          })
        }
        break
        
      case 'modal':
        // Modal interactions are typically handled by the framework
        // Just trigger a click on the element to simulate modal open/close
        if (element instanceof HTMLElement) {
          element.click()
        }
        break
        
      case 'submit':
        // Handle form submission
        if (element instanceof HTMLFormElement) {
          element.submit()
        } else {
          // If not a form, trigger click (might be a submit button)
          ;(element as HTMLElement).click()
        }
        break
        
      default:
        console.warn(`Unknown step type: ${step.type}`)
    }
  } catch (error) {
    console.error('Error playing step:', error)
  }
}
