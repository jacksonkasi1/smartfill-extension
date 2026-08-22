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
  'password',
  'passwd',
  'passphrase',
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
  // Recognise clear consent concepts only. We deliberately removed
  // bare tokens like 'condition', 'legal', 'agreement', 'agree'
  // because they are general English words that appear in lots of
  // non-consent contexts:
  //   - "Medical Conditions" / "Health Condition" (a checkbox for
  //     pre-existing conditions must NOT be treated as consent)
  //   - "Legal Name" / "Legal Entity Name" (a free-text identifier
  //     must NOT be treated as consent)
  //   - "Agreement Number" / "Contract Agreement ID" (an ID field
  //     must NOT be treated as consent)
  // The accept / decline verbs (accept, agree, opt in, ...) used to
  // detect a directive in the user context live in
  // `detectConsentDirective` and are unaffected.
  'terms',
  'privacy',
  'consent',
  'marketing',
  'newsletter',
  'subscribe',
  'subscription',
  'promotional',
  'cookie',
  'cookies',
  'opt-in',
  'optin',
  'gdpr',
  'tos',
  'eula',
]

/**
 * Mapping of consent field-keywords to the topic they refer to.
 * Used to associate a consent directive in user context with a
 * specific form field.
 */
const CONSENT_TOPIC_KEYWORDS: Record<string, ReadonlyArray<string>> = {
  terms: ['terms', 'tos', 'eula'],
  privacy: ['privacy', 'gdpr'],
  newsletter: ['newsletter', 'subscription', 'mailing list'],
  marketing: ['marketing', 'promotional', 'promo'],
  cookies: ['cookie', 'cookies'],
  generic: ['consent', 'opt-in', 'opt in', 'optin'],
}

/**
 * Reverse: a single keyword -> its topic. Built once at module load.
 */
const KEYWORD_TO_TOPIC: Map<string, string> = (() => {
  const map = new Map<string, string>()
  for (const [topic, kws] of Object.entries(CONSENT_TOPIC_KEYWORDS)) {
    for (const k of kws) map.set(k, topic)
  }
  return map
})()

/**
 * Split an identifier-like string into tokens at common boundaries.
 */
