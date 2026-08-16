// ** import core packages
import React, { useState, useEffect } from "react"

// ** import types
import type { LLMProvider } from "@/api/ai/constants"

// ** import constants
import { PROVIDERS, DEFAULT_PROVIDER, DEFAULT_MODELS } from "@/api/ai/constants"

// ** import utils
import { MESSAGE_ACTIONS } from "@/lib/utils/messaging"

// ** import styles
import "./styles/index.css"

// ** import assets
import iconUrl from "data-base64:~assets/icons/icon.png"

// ** import icons
import {
  DownloadIcon,
  UploadIcon,
  RefreshIcon,
  ArrowLeftIcon,
  CloseIcon,
  SettingsIcon,
  MenuIcon,
  RecordIcon,
  StopIcon
} from "./assets/ts-icons"

// Simple inline trash icon (kept local so we don't have to add an extra icon file)
const TrashIcon = ({ width = 16, height = 16, className = "" }) => (
  <svg width={width} height={height} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3,6 5,6 21,6"></polyline>
    <path d="m19,6v14a2,2 0,0 1,-2,2H7a2,2 0,0 1,-2,-2V6m3,0V4a2,2 0,0 1,2,-2h4a2,2 0,0 1,2,2v2"></path>
    <line x1="10" y1="11" x2="10" y2="17"></line>
    <line x1="14" y1="11" x2="14" y2="17"></line>
  </svg>
)

