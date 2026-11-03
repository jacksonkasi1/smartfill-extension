// ** import utils
import { extractLabel, extractContextualInfo } from './fieldLabels'

/** Key the field's value travels under (mock data map and AI JSON). Uniqueness is enforced later. */
export function getFieldName(element: HTMLElement, fallbackIndex: number): string {
  const name = element.getAttribute('name')
  if (name) return name

  const id = element.getAttribute('id')
  if (id) return id

  const label = extractLabel(element) || extractContextualInfo(element)
  if (label && label !== 'Unnamed Field') {
    const slug = label.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
    if (slug) return slug.slice(0, 48)
  }

  const dataName = element.getAttribute('data-name') || element.getAttribute('data-field')
  if (dataName) return dataName

  return `field_${fallbackIndex}`
}

export function getFieldId(element: HTMLElement, fallbackIndex: number): string {
  return element.getAttribute('id') || element.getAttribute('name') || `sf_${fallbackIndex}`
}