function tokenize(input: string): string[] {
  if (!input) return []
  const withSeparators = input
    .replace(/[_\-./\\:]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
  return withSeparators
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
}

function isShortSensitiveToken(token: string): boolean {
  return SHORT_SENSITIVE_PATTERNS.includes(token)
}

export function isSensitiveField(field: FormField): boolean {
  // Password fields are sensitive by construction. The `type` check
  // is the canonical path so Safe Filling Mode can always protect
  // them — even if the field name is something exotic (e.g. "pwd",
  // "user_pass") that the name/label-based detection below might
  // not match. The text-based detection further down still covers
  // the rare case of a non-password-typed field that explicitly
  // looks like a password (custom widget, etc.).
  if (field.type === 'password') return true

  const haystack = `${field.name} ${field.label || ''} ${field.placeholder || ''}`.trim()
  if (!haystack) return false

  const lower = haystack.toLowerCase()
  const tokens = tokenize(haystack)
  const tokenSet = new Set(tokens)

  // Long patterns: if the pattern is a multi-word phrase we can
  // safely substring-match it. Single-word long patterns must match
  // on a token boundary, otherwise "secret" would falsely match
  // "Secretary" / "secretaryName" / etc.
  for (const p of LONG_SENSITIVE_PATTERNS) {
    if (p.includes(' ')) {
      if (lower.includes(p)) return true
    } else {
      if (tokenSet.has(p)) return true
    }
  }

  // Compound match for multi-word patterns only. We flatten the
  // haystack and the pattern by stripping separators, so
  // "creditCardNumber" / "credit_card_number" all become
  // "creditcardnumber" and can match the flattened "credit card"
  // pattern. We deliberately do NOT apply this to single-word
  // patterns — otherwise "secret" would still substring-match
  // "secretary" via the flattened form.
  const flat = lower.replace(/[\s_\-./\\:]+/g, '')
  for (const p of LONG_SENSITIVE_PATTERNS) {
    if (!p.includes(' ')) continue
    const flatPattern = p.replace(/[\s_\-./\\:]+/g, '')
    if (flat.includes(flatPattern)) return true
  }

  // Short patterns: token boundary only.
  for (const t of tokens) {
    if (isShortSensitiveToken(t)) return true
  }
  return false
}

export function isConsentField(field: FormField): boolean {
  // Consent handling is only meaningful for boolean / choice
  // controls. A free-text "Legal Name" or "Medical Condition"
  // field should never be treated as a consent field, even if
  // its label contains a consent-looking word.
  if (field.type !== 'checkbox' && field.type !== 'radio') return false

  const haystack =
    `${field.name || ''} ${field.label || ''} ${field.placeholder || ''}`.toLowerCase()
  if (!haystack.trim()) return false
  const tokens = tokenize(haystack)
  if (tokens.length === 0) return false

  // Exact token match only. We deliberately do NOT use
  // `t.startsWith(k)` because that misclassifies common data
  // fields as consent:
  //   - "Medical Conditions"  (token "conditions" starts with the
  //     old keyword "condition")
  //   - "Agreement Number" / "Contract Agreement"  (token
  //     "agreement" starts with the old keyword "agree")
  //   - "Legal Name" / "Legal Entity Name"  (token "legal" was
  //     itself a keyword)
  // The keyword list has been pruned to remove those broad
  // words, and the matching is now strict equality.
  for (const k of CONSENT_KEYWORDS) {
    for (const t of tokens) {
      if (t === k) return true
    }
  }

  // "cookie" and "cookies" are both common and refer to the same
  // consent concept. The keyword list already contains both, so
  // the strict equality loop above covers them. This branch is
  // here as an explicit safety net for future maintainers who may
  // consolidate the list.
  if (tokens.includes('cookie') || tokens.includes('cookies')) return true

  // Hyphenated / spaced "opt-in" tokens. After tokenize(),
  // "opt-in" splits into ["opt", "in"] (because `-` is a
  // separator) and neither is a keyword on its own. The
  // original haystack is the source of truth for these phrases.
  if (/(?:^|\s)opt[-\s]?in(?:$|\s)/.test(haystack)) return true

  return false
}

/**
 * Determine which consent topic a field belongs to. Returns
 * 'generic' if no specific topic matches.
 */
function detectConsentTopic(field: FormField): string {
  const tokens = tokenize(
    `${field.name || ''} ${field.label || ''} ${field.placeholder || ''}`
  )
  for (const t of tokens) {
    if (KEYWORD_TO_TOPIC.has(t)) return KEYWORD_TO_TOPIC.get(t)!
  }
  // Substring fallback: check the haystack for each topic's keywords
  const haystack = `${field.name || ''} ${field.label || ''} ${field.placeholder || ''}`.toLowerCase()
  for (const [topic, kws] of Object.entries(CONSENT_TOPIC_KEYWORDS)) {
    if (topic === 'generic') continue
    if (kws.some(k => haystack.includes(k))) return topic
  }
  return 'generic'
}

/**
 * Field-aware consent directive. We split the user context into
 * tokens / lines and only treat a directive as authoritative when
 * the affirm/deny verb and the consent topic appear close enough to
 * each other (same sentence, or the same line if no sentences).
 *
 * Generic affirm verbs (yes / on / allow / enable) are NEVER enough
 * on their own — they have to be tied to a consent topic. A user
 * writing "I work in London" must not flip terms to true just because
 * the substring "on" appears.
 */
export function detectConsentDirective(
  customInstructions: string | undefined,
  field: FormField
): 'accept' | 'decline' | 'none' {
  if (!customInstructions || !customInstructions.trim()) return 'none'
  if (!isConsentField(field)) return 'none'

  const topic = detectConsentTopic(field)
  const topicKeywords = CONSENT_TOPIC_KEYWORDS[topic] || CONSENT_TOPIC_KEYWORDS.generic

  // Split context into sentences (or single lines if no punctuation).
  const segments = customInstructions
    .split(/[.!?\n]+/)
    .map(s => s.trim())
    .filter(Boolean)

  for (const segment of segments) {
    const segLower = segment.toLowerCase()
    const segTokens = tokenize(segment)

    // Affirm / decline must BOTH appear in the segment AND the
    // topic must be mentioned. "I work in London" -> no affirm verb
    // for the topic, so 'none'. "Yes I have experience" -> "yes" is
    // a weak affirm but no consent topic mentioned, so 'none'.
    const hasAcceptVerb = /\b(accept|agree|opt[\s-]?in|consent to|allow|enable|subscribe to|sign up)\b/i.test(segment)
    const hasDeclineVerb = /\b(decline|reject|refuse|opt[\s-]?out|do not|don't|don\u2019t|no thanks|unsubscribe|disable)\b/i.test(segment)
    // A bare "no" at the start of a sentence counts as a decline
    // only when the consent topic is mentioned in the same
    // segment. This catches "No marketing emails" / "No cookies"
    // without turning every "no" in unrelated prose into a decline.
    const hasBareNo = /^\s*no\b/i.test(segment)
    if (!hasAcceptVerb && !hasDeclineVerb && !hasBareNo) continue

    const topicMentioned =
      topicKeywords.some(k => segLower.includes(k)) ||
      segTokens.some(t => topicKeywords.includes(t))

    if (!topicMentioned) continue

    if (hasDeclineVerb) return 'decline'
    if (hasAcceptVerb) return 'accept'
    if (hasBareNo) return 'decline'
  }

  return 'none'
}

// ---------------------------------------------------------------------------
// Sensitive-context extraction
// ---------------------------------------------------------------------------

/**
 * Map from a sensitive field to a list of keys that would associate
 * a value in the user context with that field. The key matching is
 * case-insensitive and tolerant of separators.
 */
const SENSITIVE_FIELD_KEYS: Record<string, ReadonlyArray<string>> = {
  passport: ['passport'],
  aadhaar: ['aadhaar', 'aadhar', 'aadhaar number', 'aadhaar no'],
  pan: ['pan', 'pan number', 'pan no', 'pan card'],
  ssn: ['ssn', 'social security', 'social security number'],
  creditcard: ['credit card', 'creditcard', 'card number', 'cc number', 'ccv'],
  cvv: ['cvv', 'cvc', 'card security code', 'security code'],
  pin: ['pin', 'pin number', 'pincode', 'pin code', 'security pin', 'atm pin'],
  otp: ['otp', 'one time password', 'one-time password', 'verification code'],
  bank: ['bank account', 'account number', 'iban', 'swift', 'bic'],
  taxid: ['tax id', 'taxid', 'tin'],
  password: ['password', 'passwd', 'passphrase'],
  secret: ['secret', 'auth code', 'authorization code'],
  dob: ['date of birth', 'dob', 'birthday', 'birth date'],
}

/**
 * Map a sensitive field to the keys that would identify it in user
 * context. Falls back to the field's own name tokens if no
 * canonical key matches. We do NOT use broad fallback aliases like
 * "number" / "code" / "account" because they match too many
 * unrelated fields.
 */
function keysForSensitiveField(field: FormField): string[] {
  const fhaystack = `${field.name} ${field.label || ''}`.toLowerCase()
  for (const [canonical, keys] of Object.entries(SENSITIVE_FIELD_KEYS)) {
    if (keys.some(k => fhaystack.includes(k))) return [...keys]
  }
  return tokenize(field.name || '')
}

/**
 * Canonicalize a sensitive value for exact comparison.
 *
 * Trims whitespace. For Aadhaar / card-style values we also
 * collapse internal spaces and hyphens so "1234 5678 9012",
 * "1234-5678-9012", and "123456789012" all normalize to the same
 * canonical form. We do NOT strip leading zeros or apply any
 * lossy transformation that could make "1" match "4321".
 */
function normalizeSensitiveValue(value: string): string {
  let v = String(value || '').trim()
  if (!v) return ''
  // For values that look like grouped numbers / card numbers,
  // collapse spaces and hyphens.
  if (/^[\d][\d\s-]+$/.test(v) && (v.includes(' ') || v.includes('-'))) {
    v = v.replace(/[\s-]+/g, '')
  }
  return v
}

/**
 * Parse a string of "key: value" / "key = value" / "key is value"
 * / "use VALUE for KEY" pairs. Very loose — we don't try to be a
 * full NLP parser, we just extract the obvious assignments.
 *
 * Returns a Map<key, value[]> so a key can appear more than once.
 */
export type ExplicitContextMap = Map<string, string[]>

function stripQuotes(s: string): string {
  return s.replace(/^["'`]+|["'`]+$/g, '').trim()
}

function splitOnConnectors(line: string): { key: string; value: string }[] {
  const out: { key: string; value: string }[] = []
  // Patterns: "key: value", "key = value", "key is value",
  // "use value for key", "set key to value".
  const patterns: RegExp[] = [
    /([A-Za-z][A-Za-z0-9 _\-\.]{0,40}?)\s*[:=]\s*([^\n,;]+?)(?=\s*(?:[,.;]|$|\n))/g,
    /\b([A-Za-z][A-Za-z0-9 _\-\.]{0,40}?)\s+is\s+([^\n,;]+?)(?=\s*(?:[,.;]|$|\n))/gi,
    /\buse\s+([^\n,;]+?)\s+for\s+([A-Za-z][A-Za-z0-9 _\-\.]{0,40}?)(?=\s*(?:[,.;]|$|\n))/gi,
    /\bset\s+([A-Za-z][A-Za-z0-9 _\-\.]{0,40}?)\s+to\s+([^\n,;]+?)(?=\s*(?:[,.;]|$|\n))/gi,
  ]

  for (const re of patterns) {
    let m: RegExpExecArray | null
    while ((m = re.exec(line)) !== null) {
      // "use V for K" puts value at 1, key at 2; others put key at 1, value at 2.
      if (re === patterns[2]) {
        out.push({ key: m[2].trim(), value: stripQuotes(m[1]) })
      } else {
        out.push({ key: m[1].trim(), value: stripQuotes(m[2]) })
      }
    }
  }
  return out
}

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/\s+/g, ' ').trim()
}

/**
 * True when `key` (a phrase taken from the user context) refers to
 * one of the expected sensitive field keys. We use token-aware
 * matching so that "shipping" does NOT match the "pin" key just
 * because "shipping".includes("pin") is true. Exact, prefix, or
 * token-boundary matches only.
 */
function anyKeyMatches(key: string, candidates: ReadonlyArray<string>): boolean {
  const norm = key.toLowerCase().trim()
  if (!norm) return false
  const normTokens = new Set(tokenize(norm))
  for (const c of candidates) {
    if (!c) continue
    const cand = c.toLowerCase().trim()
    if (!cand) continue
    if (norm === cand) return true
    // Token-boundary: any token of the key equals the candidate, or
    // any token of the key starts with the candidate (handles
    // "Pin Number" -> "pin", "Credit Card Number" -> "credit", etc.).
    for (const t of normTokens) {
      if (t === cand) return true
      if (cand.length >= 3 && t.startsWith(cand)) return true
    }
    // Reverse: candidate tokens that start with a key token.
    for (const t of tokenize(cand)) {
      if (t && normTokens.has(t)) return true
    }
  }
  return false
}

/**
 * Build a map of explicit key -> value assignments from the user's
 * customInstructions. Values are kept verbatim (after trimming).
 */
export function extractExplicitContextMap(customInstructions: string | undefined): ExplicitContextMap {
  const map: ExplicitContextMap = new Map()
  if (!customInstructions) return map
  const lines = customInstructions.split(/\n|[.!?]+/)
  for (const line of lines) {
    if (!line.trim()) continue
    const pairs = splitOnConnectors(line)
    for (const { key, value } of pairs) {
      const k = normalizeKey(key)
      const v = value.trim()
      if (!k || !v) continue
      const list = map.get(k) || []
      list.push(v)
      map.set(k, list)
    }
  }
  return map
}

/**
 * Is `value` allowed for `field` given the explicit context map?
 *
 * Returns true only when one of the field's expected keys appears
 * in the map AND the map's recorded value, after canonicalization,
 * equals the candidate value. Substring containment is not used
 * (it was too permissive: "PIN: 1" would have accepted
 * AI pin=4321). For grouped number formats (Aadhaar, card
 * numbers) spaces and hyphens are normalized away.
 */
export function isSensitiveValueAllowed(
  field: FormField,
  value: string,
  contextMap: ExplicitContextMap
): boolean {
  const candidate = normalizeSensitiveValue(value)
  if (!candidate) return false
  const expectedKeys = keysForSensitiveField(field)
  if (expectedKeys.length === 0) return false

  for (const [mapKey, mapValues] of contextMap.entries()) {
    if (!anyKeyMatches(mapKey, expectedKeys)) continue
    for (const stored of mapValues) {
      const storedNorm = normalizeSensitiveValue(stored)
      if (!storedNorm) continue
      if (storedNorm === candidate) return true
    }
  }
  return false
}

// ---------------------------------------------------------------------------
// Backwards-compatible token-based helpers
// ---------------------------------------------------------------------------

/**
 * Tokenize user context into a normalized set of explicit values.
 * Kept for compatibility with code that only needs a token search.
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
  for (const chunk of normalized.split(/\s+/)) {
    if (chunk) tokens.add(chunk.toLowerCase())
  }
  return tokens
}

/**
 * Does the user context contain the candidate value as a token?
 * Used by non-sensitive paths.
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
