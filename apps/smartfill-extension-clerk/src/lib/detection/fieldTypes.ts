// ** import types
import type { FormField } from '@/types/extension'

export function getFieldType(element: HTMLElement): FormField['type'] {
  // Handle traditional form elements
  if (element.tagName.toLowerCase() === 'select') return 'select'
  if (element.tagName.toLowerCase() === 'textarea') return 'textarea'
  
  const input = element as HTMLInputElement
  const type = input.type?.toLowerCase() || 'text'
  
  // Handle modern UI components by analyzing element characteristics
  if (element.tagName.toLowerCase() === 'button' || element.getAttribute('role') === 'button') {
    return classifyModernUIElement(element)
  }
  
  // Handle ARIA-based elements
  const role = element.getAttribute('role')
  if (role) {
    switch (role) {
      case 'combobox':
      case 'listbox':
        return 'select'
      case 'textbox':
        return 'text'
      default:
        break
    }
  }
  
  // Handle contenteditable elements
  if (element.getAttribute('contenteditable') === 'true') {
    return 'text'
  }
  
  const validTypes: FormField['type'][] = [
    'text', 'email', 'password', 'tel', 'url', 'number', 'date', 'time', 'datetime-local', 
    'color', 'range', 'checkbox', 'radio', 'select', 'textarea', 'file'
  ]
  
  return validTypes.includes(type as FormField['type']) ? type as FormField['type'] : 'text'
}

function classifyModernUIElement(element: HTMLElement): FormField['type'] {
  const className = element.className.toLowerCase()
  const ariaLabel = element.getAttribute('aria-label')?.toLowerCase() || ''
  const textContent = element.textContent?.toLowerCase() || ''
  const allText = `${className} ${ariaLabel} ${textContent}`
  
  // Date picker detection
  if (
    allText.includes('date') || 
    allText.includes('picker') || 
    allText.includes('calendar') ||
    /\b\d{1,2}\/\d{1,2}\/\d{4}\b/.test(textContent) ||
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(textContent) ||
    /\b\d{1,2}(st|nd|rd|th)\b/.test(textContent)
  ) {
    return 'date'
  }
  
  // File upload detection
  if (
    allText.includes('upload') || 
    allText.includes('attach') || 
    allText.includes('browse') ||
    allText.includes('file')
  ) {
    return 'file'
  }
  
  // Custom dropdown detection
  if (
    allText.includes('select') || 
    allText.includes('choose') || 
    allText.includes('dropdown') ||
    element.getAttribute('aria-expanded') !== null ||
    element.getAttribute('aria-haspopup') === 'listbox'
  ) {
    return 'select'
  }
  
  // Default to text for unclassified interactive elements
  return 'text'
}

export function isGroupedField(fieldType: FormField['type']): boolean {
  return fieldType === 'radio' || fieldType === 'checkbox'
}

export function isModernUIElement(element: HTMLElement): boolean {
  const tagName = element.tagName.toLowerCase()
  const role = element.getAttribute('role')
  
  return (
    tagName === 'button' ||
    tagName === 'div' ||
    role === 'button' ||
    role === 'combobox' ||
    role === 'listbox' ||
    role === 'textbox' ||
    element.getAttribute('contenteditable') === 'true'
  )
}