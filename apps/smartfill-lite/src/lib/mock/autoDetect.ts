// ** import types
import type { FormField } from '@/types/extension'
import type { ProfileId } from './profiles'

// ** import lib
import { PROFILES } from './profiles'
import { fieldHaystack } from './fieldKinds'

export interface PageSignals {
  host: string
  title: string
  headings: string
  fields: FormField[]
}

export interface DetectedProfile {
  id: ProfileId
  /** Rough confidence: summed keyword weight of the winner. */
  score: number
}

/** Collect the page text that best describes what a form is for. */
export function readPageSignals(fields: FormField[]): PageSignals {
  const headings = Array.from(document.querySelectorAll('h1, h2, h3, legend, [role="heading"], form [class*="title" i]'))
    .slice(0, 25)
    .map(el => el.textContent || '')
    .join(' ')
  const meta = document.querySelector('meta[name="description"]')?.getAttribute('content') || ''
  return {
    host: location.hostname,
    title: `${document.title} ${meta}`,
    headings,
    fields
  }
}

const keywordPatterns = new Map<string, RegExp>()

/** Whole-word match that tolerates plurals and common suffixes ("exam" must not hit "example"). */
function keywordPattern(keyword: string): RegExp {
  let pattern = keywordPatterns.get(keyword)
  if (!pattern) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const body = escaped.endsWith('y') ? `${escaped.slice(0, -1)}(?:y|ies)` : `${escaped}(?:s|es|ed|ing|ment|ments)?`
    pattern = new RegExp(`(?:^|[^a-z0-9])${body}(?![a-z0-9])`, 'g')
    keywordPatterns.set(keyword, pattern)
  }
  return pattern
}

function countHits(text: string, keyword: string): number {
  if (!text) return 0
  return Math.min(text.match(keywordPattern(keyword))?.length ?? 0, 5)
}

/**
 * Score every industry profile against the page. Headings, title and
 * host are weighted above field labels because they describe the
 * whole form, while labels like "Name" or "Phone" appear everywhere.
 */
export function detectProfile(signals: PageSignals): DetectedProfile {
  const host = signals.host.toLowerCase().replace(/[.-]/g, ' ')
  const title = signals.title.toLowerCase()
  const headings = signals.headings.toLowerCase()
  const labels = signals.fields.map(fieldHaystack).join(' | ')

  let best: DetectedProfile = { id: 'general', score: 0 }
  for (const profile of PROFILES) {
    let score = 0
    for (const keyword of profile.keywords) {
      score += countHits(host, keyword) * 3
      score += Math.min(countHits(title, keyword), 2) * 3
      score += Math.min(countHits(headings, keyword), 3) * 2
      score += Math.min(countHits(labels, keyword), 3)
    }
    if (score > best.score) best = { id: profile.id, score }
  }
  // A single stray keyword is not enough to leave the general profile.
  return best.score >= 3 ? best : { id: 'general', score: best.score }
}
