// ** import core packages
import React, { useState, useEffect } from "react"

// ** import third party
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  useUser,
  useClerk
} from "@clerk/chrome-extension"

// ** import config
import { ENV } from "@/config/env"

// ** import apis
import { ragClient } from "@/api/rag"

// ** import styles
import "./styles/index.css"

// ** import assets
import iconUrl from "data-base64:~assets/icons/icon.png"

// ** import icons
import { 
  DownloadIcon, 
  UploadIcon, 
  RefreshIcon, 
  UserIcon,
  ArrowLeftIcon,
  CloseIcon,
  SignOutIcon,
  SettingsIcon,
  MenuIcon,
  RecordIcon,
  StopIcon
} from "./assets/ts-icons"

const EXTENSION_URL = chrome.runtime.getURL(".")

function SettingsModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [apiKey, setApiKey] = useState('')
  const [keyStatus, setKeyStatus] = useState<{ message: string, type: 'success' | 'error' | null }>({ message: '', type: null })
  const [isLoading, setIsLoading] = useState(false)
  
  // RAG Settings
  const [ragEnabled, setRagEnabled] = useState(true)
  const [autoRag, setAutoRag] = useState(true)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [ragStatus, setRagStatus] = useState<{ message: string, type: 'success' | 'error' | null }>({ message: '', type: null })
  const [tagsLoading, setTagsLoading] = useState(false)

  // Load existing API key and RAG settings on mount
  useEffect(() => {
    if (isOpen) {
      loadSettings()
    }
  }, [isOpen])

  const loadSettings = async () => {
    try {
      const result = await chrome.storage.sync.get([
        'geminiApiKey', 
        'ragEnabled', 
        'autoRag', 
        'selectedTags'
      ])
      
      if (result.geminiApiKey) {
        setApiKey(result.geminiApiKey)
      }
      if (result.ragEnabled !== undefined) {
        setRagEnabled(result.ragEnabled)
      }
      if (result.autoRag !== undefined) {
        setAutoRag(result.autoRag)
      }
      if (result.selectedTags) {
        setSelectedTags(result.selectedTags)
      }

      // Load available tags from the backend
      await loadAvailableTags()
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  const loadAvailableTags = async () => {
    setTagsLoading(true)
    try {
      const tags = await ragClient.getAvailableTags()
      setAvailableTags(tags)
    } catch (error) {
      console.error('Failed to load available tags:', error)
      setAvailableTags([])
    } finally {
      setTagsLoading(false)
    }
  }

  const saveApiKey = async () => {
    if (!apiKey.trim()) {
      setKeyStatus({ message: 'Please enter an API key', type: 'error' })
      return
    }

    setIsLoading(true)
    try {
      await chrome.storage.sync.set({ geminiApiKey: apiKey.trim() })
      setKeyStatus({ message: 'API key saved successfully!', type: 'success' })
      
      // Clear status after 3 seconds
      setTimeout(() => {
        setKeyStatus({ message: '', type: null })
      }, 3000)
    } catch (error) {
      console.error('Save API key error:', error)
      setKeyStatus({ message: 'Failed to save API key', type: 'error' })
    } finally {
      setIsLoading(false)
    }
  }

  const saveRagSettings = async () => {
    setIsLoading(true)
    try {
      await chrome.storage.sync.set({ 
        ragEnabled, 
        autoRag, 
        selectedTags
      })
      setRagStatus({ message: 'Knowledge settings saved successfully!', type: 'success' })
      
      // Clear status after 3 seconds
      setTimeout(() => {
        setRagStatus({ message: '', type: null })
      }, 3000)
    } catch (error) {
      console.error('Save RAG settings error:', error)
      setRagStatus({ message: 'Failed to save knowledge settings', type: 'error' })
    } finally {
      setIsLoading(false)
    }
  }

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag))
    } else {
      setSelectedTags([...selectedTags, tag])
    }
  }

  if (!isOpen) return null;

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
          <div className="setting-group">
            <label htmlFor="geminiKey">Gemini AI Key</label>
            <div className="input-group">
              <input 
                type="password" 
                id="geminiKey" 
                placeholder="Enter your API key" 
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveApiKey()}
              />
              <button 
                className="save-btn" 
                onClick={saveApiKey}
                disabled={isLoading}
              >
                {isLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
            {keyStatus.message && (
              <div className={`key-status ${keyStatus.type}`}>
                {keyStatus.message}
              </div>
            )}
          </div>

          {/* RAG Knowledge Settings */}
          <div className="setting-group">
            <h3>Knowledge Settings</h3>
            <p className="setting-description">Configure how AI uses your knowledge base for form filling</p>
            
            <div className="setting-row">
              <label className="checkbox-label">
                <input 
                  type="checkbox" 
                  checked={ragEnabled}
                  onChange={(e) => setRagEnabled(e.target.checked)}
                />
                <span>Enable knowledge search</span>
              </label>
            </div>

            {ragEnabled && (
              <>
                <div className="setting-row">
                  <label className="checkbox-label">
                    <input 
                      type="checkbox" 
                      checked={autoRag}
                      onChange={(e) => setAutoRag(e.target.checked)}
                    />
                    <span>Auto-select relevant knowledge (recommended)</span>
                  </label>
                </div>

                {!autoRag && (
                  <div className="setting-row">
                    <h4>Knowledge Tags</h4>
                    <p className="setting-subdescription">Select which types of knowledge to use:</p>
                    {tagsLoading ? (
                      <div className="tags-loading">Loading tags...</div>
                    ) : availableTags.length > 0 ? (
                      <div className="tags-container">
                        {availableTags.map(tag => (
                          <button
                            key={tag}
                            type="button"
                            className={`tag-btn ${selectedTags.includes(tag) ? 'selected' : ''}`}
                            onClick={() => toggleTag(tag)}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="no-tags">No tags available. Add some knowledge with tags first.</div>
                    )}
                  </div>
                )}

                <div className="input-group">
                  <button 
                    className="save-btn" 
                    onClick={saveRagSettings}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Saving...' : 'Save Knowledge Settings'}
                  </button>
                </div>

                {ragStatus.message && (
                  <div className={`key-status ${ragStatus.type}`}>
                    {ragStatus.message}
                  </div>
                )}
              </>
            )}
          </div>

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
              <input type="file" id="importFile" accept=".json" style={{ display: 'none' }} />
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
  );
}

function UserProfileModal({ isOpen, onClose, user }: { isOpen: boolean, onClose: () => void, user: any }) {
  const { signOut } = useClerk()
  
  const handleSignOut = async () => {
    try {
      await signOut({
        redirectUrl: `${ENV.CLERK_SYNC_HOST}/?signout=extension`
      })
      onClose()
    } catch (error) {
      chrome.tabs.create({ 
        url: `${ENV.CLERK_SYNC_HOST}/?signout=extension`,
        active: true
      })
      onClose()
      window.close()
    }
  }

  if (!isOpen) return null;

  return (
    <div className={`user-profile-modal ${isOpen ? 'open' : ''}`}>
      <div className="user-profile-overlay" onClick={onClose}></div>
      <div className="user-profile-content">
        <div className="user-profile-header">
          <button className="close-profile-btn" aria-label="Close" onClick={onClose}>
            <CloseIcon width={20} height={20} />
          </button>
        </div>
        
        <div className="user-profile-body">
          <div className="user-profile-info">
            <div 
              className="user-profile-avatar"
              style={{
                backgroundImage: user?.imageUrl ? `url(${user.imageUrl})` : undefined
              }}
            >
              {!user?.imageUrl && (user?.firstName ? user.firstName[0].toUpperCase() : 'U')}
            </div>
            <div className="user-profile-details">
              <div className="user-profile-name">{user?.firstName || 'User'}</div>
              <div className="user-profile-email">{user?.primaryEmailAddress?.emailAddress || 'No email'}</div>
            </div>
          </div>
          
          <button className="user-profile-signout" onClick={handleSignOut}>
            <SignOutIcon width={20} height={20} />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

function FormFillerContent() {
  const { user, isSignedIn } = useUser()
  const clerk = useClerk()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [userProfileOpen, setUserProfileOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState('formFill')
  const [promptText, setPromptText] = useState('')
  const [isFormFilling, setIsFormFilling] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{text: string, type: 'success' | 'error' | 'info'} | null>(null)

  const togglePage = () => {
    setCurrentPage(currentPage === 'formFill' ? 'recordSession' : 'formFill')
  }

  const showStatus = (text: string, type: 'success' | 'error' | 'info') => {
    setStatusMessage({ text, type })
    setTimeout(() => setStatusMessage(null), 4000)
  }

  // Store auth token for popup context (fallback when background script approach fails)
  const storeAuthToken = async () => {
    if (isSignedIn && clerk.session) {
      try {
        const token = await clerk.session.getToken()
        if (token) {
          // Store token with 30-minute expiry
          const expiryTime = Date.now() + (30 * 60 * 1000)
          await chrome.storage.local.set({
            authToken: token,
            authTokenExpiry: expiryTime.toString()
          })
        }
      } catch (error) {
        console.error('Popup: Failed to store auth token:', error)
      }
    } else {
      // Clear token if not signed in
      await chrome.storage.local.remove(['authToken', 'authTokenExpiry'])
    }
  }

  // Store auth token when user signs in or component mounts (for popup fallback)
  useEffect(() => {
    storeAuthToken()
  }, [isSignedIn])

  const handleSignIn = () => {
    chrome.tabs.create({ url: `${ENV.CLERK_SYNC_HOST}/?auth=extension` })
    window.close()
  }


  const handleFillForms = async () => {
    if (isFormFilling) return // Prevent multiple clicks
    
    setIsFormFilling(true)
    setStatusMessage({ text: 'Initializing...', type: 'info' })
    
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab?.id) {
        showStatus("No active tab found", 'error')
        return
      }

      // Check for browser internal pages
      if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('chrome-extension://') || 
          tab.url?.startsWith('about:') || tab.url?.startsWith('edge://')) {
        showStatus("Cannot run on browser internal pages", 'error')
        return
      }

      try {
        await chrome.tabs.sendMessage(tab.id, { action: "ping" })
      } catch (error) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["content.js"]
          })
          // Small delay to allow content script to load
          await new Promise(resolve => setTimeout(resolve, 100))
        } catch (scriptError) {
          showStatus("Failed to inject content script", 'error')
          return
        }
      }

      // Listen for status updates from content script
      const statusListener = (message: any) => {
        if (message.action === 'STATUS_UPDATE' && message.status) {
          setStatusMessage({ text: message.status, type: 'info' })
        }
      }
      
      chrome.runtime.onMessage.addListener(statusListener)

      const response = await chrome.tabs.sendMessage(tab.id, { 
        action: "fillForms", 
        prompt: promptText 
      })

      // Remove listener after completion
      chrome.runtime.onMessage.removeListener(statusListener)

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
          showStatus('Please configure Gemini API key in settings', 'error')
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
      <UserProfileModal isOpen={userProfileOpen} onClose={() => setUserProfileOpen(false)} user={user} />
      
      <div className="container">
        {/* Simplified Header */}
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
            <SignedOut>
              <button className="auth-avatar-btn-small" onClick={handleSignIn} title="Sign in">
                <UserIcon width={16} height={16} />
              </button>
            </SignedOut>
            <SignedIn>
              <button 
                className="user-avatar-small" 
                onClick={() => setUserProfileOpen(true)} 
                title="Profile"
                style={{
                  backgroundImage: user?.imageUrl ? `url(${user.imageUrl})` : undefined
                }}
              >
                {!user?.imageUrl && (user?.firstName ? user.firstName[0].toUpperCase() : 'U')}
              </button>
            </SignedIn>
          </div>
        </div>
        

        {/* Status Display */}
        {statusMessage && (
          <div className={`status ${statusMessage.type}`}>
            {statusMessage.text}
          </div>
        )}
        
        {/* Form Fill Page */}
        {currentPage === 'formFill' && (
          <div id="formFillPage" className="page-content">
            {/* Custom Prompt Section */}
            <div className="prompt-section">
              <label htmlFor="mainPromptText" className="prompt-label">Custom Instructions (Optional)</label>
              <textarea 
                id="mainPromptText" 
                className="main-prompt-textarea" 
                placeholder={`Add specific instructions for form filling, or leave empty for smart defaults:
• Fill with professional information
• Use company name: TechCorp Inc
• Make me appear as a senior developer
• Use email format: firstname.lastname@domain.com`}
                rows={3}
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
              />
            </div>
            
            {/* Primary Action */}
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

        {/* Record Session Page */}
        {currentPage === 'recordSession' && (
          <div id="recordSessionPage" className="page-content">
            <div className="recording-section">
              <div className="recording-status" id="recordingStatus">
                <span className="status-dot" id="statusDot"></span>
                <span className="status-text" id="statusText">Ready to record</span>
              </div>
              
              <div className="recording-buttons">
                <button id="recordBtn" className="record-btn">
                  <RecordIcon width={20} height={20} />
                  <span>Record</span>
                </button>
                
                <button id="stopBtn" className="stop-btn hidden">
                  <StopIcon width={20} height={20} />
                  <span>Stop</span>
                </button>
              </div>
            </div>

            <div className="sessions-section">
              <div className="sessions-header">
                <h3>Saved Sessions</h3>
                <button id="refreshSessions" className="refresh-btn">
                  <RefreshIcon width={16} height={16} />
                </button>
              </div>
              
              <div id="sessionsList" className="sessions-list">
                <div className="no-sessions">No sessions found for this site</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

function IndexPopup() {
  return (
    <ClerkProvider
      publishableKey={ENV.CLERK_PUBLISHABLE_KEY}
      afterSignOutUrl={`${EXTENSION_URL}/popup.html`}
      signInFallbackRedirectUrl={`${EXTENSION_URL}/popup.html`}
      signUpFallbackRedirectUrl={`${EXTENSION_URL}/popup.html`}
      syncHost={ENV.CLERK_SYNC_HOST}
    >
      <FormFillerContent />
    </ClerkProvider>
  )
}

export default IndexPopup