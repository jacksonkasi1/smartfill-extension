import { describe, expect, test } from 'bun:test'
import { normalizeFormFields } from '../../src/lib/detection/fieldNormalization'
import { buildFieldSchema } from '../../src/api/ai/prompt'
import type { FormField } from '../../src/types/extension'

function element(attributes: Record<string, string> = {}, parent?: object): FormField['element'] {
  return {
    hidden: false,
    parentElement: parent || null,
    getAttribute: (name: string) => attributes[name] ?? null,
    hasAttribute: (name: string) => name in attributes,
    closest: () => parent || null
  } as unknown as FormField['element']
}

function field(overrides: Partial<FormField>): FormField {
  return {
    id: 'field', name: 'field', type: 'text', value: '', required: false,
    element: element(), ...overrides
  } as FormField
}

describe('normalizeFormFields', () => {
  test('keeps one canonical candidate for repeated exact names', () => {
    const result = normalizeFormFields([
      field({ id: 'businessName', name: 'businessName', label: 'Business Name' }),
      field({ id: 'businessName', name: 'businessName', label: 'Business Name', placeholder: 'Acme Ltd' })
    ])
    expect(result.fields).toHaveLength(1)
    expect(result.fields[0].placeholder).toBe('Acme Ltd')
  })

  test('prefers the named select with options over a generated Radix trigger', () => {
    const result = normalizeFormFields([
      field({ id: '_r_7p_-form-item', name: '_r_7p_-form-item', type: 'select', label: 'Credit Terms' }),
      field({ id: 'select_terms', name: 'select_terms', type: 'select', label: 'Credit Terms', options: ['thirty_days', 'cash'] })
    ])
    expect(result.fields).toHaveLength(1)
    expect(result.fields[0].name).toBe('select_terms')
    expect(JSON.parse(buildFieldSchema(result.fields))[0].options).toEqual(['thirty_days', 'cash'])
  })

  test('does not merge equal labels from different sections', () => {
    const business = {}
    const finance = {}
    const result = normalizeFormFields([
      field({ name: 'business_phone', label: 'Phone Number', element: element({}, business) }),
      field({ name: 'finance_phone', label: 'Phone Number', element: element({}, finance) })
    ])
    expect(result.fields).toHaveLength(2)
  })

  test('removes listbox/menu popup content from the AI schema', () => {
    const result = normalizeFormFields([
      field({ name: 'supplier_menu', label: 'Suppliers', type: 'select', element: element({ role: 'listbox' }) }),
      field({ name: 'company', label: 'Company Name' })
    ])
    expect(result.fields.map(f => f.name)).toEqual(['company'])
  })

  test('keeps one field when a hidden custom-select implementation accompanies a visible trigger', () => {
    const result = normalizeFormFields([
      field({ name: 'country', label: 'Country', type: 'select', element: element({}) }),
      field({ name: 'country_value', label: 'Country', type: 'select', element: { ...element({}), hidden: true } as FormField['element'] })
    ])
    expect(result.fields).toHaveLength(1)
    expect(result.fields[0].name).toBe('country')
  })
})
