// ** import types
import type { AIFormData, FormField } from '@/types/extension'

// ** import shared sensitive / consent helpers
import {
  isSensitiveField,
  isConsentField,
  extractExplicitContextMap,
  isSensitiveValueAllowed,
  detectConsentDirective
} from './sensitiveFields'

/**
 * Parse the AI's raw text response into a structured AIFormData.
 *
 * Behaviour:
 *   - Tolerates surrounding prose and markdown code fences.
 *   - When `safeFillingMode` is true (the user opted in to the
 *     protection layer):
 *       * Sensitive fields (password, passport, Aadhaar, PAN, SSN,
 *         PIN, OTP, CVV, bank account, credit card, tax ID, ...)
 *         are only allowed a value when the user context contains
 *         an explicit `key: value` pair that associates the value
 *         with that specific field. Everything else is left blank.
 *       * Consent / opt-in fields (terms, privacy, newsletter,
 *         marketing, cookies, ...) default to false / unchecked.
 *         The user context must contain a consent directive tied
 *         to the field's topic (e.g. "accept the terms" for a
 *         Terms checkbox) to flip it to true.
 *   - When `safeFillingMode` is false (default, "SmartFill Lite"
 *     mode), the AI is allowed to generate appropriate values for
 *     every detected field. Nothing is blanked purely because it is
 *     sensitive or consent-shaped. Password and confirm-password
 *     fields are filled with whatever the AI produced.
 *   - Empty string for sensitive fields is preserved as the
 *     user's intent.
 */
export function parseAIResponse(
  response: string,
  fields: FormField[],
  customInstructions?: string,
  options: { safeFillingMode?: boolean } = {}
): AIFormData {
  const jsonText = extractFirstJsonObject(response)
  if (!jsonText) throw new Error('No JSON found in AI response')

  let jsonData: Record<string, any>
  try {
    jsonData = JSON.parse(jsonText)
  } catch (err) {
    throw new Error(`Failed to parse AI response JSON: ${(err as Error).message}`)
  }

  // Default OFF. Existing users with no setting must receive
  // unrestricted filling.
  const safeFillingMode = options.safeFillingMode === true

  // Build a structured map of explicit assignments from the user
  // context. The parser uses this (only when safeFillingMode is on)
  // to decide whether a sensitive value is associated with the
  // right field.
  const contextMap = safeFillingMode
    ? extractExplicitContextMap(customInstructions)
    : new Map<string, string[]>()
  const cleaned: AIFormData = {}
  const missing: string[] = []

  for (const field of fields) {
    const raw = findValueForField(field, jsonData)
    const sensitive = isSensitiveField(field)
    const consent = isConsentField(field)

    if (raw === undefined || raw === null) {
      missing.push(field.name)
      cleaned[field.name] = fallbackForField(field, sensitive, consent, safeFillingMode)
      continue
    }

    const asString = normalizeToString(raw)

    // ----------------------------------------------------------------
    // Safe Filling Mode ON — apply sensitive / consent protection.
    // ----------------------------------------------------------------
    if (safeFillingMode && sensitive) {
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

    if (safeFillingMode && consent) {
      if (asString === '') {
        cleaned[field.name] = ''
        continue
      }
      const truthy = isTruthyValue(raw)
      // Consent is gated ONLY by the field-aware directive. We do
      // NOT use `isValueExplicitInContext` as a fallback because
      // unrelated context ("true", "yes", the literal string the AI
      // echoed) could otherwise let a consent field slip through.
      const directive = detectConsentDirective(customInstructions, field)
      const affirmativeContext =
        (directive === 'accept' && truthy) ||
        (directive === 'decline' && !truthy)
      if (!affirmativeContext) {
        cleaned[field.name] = field.type === 'checkbox' ? false : ''
        continue
      }
      cleaned[field.name] = field.type === 'checkbox' ? truthy : asString
      continue
    }

    // ----------------------------------------------------------------
    // Safe Filling Mode OFF (default) — normalise the AI value for
    // every field, sensitive or not, consent or not. We still call
    // the helper so consent / sensitive fields benefit from the
    // same checkbox / select / radio normalization as normal
    // fields. No field is blanked because of its topic.
    // ----------------------------------------------------------------
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
    if (Array.isArray(value)) {
      return value.map(v => normalizeToString(v))
    }
    if (typeof value === 'boolean') return value
    if (typeof value === 'string') {
      const v = value.trim().toLowerCase()
      if (v === 'true' || v === '1' || v === 'yes' || v === 'on') return true
      if (v === 'false' || v === '0' || v === 'no' || v === 'off') return false
      // For option-based checkboxes / checkbox groups, preserve the
      // original casing so "Full Time" stays "Full Time" instead of
      // becoming "full time" (lowercased values can fail to match
      // real option text).
      return value.trim()
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
  consent: boolean,
  safeFillingMode: boolean
): string | boolean | string[] {
  // The sensitive / consent blanks are the *protection* behavior.
  // They only kick in when the user has explicitly enabled Safe
  // Filling Mode. When the mode is off, fall through to the normal
  // generic fallback so sensitive / consent fields still get a
  // value when the AI happens to omit one.
  if (safeFillingMode) {
    if (sensitive) return ''
    if (consent) {
      if (field.type === 'checkbox') return false
      return ''
    }
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
