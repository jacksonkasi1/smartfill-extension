export interface ExtensionMessage {
  action:
    | 'fillForms'
    | 'detectForms'
    | 'benchmark'
    | 'autoDetectAndFill'
  data?: {
    formData?: Record<string, unknown>
    query?: string
  }
  customPrompt?: string
}

export interface ExtensionResponse {
  success: boolean
  data?: Record<string, unknown> | unknown[]
  error?: string
  filled?: number
  formCount?: number
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
