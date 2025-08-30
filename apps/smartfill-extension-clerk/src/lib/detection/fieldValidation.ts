// ** import utils
import { isModernUIElement } from './fieldTypes'

export function isFieldFillable(element: HTMLElement): boolean {
  if (!element || element.hasAttribute('disabled') || element.hasAttribute('readonly')) {
    return false
  }

  // Check if element is visible
  const style = window.getComputedStyle(element)
  if (style.display === 'none' || style.visibility === 'hidden') {
    return false
  }

  const tagName = element.tagName.toLowerCase()
  
  // Handle modern UI elements
  if (isModernUIElement(element)) {
    return isModernUIElementFillable(element)
  }
  
  // Handle traditional form elements
  if (!['input', 'select', 'textarea'].includes(tagName)) {
    return false
  }

  const skipTypes = ['hidden', 'submit', 'button', 'reset', 'image']
  if (skipTypes.includes(element.getAttribute('type') || '')) {
    return false
  }

  if (tagName === 'input') {
    const inputElement = element as HTMLInputElement
    if (inputElement.type && !isValidInputType(inputElement.type)) {
      return false
    }
  }

  return true
}

function isModernUIElementFillable(element: HTMLElement): boolean {
  // Check for disabled state in modern UI components
  if (element.getAttribute('aria-disabled') === 'true') {
    return false
  }
  
  // Check for readonly state
  if (element.getAttribute('aria-readonly') === 'true') {
    return false
  }
  
  // Ensure element is interactive
  const role = element.getAttribute('role')
  const tagName = element.tagName.toLowerCase()
  
  // Must be clickable or have interactive role
  if (tagName === 'button' || role === 'button' || role === 'combobox' || role === 'textbox') {
    return true
  }
  
  // Check if element has click handlers (heuristic)
  const hasClickableClasses = element.className.toLowerCase().includes('click') ||
                              element.className.toLowerCase().includes('select') ||
                              element.className.toLowerCase().includes('button')
  
  if (hasClickableClasses) return true
  
  // Check for contenteditable
  if (element.getAttribute('contenteditable') === 'true') {
    return true
  }
  
  // Must have some form-related indication
  const formKeywords = ['select', 'choose', 'pick', 'upload', 'attach', 'date', 'input', 'field']
  const elementText = (element.textContent || '').toLowerCase()
  const className = element.className.toLowerCase()
  const ariaLabel = (element.getAttribute('aria-label') || '').toLowerCase()
  
  return formKeywords.some(keyword => 
    elementText.includes(keyword) || 
    className.includes(keyword) || 
    ariaLabel.includes(keyword)
  )
}

function isValidInputType(type: string): boolean {
  const validTypes = [
    'text', 'email', 'password', 'tel', 'url', 'search', 'number', 'range',
    'date', 'datetime-local', 'time', 'month', 'week', 'checkbox', 'radio',
    'color', 'file'
  ]
  return validTypes.includes(type.toLowerCase()) || type === ''
}

export function isFieldRequired(element: HTMLElement): boolean {
  return element.hasAttribute('required') || 
         element.hasAttribute('data-required') ||
         element.getAttribute('aria-required') === 'true'
}