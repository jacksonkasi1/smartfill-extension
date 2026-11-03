// ** import types
import type { FormField } from '@/types/extension'

// ** import utils
import { isCustomSelectTrigger } from './safety'

const INPUT_TYPES: FormField['type'][] = [
  'text', 'email', 'password', 'tel', 'url', 'number', 'date', 'time', 'datetime-local',
  'color', 'range', 'checkbox', 'radio', 'file'
]

export function getFieldType(element: HTMLElement): FormField['type'] {
  const tag = element.tagName.toLowerCase()
  if (tag === 'select') return 'select'
  if (tag === 'textarea') return 'textarea'
  if (tag === 'input') {
    const input = element as HTMLInputElement
    // A read-only combobox input (Ant Design, Headless UI) is a dropdown, not a text box.
    if (isReadonlyCombobox(input)) return 'select'
    const type = (input.type || 'text').toLowerCase() as FormField['type']
    return INPUT_TYPES.includes(type) ? type : 'text'
  }
  if (isCustomSelectTrigger(element)) return 'select'
  // Rich-text editors and other contenteditable hosts hold free text.
  return 'textarea'
}

export function isReadonlyCombobox(element: Element): boolean {
  return element.tagName === 'INPUT' &&
    (element.getAttribute('role') || '').toLowerCase() === 'combobox' &&
    (element as HTMLInputElement).readOnly
}

export function isGroupedField(fieldType: FormField['type']): boolean {
  return fieldType === 'radio' || fieldType === 'checkbox'
}

export function isFieldRequired(element: HTMLElement): boolean {
  return element.hasAttribute('required') ||
    element.hasAttribute('data-required') ||
    element.getAttribute('aria-required') === 'true'
}
