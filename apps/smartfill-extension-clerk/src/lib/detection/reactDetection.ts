// ** import types
import type { FormField } from '@/types/extension'

// ** import utils
import { isFieldFillable, isFieldRequired } from './fieldValidation'
import { getFieldType } from './fieldTypes'
import { getFieldName, getFieldId } from './fieldNames'
import { extractLabel, extractContextualInfo } from './fieldLabels'
import { getFieldOptions } from './fieldOptions'

export async function waitForReactComponents(timeout: number = 2000): Promise<void> {
  return new Promise(resolve => {
    const startTime = Date.now()
    
    function checkForReact() {
      const hasReactElements = document.querySelector('[data-reactroot], [class*="react"], [id*="react"]')
      if (hasReactElements || Date.now() - startTime >= timeout) {
        resolve()
      } else {
        setTimeout(checkForReact, 100)
      }
    }
    
    checkForReact()
  })
}

export function detectReactFields(): FormField[] {
  const fields: FormField[] = []
  
  const reactSelectors = [
    'input[onChange]', 'input[onInput]', 'input[onBlur]',
    'select[onChange]', 'textarea[onChange]',
    
    '.MuiTextField-root input', '.MuiSelect-select', '.MuiTextarea-root textarea',
    '[data-testid*="input"]', '[data-testid*="select"]', '[data-testid*="field"]',
    
    '.ant-input', '.ant-select', '.ant-checkbox', '.ant-radio',
    
    '[data-hook-form]', '[ref*="register"]',
    
    '[name][value]',
    
    '[class*="FormField"]', '[class*="Field"]', '[class*="Input"]',
    
    '[data-field-name]', '[data-form-field]'
  ]
  
  const elements = document.querySelectorAll(reactSelectors.join(', '))
  const processedElements = new Set<Element>()
  
  for (const element of elements) {
    const el = element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    
    if (processedElements.has(el) || !isFieldFillable(el)) continue
    processedElements.add(el)
    
    const field: FormField = {
      id: getFieldId(el),
      name: getFieldName(el),
      type: getFieldType(el),
      value: el.value || '',
      label: extractLabel(el) || extractContextualInfo(el),
      placeholder: el.getAttribute('placeholder') || undefined,
      required: isFieldRequired(el),
      element: el,
      options: getFieldOptions(el, document.body)
    }
    
    fields.push(field)
  }
  
  return fields
}