// ** import types
import type { FormField, AIFormData, FillResult } from '@/types/extension'

// ** import constants
import {
  NATIVE_MAX_ATTEMPTS,
  CUSTOM_MAX_ATTEMPTS,
  CUSTOM_RETRY_GAP_MS
} from './constants'

// ** import utils
import {
  getFieldValue,
  fillTextField,
  fillSelectField,
  fillRadioField,
  fillCheckboxField,
  fillCustomSelect
} from './fieldFiller'

export interface FillTimings {
  fillMs: number
  filled: number
  failed: number
  fieldCount: number
}

export async function fillForm(
  fields: FormField[],
  data: AIFormData
): Promise<FillResult> {
  const start = performance.now()
  const result: FillResult = { success: false, filled: 0, errors: [] }
  let filled = 0
  let failed = 0

  for (const field of fields) {
    const value = getFieldValue(field, data)

    // Missing / undefined / null: skip silently. Empty string is OK and
    // is handled per-type below (e.g. sensitive-blank checkbox is a no-op).
    if (value === null || value === undefined) {
      failed++
      continue
    }

    try {
      const ok = await fillSingleField(field, value)
      if (ok) filled++
      else {
        failed++
        result.errors.push(`Failed to fill ${field.name}`)
      }
    } catch (error) {
      console.error(`Error filling field ${field.name}:`, error)
      failed++
      result.errors.push(`Error filling ${field.name}: ${error}`)
    }
  }

  result.filled = filled
  result.success = filled > 0
  const fillMs = performance.now() - start

  return result
}

async function fillSingleField(
  field: FormField,
  value: any
): Promise<boolean> {
  // File inputs are unsupported across the board — no retry.
  if (field.type === 'file') return false

  // Sensitive fields that came back explicitly empty from the parser
  // are a user choice, not a failure.
  if (field.type === 'password' && value === '') return false

  // Only custom dropdowns get the custom retry budget. Native
  // controls (text input, textarea, checkbox, radio, native
  // <select>) must never incur the 120 ms retry gap.
  const isCustomSelect = field.type === 'select' && isCustomSelectElement(field.element)
  const maxAttempts = isCustomSelect ? CUSTOM_MAX_ATTEMPTS : NATIVE_MAX_ATTEMPTS

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const ok = await dispatchFill(field, value)
    if (ok) return true
    if (attempt < maxAttempts) {
      // Yield to the browser so async UI can re-render, but never 500 ms.
      await sleep(CUSTOM_RETRY_GAP_MS)
    }
  }
  return false
}

async function dispatchFill(field: FormField, value: any): Promise<boolean> {
  switch (field.type) {
    // ---- native text-like ----
    case 'text':
    case 'email':
    case 'password':
    case 'tel':
    case 'url':
    case 'number':
    case 'date':
    case 'time':
    case 'datetime-local':
    case 'color':
    case 'range':
      return fillTextField(field.element as HTMLInputElement, String(value))

    // ---- textarea / contenteditable ----
    case 'textarea':
      return fillTextField(field.element as HTMLTextAreaElement, String(value))

    // ---- native <select> ----
    case 'select': {
      const el = field.element
      if (el instanceof HTMLSelectElement) {
        return fillSelectField(el, String(value))
      }
      // Custom dropdown detected under `type: 'select'`
      return fillCustomSelect(el as HTMLElement, String(value))
    }

    // ---- radio group ----
    case 'radio':
      return fillRadioField(
        field.element as HTMLInputElement,
        String(value),
        field.element.closest('form') || document.body
      )

    // ---- checkbox (single or group) ----
    case 'checkbox':
      return fillCheckboxField(
        field.element as HTMLInputElement,
        value,
        field.element.closest('form') || document.body
      )

    // ---- anything else ----
    case 'file':
      return false

    default:
      // Last-resort branch: if the element isn't a real input/select/textarea
      // but our detection accepted it (e.g. div[role="textbox"]), try
      // filling it as text.
      if (field.element instanceof HTMLElement &&
          (field.element.getAttribute('contenteditable') === 'true' ||
           field.element.getAttribute('role') === 'textbox' ||
           field.element.getAttribute('role') === 'combobox')) {
        return fillTextField(
          field.element as unknown as HTMLInputElement,
          String(value)
        )
      }
      console.warn(`Unsupported field type: ${field.type}`)
      return false
  }
}

/**
 * Decide whether a select-typed field is a native <select> or a custom
 * dropdown. Custom dropdowns are anything that:
 *   - is not an actual HTMLSelectElement, OR
 *   - has role=combobox / listbox, OR
 *   - has aria-haspopup="listbox", OR
 *   - looks like a Material / Ant / Bootstrap dropdown trigger
 */
function isCustomSelectElement(el: HTMLElement): boolean {
  if (!(el instanceof HTMLSelectElement)) return true
  const role = el.getAttribute('role')
  if (role === 'combobox' || role === 'listbox') return true
  if (el.getAttribute('aria-haspopup') === 'listbox') return true
  return false
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}
