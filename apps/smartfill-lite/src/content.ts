// ** import types
import type { PlasmoCSConfig } from "plasmo"
import type { DetectResult, FillResult } from './types/extension'
import type { RecordingSession, RecordingStep } from './types/recording'

// ** import utils
import { MessageListener, MessagingClient, WebsiteEvents, MESSAGE_ACTIONS } from "@/lib/utils/messaging"

// ** import lib
import { detectAllForms, fillForm } from './lib'

// ** import apis
import { generateFormData } from './api'

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"]
}

// ---------------------------------------------------------------------------
// Recording state (kept independent of the AI fill flow)
// ---------------------------------------------------------------------------
let currentRecording: RecordingSession | null = null
let isRecording = false
let recordingStartTime = 0
let eventListeners: Array<{ element: Element, event: string, handler: EventListener }> = []

async function initializeRecordingState() {
  try {
    const result = await chrome.storage.local.get(['recordingState'])
    if (result.recordingState?.isRecording) {
      await chrome.storage.local.set({
        recordingState: { isRecording: false, status: 'Ready to record' }
      })
    }
  } catch (error) {
    console.error('Failed to initialize recording state:', error)
  }
}

initializeRecordingState()

WebsiteEvents.onExtensionOpen((data) => {
  MessagingClient.openPopup({ data }).catch(console.error)
})
WebsiteEvents.onWebsiteMessage((eventData) => {
  MessagingClient.openPopup({ data: eventData.data }).catch(console.error)
})

