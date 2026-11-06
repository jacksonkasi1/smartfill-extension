// ** import types
import type { FieldSignature, MatchResult } from './signature'

// ** import lib
import { FORM_MATCH_THRESHOLD, matchSignatures } from './signature'

/**
 * A form area the user picked once. Next visit SmartFill finds the same
 * fields again by signature, so the area does not have to be picked again.
 */
export interface SavedForm {
  id: string
  host: string
  path: string
  /** Heading of the picked area, or the page title. */
  title: string
  fields: FieldSignature[]
  /** CSS paths of the picked containers; a hint, signatures decide. */
  containers: string[]
  /**
   * Values from the last fill, aligned with `fields`. `null` where
   * nothing was stored: passwords, card numbers and IDs never are.
   */
  values?: Array<SavedValue | null>
  /**
   * Values the user set in Settings, aligned with `fields`. A pinned value
   * is used on every fill, "New values" included, and a fill never
   * overwrites it.
   */
  pinned?: boolean[]
  /** Seed of the last mock fill, so "same values" also works for new fields. */
  seed?: number
  createdAt: number
  updatedAt: number
  fillCount: number
}

export type SavedValue = string | boolean | string[]

export interface FormMatch extends MatchResult {
  form: SavedForm
}

const STORAGE_KEY = 'formMemory'
/** Forms with fewer fields than this are only recognized on the page they were picked on. */
const SMALL_FORM = 4
const MAX_FORMS = 200

export async function listSavedForms(): Promise<SavedForm[]> {
  try {
    const stored = await chrome.storage.local.get(STORAGE_KEY)
    return Array.isArray(stored[STORAGE_KEY]) ? stored[STORAGE_KEY] : []
  } catch {
    return []
  }
}

export async function savedFormsFor(host: string): Promise<SavedForm[]> {
  return (await listSavedForms()).filter(form => form.host === host)
}

async function write(forms: SavedForm[]): Promise<void> {
  // Oldest-used forms go first when the list is full.
  const kept = [...forms].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_FORMS)
  await chrome.storage.local.set({ [STORAGE_KEY]: kept })
}

export async function upsertSavedForm(form: SavedForm): Promise<SavedForm> {
  const forms = await listSavedForms()
  const index = forms.findIndex(f => f.id === form.id)
  if (index === -1) forms.push(form)
  else forms[index] = form
  await write(forms)
  return form
}

export async function updateSavedForm(id: string, patch: Partial<SavedForm>): Promise<SavedForm | undefined> {
  const forms = await listSavedForms()
  const form = forms.find(f => f.id === id)
  if (!form) return undefined
  Object.assign(form, patch, { updatedAt: Date.now() })
  await write(forms)
  return form
}

export async function deleteSavedForm(id: string): Promise<void> {
  await write((await listSavedForms()).filter(f => f.id !== id))
}

export async function clearSavedForms(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEY)
}

/** Kinds the editor never stores a value for. */
const UNEDITABLE_KINDS = new Set(['password', 'file'])

export function isEditableField(sig: FieldSignature): boolean {
  return !UNEDITABLE_KINDS.has(sig.kind)
}

export function isPinned(form: SavedForm, index: number): boolean {
  return form.pinned?.[index] === true
}

/**
 * The `values` / `pinned` patch for a value the user typed in Settings.
 * An empty value clears the slot and unpins it, so the next fill
 * generates one again.
 */
export function editSavedValue(form: SavedForm, index: number, value: SavedValue | null, pin = true): Pick<SavedForm, 'values' | 'pinned'> {
  const size = form.fields.length
  const values = Array.from({ length: size }, (_, i) => form.values?.[i] ?? null)
  const pinned = Array.from({ length: size }, (_, i) => isPinned(form, i))
  const empty = value === null || value === '' || (Array.isArray(value) && value.length === 0)
  if (index < 0 || index >= size || !isEditableField(form.fields[index])) return { values, pinned }
  values[index] = empty ? null : value
  pinned[index] = !empty && pin
  return { values, pinned }
}

/** Pin or unpin a stored value without changing it. Empty slots cannot be pinned. */
export function setValuePinned(form: SavedForm, index: number, pin: boolean): Pick<SavedForm, 'pinned'> {
  const pinned = Array.from({ length: form.fields.length }, (_, i) => isPinned(form, i))
  const value = form.values?.[index]
  if (index >= 0 && index < pinned.length) pinned[index] = pin && value !== null && value !== undefined
  return { pinned }
}

export function newFormId(): string {
  return `form_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

/**
 * The saved form on this page with the highest score, when it reaches
 * the auto-reuse threshold. Small forms only count on their own path:
 * "email + password" is on half the pages of a site.
 */
export function bestFormMatch(
  forms: SavedForm[],
  page: FieldSignature[],
  path: string,
  preferredFor: (form: SavedForm) => Set<number> | undefined = () => undefined
): FormMatch | undefined {
  let best: FormMatch | undefined
  for (const form of forms) {
    if (form.fields.length === 0) continue
    if (form.fields.length < SMALL_FORM && form.path !== path) continue
    const result = matchSignatures(form.fields, page, preferredFor(form))
    if (result.score < FORM_MATCH_THRESHOLD) continue
    const better = !best
      || result.score > best.score + 0.001
      || (Math.abs(result.score - best.score) <= 0.001 && (form.path === path) && best.form.path !== path)
      || (Math.abs(result.score - best.score) <= 0.001 && form.fields.length > best.form.fields.length)
    if (better) best = { ...result, form }
  }
  return best
}
