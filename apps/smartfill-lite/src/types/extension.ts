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
  /** Every radio / checkbox answering this question, when it is a group. */
  group?: HTMLInputElement[]
  /** Custom dropdown trigger whose hidden native `<select>` is `element`. */
  trigger?: HTMLElement
  /** A hidden native `<select>` that select2 / Chosen / Choices draws a widget for. */
  enhanced?: boolean
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
