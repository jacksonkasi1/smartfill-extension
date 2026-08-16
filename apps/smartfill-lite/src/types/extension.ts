// ** import types
import type { RecordingSession, RecordingState } from '@/types/recording'

// Re-export for compatibility
export type { RecordingSession, RecordingState }

export interface ExtensionMessage {
  action:
    | 'fillForms'
    | 'detectForms'
    | 'benchmark'
    | 'autoDetectAndFill'
    | 'startRecording'
    | 'stopRecording'
    | 'playSession'
    | 'getRecordingState'
    | 'getSessions'
    | 'deleteSession'
    | 'updateSessionName'
    | 'tabLostFocus'
    | 'tabGainedFocus'
    | 'crossTabPlaySession'
    | 'stopPlayback'
    | 'stopPlaySession'
    | 'isPlaybackActive'
    | 'exportDomainSessions'
    | 'exportAllSessions'
    | 'exportSession'
    | 'importSessions'
  data?: {
    jsonData?: string
    options?: ImportOptions
    formData?: Record<string, unknown>
    query?: string
  }
  sessionId?: string
  sessionName?: string
  type?: 'recording' | 'playback'
  domain?: string
  customPrompt?: string
}

export interface ExtensionResponse {
  success: boolean
  data?: Record<string, unknown> | unknown[]
  error?: string
  filled?: number
  formCount?: number
  state?: RecordingState
}

export interface ExtensionSettings {
  enabled: boolean
  autoFill: boolean
  debugMode: boolean
  llmProvider: 'gemini' | 'groq' | 'openrouter'
  llmModel: string
  llmApiKeys: {
    gemini?: string
    groq?: string
    openrouter?: string
  }
  smartDetection: boolean
  confirmBeforeFill: boolean
  fillDelay: number
}

export interface FormField {
  id: string
  name: string
  type:
    | 'text' | 'email' | 'password' | 'tel' | 'url' | 'number' | 'date'
    | 'time' | 'datetime-local' | 'color' | 'range' | 'checkbox' | 'radio'
    | 'select' | 'textarea' | 'file'
  value: string
  label?: string
  placeholder?: string
  required: boolean
  element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  options?: string[]
}

export interface DetectedForm {
  element: HTMLFormElement | HTMLElement
  fields: FormField[]
  fieldCount: number
}

export interface FillResult {
  success: boolean
  filled: number
  errors: string[]
}

export interface DetectResult {
  success: boolean
  formCount: number
  forms: DetectedForm[]
}

export interface AIFormData {
  [fieldName: string]: string | boolean | string[]
}

export interface ImportOptions {
  overwrite?: boolean
  skipExisting?: boolean
  domainFilter?: boolean
}

export interface ImportResult {
  imported: number
  skipped: number
  errors: string[]
}

export interface ExportResult {
  sessions: number
  data: string
  filename: string
}
