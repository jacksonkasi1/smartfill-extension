// ** import types
import type { FormField } from '@/types/extension'

// ** import utils
import { isFieldFillable, isFieldRequired } from './fieldValidation'
import { getFieldType, isGroupedField, isModernUIElement } from './fieldTypes'
import { getFieldName, getFieldId } from './fieldNames'
import { extractLabel, extractContextualInfo } from './fieldLabels'
import { getFieldOptions } from './fieldOptions'
import { getFieldSelectors } from './formSelector'

interface ProcessedField {
  element: Element
  uniqueKey: string
  position: { x: number, y: number }
}

export function detectFieldsInContainer(container: Element, customFields?: NodeListOf<Element>): FormField[] {
  const fields: FormField[] = []
  const selectors = getFieldSelectors()
  
  const elements = customFields || container.querySelectorAll(selectors.join(', '))
  const processedGroups = {
    radio: new Set<string>(),
    checkbox: new Set<string>()
  }
  
  // Track processed fields to prevent duplicates
  const processedFields: ProcessedField[] = []

  for (const element of elements) {
    const el = element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    
    if (!isFieldFillable(el)) continue

    const fieldType = getFieldType(el)
    const fieldId = getFieldId(el)
    const fieldName = getFieldName(el)
    
    // Create unique identifier for deduplication
    const uniqueKey = createUniqueFieldKey(el, fieldType, fieldName)
    const position = getElementPosition(el)
    
    // Check for duplicates
    if (isDuplicateField(processedFields, uniqueKey, position)) {
      continue
    }
    
    // Add to processed fields
    processedFields.push({ element: el, uniqueKey, position })

    if (isGroupedField(fieldType)) {
      const groupKey = (el as HTMLInputElement).name
      if (!groupKey) continue // Skip grouped fields without name attribute
      if (processedGroups[fieldType as keyof typeof processedGroups].has(groupKey)) continue
      processedGroups[fieldType as keyof typeof processedGroups].add(groupKey)
      
      // For grouped fields, use the HTML name attribute as the field name
      const field: FormField = {
        id: fieldId,
        name: groupKey,
        type: fieldType,
        value: getFieldValue(el),
        label: extractLabel(el) || extractContextualInfo(el),
        placeholder: el.getAttribute('placeholder') || undefined,
        required: isFieldRequired(el),
        element: el,
        options: getFieldOptions(el, container)
      }
      fields.push(field)
    } else {
      // For non-grouped fields, use the derived field name
      const field: FormField = {
        id: fieldId,
        name: fieldName,
        type: fieldType,
        value: getFieldValue(el),
        label: extractLabel(el) || extractContextualInfo(el),
        placeholder: el.getAttribute('placeholder') || undefined,
        required: isFieldRequired(el),
        element: el,
        options: getFieldOptions(el, container)
      }
      fields.push(field)
    }
  }

  return fields
}

function createUniqueFieldKey(element: HTMLElement, fieldType: FormField['type'], fieldName: string): string {
  const name = element.getAttribute('name') || fieldName
  const id = element.id || ''
  const type = fieldType
  const className = element.className || ''
  
  // For modern UI elements, include more specific identifiers
  if (isModernUIElement(element)) {
    const textContent = element.textContent?.trim() || ''
    const ariaLabel = element.getAttribute('aria-label') || ''
    return `${type}:${name}:${id}:${className}:${textContent}:${ariaLabel}`
  }
  
  return `${type}:${name}:${id}:${className}`
}

function getElementPosition(element: HTMLElement): { x: number, y: number } {
  const rect = element.getBoundingClientRect()
  return {
    x: Math.round(rect.left + rect.width / 2),
    y: Math.round(rect.top + rect.height / 2)
  }
}

function isDuplicateField(processedFields: ProcessedField[], uniqueKey: string, position: { x: number, y: number }): boolean {
  return processedFields.some(processed => {
    // Exact match on unique key
    if (processed.uniqueKey === uniqueKey) return true
    
    // Position-based duplicate detection (within 10px tolerance)
    const positionMatch = Math.abs(processed.position.x - position.x) < 10 && 
                         Math.abs(processed.position.y - position.y) < 10
    
    // Similar unique key with same position (likely same field detected multiple ways)
    const keyParts = uniqueKey.split(':')
    const processedKeyParts = processed.uniqueKey.split(':')
    
    if (positionMatch && keyParts.length === processedKeyParts.length) {
      // Check if at least 2 out of 4 key parts match
      const matches = keyParts.filter((part, index) => part === processedKeyParts[index]).length
      return matches >= 2
    }
    
    return false
  })
}

function getFieldValue(element: HTMLElement): string {
  if (isModernUIElement(element)) {
    // For modern UI elements, extract value from text content or aria attributes
    const ariaValueText = element.getAttribute('aria-valuetext')
    if (ariaValueText) return ariaValueText
    
    const textContent = element.textContent?.trim()
    if (textContent && !textContent.toLowerCase().includes('select') && !textContent.toLowerCase().includes('choose')) {
      return textContent
    }
    
    return ''
  }
  
  // Traditional form elements
  const input = element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  return input.value || ''
}