// ---------------------------------------------------------------------------
// Message handling
// ---------------------------------------------------------------------------
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const handleMessage = async () => {
    try {
      switch (message.action) {
        case MESSAGE_ACTIONS.FORMS.PING:
          return { success: true, status: "ready" }

        case MESSAGE_ACTIONS.FORMS.FILL: {
          const result = await fillForms(message.prompt)
          return {
            success: result.success,
            filled: result.filled,
            formCount: result.filled,
            errors: result.errors
          }
        }

        case MESSAGE_ACTIONS.RECORDING.START:
          return await startRecording()
        case MESSAGE_ACTIONS.RECORDING.STOP:
          return await stopRecording()
        case MESSAGE_ACTIONS.RECORDING.PLAY:
          return await playSession(message.sessionId)

        default:
          return { success: false, status: "error", error: `Unknown action: ${message.action}` }
      }
    } catch (error) {
      console.error("Message handling error:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  handleMessage()
    .then(response => sendResponse(response))
    .catch(error => {
      console.error("Async message handler error:", error)
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    })
  return true
})

// ---------------------------------------------------------------------------
// Core fill pipeline: Detect -> Context -> AI -> Fill
// ---------------------------------------------------------------------------
async function fillForms(customPrompt?: string): Promise<FillResult> {
  const totalStart = performance.now()

  // 0) Read the Safe Filling Mode setting from chrome.storage.sync.
  // Default OFF — never default this to true. Existing users with
  // no stored setting must receive unrestricted filling.
  let safeFillingMode = false
  try {
    const stored = await chrome.storage.sync.get(['safeFillingMode'])
    safeFillingMode = stored.safeFillingMode === true
  } catch (err) {
    console.error('[SmartFill] Failed to read safeFillingMode setting:', err)
  }

  // 1) Detect
  const detectStart = performance.now()
  const detectResult = await detectAllForms()
  const detectMs = performance.now() - detectStart

  if (!detectResult.success || detectResult.forms.length === 0) {
    return { success: false, filled: 0, errors: ['No forms detected on this page'] }
  }
  const allFields = detectResult.forms.flatMap(f => f.fields)
  if (allFields.length === 0) {
    return { success: false, filled: 0, errors: ['No fillable fields found'] }
  }

  // 2) AI prepare + request + parse
  const aiResult = await generateFormData(allFields, customPrompt, { safeFillingMode })
  const { data: aiData, timings: aiTimings } = aiResult

  // 3) Fill
  const fillStart = performance.now()
  const fillResult = await fillForm(allFields, aiData)
  const fillMs = performance.now() - fillStart

  // 4) Performance instrumentation (dev only)
  const totalMs = performance.now() - totalStart
  const failed = allFields.length - fillResult.filled
  if (process.env.NODE_ENV !== 'production') {
    const lines = [
      '[SmartFill Performance]',
      '',
      `Fields detected: ${allFields.length}`,
      `Safe Filling Mode: ${safeFillingMode ? 'ON' : 'OFF'}`,
      `Detection: ${detectMs.toFixed(0)}ms`,
      `Prompt build: ${aiTimings.promptMs.toFixed(0)}ms`,
      `AI API: ${aiTimings.apiMs.toFixed(0)}ms`,
      `Parsing: ${aiTimings.parseMs.toFixed(0)}ms`,
      `Fill: ${fillMs.toFixed(0)}ms`,
      `Total: ${totalMs.toFixed(0)}ms`,
      '',
      `Filled: ${fillResult.filled}`,
      `Failed: ${failed}`
    ]
    console.log(lines.join('\n'))
  }

  return fillResult
}

// ---------------------------------------------------------------------------
// Recording helpers (unchanged structurally)
// ---------------------------------------------------------------------------
function generateSelector(element: Element): string {
  if (element.id) {
    return `#${safeEscape(element.id)}`
  }
  // classList works for HTMLElement and SVGElement; className.split
  // can return a non-string (SVGAnimatedString) for SVG nodes.
  if (element.classList && element.classList.length > 0) {
    const classes = Array.from(element.classList)
      .map(c => safeEscape(c))
      .filter(Boolean)
      .join('.')
    if (classes) return `.${classes}`
  }
  const tagName = element.tagName.toLowerCase()
  const parent = element.parentElement
  if (parent) {
    const siblings = Array.from(parent.children).filter(c => c.tagName === element.tagName)
    if (siblings.length > 1) {
      const index = siblings.indexOf(element) + 1
      return `${tagName}:nth-child(${index})`
    }
  }
  return tagName
}

function safeEscape(value: string): string {
  if (!value) return ''
  const css = (window as any).CSS
  if (css && typeof css.escape === 'function') return css.escape(value)
  // Minimal fallback: escape characters that have meaning in CSS
  // selectors. Good enough for the few real-world class names we see.
  return value.replace(/(["\\:#.>+~*[\]()'\s,])/g, '\\$1')
}

async function startRecording(): Promise<{ success: boolean, error?: string }> {
  try {
    if (isRecording) return { success: false, error: "Already recording" }
    const domain = window.location.hostname
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const sessionName = `Session ${new Date().toLocaleTimeString()}`
    currentRecording = {
      id: sessionId, name: sessionName, domain,
      createdAt: new Date(), updatedAt: new Date(), steps: []
    }
    isRecording = true
    recordingStartTime = Date.now()
    await chrome.storage.local.set({
      recordingState: { isRecording: true, status: 'Recording in progress...' }
    })
    setupRecordingListeners()
    return { success: true }
  } catch (error) {
    console.error('Error starting recording:', error)
    return { success: false, error: 'Failed to start recording' }
  }
}

async function stopRecording(): Promise<{ success: boolean, error?: string }> {
  try {
    if (!isRecording || !currentRecording) return { success: false, error: "Not recording" }
    isRecording = false
    cleanupRecordingListeners()
    const sessions = await getStoredSessions()
    sessions.push(currentRecording)
    await chrome.storage.local.set({ recordingSessions: sessions })
    await chrome.storage.local.set({
      recordingState: { isRecording: false, status: 'Ready to record' }
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
  setupDocumentListeners()
  setupElementListeners()
  setupMutationObserver()
}

function setupDocumentListeners() {
  let scrollTimeout: number | null = null
  const scrollHandler = (event: Event) => {
    if (!isRecording) return
    if (scrollTimeout) clearTimeout(scrollTimeout)
    scrollTimeout = window.setTimeout(() => {
      recordInteraction('scroll', document.documentElement, JSON.stringify({
        x: window.scrollX, y: window.scrollY,
        target: event.target === document ? 'document' : 'element'
      }))
    }, 100)
  }
  document.addEventListener('scroll', scrollHandler, true)
  eventListeners.push({ element: document as any, event: 'scroll', handler: scrollHandler })

  const keydownHandler = (event: Event) => {
    if (!isRecording) return
    const kb = event as KeyboardEvent
    const target = kb.target as Element
    if (!target.matches('input, textarea, [contenteditable="true"]')) return
    recordInteraction('keydown', target, JSON.stringify({
      key: kb.key, code: kb.code,
      ctrlKey: kb.ctrlKey, altKey: kb.altKey,
      shiftKey: kb.shiftKey, metaKey: kb.metaKey
    }))
  }
  document.addEventListener('keydown', keydownHandler, true)
  eventListeners.push({ element: document as any, event: 'keydown', handler: keydownHandler })

  const focusHandler = (event: Event) => {
    if (!isRecording) return
    const fe = event as FocusEvent
    const target = fe.target as Element
    if (target.matches('input, textarea, select, [contenteditable="true"]')) {
      recordInteraction('focus', target, '')
    }
  }
  document.addEventListener('focusin', focusHandler, true)
  eventListeners.push({ element: document as any, event: 'focusin', handler: focusHandler })

  const mousedownHandler = (event: Event) => {
    if (!isRecording) return
    const me = event as MouseEvent
    recordInteraction('mousedown', me.target as Element, JSON.stringify({
      x: me.clientX, y: me.clientY, button: me.button
    }))
  }
  document.addEventListener('mousedown', mousedownHandler, true)
  eventListeners.push({ element: document as any, event: 'mousedown', handler: mousedownHandler })
}

function setupElementListeners() {
  document.querySelectorAll('input, textarea, select, button, [role="button"], [onclick], a, [tabindex]')
    .forEach(setupSingleElementListeners)
}

function setupSingleElementListeners(element: Element) {
  const clickHandler = (event: Event) => {
    if (!isRecording) return
    const me = event as MouseEvent
    recordInteraction('click', element, JSON.stringify({
      x: me.clientX, y: me.clientY, button: me.button,
      ctrlKey: me.ctrlKey, shiftKey: me.shiftKey
    }))
  }
  element.addEventListener('click', clickHandler)
  eventListeners.push({ element, event: 'click', handler: clickHandler })

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

  if (element.matches('form')) {
    const submitHandler = () => { if (isRecording) recordInteraction('submit', element, '') }
    element.addEventListener('submit', submitHandler)
    eventListeners.push({ element, event: 'submit', handler: submitHandler })
  }
}

function setupMutationObserver() {
  const observer = new MutationObserver((mutations) => {
    if (!isRecording) return
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element
          if (element.matches('.modal, .popup, .dialog, [role="dialog"], .overlay')) {
            recordInteraction('modal_open', element, '')
          }
          element.querySelectorAll('input, textarea, select, button, [role="button"], [onclick], a, [tabindex]')
            .forEach(setupSingleElementListeners)
          if (element.matches('input, textarea, select, button, [role="button"], [onclick], a, [tabindex]')) {
            setupSingleElementListeners(element)
          }
        }
      })
      mutation.removedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element
          if (element.matches('.modal, .popup, .dialog, [role="dialog"], .overlay')) {
            recordInteraction('modal_close', element, '')
          }
        }
      })
      if (mutation.type === 'attributes') {
        const element = mutation.target as Element
        if (mutation.attributeName === 'class' || mutation.attributeName === 'style') {
          if (element.matches('.modal, .popup, .dialog, [role="dialog"], .overlay')) {
            const isVisible = element.checkVisibility?.() ?? getComputedStyle(element).display !== 'none'
            recordInteraction(isVisible ? 'modal_show' : 'modal_hide', element, '')
          }
        }
      }
    })
  })
  observer.observe(document.body, {
    childList: true, subtree: true, attributes: true,
    attributeFilter: ['class', 'style', 'hidden']
  })
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
    selector,
    value: value || undefined,
    timestamp,
    data: value ? (isJsonString(value) ? JSON.parse(value) : undefined) : undefined
  }
  currentRecording.steps.push(step)
  currentRecording.updatedAt = new Date()
}

