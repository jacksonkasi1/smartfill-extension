// ** import types
import type { FormField, AIFormData } from '@/types/extension'

// ** import utils
import { triggerEvents } from './utils'
import { formatValueForField } from './valueFormatter'

export function getFieldValue(field: FormField, data: AIFormData): string | string[] | boolean | null {
  if (data[field.name]) {
    return data[field.name]
  }
  
  const lowerName = field.name.toLowerCase()
  const matchingKey = Object.keys(data).find(key => 
    key.toLowerCase() === lowerName ||
    key.toLowerCase().includes(lowerName) ||
    lowerName.includes(key.toLowerCase())
  )
  
  return matchingKey ? data[matchingKey] : null
}

export function fillTextField(element: HTMLInputElement | HTMLTextAreaElement, value: string, fieldType?: FormField['type']): boolean {
  try {
    element.focus()
    
    const formattedValue = fieldType ? formatValueForField(value, fieldType) : value
    element.value = formattedValue
    
    triggerEvents(element)
    return true
  } catch (error) {
    console.error('Error filling text field:', error)
    return false
  }
}

export function fillSelectField(element: HTMLSelectElement, value: string): boolean {
  try {
    if (!element || !element.options) {
      console.warn('Invalid select element or options not available')
      return false
    }
    
    element.focus()
    
    const option = Array.from(element.options).find(opt => 
      opt.value === value || 
      opt.text === value ||
      opt.text.toLowerCase().includes(value.toLowerCase()) ||
      value.toLowerCase().includes(opt.text.toLowerCase())
    )
    
    if (option) {
      element.value = option.value
      triggerEvents(element)
      return true
    }
    
    return false
  } catch (error) {
    console.error('Error filling select field:', error)
    return false
  }
}

export function fillRadioField(element: HTMLInputElement, value: string, container: Element): boolean {
  try {
    const name = element.name
    if (!name) return false
    
    const radioButtons = container.querySelectorAll(`input[name="${name}"][type="radio"]`) as NodeListOf<HTMLInputElement>
    
    for (const radio of radioButtons) {
      const label = radio.nextElementSibling?.textContent?.trim() || radio.value
      if (label === value || label?.toLowerCase().includes(value.toLowerCase())) {
        radio.focus()
        radio.checked = true
        triggerEvents(radio)
        return true
      }
    }
    
    return false
  } catch (error) {
    console.error('Error filling radio field:', error)
    return false
  }
}

export function fillCheckboxField(element: HTMLInputElement, value: string | string[] | boolean, container?: Element): boolean {
  try {
    // Handle checkbox groups (multiple values)
    if (Array.isArray(value)) {
      return fillCheckboxGroup(element, value, container || document.body)
    }
    
    // Handle single checkbox
    element.focus()
    let shouldCheck = false
    
    if (typeof value === 'boolean') {
      shouldCheck = value
    } else if (typeof value === 'string') {
      shouldCheck = value.toLowerCase() === 'true' || value === '1' || value.toLowerCase() === 'yes'
    }
    
    element.checked = shouldCheck
    triggerEvents(element)
    return true
  } catch (error) {
    console.error('Error filling checkbox field:', error)
    return false
  }
}

export function fillCheckboxGroup(element: HTMLInputElement, values: string[], container: Element): boolean {
  try {
    const name = element.name
    if (!name) return false
    
    const checkboxes = container.querySelectorAll(`input[name="${name}"][type="checkbox"]`) as NodeListOf<HTMLInputElement>
    let filledCount = 0
    
    for (const checkbox of checkboxes) {
      const label = checkbox.nextElementSibling?.textContent?.trim() || 
                   checkbox.closest('label')?.textContent?.trim() ||
                   checkbox.value ||
                   checkbox.getAttribute('aria-label')
      
      const shouldCheck = values.some(value => 
        label === value ||
        label?.toLowerCase().includes(value.toLowerCase()) ||
        value.toLowerCase().includes(label?.toLowerCase() || '')
      )
      
      checkbox.focus()
      checkbox.checked = shouldCheck
      triggerEvents(checkbox)
      
      if (shouldCheck) {
        filledCount++
      }
    }
    
    return filledCount > 0
  } catch (error) {
    console.error('Error filling checkbox group:', error)
    return false
  }
}