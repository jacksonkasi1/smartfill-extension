// ** import types
import type { AIFormData, FormField } from '@/types/extension'

const SENSITIVE_FIELD_PATTERNS = [
  'passport',
  'aadhaar',
  'ssn',
  'social security',
  'credit card',
  'card number',
  'cvv',
  'cvc',
  'bank account',
  'account number',
  'iban',
  'tax id',
  'pan number',
  'sin number',
  'pin',
  'password',
  'secret',
  'otp',
  '2fa',
  'auth code',
]

function isSensitiveField(field: FormField): boolean {
  const haystack = `${field.name} ${field.label || ''} ${field.placeholder || ''}`.toLowerCase()
  return SENSITIVE_FIELD_PATTERNS.some(p => haystack.includes(p))
}

/**
 * Parse the AI's raw text response into a structured AIFormData.
 *
 * The parser is tolerant: it strips markdown fences, finds the first
 * balanced JSON object, and falls back gracefully for any fields the AI
 * did not generate a value for.
 */
export function parseAIResponse(response: string, fields: FormField[]): AIFormData {
  // Try to find a JSON object in the response, with or without markdown fences.
  const jsonText = extractFirstJsonObject(response)
  if (!jsonText) {
    throw new Error('No JSON found in AI response')
  }

  let jsonData: Record<string, any>
  try {
    jsonData = JSON.parse(jsonText)
  } catch (err) {
    throw new Error(`Failed to parse AI response JSON: ${(err as Error).message}`)
  }

  const cleanedData: AIFormData = {}
  const missingFields: string[] = []

  for (const field of fields) {
    const fieldName = field.name
    const matchedValue = findValueForField(field, jsonData)

    if (matchedValue !== undefined && matchedValue !== null && matchedValue !== '') {
      // Sensitive fields: never let the AI supply a value the user did not.
      if (isSensitiveField(field)) {
        cleanedData[fieldName] = ''
        continue
      }
      cleanedData[fieldName] = normalizeValue(matchedValue, field)
      continue
    }

    // AI did not supply a value for this field. Provide a safe fallback.
    missingFields.push(fieldName)
    cleanedData[fieldName] = fallbackForField(field)
  }

  if (missingFields.length > 0) {
    console.warn('[SmartFill] AI did not generate data for fields:', missingFields)
  }

  return cleanedData
}

function findValueForField(field: FormField, data: Record<string, any>): any {
  if (data[field.name] !== undefined) return data[field.name]

  const lowerFieldName = field.name.toLowerCase()
  const directMatch = Object.keys(data).find(k => k.toLowerCase() === lowerFieldName)
  if (directMatch) return data[directMatch]

  // Fuzzy containment match — pick the key that best matches.
  let bestKey: string | undefined
  for (const key of Object.keys(data)) {
    const lk = key.toLowerCase()
    if (lk.includes(lowerFieldName) || lowerFieldName.includes(lk)) {
      if (!bestKey || key.length < bestKey.length) bestKey = key
    }
  }
  return bestKey !== undefined ? data[bestKey] : undefined
}

function normalizeValue(value: any, field: FormField): string | boolean | string[] {
  // Coerce based on the field type so downstream code can rely on the shape.
  if (field.type === 'checkbox') {
    if (Array.isArray(value)) return value.map(String)
    if (typeof value === 'boolean') return value
    if (typeof value === 'string') {
      const v = value.toLowerCase()
      if (v === 'true' || v === '1' || v === 'yes' || v === 'on') return true
      if (v === 'false' || v === '0' || v === 'no' || v === 'off') return false
      return v // treat as a single string option
    }
    return Boolean(value)
  }

  if (field.type === 'radio' || field.type === 'select') {
    if (Array.isArray(value)) return String(value[0] ?? '')
    if (typeof value === 'boolean') return value ? 'true' : 'false'
    return String(value)
  }

  if (typeof value === 'boolean') return value
  if (Array.isArray(value)) return value.map(String).join(', ')
  return String(value)
}

function fallbackForField(field: FormField): string | boolean | string[] {
  // Sensitive fields are always empty.
  if (isSensitiveField(field)) return ''

  if (field.type === 'checkbox') {
    if (field.options && field.options.length > 1) return [field.options[0]]
    // Single checkbox: default to true for required fields, false otherwise.
    return Boolean(field.required) || field.name.toLowerCase().includes('terms')
  }

  if (field.type === 'radio' || field.type === 'select') {
    return field.options?.[0] ?? ''
  }

  return getGenericFieldValue(field)
}

function getGenericFieldValue(field: FormField): string {
  const name = field.name.toLowerCase()

  if (name.includes('email')) return 'test@example.com'
  if (name.includes('phone') || name.includes('mobile')) return '+1-555-0123'
  if (name.includes('firstname') || name.includes('first_name')) return 'Test'
  if (name.includes('lastname') || name.includes('last_name')) return 'User'
  if (name.includes('fullname') || name.includes('name')) return 'Test User'
  if (name.includes('date')) return new Date().toISOString().split('T')[0]
  if (name.includes('time')) return '09:00'
  if (name.includes('age')) return '25'
  if (name.includes('salary')) return '50000'
  if (name.includes('zip') || name.includes('postal')) return '12345'
  if (name.includes('address') || name.includes('street')) return '123 Main St'
  if (name.includes('city')) return 'New York'
  if (name.includes('company')) return 'Test Corp'
  if (name.includes('title') || name.includes('job')) return 'Software Developer'
  if (name.includes('country')) return 'United States'

  return ''
}

/**
 * Extract the first balanced top-level JSON object from a string.
 * Tolerates surrounding prose, markdown fences, and leading text.
 */
function extractFirstJsonObject(text: string): string | null {
  if (!text) return null

  // Strip markdown code fences if present
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenced) {
    return extractFirstJsonObject(fenced[1].trim())
  }

  const start = text.indexOf('{')
  if (start === -1) return null

  let depth = 0
  let inString = false
  let escape = false
  for (let i = start; i < text.length; i++) {
    const ch = text[i]
    if (escape) {
      escape = false
      continue
    }
    if (ch === '\\') {
      escape = true
      continue
    }
    if (ch === '"') {
      inString = !inString
      continue
    }
    if (inString) continue
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) {
        return text.slice(start, i + 1)
      }
    }
  }
  return null
}
