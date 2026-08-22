// ** import utils
import { isModernUIElement } from './fieldTypes'

/**
 * Cheap, layout-light "is this element worth filling?" check.
 *
 * We deliberately avoid `getComputedStyle()` and `getBoundingClientRect()`
 * here — the spec calls out minimizing layout reads. The caller
 * (`formDetection.ts`) does a fast `offsetParent === null` check
 * up-front so we rarely even get here for hidden elements.
 */
export function isFieldFillable(element: HTMLElement): boolean {
  if (!element) return false
  if (element.hasAttribute('disabled') || element.hasAttribute('readonly')) {
    return false
  }

  const tagName = element.tagName.toLowerCase()

  // Modern UI / non-form elements
  if (isModernUIElement(element)) {
    if (element.getAttribute('aria-disabled') === 'true') return false
    if (element.getAttribute('aria-readonly') === 'true') return false

    const role = element.getAttribute('role')
    if (tagName === 'button' || role === 'button' || role === 'combobox' || role === 'textbox') {
      return true
    }

    if (element.getAttribute('contenteditable') === 'true') return true

    // Heuristic: class / text / aria contains a form-like keyword
    const keywords = ['select', 'choose', 'pick', 'upload', 'attach', 'date', 'input', 'field']
    const haystack = `${element.className} ${element.getAttribute('aria-label') || ''} ${element.textContent || ''}`.toLowerCase()
    return keywords.some(k => haystack.includes(k))
  }

  // Traditional form elements
  if (!['input', 'select', 'textarea'].includes(tagName)) return false

  const skipTypes = ['hidden', 'submit', 'button', 'reset', 'image']
  const type = element.getAttribute('type') || ''
  if (skipTypes.includes(type.toLowerCase())) return false

  if (tagName === 'input') {
    const inputElement = element as HTMLInputElement
    if (inputElement.type && !isValidInputType(inputElement.type)) return false
  }

  return true
}

function isValidInputType(type: string): boolean {
  const valid = [
    'text', 'email', 'password', 'tel', 'url', 'search', 'number', 'range',
    'date', 'datetime-local', 'time', 'month', 'week', 'checkbox', 'radio',
    'color', 'file'
  ]
  return valid.includes(type.toLowerCase()) || type === ''
}

export function isFieldRequired(element: HTMLElement): boolean {
  return element.hasAttribute('required') ||
    element.hasAttribute('data-required') ||
    element.getAttribute('aria-required') === 'true'
}
