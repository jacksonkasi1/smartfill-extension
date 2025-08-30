// ** import utils
import { getFieldType, isModernUIElement } from './fieldTypes'

export function getFieldOptions(element: HTMLElement, container: Element): string[] {
  const fieldType = getFieldType(element)
  
  // Handle modern UI custom dropdowns
  if (isModernUIElement(element) && fieldType === 'select') {
    return getModernUIDropdownOptions(element, container)
  }
  
  if (fieldType === 'select') {
    const select = element as HTMLSelectElement
    return Array.from(select.options)
      .filter(opt => opt.value && opt.value !== '' && opt.value !== 'undefined')
      .map(opt => opt.value)
  }

  if (fieldType === 'radio' || fieldType === 'checkbox') {
    const name = element.getAttribute('name')
    if (name) {
      const relatedElements = container.querySelectorAll(`input[name="${name}"][type="${fieldType}"]`)
      
      if (relatedElements.length > 0) {
        return Array.from(relatedElements).map((el) => {
          const relatedEl = el as HTMLInputElement
          return relatedEl.value || relatedEl.getAttribute('aria-label') || 'unknown'
        }).filter(value => value && value !== '')
      }
    }

    const radioGroup = element.closest('[role="radiogroup"]')
    if (radioGroup && fieldType === 'radio') {
      const allRadios = radioGroup.querySelectorAll('input[type="radio"]')
      return Array.from(allRadios).map((radio) => {
        const radioEl = radio as HTMLInputElement
        return radioEl.value || 'unknown'
      }).filter(value => value && value !== '')
    }
  }

  return []
}

function getModernUIDropdownOptions(element: HTMLElement, container: Element): string[] {
  const options: string[] = []
  
  // Look for associated dropdown menu or listbox
  const ariaControls = element.getAttribute('aria-controls')
  if (ariaControls) {
    const dropdown = document.getElementById(ariaControls)
    if (dropdown) {
      const optionElements = dropdown.querySelectorAll('[role="option"], li, button, a')
      options.push(...extractOptionsFromElements(optionElements))
    }
  }
  
  // Look for nearby dropdown menu (common pattern)
  const parentContainer = element.closest('div, section, fieldset') || container
  const nearbyDropdowns = parentContainer.querySelectorAll('[role="listbox"], [role="menu"], .dropdown-menu, .select-options, .options')
  
  for (const dropdown of nearbyDropdowns) {
    const optionElements = dropdown.querySelectorAll('[role="option"], li, button, a')
    options.push(...extractOptionsFromElements(optionElements))
  }
  
  // Look for sibling elements that might be dropdown options
  let sibling = element.nextElementSibling
  while (sibling && options.length === 0) {
    if (sibling.matches('[role="listbox"], .dropdown, .select-options')) {
      const optionElements = sibling.querySelectorAll('[role="option"], li, button, a')
      options.push(...extractOptionsFromElements(optionElements))
      break
    }
    sibling = sibling.nextElementSibling
  }
  
  // Look for data attributes that might contain options
  const dataOptions = element.getAttribute('data-options')
  if (dataOptions) {
    try {
      const parsed = JSON.parse(dataOptions)
      if (Array.isArray(parsed)) {
        options.push(...parsed.map(opt => typeof opt === 'object' ? opt.value || opt.label : String(opt)))
      }
    } catch {
      // If not JSON, try splitting by common delimiters
      options.push(...dataOptions.split(/[,;|]/).map(opt => opt.trim()).filter(Boolean))
    }
  }
  
  // Extract options from class names or common patterns
  if (options.length === 0) {
    const commonOptions = extractCommonOptions(element)
    options.push(...commonOptions)
  }
  
  return [...new Set(options)].filter(opt => opt && opt.length > 0)
}

function extractOptionsFromElements(elements: NodeListOf<Element>): string[] {
  return Array.from(elements)
    .map(el => {
      // Try data-value first, then value attribute, then text content
      return el.getAttribute('data-value') || 
             el.getAttribute('value') || 
             el.textContent?.trim() || ''
    })
    .filter(text => text && text.length > 0 && !isPlaceholderText(text))
}

function isPlaceholderText(text: string): boolean {
  const placeholderPatterns = /^(select|choose|pick|click|tap|--)/i
  return placeholderPatterns.test(text) || text.length > 50
}

function extractCommonOptions(element: HTMLElement): string[] {
  const className = element.className.toLowerCase()
  const ariaLabel = element.getAttribute('aria-label')?.toLowerCase() || ''
  const textContent = element.textContent?.toLowerCase() || ''
  
  // Common options based on field context
  if (className.includes('gender') || ariaLabel.includes('gender') || textContent.includes('gender')) {
    return ['Male', 'Female', 'Other', 'Prefer not to say']
  }
  
  if (className.includes('country') || ariaLabel.includes('country')) {
    return ['United States', 'Canada', 'United Kingdom', 'Australia', 'Germany', 'France', 'Other']
  }
  
  if (className.includes('state') || ariaLabel.includes('state')) {
    return ['CA', 'NY', 'TX', 'FL', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI']
  }
  
  if (className.includes('brand') || ariaLabel.includes('brand')) {
    return ['Apple', 'Samsung', 'Google', 'Microsoft', 'Sony', 'LG', 'Other']
  }
  
  return []
}