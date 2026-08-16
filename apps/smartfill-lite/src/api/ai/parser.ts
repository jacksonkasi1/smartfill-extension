// ** import types
import type { AIFormData, FormField } from '@/types/extension'

const SENSITIVE_FIELD_PATTERNS = [
  'passport', 'aadhaar', 'ssn', 'social security',
  'credit card', 'card number', 'cvv', 'cvc',
  'bank account', 'account number', 'iban',
  'tax id', 'pan number', 'sin number',
  'pin', 'password', 'secret', 'otp', '2fa', 'auth code'
]

function isSensitiveField(field: FormField): boolean {
  const haystack = `${field.name} ${field.label || ''} ${field.placeholder || ''}`.toLowerCase()
  return SENSITIVE_FIELD_PATTERNS.some(p => haystack.includes(p))
}

/**
 * Normalize a custom-instructions blob into a set of canonical tokens
 * that we will allow the AI to use for sensitive fields. We use a
 * fairly loose, deterministic check: any value that appears anywhere
 * in the user's context as a non-trivial substring is considered
 * "explicit". A short, well-known placeholder like `1234` would be
 * rejected because the context must contain it.
 */
function extractAllowedContextTokens(customInstructions: string | undefined): Set<string> {
  const tokens = new Set<string>()
  if (!customInstructions) return tokens
  const lowered = customInstructions.toLowerCase()
  // Sliding 4+ character alnum tokens (loose)
  const re = /[A-Za-z0-9][A-Za-z0-9._@/-]{3,}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(customInstructions)) !== null) {
    const t = m[0].toLowerCase()
    if (t.length >= 4) tokens.add(t)
  }
  // Also keep the entire normalized context so full-value matches work
  tokens.add(lowered.trim())
  return tokens
}

function isValueExplicitInContext(value: string, tokens: Set<string>): boolean {
  if (!value) return false
  const v = value.toLowerCase()
  if (v.length < 4) return false
  if (tokens.has(v)) return true
  // Substring: any context token that contains the value
  for (const t of tokens) {
    if (t.includes(v)) return true
  }
  return false
}

/**
 * Parse the AI's raw text response into a structured AIFormData.
 *
 * Behaviour:
 *   - Tolerates surrounding prose and markdown code fences.
 *   - For sensitive fields, only allows a value if it explicitly
 *     appears in the user's `customInstructions` context. This way
 *     a user who types "Passport: N1234567" can still fill the
 *     passport field, but the AI cannot invent a fake one.
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

  const contextTokens = extractAllowedContextTokens(customInstructions)
  const cleaned: AIFormData = {}
  const missing: string[] = []

  for (const field of fields) {
    const raw = findValueForField(field, jsonData)

    if (raw === undefined || raw === null) {
      missing.push(field.name)
      cleaned[field.name] = fallbackForField(field)
      continue
    }

    // Sensitive fields: allow only if value came from explicit user context.
    if (isSensitiveField(field)) {
      if (raw === '') {
        cleaned[field.name] = ''
      } else if (typeof raw === 'string' && isValueExplicitInContext(raw, contextTokens)) {
        cleaned[field.name] = raw
      } else if (typeof raw === 'number' || typeof raw === 'boolean') {
        // Numbers / booleans for sensitive fields are never from context.
        cleaned[field.name] = ''
      } else {
        cleaned[field.name] = ''
      }
      continue
    }

    // Empty string is valid for non-sensitive fields (e.g. intentionally
    // blank "About" textarea). Pass through.
    if (raw === '') {
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

function normalizeValue(value: any, field: FormField): string | boolean | string[] {
  if (field.type === 'checkbox') {
    if (Array.isArray(value)) return value.map(String)
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
    if (Array.isArray(value)) return String(value[0] ?? '')
    if (typeof value === 'boolean') return value ? 'true' : 'false'
    return String(value)
  }
  if (typeof value === 'boolean') return value
  if (Array.isArray(value)) return value.map(String).join(', ')
  return String(value)
}

function fallbackForField(field: FormField): string | boolean | string[] {
  if (isSensitiveField(field)) return ''

  if (field.type === 'checkbox') {
    if (field.options && field.options.length > 1) return [field.options[0]]
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
