// ** import types
import type { AIFormData, FormField } from '@/types/extension'

// ** import shared sensitive / consent helpers
import {
  isSensitiveField,
  isConsentField,
  extractExplicitContextTokens,
  extractExplicitContextMap,
  isSensitiveValueAllowed,
  isValueExplicitInContext,
  detectConsentDirective
} from './sensitiveFields'

/**
 * Parse the AI's raw text response into a structured AIFormData.
 *
 * Behaviour:
 *   - Tolerates surrounding prose and markdown code fences.
 *   - For sensitive fields, only allows a value when the user
 *     context contains an explicit `key: value` pair that
 *     associates the value with that specific field. A bare
 *     token-presence-in-context check is no longer sufficient.
 *   - For consent fields (terms / privacy / newsletter / etc.),
 *     default to false / unchecked. The user context must
 *     contain a consent directive tied to the field's topic
 *     (e.g. "accept the terms" for a Terms checkbox) to flip it
 *     to true.
 *   - Empty string for sensitive fields is preserved as the
 *     user's intent.
 */
export function parseAIResponse(
  response: string,
  fields: FormField[],
  customInstructions?: string
): AIFormData {
  const jsonText = extractFirstJsonObject(response)
  if (!jsonText) throw new Error('No JSON found in AI response')

  let jsonData: Record<string, any>
  try {
    jsonData = JSON.parse(jsonText)
  } catch (err) {
    throw new Error(`Failed to parse AI response JSON: ${(err as Error).message}`)
  }

  // Build a structured map of explicit assignments from the user
  // context. The parser uses this to decide whether a sensitive
  // value is associated with the right field.
  const contextMap = extractExplicitContextMap(customInstructions)
  // Tokens are still useful for non-sensitive field matching.
  const contextTokens = extractExplicitContextTokens(customInstructions)
  const cleaned: AIFormData = {}
  const missing: string[] = []

  for (const field of fields) {
    const raw = findValueForField(field, jsonData)
    const sensitive = isSensitiveField(field)
    const consent = isConsentField(field)

    if (raw === undefined || raw === null) {
      missing.push(field.name)
      cleaned[field.name] = fallbackForField(field, sensitive, consent)
      continue
    }

    const asString = normalizeToString(raw)

    if (sensitive) {
      // Sensitive value must be associated with this specific field
      // by an explicit key/value pair in the user context.
      if (asString === '') {
        cleaned[field.name] = ''
      } else if (isSensitiveValueAllowed(field, asString, contextMap)) {
        cleaned[field.name] = asString
      } else {
        cleaned[field.name] = ''
      }
      continue
    }

    if (consent) {
      if (asString === '') {
        cleaned[field.name] = ''
        continue
      }
      const truthy = isTruthyValue(raw)
      // Field-aware consent: pass the field in so we can check the
      // consent topic against the user context.
      const directive = detectConsentDirective(customInstructions, field)
      const affirmativeContext =
        (directive === 'accept' && truthy) ||
        (directive === 'decline' && !truthy)
      const affirmativeValue = truthy && isValueExplicitInContext(asString, contextTokens)
      if (!affirmativeContext && !affirmativeValue) {
        cleaned[field.name] = field.type === 'checkbox' ? false : ''
        continue
      }
      cleaned[field.name] = field.type === 'checkbox' ? truthy : asString
      continue
    }

    if (asString === '') {
      cleaned[field.name] = ''
      continue
    }

    cleaned[field.name] = normalizeValue(raw, field)
  }

  if (missing.length > 0) {
    console.warn('[SmartFill] AI did not generate data for fields:', missing)
  }

  return cleaned
}

function findValueForField(field: FormField, data: Record<string, any>): any {
  if (data[field.name] !== undefined) return data[field.name]
  const lower = field.name.toLowerCase()
  const direct = Object.keys(data).find(k => k.toLowerCase() === lower)
  if (direct) return data[direct]
  let bestKey: string | undefined
  for (const key of Object.keys(data)) {
    const lk = key.toLowerCase()
    if (lk.includes(lower) || lower.includes(lk)) {
      if (!bestKey || key.length < bestKey.length) bestKey = key
    }
  }
  return bestKey !== undefined ? data[bestKey] : undefined
}

function normalizeToString(value: any): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  if (Array.isArray(value)) return value.map(v => normalizeToString(v)).join(', ')
  if (typeof value === 'object') {
    try { return JSON.stringify(value) } catch { return '' }
  }
  return String(value)
}

function isTruthyValue(value: any): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase()
    if (v === 'true' || v === '1' || v === 'yes' || v === 'on' || v === 'checked') return true
    if (v === 'false' || v === '0' || v === 'no' || v === 'off' || v === 'unchecked' || v === '') return false
  }
  return Boolean(value)
}

function normalizeValue(value: any, field: FormField): string | boolean | string[] {
  if (field.type === 'checkbox') {
    if (Array.isArray(value)) return value.map(v => normalizeToString(v))
    if (typeof value === 'boolean') return value
    if (typeof value === 'string') {
      const v = value.toLowerCase()
      if (v === 'true' || v === '1' || v === 'yes' || v === 'on') return true
      if (v === 'false' || v === '0' || v === 'no' || v === 'off') return false
      return v
    }
    return Boolean(value)
  }
  if (field.type === 'radio' || field.type === 'select') {
    if (Array.isArray(value)) return normalizeToString(value[0] ?? '')
    if (typeof value === 'boolean') return value ? 'true' : 'false'
    return normalizeToString(value)
  }
  if (typeof value === 'boolean') return value
  if (Array.isArray(value)) return value.map(v => normalizeToString(v))
  return normalizeToString(value)
}

function fallbackForField(
  field: FormField,
  sensitive: boolean,
  consent: boolean
): string | boolean | string[] {
  if (sensitive) return ''
  if (consent) {
    if (field.type === 'checkbox') return false
    return ''
  }
  if (field.type === 'checkbox') {
    if (field.options && field.options.length > 1) return [field.options[0]]
    return false
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

function extractFirstJsonObject(text: string): string | null {
  if (!text) return null
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenced) return extractFirstJsonObject(fenced[1].trim())
  const start = text.indexOf('{')
  if (start === -1) return null
  let depth = 0
  let inString = false
  let escape = false
  for (let i = start; i < text.length; i++) {
    const ch = text[i]
    if (escape) { escape = false; continue }
    if (ch === '\\') { escape = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === '{') depth++
    else if (ch === '}') { depth--; if (depth === 0) return text.slice(start, i + 1) }
  }
  return null
}
