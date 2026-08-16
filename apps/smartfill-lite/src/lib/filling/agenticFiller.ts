// ** import types
import type { FormField, AIFormData, FillResult } from '@/types/extension'

// ** import constants
import { INTERACTION_DELAY, RETRY_DELAY, MAX_RETRIES } from './constants'

// ** import utils
import { delay } from './utils'
import { getFieldValue, fillTextField, fillSelectField, fillRadioField, fillCheckboxField } from './fieldFiller'

export async function fillForm(fields: FormField[], data: AIFormData): Promise<FillResult> {
  const result: FillResult = {
    success: false,
    filled: 0,
    errors: []
  }


  for (const field of fields) {
    try {
      await delay(INTERACTION_DELAY)
      
      const success = await fillFieldWithRetries(field, data)
      if (success) {
        result.filled++
      } else {
        result.errors.push(`Failed to fill ${field.name}`)
      }
    } catch (error) {
      console.error(`Error filling field ${field.name}:`, error)
      result.errors.push(`Error filling ${field.name}: ${error}`)
    }
  }

  result.success = result.filled > 0
  
  return result
}

async function fillFieldWithRetries(field: FormField, data: AIFormData): Promise<boolean> {
  if (field.type === 'file') {
    return false
  }
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    
    const success = await fillSingleField(field, data)
    if (success) {
      return true
    }
    
    if (attempt < MAX_RETRIES) {
      await delay(RETRY_DELAY)
    }
  }
  
  return false
}

async function fillSingleField(field: FormField, data: AIFormData): Promise<boolean> {
  const value = getFieldValue(field, data)
  if (!value) {
    return false
  }


  switch (field.type) {
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
    case 'textarea':
      return fillTextField(field.element as HTMLInputElement | HTMLTextAreaElement, String(value), field.type)
    
    case 'select':
      return fillSelectField(field.element as HTMLSelectElement, String(value))
    
    case 'radio':
      return fillRadioField(field.element as HTMLInputElement, String(value), document.body)
    
    case 'checkbox':
      return fillCheckboxField(field.element as HTMLInputElement, value, document.body)
    
    case 'file':
      return false
    
    default:
      console.warn(`Unsupported field type: ${field.type}`)
      return false
  }
}