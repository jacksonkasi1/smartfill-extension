import { describe, expect, test } from 'bun:test'

// ** import types
import type { FieldSignature, SavedForm } from '../../src/lib/memory'

// ** import lib
import { bestFormMatch, matchSignatures, signatureSimilarity, FORM_MATCH_THRESHOLD } from '../../src/lib/memory'

const sig = (kind: string, label: string, name = ''): FieldSignature => ({ kind, label, name })

const SIGNUP: FieldSignature[] = [
  sig('text', 'first name', 'first'),
  sig('text', 'last name', 'last'),
  sig('email', 'work email', 'email'),
  sig('tel', 'phone', 'phone'),
  sig('choice', 'country', 'country'),
  sig('text', 'company', 'company'),
  sig('check', 'i accept the terms', 'terms')
]

function saved(fields: FieldSignature[], overrides: Partial<SavedForm> = {}): SavedForm {
  return {
    id: 'f1', host: 'app.test', path: '/signup', title: 'Sign up',
    fields, containers: [], createdAt: 1, updatedAt: 1, fillCount: 0,
    ...overrides
  }
}

describe('signatureSimilarity', () => {
  test('same label is a full match, other control families never match', () => {
    expect(signatureSimilarity(sig('text', 'company'), sig('text', 'company'))).toBe(1)
    expect(signatureSimilarity(sig('text', 'company'), sig('choice', 'company'))).toBe(0)
  })

  test('a renamed label still matches through the name or shared words', () => {
    expect(signatureSimilarity(sig('tel', 'phone', 'phone'), sig('tel', 'mobile', 'phone'))).toBe(0.95)
    expect(signatureSimilarity(sig('tel', 'phone'), sig('tel', 'phone number'))).toBeCloseTo(0.67, 2)
    expect(signatureSimilarity(sig('text', 'city'), sig('text', 'state'))).toBe(0)
  })

  test('generated fallback names are not evidence', () => {
    expect(signatureSimilarity(sig('text', 'a', 'field 3'), sig('text', 'b', 'field 3'))).toBe(0)
  })
})

describe('matchSignatures', () => {
  test('pairs repeated labels one-to-one, in order', () => {
    const page = [sig('tel', 'phone'), sig('text', 'x'), sig('tel', 'phone')]
    const result = matchSignatures([sig('tel', 'phone'), sig('tel', 'phone')], page)
    expect(result.pairs).toEqual([0, 2])
    expect(result.score).toBe(1)
  })

  test('preferred page fields (inside the saved area) win ties', () => {
    const page = [sig('text', 'city'), sig('text', 'city')]
    expect(matchSignatures([sig('text', 'city')], page, new Set([1])).pairs).toEqual([1])
  })
})

describe('bestFormMatch', () => {
  test('the same form with extra page fields around it is recognized', () => {
    const page = [sig('text', 'search'), ...SIGNUP, sig('email', 'newsletter email')]
    const match = bestFormMatch([saved(SIGNUP)], page, '/signup')
    expect(match?.score).toBe(1)
    expect(match?.pairs).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  test('one renamed and one missing field still clears 85%', () => {
    const page = SIGNUP.slice(0, 6).map((s, i) => (i === 3 ? sig('tel', 'mobile', 'phone') : s))
    // 6 of 7 present (one at 0.95) = 0.85
    const match = bestFormMatch([saved(SIGNUP)], page, '/signup')
    expect(match).toBeDefined()
    expect(match!.score).toBeGreaterThanOrEqual(FORM_MATCH_THRESHOLD)
  })

  test('a different form on the same site is not reused', () => {
    const login = [sig('email', 'email', 'email'), sig('password', 'password', 'password')]
    expect(bestFormMatch([saved(SIGNUP)], login, '/login')).toBeUndefined()
  })

  test('one-field forms only count on their own page', () => {
    const one = saved([sig('email', 'email', 'email')], { path: '/subscribe' })
    expect(bestFormMatch([one], [sig('email', 'email', 'email')], '/other')).toBeUndefined()
    expect(bestFormMatch([one], [sig('email', 'email', 'email')], '/subscribe')).toBeDefined()
  })

  test('the best of several saved forms wins', () => {
    const billing = saved([sig('text', 'card holder'), sig('text', 'billing address'), sig('text', 'city')], { id: 'b' })
    const page = [sig('text', 'card holder'), sig('text', 'billing address'), sig('text', 'city'), ...SIGNUP]
    expect(bestFormMatch([billing, saved(SIGNUP)], page, '/signup')!.form.id).toBe('f1')
  })
})
