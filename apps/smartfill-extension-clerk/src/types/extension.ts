// ** import types
import type { RecordingSession, RecordingState } from '@/types/recording'

// Re-export for compatibility
export type { RecordingSession, RecordingState }

export interface ExtensionMessage {
  action: 'fillForms' | 'detectForms' | 'benchmark' | 'autoDetectAndFill' | 'startRecording' | 'stopRecording' | 'playSession' | 'getRecordingState' | 'getSessions' | 'deleteSession' | 'updateSessionName' | 'tabLostFocus' | 'tabGainedFocus' | 'crossTabPlaySession' | 'stopPlayback' | 'stopPlaySession' | 'isPlaybackActive' | 'exportDomainSessions' | 'exportAllSessions' | 'exportSession' | 'importSessions' | 'login' | 'logout' | 'getAuthStatus' | 'searchMemories' | 'storeFormMemory';
  data?: {
    jsonData?: string;
    options?: ImportOptions;
    formData?: Record<string, unknown>;
    query?: string;
  };
  sessionId?: string;
  sessionName?: string;
  type?: 'recording' | 'playback';
  domain?: string;
  customPrompt?: string;
  userId?: string;
}

/** User authentication information */
export interface User {
  /** Unique user identifier */
  id: string;
  /** User's email address */
  email: string;
  /** User's first name (optional) */
  firstName?: string;
  /** User's last name (optional) */
  lastName?: string;
  /** Account creation timestamp */
  createdAt: Date;
  /** Last login timestamp (optional) */
  lastLoginAt?: Date;
}

/** Authentication session data */
export interface AuthSession {
  /** Authenticated user information */
  user: User;
  /** JWT token details */
  token: {
    /** JWT token string */
    token: string;
    /** Token expiration date */
    expiresAt: Date;
    /** Associated user ID */
    userId: string;
  };
  /** Authentication status flag */
  isAuthenticated: boolean;
}

export interface ExtensionResponse {
  success: boolean;
  data?: Record<string, unknown> | unknown[];
  error?: string;
  filled?: number;
  formCount?: number;
  isAuthenticated?: boolean;
  user?: User;
  state?: RecordingState;
  userId?: string;
}

export interface ExtensionSettings {
  enabled: boolean;
  autoFill: boolean;
  debugMode: boolean;
  aiProvider: 'gemini' | 'groq' | 'openai' | 'openrouter';
  geminiApiKey: string;
  geminiModel: string;
  groqApiKey: string;
  groqModel: string;
  openaiApiKey: string;
  openaiModel: string;
  openrouterApiKey: string;
  openrouterModel: string;
  smartDetection: boolean;
  confirmBeforeFill: boolean;
  fillDelay: number;
  memoryEnabled: boolean;
  autoSaveMemory: boolean;
  memoryThreshold: number;
}

export interface FormField {
  id: string;
  name: string;
  type: 'text' | 'email' | 'password' | 'tel' | 'url' | 'number' | 'date' | 'time' | 'datetime-local' | 'color' | 'range' | 'checkbox' | 'radio' | 'select' | 'textarea' | 'file';
  value: string;
  label?: string;
  placeholder?: string;
  required: boolean;
  element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
  options?: string[];
}

export interface DetectedForm {
  element: HTMLFormElement;
  fields: FormField[];
  fieldCount: number;
}

export interface FillResult {
  success: boolean;
  filled: number;
  errors: string[];
}

export interface DetectResult {
  success: boolean;
  formCount: number;
  forms: DetectedForm[];
}

export interface AIFormData {
  [fieldName: string]: string | boolean | string[];
}

export interface ImportOptions {
  overwrite?: boolean;
  skipExisting?: boolean;
  domainFilter?: boolean;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export interface ExportResult {
  sessions: number;
  data: string;
  filename: string;
}