// ---------------------------------------------------------------------------
// SettingsModal — AI provider, model, API key, and recording export/import.
// No auth, no RAG.
// ---------------------------------------------------------------------------
function SettingsModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider>(DEFAULT_PROVIDER)
  const [modelType, setModelType] = useState<'recommended' | 'custom'>('recommended')
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [customModel, setCustomModel] = useState<string>('')
  const [providerDropdownOpen, setProviderDropdownOpen] = useState(false)
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false)
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({
    gemini: '',
    groq: '',
    openrouter: ''
  })
  const [keyStatus, setKeyStatus] = useState<{ message: string, type: 'success' | 'error' | null }>({ message: '', type: null })
  const [isLoading, setIsLoading] = useState(false)
  const [showStatusBar, setShowStatusBar] = useState(false)

  useEffect(() => {
    if (isOpen) loadSettings()
  }, [isOpen])

  const loadSettings = async () => {
    try {
      const result = await chrome.storage.sync.get([
        'llmProvider',
        'llmModel',
        'llmApiKeys',
        'showStatusBar'
      ])

      const provider: LLMProvider = (result.llmProvider as LLMProvider) || DEFAULT_PROVIDER
      setSelectedProvider(provider)

      const model: string = (result.llmModel as string) || DEFAULT_MODELS[provider]
      setSelectedModel(model)

      const isRecommended = PROVIDERS[provider].models.some((m: { id: string }) => m.id === model)
      if (!isRecommended && model) {
        setModelType('custom')
        setCustomModel(model)
      } else {
        setModelType('recommended')
      }

      const loadedApiKeys = result.llmApiKeys || {}
      setApiKeys({
        gemini: loadedApiKeys.gemini || '',
        groq: loadedApiKeys.groq || '',
        openrouter: loadedApiKeys.openrouter || ''
      })

      if (result.showStatusBar !== undefined) setShowStatusBar(result.showStatusBar)
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  const saveProviderSettings = async () => {
    const currentApiKey = apiKeys[selectedProvider]

    if (!currentApiKey?.trim()) {
      setKeyStatus({ message: `Please enter an API key for ${PROVIDERS[selectedProvider].name}`, type: 'error' })
      return
    }

    setIsLoading(true)
    try {
      await chrome.storage.sync.set({
        llmProvider: selectedProvider,
        llmModel: selectedModel,
        llmApiKeys: apiKeys
      })
      setKeyStatus({ message: 'Settings saved successfully!', type: 'success' })
      setTimeout(() => setKeyStatus({ message: '', type: null }), 3000)
    } catch (error) {
      console.error('Save settings error:', error)
      setKeyStatus({ message: 'Failed to save settings', type: 'error' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleProviderChange = (provider: LLMProvider) => {
    setSelectedProvider(provider)
    setProviderDropdownOpen(false)
    const defaultModel = DEFAULT_MODELS[provider]
    setSelectedModel(defaultModel)
    setModelType('recommended')
    setCustomModel('')
  }

  const handleModelTypeChange = (type: 'recommended' | 'custom') => {
    setModelType(type)
    if (type === 'recommended') {
      setSelectedModel(DEFAULT_MODELS[selectedProvider])
      setCustomModel('')
    } else {
      setCustomModel(selectedModel)
    }
  }

  const handleRecommendedModelChange = (modelId: string) => {
    setSelectedModel(modelId)
    setModelDropdownOpen(false)
  }

  const handleCustomModelChange = (value: string) => {
    setCustomModel(value)
    setSelectedModel(value)
  }

  const handleApiKeyChange = (provider: string, value: string) => {
    setApiKeys(prev => ({ ...prev, [provider]: value }))
  }

  // The showStatusBar setting is persisted inline in the checkbox
  // onChange handler (reading the actual event value, not React state,
  // to avoid a stale-state race). No need for a separate helper here.

  if (!isOpen) return null

  return (
    <div className={`settings-modal ${isOpen ? '' : 'hidden'}`}>
      <div className="settings-content">
        <div className="settings-header">
          <button className="back-btn" aria-label="Back" onClick={onClose}>
            <ArrowLeftIcon width={20} height={20} />
          </button>
          <h2>Settings</h2>
        </div>

        <div className="settings-body">
          {/* AI Provider Settings */}
          <div className="setting-group">
            <h3>AI Provider</h3>
            <p className="setting-description">Configure your preferred AI provider and model for form filling</p>

            <div className="setting-row">
              <label>Provider</label>
              <div className="custom-select-wrapper">
                <button
                  type="button"
                  className="custom-select-trigger"
                  onClick={() => setProviderDropdownOpen(!providerDropdownOpen)}
                  onBlur={() => setTimeout(() => setProviderDropdownOpen(false), 200)}
                >
                  <span>{PROVIDERS[selectedProvider].name}</span>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="chevron-icon">
                    <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                {providerDropdownOpen && (
                  <div className="custom-select-dropdown">
                    {Object.entries(PROVIDERS).map(([key, config]) => (
                      <button
                        key={key}
                        type="button"
                        className={`custom-select-option ${selectedProvider === key ? 'selected' : ''}`}
                        onClick={() => handleProviderChange(key as LLMProvider)}
                      >
                        {config.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="setting-row">
              <label>Model</label>
              <div className="model-type-toggle">
                <button
                  type="button"
                  className={`toggle-btn ${modelType === 'recommended' ? 'active' : ''}`}
                  onClick={() => handleModelTypeChange('recommended')}
                >
                  Recommended
                </button>
                <button
                  type="button"
                  className={`toggle-btn ${modelType === 'custom' ? 'active' : ''}`}
                  onClick={() => handleModelTypeChange('custom')}
                >
                  Custom
                </button>
              </div>
            </div>

            <div className="setting-row">
              <label>{modelType === 'recommended' ? 'Select Model' : 'Custom Model ID'}</label>
              {modelType === 'recommended' ? (
                <div className="custom-select-wrapper">
                  <button
                    type="button"
                    className="custom-select-trigger"
                    onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                    onBlur={() => setTimeout(() => setModelDropdownOpen(false), 200)}
                  >
                    <span className="model-display">
                      {PROVIDERS[selectedProvider].models.find(m => m.id === selectedModel)?.name || selectedModel}
                    </span>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="chevron-icon">
                      <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  {modelDropdownOpen && (
                    <div className="custom-select-dropdown">
                      {PROVIDERS[selectedProvider].models.map((model) => (
                        <button
                          key={model.id}
                          type="button"
                          className={`custom-select-option ${selectedModel === model.id ? 'selected' : ''}`}
                          onClick={() => handleRecommendedModelChange(model.id)}
                        >
                          <div className="model-option-content">
                            <div className="model-name">{model.name}</div>
                            {model.description && (
                              <div className="model-description">{model.description}</div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <input
                  type="text"
                  className="custom-model-input"
                  placeholder="e.g., llama-3.1-8b-instant"
                  value={customModel}
                  onChange={(e) => handleCustomModelChange(e.target.value)}
                />
              )}
            </div>

            <div className="setting-row">
              <label htmlFor="apiKey">{PROVIDERS[selectedProvider].name} API Key</label>
              <div className="input-group">
                <input
                  type="password"
                  id="apiKey"
                  placeholder={`Enter your ${PROVIDERS[selectedProvider].name} API key`}
                  value={apiKeys[selectedProvider]}
                  onChange={(e) => handleApiKeyChange(selectedProvider, e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveProviderSettings()}
                />
                <button
                  className="save-btn"
                  onClick={saveProviderSettings}
                  disabled={isLoading}
                >
                  {isLoading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>

            {keyStatus.message && (
              <div className={`key-status ${keyStatus.type}`}>
                {keyStatus.message}
              </div>
            )}

            <div className="active-config-indicator">
              <div className="config-label">Active Configuration:</div>
              <div className="config-details">
                <span className="provider-badge">{PROVIDERS[selectedProvider].name}</span>
                <span className="config-separator">·</span>
                <span className="model-id">{selectedModel || 'Not set'}</span>
                {modelType === 'custom' && selectedModel && (
                  <span className="custom-badge">Custom</span>
                )}
              </div>
            </div>
          </div>

          {/* Display Settings */}
          <div className="setting-group">
            <h3>Display</h3>
            <p className="setting-description">Customize the extension's user interface</p>

            <div className="setting-row">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={showStatusBar}
                  onChange={(e) => {
                    const checked = e.target.checked
                    setShowStatusBar(checked)
                    // Persist the actual event value, not the (still
                    // stale) React state, to avoid a race where
                    // storage.sync.set writes the previous value.
                    chrome.storage.sync.set({ showStatusBar: checked }).catch((err) => {
                      console.error('Save UI settings error:', err)
                    })
                  }}
                />
                <span>Show status bar</span>
              </label>
            </div>
          </div>

          {/* Export / Import sessions — kept from the recording feature */}
          <div className="setting-group">
            <h3>Export Sessions</h3>
            <p className="setting-description">Download your recording sessions as JSON files</p>
            <div className="export-buttons">
              <button id="exportCurrentDomain" className="export-btn">
                <DownloadIcon width={20} height={20} />
                Current Domain
              </button>
              <button id="exportAllSessions" className="export-btn">
                <DownloadIcon width={20} height={20} />
                All Sessions
              </button>
            </div>
            <div id="exportStatus" className="export-status hidden"></div>
          </div>

          <div className="setting-group">
            <h3>Import Sessions</h3>
            <p className="setting-description">Upload JSON files to restore sessions</p>
            <div className="import-section">
              <label htmlFor="importFile" className="file-input-label">
                <UploadIcon width={20} height={20} />
                Choose File
              </label>
              <input type="file" id="importFile" accept=".json" style={{ display: "none" }} />
              <div className="import-options">
                <label className="checkbox-label">
                  <input type="checkbox" id="overwriteExisting" />
                  <span>Overwrite existing sessions with same ID</span>
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" id="domainFilterImport" />
                  <span>Only import sessions for current domain</span>
                </label>
              </div>
              <button id="importSessions" className="import-btn" disabled>
                <UploadIcon width={20} height={20} />
                Import Sessions
              </button>
            </div>
            <div id="importStatus" className="import-status hidden"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// FormFillerContent — simple, no auth.
// ---------------------------------------------------------------------------
function FormFillerContent() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState('formFill')
  const [promptText, setPromptText] = useState('')
  const [isFormFilling, setIsFormFilling] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{text: string, type: 'success' | 'error' | 'info'} | null>(null)
  const [showStatusBar, setShowStatusBar] = useState(false)
  // Set to true once the initial chrome.storage.sync read for
  // customInstructions / showStatusBar has finished. While false, we
  // do NOT write back to storage — this prevents the empty initial
  // state from clobbering the saved user context on first paint.
  const [settingsLoaded, setSettingsLoaded] = useState(false)

  // Recording state (kept independent of the AI fill flow)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingStatus, setRecordingStatus] = useState('Ready to record')
  const [sessions, setSessions] = useState<any[]>([])
  const [isLoadingSessions, setIsLoadingSessions] = useState(false)
  const [deletingSessionIds, setDeletingSessionIds] = useState<Set<string>>(new Set())

  const togglePage = async () => {
    const newPage = currentPage === 'formFill' ? 'recordSession' : 'formFill'
    setCurrentPage(newPage)
    await chrome.storage.local.set({ currentPage: newPage })
  }

  useEffect(() => {
    const loadSavedState = async () => {
      try {
        const result = await chrome.storage.local.get(['currentPage', 'recordingState'])
        if (result.currentPage) setCurrentPage(result.currentPage)
        if (result.recordingState) {
          setIsRecording(result.recordingState.isRecording)
          setRecordingStatus(result.recordingState.status)
        }
      } catch (error) {
        console.error('Failed to load saved state:', error)
      }
    }
    loadSavedState()
  }, [])

  useEffect(() => {
    const loadUISettings = async () => {
      try {
        const result = await chrome.storage.sync.get(['showStatusBar', 'customInstructions'])
        if (result.showStatusBar !== undefined) setShowStatusBar(result.showStatusBar)
        if (result.customInstructions) setPromptText(result.customInstructions)
      } catch (error) {
        console.error('Failed to load UI settings:', error)
      } finally {
        setSettingsLoaded(true)
      }
    }
    loadUISettings()
  }, [])

  useEffect(() => {
    const saveRecordingState = async () => {
      try {
        await chrome.storage.local.set({
          recordingState: { isRecording, status: recordingStatus }
        })
      } catch (error) {
        console.error('Failed to save recording state:', error)
      }
    }
    saveRecordingState()
  }, [isRecording, recordingStatus])

  // Persist custom instructions, but only after the initial storage
  // load has finished, and debounced so we do not write on every
  // keystroke. Chrome sync storage has write limits; an initial empty
  // value from a quick re-render would otherwise clobber the saved
  // value before it has finished loading.
  useEffect(() => {
    if (!settingsLoaded) return
    const timer = setTimeout(() => {
      chrome.storage.sync.set({ customInstructions: promptText }).catch((err) => {
        console.error('Failed to save custom instructions:', err)
      })
    }, 400)
    return () => clearTimeout(timer)
  }, [promptText, settingsLoaded])

  const deleteSession = async (sessionId: string) => {
    setDeletingSessionIds(prev => new Set(prev).add(sessionId))
    try {
      const result = await chrome.storage.local.get(['recordingSessions'])
      const allSessions = result.recordingSessions || []
      const filteredSessions = allSessions.filter((session: any) => session.id !== sessionId)
      await chrome.storage.local.set({ recordingSessions: filteredSessions })
      setSessions(prev => prev.filter(session => session.id !== sessionId))
      showStatus('Session deleted successfully!', 'success')
    } catch (error) {
      console.error('Error deleting session:', error)
      showStatus('Failed to delete session', 'error')
    } finally {
      setDeletingSessionIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(sessionId)
        return newSet
      })
    }
  }

  const showStatus = (text: string, type: 'success' | 'error' | 'info') => {
    setStatusMessage({ text, type })
    setTimeout(() => setStatusMessage(null), 4000)
  }

  const clearCustomInstructions = async () => {
    setPromptText('')
    try {
      await chrome.storage.sync.remove('customInstructions')
    } catch (error) {
      console.error('Failed to clear custom instructions:', error)
    }
  }

  // Recording
  const startRecording = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab?.id) {
        showStatus("No active tab found", 'error')
        return
      }
      if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('chrome-extension://') ||
          tab.url?.startsWith('about:') || tab.url?.startsWith('edge://')) {
        showStatus("Cannot record on browser internal pages", 'error')
        return
      }

      try {
        await chrome.tabs.sendMessage(tab.id, { action: MESSAGE_ACTIONS.FORMS.PING })
      } catch (error) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["content.js"]
          })
          // executeScript() resolves only after the script has finished
          // loading, so no fixed delay is needed before sending the
          // first real message.
        } catch (scriptError) {
          showStatus("Failed to inject content script", 'error')
          return
        }
      }

      const response = await chrome.tabs.sendMessage(tab.id, { action: MESSAGE_ACTIONS.RECORDING.START })

      if (response?.success) {
        setIsRecording(true)
        setRecordingStatus('Recording in progress...')
        showStatus('Recording started!', 'success')
      } else {
        const errorMsg = response?.error || 'Failed to start recording'
        showStatus(errorMsg, 'error')
      }
    } catch (error) {
      console.error("Error starting recording:", error)
      showStatus(`Failed to start recording: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
    }
  }

  const stopRecording = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab?.id) {
        showStatus("No active tab found", 'error')
        return
      }
      const response = await chrome.tabs.sendMessage(tab.id, { action: MESSAGE_ACTIONS.RECORDING.STOP })
      if (response?.success) {
        setIsRecording(false)
        setRecordingStatus('Ready to record')
        showStatus('Recording stopped and saved!', 'success')
        loadSessions()
      } else {
        showStatus('Failed to stop recording', 'error')
      }
    } catch (error) {
      console.error("Error stopping recording:", error)
      showStatus('Failed to stop recording', 'error')
    }
  }

  const loadSessions = async () => {
    setIsLoadingSessions(true)
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab?.url) return
      const domain = new URL(tab.url).hostname
      const result = await chrome.storage.local.get(['recordingSessions'])
      const allSessions = result.recordingSessions || []
      const domainSessions = allSessions.filter((session: any) => session.domain === domain)
      setSessions(domainSessions)
    } catch (error) {
      console.error("Error loading sessions:", error)
      setSessions([])
    } finally {
      setIsLoadingSessions(false)
    }
  }

  const playSession = async (sessionId: string) => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab?.id) {
        showStatus("No active tab found", 'error')
        return
      }
      showStatus('Starting playback...', 'info')
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: MESSAGE_ACTIONS.RECORDING.PLAY,
        sessionId
      })
      if (response?.success) showStatus('Playback completed!', 'success')
      else showStatus('Playback failed', 'error')
    } catch (error) {
      console.error("Error playing session:", error)
      showStatus('Playback failed', 'error')
    }
  }

  useEffect(() => {
    if (currentPage === 'recordSession') loadSessions()
  }, [currentPage])

  // Main fill handler — sends the custom prompt (context) and the page's
  // form fields to the AI, then fills the result back. No auth, no RAG.
  const handleFillForms = async () => {
    if (isFormFilling) return
    setIsFormFilling(true)
    setStatusMessage({ text: 'Initializing...', type: 'info' })

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab?.id) {
        showStatus("No active tab found", 'error')
        return
      }
      if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('chrome-extension://') ||
          tab.url?.startsWith('about:') || tab.url?.startsWith('edge://')) {
        showStatus("Cannot run on browser internal pages", 'error')
        return
      }

      try {
        await chrome.tabs.sendMessage(tab.id, { action: MESSAGE_ACTIONS.FORMS.PING })
      } catch (error) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["content.js"]
          })
          // executeScript() resolves after the script has loaded; no
          // artificial delay before sending the real message.
        } catch (scriptError) {
          showStatus("Failed to inject content script", 'error')
          return
        }
      }

      const response = await chrome.tabs.sendMessage(tab.id, {
        action: MESSAGE_ACTIONS.FORMS.FILL,
        prompt: promptText
      })

      if (response?.success) {
        const filled = response.filled || 0
        if (filled > 0) {
          showStatus(`Successfully filled ${filled} field${filled > 1 ? 's' : ''}!`, 'success')
        } else {
          showStatus('No fields were filled', 'error')
        }
      } else {
        const errorMessage = response?.errors?.[0] || response?.error || 'Form filling failed'
        if (errorMessage.includes('API key')) {
          showStatus('Please configure your AI provider API key in settings', 'error')
        } else {
          showStatus(errorMessage, 'error')
        }
      }
    } catch (error) {
      console.error("Error filling forms:", error)
      const errorMessage = (error as Error).message || 'Connection error'
      if (errorMessage.includes('not loaded') || errorMessage.includes('refresh')) {
        showStatus('Please refresh page and try again', 'error')
      } else {
        showStatus('Connection error - please try again', 'error')
      }
    } finally {
      setIsFormFilling(false)
    }
  }

  return (
    <>
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <div className="container">
        {/* Header — no auth controls. */}
        <div className="header">
          <div className="header-left-buttons">
            <button className="settings-btn" aria-label="Settings" onClick={() => setSettingsOpen(true)}>
              <SettingsIcon width={20} height={20} />
            </button>
            <button className="page-toggle-btn" aria-label="Toggle Page" onClick={togglePage}>
              <MenuIcon width={20} height={20} />
            </button>
          </div>
          <div className="header-center">
            <div className="logo">
              <img src={iconUrl} alt="SmartFill" width="40" height="40" />
            </div>
          </div>
          <div className="header-right">
            {/* No account controls */}
          </div>
        </div>

        {showStatusBar && statusMessage && (
          <div className={`status ${statusMessage.type}`}>
            {statusMessage.text}
          </div>
        )}

        {currentPage === 'formFill' && (
          <div id="formFillPage" className="page-content">
            <div className="prompt-section">
              <div className="prompt-header">
                <label htmlFor="mainPromptText" className="prompt-label">Custom Instructions (Optional)</label>
                {promptText && (
                  <button
                    className="clear-instructions-btn"
                    onClick={clearCustomInstructions}
                    title="Clear custom instructions"
                  >
                    Clear
                  </button>
                )}
              </div>
              <textarea
                id="mainPromptText"
                className="main-prompt-textarea"
                placeholder={`Add specific instructions for form filling, or leave empty for smart defaults:
• Fill with professional information
• Use company name: TechCorp Inc
• Make me appear as a senior developer
• Use email format: firstname.lastname@domain.com`}
                rows={7}
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
              />
            </div>

            <button
              className={`primary-btn ${isFormFilling ? 'loading' : ''}`}
              onClick={handleFillForms}
              disabled={isFormFilling}
            >
              {isFormFilling ? (
                <>
                  <div className="loading-spinner"></div>
                  <span className="btn-text">Processing...</span>
                </>
              ) : (
                <span className="btn-text">Fill Forms</span>
              )}
            </button>
          </div>
        )}

        {currentPage === 'recordSession' && (
          <div id="recordSessionPage" className="page-content">
            <div className="recording-section">
              <div className="recording-status" id="recordingStatus">
                <span className={`status-dot ${isRecording ? 'recording' : ''}`} id="statusDot"></span>
                <span className="status-text" id="statusText">{recordingStatus}</span>
              </div>

              <div className="recording-buttons">
                {!isRecording ? (
                  <button
                    className="record-btn"
                    onClick={startRecording}
                  >
                    <RecordIcon width={20} height={20} />
                    <span>Record</span>
                  </button>
                ) : (
                  <button
                    className="stop-btn"
                    onClick={stopRecording}
                  >
                    <StopIcon width={20} height={20} />
                    <span>Stop</span>
                  </button>
                )}
              </div>
            </div>

            <div className="sessions-section">
              <div className="sessions-header">
                <h3>Saved Sessions</h3>
                <button
                  className="refresh-btn"
                  onClick={loadSessions}
                  disabled={isLoadingSessions}
                >
                  <RefreshIcon width={16} height={16} />
                </button>
              </div>

              <div className="sessions-list">
                {isLoadingSessions ? (
                  <div className="loading-sessions">Loading sessions...</div>
                ) : sessions.length > 0 ? (
                  sessions.map((session) => (
                    <div key={session.id} className="session-item">
                      <div className="session-info">
                        <div className="session-name">{session.name}</div>
                        <div className="session-date">
                          {session.createdAt ? new Date(session.createdAt).toLocaleDateString() : 'Unknown date'}
                        </div>
                        <div className="session-steps">{session.steps?.length || 0} steps</div>
                      </div>
                      <div className="session-actions">
                        <button
                          className="play-btn"
                          onClick={() => playSession(session.id)}
                          disabled={deletingSessionIds.has(session.id)}
                        >
                          Play
                        </button>
                        <button
                          className={`delete-btn ${deletingSessionIds.has(session.id) ? 'deleting' : ''}`}
                          onClick={() => deleteSession(session.id)}
                          disabled={deletingSessionIds.has(session.id)}
                          title="Delete session"
                        >
                          {deletingSessionIds.has(session.id) ? (
                            <div className="loading-spinner-small"></div>
                          ) : (
                            <TrashIcon width={14} height={14} />
                          )}
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-sessions">No sessions found for this site</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

function IndexPopup() {
  return <FormFillerContent />
}

export default IndexPopup
