// ** import types
import type { FormField } from '@/types/extension'

/**
 * Patterns that mark a form field as sensitive. We deliberately do NOT
 * use a plain substring search on the raw name/label/placeholder
 * because short words like "pin" would then match anything that
 * happens to contain those letters ("shipping" -> "pin" via "...pp**in**g",
 * "spinning", "mapping", "shipp**in**g"). Instead we split the
 * haystack on common identifier separators (space, underscore, dash,
 * camelCase boundaries) and test each token individually.
 *
 * The pattern shapes are split into two groups:
 *
 *  - "long" patterns: words that are long enough that a substring
 *    search would not cause surprising matches. Tested as plain
 *    case-insensitive substrings.
 *
 *  - "short" patterns: 1-3 character abbreviations that MUST only
 *    match on a complete word / token boundary. These are the
 *    dangerous ones (pin, otp, ssn, cvv, cvc, 2fa, pan, sin, iban).
 */

const LONG_SENSITIVE_PATTERNS: ReadonlyArray<string> = [
  'passport',
  'aadhaar',
  'social security',
  'credit card',
  'card number',
  'creditcard',
  'bank account',
  'account number',
  'tax id',
  'pin number',
  'passcode',
  'secret',
  'auth code',
  'verification code',
  'security question',
  'date of birth',
  'mothers maiden',
  'driver licence',
  'drivers licence',
  'national id',
  'cardholder',
]

// Short patterns: MUST match on a token boundary only.
const SHORT_SENSITIVE_PATTERNS: ReadonlyArray<string> = [
  'pin',
  'otp',
  'ssn',
  'cvv',
  'cvc',
  '2fa',
  'pan',
  'sin',
  'iban',
  'swift',
]

const CONSENT_KEYWORDS: ReadonlyArray<string> = [
  'terms',
  'condition',
  'privacy',
  'consent',
  'agree',
  'agreement',
  'marketing',
  'newsletter',
  'subscribe',
  'subscription',
  'promotional',
  'cookie',
  'data processing',
  'legal',
  'opt-in',
  'opt-in',
]

/**
 * Split an identifier-like string into tokens at common boundaries:
 *   - whitespace
 *   - underscores, dashes, dots, slashes
 *   - camelCase boundaries (lowercase -> uppercase)
 *
 * This means `shippingAddress` becomes ['shipping', 'Address'] and
 * `pin-code` becomes ['pin', 'code'].
 */
function tokenize(input: string): string[] {
  if (!input) return []
  // Normalize separators to spaces, then split on camelCase.
  const withSeparators = input
    .replace(/[_\-./\\:]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
  return withSeparators
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
}

/**
 * Is `token` a sensitive short pattern? Exact equality check only.
 */
function isShortSensitiveToken(token: string): boolean {
  return SHORT_SENSITIVE_PATTERNS.includes(token)
}

/**
 * Full sensitive-field test for a FormField. Combines long-substring
 * patterns with short-token patterns. Does not depend on regex
 * metachars in the haystack, so the function is safe to call on
 * arbitrary web-supplied strings.
 */
export function isSensitiveField(field: FormField): boolean {
  const haystack = `${field.name} ${field.label || ''} ${field.placeholder || ''}`.trim()
  if (!haystack) return false

  const lower = haystack.toLowerCase()
  for (const p of LONG_SENSITIVE_PATTERNS) {
    if (lower.includes(p)) return true
  }

  const tokens = tokenize(haystack)
  for (const t of tokens) {
    if (isShortSensitiveToken(t)) return true
  }

  return false
}

/**
 * Is the field a consent / opt-in control that we must NEVER
 * auto-accept? Detected independently of sensitive fields so that
 * marketing and cookie checkboxes (which are not sensitive) are
 * still guarded.
 */
export function isConsentField(field: FormField): boolean {
  const haystack =
    `${field.name || ''} ${field.label || ''} ${field.placeholder || ''}`.toLowerCase()
  if (!haystack.trim()) return false
  return CONSENT_KEYWORDS.some(k => {
    // Match whole-word style for these too, so "conditioning" does
    // not trip a "condition" match.
    const tokens = tokenize(haystack)
    return tokens.some(t => t === k || t.startsWith(k) || t.includes(k))
  })
}

/**
 * Tokenize user context (custom instructions) into a normalized set
 * of explicit values. Used by the parser to decide whether a sensitive
 * value is allowed.
 */
export function extractExplicitContextTokens(customInstructions: string | undefined): Set<string> {
  const tokens = new Set<string>()
  if (!customInstructions) return tokens
  const normalized = customInstructions.trim()
  if (!normalized) return tokens
  tokens.add(normalized.toLowerCase())
  for (const t of tokenize(normalized)) {
    if (t.length > 0) tokens.add(t)
  }
  // Also keep every whitespace-delimited chunk so exact-phrase
  // matches like "N1234567" or "ABCDE1234F" work.
  for (const chunk of normalized.split(/\s+/)) {
    if (chunk) tokens.add(chunk.toLowerCase())
  }
  return tokens
}

/**
 * Words that, when they appear in user context near a consent
 * field, indicate the user is opting in. Used to allow
 * "accept the terms" / "subscribe to newsletter" even though
 * the AI's value is a boolean "true" with no other context.
 */
const CONSENT_AFFIRM_KEYWORDS: ReadonlyArray<string> = [
  'accept', 'agree', 'opted-in', 'opt-in', 'opt in',
  'subscribe', 'sign up', 'signup',
  'yes', 'consent', 'allow', 'enable', 'on'
]
const CONSENT_DENY_KEYWORDS: ReadonlyArray<string> = [
  'do not', 'don\u2019t', 'don\u2018t', 'don\u2019t',
  'decline', 'reject', 'refuse', 'opt-out', 'opt out',
  'no thanks', 'unsubscribe', 'disable', 'off'
]

/**
 * Does the user context contain an explicit accept / decline for
 * consent / opt-in fields?
 *
 *   return value: 'accept' | 'decline' | 'none'
 */
export function detectConsentDirective(customInstructions: string | undefined): 'accept' | 'decline' | 'none' {
  if (!customInstructions) return 'none'
  const lower = customInstructions.toLowerCase()
  if (CONSENT_DENY_KEYWORDS.some(k => lower.includes(k))) return 'decline'
  if (CONSENT_AFFIRM_KEYWORDS.some(k => lower.includes(k))) return 'accept'
  return 'none'
}

/**
 * Does the user context explicitly contain the given candidate value
 * (as a token or a contiguous substring of a chunk)? Used to allow
 * sensitive values when the user typed them in.
 */
export function isValueExplicitInContext(value: string, tokens: Set<string>): boolean {
  if (!value) return false
  const v = value.toLowerCase().trim()
  if (!v) return false
  if (tokens.has(v)) return true
  for (const t of tokens) {
    if (t.includes(v) || v.includes(t)) return true
  }
  return false
}
