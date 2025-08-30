// ** import utils
import { extractLabel, extractContextualInfo } from './fieldLabels'
import { getFieldType } from './fieldTypes'

export function getFieldName(element: HTMLElement): string {
  const name = element.getAttribute('name')
  if (name) return name
  
  const id = element.getAttribute('id')
  if (id) return id
  
  const label = extractLabel(element) || extractContextualInfo(element)
  if (label && label !== 'Unnamed Field') {
    return label.toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
  }
  
  const dataName = element.getAttribute('data-name') || element.getAttribute('data-field')
  if (dataName) return dataName
  
  const type = getFieldType(element)
  const position = Array.from(document.querySelectorAll(element.tagName.toLowerCase())).indexOf(element)
  return `${type}_field_${position}`
}

export function getFieldId(element: HTMLElement): string {
  return element.getAttribute('id') || 
         element.getAttribute('name') || 
         `id_${Math.random().toString(36).substr(2, 9)}`
}