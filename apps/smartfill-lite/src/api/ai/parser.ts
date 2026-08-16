// ** import types
import type { AIFormData, FormField } from '@/types/extension'

// ** import shared sensitive/consent helpers
import {
  isSensitiveField,
  isConsentField,
  extractExplicitContextTokens,
  isValueExplicitInContext,
  detectConsentDirective
} from './sensitiveFields'

/**
 * Parse the AI's raw text response into a structured AIFormData.
 *
 * Behaviour:
 *   - Tolerates surrounding prose and markdown code fences.
 *   - For sensitive fields, only allows a value if it explicitly
 *     appears in the user's `customInstructions` context. This way
 *     a user who types "Passport: N1234567" can still fill the
 *     passport field, but the AI cannot invent a fake one.
 *   - For consent fields (terms / privacy / newsletter / etc.),
 *     default to false / unchecked unless the AI's value was
 *     clearly instructed by the user's context.
 *   - Empty string for sensitive fields is preserved as the user's
 *     intent (the field is left blank).
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

  const contextTokens = extractExplicitContextTokens(customInstructions)
  const consentDirective = detectConsentDirective(customInstructions)
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

    // Normalize to string for the cross-check against context. We do
    // NOT require a minimum length here — a 3-digit CVV the user
    // typed explicitly must be honoured.
    const asString = normalizeToString(raw)
    const explicit = isValueExplicitInContext(asString, contextTokens)

    if (sensitive) {
      if (asString === '') {
        cleaned[field.name] = ''
      } else if (explicit) {
        cleaned[field.name] = asString
      } else {
        // Sensitive but not in the user's context: blank it. We
        // do this even for numbers, booleans, and short strings,
        // because the AI should not have invented them.
        cleaned[field.name] = ''
      }
      continue
    }

    if (consent) {
      // Consent default = off. The AI may only set true if either:
      //   1) the user explicitly said so in the context, OR
      //   2) the value itself is explicit and affirmative, OR
      //   3) the user context contains an accept-style directive.
      if (asString === '') {
        cleaned[field.name] = ''
        continue
      }
      const truthy = isTruthyValue(raw)
      const affirmativeValue = truthy && explicit
      const affirmativeContext =
        (consentDirective === 'accept' && truthy) ||
        (consentDirective === 'decline' && !truthy)
      if (!affirmativeValue && !affirmativeContext) {
        // No explicit signal -> do not auto-accept.
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
  // Sensitive or consent: blank / off, never a guessed value.
  if (sensitive) return ''
  if (consent) {
    if (field.type === 'checkbox') return false
    return ''
  }

  if (field.type === 'checkbox') {
    if (field.options && field.options.length > 1) return [field.options[0]]
    // Single checkbox: only default to true for explicitly "required"
    // agreement-like fields, never just because `required` is set.
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
