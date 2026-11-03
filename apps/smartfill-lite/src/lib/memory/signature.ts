// ** import types
import type { FormField } from '@/types/extension'

/**
 * A field signature is what survives between visits: the kind of
 * control plus its label (or name). Element ids, classes and positions
 * change with every deploy; "email|Work email" does not.
 */
export interface FieldSignature {
  /** Control family: text, email, choice, check, radio, long, ... */
  kind: string
  /** Normalized label (or placeholder / name when there is no label). */
  label: string
  /** Normalized `name` attribute, a second way to recognize the field. */
  name: string
}

/** Lower-case words, without the `__2` suffix added for duplicate names. */
export function normalizeLabel(text: string | undefined): string {
  return (text || '')
    .replace(/__\d+$/, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    // Letters and digits of any script: Hindi, Tamil, CJK labels match too.
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ')
    .trim()
}

function kindOf(field: FormField): string {
  switch (field.type) {
    case 'select': return 'choice'
    case 'checkbox': return 'check'
    case 'radio': return 'radio'
    case 'textarea': return 'long'
    case 'email': case 'password': case 'tel': case 'number': case 'date': case 'file': return field.type
    default: return 'text'
  }
}

export function fieldSignature(field: FormField): FieldSignature {
  const label = field.label && field.label !== 'Unnamed Field' ? field.label : field.placeholder || field.name
  return { kind: kindOf(field), label: normalizeLabel(label), name: normalizeLabel(field.name) }
}

export function signatureKey(sig: FieldSignature): string {
  return `${sig.kind}|${sig.label}`
}

function tokens(text: string): Set<string> {
  return new Set(text.split(' ').filter(Boolean))
}

/** 0..1 similarity of two signatures. Different control families never match. */
export function signatureSimilarity(a: FieldSignature, b: FieldSignature): number {
  if (a.kind !== b.kind) return 0
  if (a.label && a.label === b.label) return 1
  if (a.name && a.name === b.name && !/^(field|sf) \d+$/.test(a.name)) return 0.95
  const ta = tokens(a.label)
  const tb = tokens(b.label)
  if (ta.size === 0 || tb.size === 0) return 0
  let shared = 0
  ta.forEach(t => { if (tb.has(t)) shared++ })
  // Dice coefficient: "Phone" vs "Phone number" = 0.67, "First name" vs "Given name" = 0.5.
  return (2 * shared) / (ta.size + tb.size)
}

/** Field-level similarity needed for a saved field to count as present on the page. */
export const FIELD_MATCH_THRESHOLD = 0.6

/** Form-level score at which SmartFill reuses a saved form without asking for a new scan. */
export const FORM_MATCH_THRESHOLD = 0.85

export interface MatchResult {
  /** Share of the saved fields found on the page (0..1), weighted by how well each matched. */
  score: number
  /** For each saved signature index, the index of the page field it matched (or -1). */
  pairs: number[]
}

/**
 * Pair saved fields with page fields one-to-one, best pairs first, so
 * two "Phone" fields on the page each get their own saved counterpart.
 * `preferred` page indices (inside the saved area) win ties.
 */
export function matchSignatures(saved: FieldSignature[], page: FieldSignature[], preferred?: Set<number>): MatchResult {
  const candidates: Array<{ s: number, p: number, sim: number }> = []
  saved.forEach((sig, s) => {
    page.forEach((other, p) => {
      const sim = signatureSimilarity(sig, other)
      if (sim >= FIELD_MATCH_THRESHOLD) candidates.push({ s, p, sim: sim + (preferred?.has(p) ? 0.01 : 0) })
    })
  })
  // Best similarity first; among equals keep document order, so repeated
  // labels pair up in the order they appear.
  candidates.sort((a, b) => b.sim - a.sim || a.s - b.s || a.p - b.p)

  const pairs = new Array<number>(saved.length).fill(-1)
  const usedPage = new Set<number>()
  let total = 0
  for (const c of candidates) {
    if (pairs[c.s] !== -1 || usedPage.has(c.p)) continue
    pairs[c.s] = c.p
    usedPage.add(c.p)
    total += Math.min(1, c.sim)
  }
  return { score: saved.length ? total / saved.length : 0, pairs }
}
