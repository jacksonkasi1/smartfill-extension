import type { DetectedForm, DetectResult, FillResult } from "@/types/extension"

export namespace MessagingTypes {
  // Form Operations
  export interface FillFormsRequest {
    prompt?: string
    options?: FillOptions
    formSelector?: string
  }

  export interface FillFormsResponse {
    success: boolean
    filled: number
    formCount: number
    errors?: string[]
  }

  export interface DetectFormsRequest {
    includeHidden?: boolean
    formSelector?: string
  }

  export interface DetectFormsResponse {
    success: boolean
    forms: DetectedForm[]
    formCount: number
  }

  // Popup Operations
  export interface OpenPopupRequest {
    data?: any
    source?: string
  }

  export interface OpenPopupResponse {
    success: boolean
    error?: string
  }

  // Status Operations
  export interface PingRequest {}

  export interface PingResponse {
    success: boolean
    status: string
  }

  // Recording Operations
  export interface StartRecordingRequest {}

  export interface StartRecordingResponse {
    success: boolean
    error?: string
  }

  export interface StopRecordingRequest {}

  export interface StopRecordingResponse {
    success: boolean
    error?: string
  }

  export interface PlaySessionRequest {
    sessionId: string
  }

  export interface PlaySessionResponse {
    success: boolean
    error?: string
  }

  // Website Communication
  export interface WebsiteEventData {
    type: 'SMARTFILL_OPEN_EXTENSION'
    source: 'website'
    data?: any
  }

  // Custom Event Types
  export interface SmartFillOpenExtensionEvent extends CustomEvent {
    detail: any
  }
}

export interface FillOptions {
  includeHidden?: boolean
  validateFields?: boolean
  delayBetweenFields?: number
  useAI?: boolean
}

// Message Action Constants
export const MESSAGE_ACTIONS = {
  FORMS: {
    FILL: "fillForms",
    DETECT: "detectForms",
    PING: "ping"
  },
  RECORDING: {
    START: "startRecording",
    STOP: "stopRecording",
    PLAY: "playSession"
  },
  POPUP: {
    OPEN: "OPEN_POPUP"
  },
  WEBSITE: {
    OPEN_EXTENSION: "smartfill-open-extension"
  }
} as const

// Event Type Constants
export const EVENT_TYPES = {
  WEBSITE: {
    SMARTFILL_OPEN: "SMARTFILL_OPEN_EXTENSION"
  },
  CUSTOM: {
    SMARTFILL_OPEN: "smartfill-open-extension"
  }
} as const

export type MessageAction = string
export type EventType = typeof EVENT_TYPES[keyof typeof EVENT_TYPES][keyof typeof EVENT_TYPES[keyof typeof EVENT_TYPES]]