function normalizeStepType(type: string): 'click' | 'input' | 'select' | 'keydown' | 'focus' | 'mousedown' | 'scroll' | 'modal' | 'submit' {
  switch (type) {
    case 'modal_open': case 'modal_close': case 'modal_show': case 'modal_hide': return 'modal'
    case 'change': return 'select'
    default: return type as any
  }
}

function isJsonString(str: string): boolean {
  try { JSON.parse(str); return true } catch { return false }
}

function cleanupRecordingListeners() {
  eventListeners.forEach(({ element, event, handler }) => {
    element.removeEventListener(event, handler)
  })
  eventListeners = []
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
  } catch {
    return []
  }
}

async function playSession(sessionId: string): Promise<{ success: boolean, error?: string }> {
  try {
    const sessions = await getStoredSessions()
    const session = sessions.find(s => s.id === sessionId)
    if (!session) return { success: false, error: 'Session not found' }
    const sorted = [...session.steps].sort((a, b) => a.timestamp - b.timestamp)
    let last = 0
    for (const step of sorted) {
      const gap = Math.max(0, step.timestamp - last)
      if (gap > 0) await new Promise(r => setTimeout(r, Math.min(gap, 2000)))
      await playStep(step)
      last = step.timestamp
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
    if (!element) return
    switch (step.type) {
      case 'click':
        if (step.data && 'x' in step.data && 'y' in step.data) {
          element.dispatchEvent(new MouseEvent('click', {
            bubbles: true, cancelable: true,
            clientX: step.data.x as number, clientY: step.data.y as number,
            button: (step.data.button as number) || 0
          }))
        } else {
          (element as HTMLElement).click()
        }
        break
      case 'input':
        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element.matches('[contenteditable="true"]')) {
          if (element instanceof HTMLElement) element.focus()
          if (step.data && 'value' in step.data) {
            const d = step.data as any
            if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
              element.value = d.value || ''
              if (typeof d.selectionStart === 'number') {
                element.setSelectionRange(d.selectionStart, d.selectionEnd || d.selectionStart)
              }
            } else {
              (element as any).textContent = d.value || ''
            }
          } else {
            if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
              element.value = step.value || ''
            } else {
              (element as any).textContent = step.value || ''
            }
          }
          element.dispatchEvent(new Event('input', { bubbles: true }))
          element.dispatchEvent(new Event('change', { bubbles: true }))
        }
        break
      case 'select':
        if (element instanceof HTMLSelectElement) {
          const v = (step.data as any)?.value ?? step.value ?? ''
          element.value = v
          element.dispatchEvent(new Event('change', { bubbles: true }))
        }
        break
      case 'keydown':
        if (step.data) {
          const d = step.data as any
          element.dispatchEvent(new KeyboardEvent('keydown', {
            key: d.key, code: d.code,
            ctrlKey: d.ctrlKey, altKey: d.altKey,
            shiftKey: d.shiftKey, metaKey: d.metaKey,
            bubbles: true
          }))
        }
        break
      case 'focus':
        if (element instanceof HTMLElement) element.focus()
        break
      case 'mousedown':
        if (step.data) {
          const d = step.data as any
          element.dispatchEvent(new MouseEvent('mousedown', {
            bubbles: true, cancelable: true,
            clientX: d.x, clientY: d.y, button: d.button || 0
          }))
        }
        break
      case 'scroll':
        if (step.data) {
          const d = step.data as any
          window.scrollTo({ left: d.x || 0, top: d.y || 0, behavior: 'smooth' })
        }
        break
      case 'modal':
        if (element instanceof HTMLElement) element.click()
        break
      case 'submit':
        if (element instanceof HTMLFormElement) element.submit()
        else (element as HTMLElement).click()
        break
      default:
        console.warn(`Unknown step type: ${step.type}`)
    }
  } catch (error) {
    console.error('Error playing step:', error)
  }
}
