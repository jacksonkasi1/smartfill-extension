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
  fillComboboxInput,
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

  // Native controls fill synchronously; custom dropdowns wait for their
  // popup, so they go last and the rest of the form appears instantly.
  const ordered = [
    ...fields.filter(f => !needsPopup(f)),
    ...fields.filter(needsPopup)
  ]

  for (const field of ordered) {
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
  const maxAttempts = needsPopup(field) ? CUSTOM_MAX_ATTEMPTS : NATIVE_MAX_ATTEMPTS

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
    case 'range': {
      const el = field.element
      if (el instanceof HTMLInputElement && (el.getAttribute('role') || '').toLowerCase() === 'combobox') {
        return fillComboboxInput(el, String(value))
      }
      return fillTextField(el as HTMLInputElement, String(value))
    }

    // ---- textarea / contenteditable ----
    case 'textarea':
      return fillTextField(field.element as HTMLTextAreaElement, String(value))

    // ---- native <select>, or a custom dropdown ----
    case 'select': {
      const el = field.element
      if (el instanceof HTMLSelectElement) {
        const ok = fillSelectField(el, String(value))
        // A Radix-style hidden <select> only updates the visible trigger
        // when the kit listens to it; otherwise open the real dropdown.
        if (field.trigger && (!ok || !(await triggerShows(field.trigger, el)))) {
          return fillCustomSelect(field.trigger, String(value))
        }
        return ok
      }
      return fillCustomSelect(el as HTMLElement, String(value))
    }

    // ---- radio group ----
    case 'radio':
      return fillRadioField(
        field.element as HTMLInputElement,
        String(value),
        field.element.closest('form') || document.body,
        field.group
      )

    // ---- checkbox (single or group) ----
    case 'checkbox':
      return fillCheckboxField(
        field.element as HTMLInputElement,
        value,
        field.element.closest('form') || document.body,
        field.group
      )

    // ---- anything else ----
    case 'file':
      return false

    default:
      console.warn(`Unsupported field type: ${field.type}`)
      return false
  }
}

/** Fields that have to wait for a popup, so they fill after everything else. */
function needsPopup(field: FormField): boolean {
  if (field.type !== 'select') return false
  return !(field.element instanceof HTMLSelectElement) || Boolean(field.trigger)
}

/** Whether a custom trigger now displays the option chosen on its hidden native select. */
async function triggerShows(trigger: HTMLElement, select: HTMLSelectElement): Promise<boolean> {
  const chosen = select.selectedOptions[0]
  const text = (chosen?.text || chosen?.value || '').trim().toLowerCase()
  if (!text) return false
  await sleep(30)
  return (trigger.textContent || '').toLowerCase().includes(text)
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}
