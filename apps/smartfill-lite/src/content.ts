// ** import types
import type { PlasmoCSConfig } from "plasmo"
import type { AIFormData, FormField } from './types/extension'
import type { RecordingSession, RecordingStep } from './types/recording'
import type { FillMode, Settings } from '@/lib/settings'
import type { ProfileId, Region } from '@/lib/mock'
import type { SavedForm } from '@/lib/memory'

// ** import utils
import { MessagingClient, WebsiteEvents, MESSAGE_ACTIONS } from "@/lib/utils/messaging"

// ** import lib
import { closestDeep, commonAncestor, containsDeep, cssPath, detectAllForms, fillForm, normalizeFormFields, FillSnapshot } from './lib'
import { getSettings, isAIReady } from '@/lib/settings'
import {
  MockGenerator,
  PROFILE_MAP,
  REGIONS,
  classifyField,
  detectProfile,
  detectRegion,
  fieldHaystack,
  generateMockData,
  kindLabel,
  newSeed,
  readPageSignals
} from '@/lib/mock'
import {
  FORM_MATCH_THRESHOLD,
  bestFormMatch,
  deleteSavedForm,
  fieldSignature,
  matchSignatures,
  newFormId,
  savedFormsFor,
  updateSavedForm,
  upsertSavedForm
} from '@/lib/memory'
import { flashFields, showPagePanel, startRegionPicker } from '@/lib/picker'
import { isConsentField, isSensitiveField } from '@/api/ai/sensitiveFields'

// ** import apis
import { generateFormData } from './api'

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"]
}

// ---------------------------------------------------------------------------
// Recording state (kept independent of the fill flow)
// ---------------------------------------------------------------------------
let currentRecording: RecordingSession | null = null
let isRecording = false
let recordingStartTime = 0
let eventListeners: Array<{ element: Element, event: string, handler: EventListener }> = []

async function initializeRecordingState() {
  try {
    const result = await chrome.storage.local.get(['recordingState'])
    if (result.recordingState?.isRecording) {
      await chrome.storage.local.set({
        recordingState: { isRecording: false, status: 'Ready to record' }
      })
    }
  } catch (error) {
    console.error('Failed to initialize recording state:', error)
  }
}

initializeRecordingState()

WebsiteEvents.onExtensionOpen((data) => {
  MessagingClient.openPopup({ data }).catch(console.error)
})
WebsiteEvents.onWebsiteMessage((eventData) => {
  MessagingClient.openPopup({ data: eventData.data }).catch(console.error)
})

// ---------------------------------------------------------------------------
// Message handling
// ---------------------------------------------------------------------------
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const handleMessage = async () => {
    try {
      switch (message.action) {
        case MESSAGE_ACTIONS.FORMS.PING:
          return { success: true, status: "ready" }

        case MESSAGE_ACTIONS.FORMS.SCAN:
          return await scanPage()

        case MESSAGE_ACTIONS.FORMS.FILL:
          return await fillPage({ seed: message.seed, mode: message.mode, reuse: message.reuse === true })

        case MESSAGE_ACTIONS.FORMS.UNDO:
          return undoFill()

        case MESSAGE_ACTIONS.FORMS.PICK:
          return await startPicking()

        case MESSAGE_ACTIONS.FORMS.CLEAR_SCOPE:
          clearScope()
          return { success: true }

        case MESSAGE_ACTIONS.FORMS.FORGET:
          return await forgetForm(message.formId)

        case MESSAGE_ACTIONS.RECORDING.START:
          return await startRecording()
        case MESSAGE_ACTIONS.RECORDING.STOP:
          return await stopRecording()
        case MESSAGE_ACTIONS.RECORDING.PLAY:
          return await playSession(message.sessionId)

        default:
          return { success: false, status: "error", error: `Unknown action: ${message.action}` }
      }
    } catch (error) {
      console.error("Message handling error:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  handleMessage()
    .then(response => sendResponse(response))
    .catch(error => {
      console.error("Async message handler error:", error)
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    })
  return true
})

// ---------------------------------------------------------------------------
// Detection + context
// ---------------------------------------------------------------------------

/** Elements SmartFill wrote to, so "keep existing values" never protects our own output. */
const filledBySmartFill = new WeakSet<Element>()
let lastSnapshot: FillSnapshot | null = null

async function collectFields(): Promise<FormField[]> {
  const detectResult = await detectAllForms()
  if (!detectResult.success || detectResult.forms.length === 0) return []
  return normalizeFormFields(detectResult.forms.flatMap(f => f.fields)).fields
}

interface FillContext {
  profileId: ProfileId
  autoDetected: boolean
  region: Region
}

function resolveContext(settings: Settings, fields: FormField[]): FillContext {
  const autoDetected = settings.profile === 'auto'
  const profileId = autoDetected ? detectProfile(readPageSignals(fields)).id : settings.profile as ProfileId
  const fieldText = fields.map(f => `${fieldHaystack(f)} ${(f.options || []).join(' ')}`).join(' | ')
  const region = settings.region === 'auto'
    ? detectRegion(location.hostname, navigator.language || 'en-US', fieldText)
    : settings.region
  return { profileId, autoDetected, region }
}

function fieldLabel(field: FormField): string {
  const label = field.label && field.label !== 'Unnamed Field' ? field.label : ''
  return (label || field.placeholder || field.name.replace(/__\d+$/, '')).replace(/\s+/g, ' ').trim().slice(0, 60)
}

// ---------------------------------------------------------------------------
// Form scope: the area the user picked, or a saved one recognized again
// ---------------------------------------------------------------------------

interface ActiveScope {
  form: SavedForm
  source: 'picked' | 'memory'
  /** Whether `form` is in storage (Remember forms on). */
  persisted: boolean
  /** Elements picked in this page session; signatures cover re-renders and later visits. */
  elements: WeakSet<Element>
}

interface ScopedFields {
  scope: ActiveScope
  fields: FormField[]
  /** For each saved field, the page field it matched (or undefined). */
  bySaved: Array<FormField | undefined>
  score: number
}

let activeScope: ActiveScope | null = null
/** Set when the user chose "whole page", so a saved form is not re-applied this visit. */
let scopeDismissed = false
let scopePath = location.pathname.replace(/\/+$/, '') || '/'

function pagePath(): string {
  return location.pathname.replace(/\/+$/, '') || '/'
}

/** Page fields inside the saved containers: they win ties when labels repeat. */
function preferredIndices(form: SavedForm, fields: FormField[]): Set<number> | undefined {
  const containers = form.containers
    .map(path => { try { return document.querySelector(path) } catch { return null } })
    .filter((el): el is Element => Boolean(el))
  if (containers.length === 0) return undefined
  const set = new Set<number>()
  fields.forEach((f, i) => { if (containers.some(c => containsDeep(c, f.element))) set.add(i) })
  return set
}

function applyScope(scope: ActiveScope, fields: FormField[]): ScopedFields {
  // Fields picked in this session are matched by element first.
  const picked = fields.filter(f => scope.elements.has(f.element) || f.group?.some(m => scope.elements.has(m)))
  const page = fields.map(fieldSignature)
  const preferred = new Set<number>(picked.map(f => fields.indexOf(f)))
  preferredIndices(scope.form, fields)?.forEach(i => preferred.add(i))
  const match = matchSignatures(scope.form.fields, page, preferred)
  const bySaved = match.pairs.map(p => (p >= 0 ? fields[p] : undefined))
  const inScope = new Set<FormField>([...picked, ...bySaved.filter((f): f is FormField => Boolean(f))])
  return {
    scope,
    fields: fields.filter(f => inScope.has(f)),
    bySaved,
    score: picked.length ? Math.max(match.score, picked.length / Math.max(1, scope.form.fields.length)) : match.score
  }
}

/** The active scope, or a saved form for this page matching at least 85%. */
async function resolveScope(fields: FormField[], settings: Settings): Promise<ScopedFields | null> {
  // A single-page app moved to another route: "whole page" was for the old one.
  if (pagePath() !== scopePath) {
    scopePath = pagePath()
    scopeDismissed = false
    // Re-match on the new route so path rules and better saved forms apply.
    if (activeScope?.source === 'memory') activeScope = null
  }
  if (activeScope?.source === 'memory' && !settings.rememberForms) activeScope = null
  if (activeScope) {
    const scoped = applyScope(activeScope, fields)
    const stillPicked = activeScope.source === 'picked' && fields.some(f => activeScope!.elements.has(f.element))
    // After a route change the old form may share a field or two with
    // the new page; that is not the same form.
    if (scoped.fields.length > 0 && (stillPicked || scoped.score >= FORM_MATCH_THRESHOLD)) return scoped
    activeScope = null
  }
  if (scopeDismissed || !settings.rememberForms || fields.length === 0) return null
  const forms = await savedFormsFor(location.hostname)
  if (forms.length === 0) return null
  const match = bestFormMatch(forms, fields.map(fieldSignature), pagePath(), form => preferredIndices(form, fields))
  if (!match) return null
  activeScope = { form: match.form, source: 'memory', persisted: true, elements: new WeakSet() }
  return applyScope(activeScope, fields)
}

function clearScope() {
  activeScope = null
  scopeDismissed = true
}

async function forgetForm(formId?: string) {
  const id = formId || activeScope?.form.id
  if (!id) return { success: false, error: 'No saved form here.' }
  await deleteSavedForm(id)
  if (activeScope?.form.id === id) activeScope = null
  scopeDismissed = true
  return { success: true }
}

function scopeSummary(scoped: ScopedFields | null) {
  if (!scoped) return undefined
  const { scope, fields, score } = scoped
  return {
    source: scope.source,
    formId: scope.form.id,
    title: scope.form.title,
    persisted: scope.persisted,
    score: Math.round(Math.min(1, score) * 100),
    fieldCount: fields.length,
    hasValues: Boolean(scope.form.values?.some(v => v !== null && v !== undefined)),
    savedAt: scope.form.updatedAt
  }
}

/** Heading text that names a picked area ("Shipping address"), else the page title. */
function areaTitle(containers: Element[]): string {
  for (const container of containers) {
    const heading = container.querySelector('legend, h1, h2, h3, h4, [role="heading"]')
      || closestDeep(container, 'section, [role="dialog"], form')?.querySelector('legend, h1, h2, h3, h4, [role="heading"]')
    const text = heading?.textContent?.replace(/\s+/g, ' ').trim()
    if (text && text.length <= 60) return text
  }
  return (document.title || location.hostname).replace(/\s+/g, ' ').trim().slice(0, 60)
}

// ---------------------------------------------------------------------------
// Picking a form area on the page
// ---------------------------------------------------------------------------

let pickerActive = false
let closePanel: (() => void) | undefined

/** The in-page card; a new one replaces the old, and none shows while picking. */
function showPanel(options: Parameters<typeof showPagePanel>[0]) {
  if (pickerActive) return
  closePanel = showPagePanel(options)
}

async function startPicking() {
  closePanel?.()
  const settings = await getSettings()
  const fields = await collectFields()
  if (fields.length === 0) return { success: false, error: 'No form fields found on this page.' }
  const current = await resolveScope(fields, settings)

  // Outline what the user sees: a dropdown's trigger, not its hidden select.
  const visible = (f: FormField) => (f.trigger || f.element) as HTMLElement
  pickerActive = true
  startRegionPicker({
    fields: fields.map(visible),
    initial: current?.fields.map(visible),
    onDone: (result, fillNow) => {
      pickerActive = false
      if (!result) return
      onAreaPicked(fields, result.elements, result.containers, fillNow, current?.scope).catch(console.error)
    }
  })
  return { success: true }
}

async function onAreaPicked(
  fields: FormField[],
  elements: HTMLElement[],
  containers: Element[],
  fillNow: boolean,
  previous: ActiveScope | undefined
) {
  const chosen = new Set<Element>(elements)
  const picked = fields.filter(f => chosen.has(f.element) || (f.trigger && chosen.has(f.trigger)))
  if (picked.length === 0) return
  const settings = await getSettings()
  const areas = containers.length ? containers : [commonAncestor(picked.map(f => f.element)) || document.body]
  const now = Date.now()
  const signatures = picked.map(fieldSignature)
  const sameForm = Boolean(previous && matchSignatures(previous.form.fields, signatures).score >= 0.5)
  const form: SavedForm = {
    // Re-picking the same form updates it; picking a different area saves a new one.
    id: sameForm ? previous!.form.id : newFormId(),
    host: location.hostname,
    path: pagePath(),
    title: areaTitle(areas),
    fields: signatures,
    containers: areas.filter(a => a !== document.body).map(cssPath),
    createdAt: sameForm ? previous!.form.createdAt : now,
    updatedAt: now,
    fillCount: sameForm ? previous!.form.fillCount : 0
  }
  if (settings.rememberForms) await upsertSavedForm(form)
  const elementSet = new WeakSet<Element>()
  picked.forEach(f => { elementSet.add(f.element); f.group?.forEach(m => elementSet.add(m)) })
  activeScope = { form, source: 'picked', persisted: settings.rememberForms, elements: elementSet }
  scopeDismissed = false

  const count = `${picked.length} field${picked.length === 1 ? '' : 's'}`
  if (fillNow) {
    const res = await fillPage({})
    showPanel({
      tone: res.success ? 'success' : 'warning',
      title: res.success ? `Filled ${res.filled} of ${count}` : 'Nothing was filled',
      message: settings.rememberForms
        ? 'Area saved. SmartFill will recognize this form next time.'
        : res.warning || undefined,
      timeoutMs: 5000,
      actions: res.success ? [{ label: 'Undo', onClick: () => { undoFill() } }] : []
    })
    return
  }
  showPanel({
    tone: 'success',
    title: `Area saved · ${count}`,
    message: settings.rememberForms
      ? 'SmartFill will recognize this form next time. Only these fields get filled.'
      : 'Only these fields get filled until you reload the page.',
    highlight: picked.map(f => f.element as HTMLElement),
    timeoutMs: 8000,
    actions: [{ label: 'Fill now', primary: true, onClick: async () => { await fillAndReport({}) } }]
  })
}

// ---------------------------------------------------------------------------
// Scan for the popup
// ---------------------------------------------------------------------------

async function scanPage() {
  const settings = await getSettings()
  const fields = await collectFields()
  const scoped = await resolveScope(fields, settings)
  const inScope = scoped ? new Set(scoped.fields) : undefined
  const context = resolveContext(settings, scoped?.fields || fields)
  return {
    success: true,
    host: location.hostname,
    profile: context.profileId,
    autoDetected: context.autoDetected,
    region: context.region,
    scope: scopeSummary(scoped),
    fields: fields.map(field => {
      const kind = classifyField(field)
      return {
        label: fieldLabel(field),
        kind: kindLabel(kind),
        required: field.required,
        skipped: kind === 'skip' || (settings.safeFillingMode && isSensitiveField(field)),
        inScope: inScope ? inScope.has(field) : true
      }
    })
  }
}

function hasUserValue(field: FormField): boolean {
  const el = field.element
  if (filledBySmartFill.has(el)) return false
  if (el instanceof HTMLSelectElement) return el.selectedIndex > 0
  if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio')) return false
  return 'value' in el && String(el.value).trim() !== ''
}

/** Secrets, card data and government / bank identifiers never go into the saved-form memory. */
const NEVER_STORED = new Set<string>([
  'skip', 'password', 'confirmPassword', 'otp', 'cardNumber', 'cardName', 'cvv', 'cardExpiry',
  'accountNumber', 'iban', 'routing', 'swift', 'ifsc', 'upi', 'pan', 'aadhaar', 'ssn', 'ein', 'nino',
  'taxId', 'gstin', 'tan', 'cin', 'passport', 'drivingLicense', 'voterId', 'nationalId', 'npi', 'mrn',
  'policyNumber', 'licenseNumber'
])

/** Kinds whose values are never written to the saved-form memory. */
function isStorableValue(field: FormField): boolean {
  if (field.type === 'password' || field.type === 'file') return false
  const kind = classifyField(field)
  return !NEVER_STORED.has(kind) && !isSensitiveField(field)
}

// ---------------------------------------------------------------------------
// Core fill pipeline: Detect -> Scope -> Context -> Mock (+ AI) -> Fill
// ---------------------------------------------------------------------------

interface FillRequest {
  seed?: number
  mode?: FillMode
  /** Refill the values saved with the recognized form ("continue with existing"). */
  reuse?: boolean
}

async function fillPage({ seed, mode: modeOverride, reuse = false }: FillRequest) {
  const totalStart = performance.now()
  const settings = await getSettings()
  const mode: FillMode = modeOverride || settings.mode
  const safeFillingMode = settings.safeFillingMode === true

  const allFields = await collectFields()
  if (allFields.length === 0) {
    return { success: false, filled: 0, total: 0, errors: ['No form fields found on this page.'] }
  }

  const scoped = await resolveScope(allFields, settings)
  const fields = scoped ? scoped.fields : allFields
  const savedSeed = scoped?.scope.form.seed
  const runSeed = seed ?? (reuse && savedSeed !== undefined ? savedSeed : newSeed())

  const context = resolveContext(settings, fields)
  const profile = PROFILE_MAP[context.profileId]

  // Mock values are always generated: they are the whole answer in
  // mock mode and the fallback for anything the AI leaves out.
  const generator = new MockGenerator({ profile, region: context.region, seed: runSeed, identity: settings.identity })
  const mock = generateMockData(fields, generator) as Record<string, any>
  if (safeFillingMode) {
    for (const field of fields) {
      if (isSensitiveField(field)) mock[field.name] = null
      else if (isConsentField(field)) mock[field.name] = false
    }
  }

  // "Continue with existing": the values saved last time, matched by signature.
  const reused = new Map<FormField, string | boolean | string[]>()
  if (reuse && scoped?.scope.form.values) {
    scoped.bySaved.forEach((field, index) => {
      const value = scoped.scope.form.values?.[index]
      if (field && value !== null && value !== undefined) reused.set(field, value)
    })
  }

  let data: Record<string, any> = mock
  let warning: string | undefined
  let aiTimings: { promptMs: number, apiMs: number, parseMs: number } | undefined

  // Reusing saved values needs no AI call unless some fields are new.
  const needsAI = mode === 'ai' && fields.some(f => !reused.has(f))
  if (needsAI) {
    if (!isAIReady(settings)) {
      warning = 'AI is not set up yet, so mock data was used. Add an API key in Settings.'
    } else {
      try {
        const ai = await generateFormData(fields.filter(f => !reused.has(f)), settings.instructions, {
          safeFillingMode,
          fallback: mock,
          context: {
            industry: `${profile.name} — ${profile.description}`,
            region: REGIONS[context.region].promptHint,
            persona: generator.summary(),
            pageTitle: document.title,
            host: location.hostname
          }
        })
        aiTimings = ai.timings
        data = mergeWithFallback(fields, ai.data, mock, safeFillingMode)
      } catch (error) {
        warning = `AI failed (${error instanceof Error ? error.message : 'unknown error'}). Filled with mock data instead.`
      }
    }
  }
  reused.forEach((value, field) => { data[field.name] = value })

  // Pinned login details win over whatever the AI wrote.
  const pinPassword = Boolean(settings.identity.password.trim())
  for (const field of fields) {
    const kind = classifyField(field)
    const pinned = (generator.pinnedEmail && (kind === 'email' || kind === 'confirmEmail'))
      || (pinPassword && (kind === 'password' || kind === 'confirmPassword'))
    // Read from the generator, not `mock`: Safe Filling Mode blanks passwords
    // there, but a password the user pinned counts as one they provided.
    if (pinned) data[field.name] = generator.valueFor(field, kind)
  }

  if (settings.keepExisting) {
    for (const field of fields) {
      if (hasUserValue(field)) data[field.name] = null
    }
  }

  lastSnapshot = FillSnapshot.capture(fields)
  const fillStart = performance.now()
  const fillResult = await fillForm(fields, data as AIFormData)
  const fillMs = performance.now() - fillStart
  const written: HTMLElement[] = []
  for (const field of fields) {
    if (data[field.name] !== null && data[field.name] !== undefined) {
      filledBySmartFill.add(field.element)
      written.push((field.trigger || field.element) as HTMLElement)
    }
  }
  if (fillResult.filled > 0) flashFields(written)

  if (scoped && fillResult.filled > 0) await rememberValues(scoped, data, runSeed, settings)

  if (process.env.NODE_ENV !== 'production') {
    console.log([
      '[SmartFill Performance]',
      `Mode: ${mode}${warning ? ' (fell back to mock)' : ''} · Profile: ${profile.name} · Region: ${context.region}`,
      `Fields detected: ${allFields.length}${scoped ? ` · in saved area: ${fields.length}` : ''}${reused.size ? ` · reused: ${reused.size}` : ''}`,
      aiTimings ? `AI: prompt ${aiTimings.promptMs.toFixed(0)}ms · API ${aiTimings.apiMs.toFixed(0)}ms · parse ${aiTimings.parseMs.toFixed(0)}ms` : '',
      `Fill: ${fillMs.toFixed(0)}ms · Total: ${(performance.now() - totalStart).toFixed(0)}ms`,
      `Filled: ${fillResult.filled}/${fields.length}`
    ].filter(Boolean).join('\n'))
  }

  return {
    success: fillResult.filled > 0,
    filled: fillResult.filled,
    total: fields.length,
    mode,
    profile: context.profileId,
    region: context.region,
    seed: runSeed,
    reused: reused.size,
    scope: scopeSummary(scoped),
    inbox: generator.chosenEmail?.inboxUrl
      ? { email: generator.chosenEmail.email, url: generator.chosenEmail.inboxUrl, name: generator.chosenEmail.inboxName }
      : undefined,
    warning,
    errors: fillResult.filled > 0 ? [] : ['No fields could be filled on this page.']
  }
}

/** Store what was filled so the next visit can continue with the same values. */
async function rememberValues(scoped: ScopedFields, data: Record<string, any>, seed: number, settings: Settings) {
  if (!settings.rememberForms) return
  const form = scoped.scope.form
  // A field missing this time (or left alone) keeps the value it had.
  const values = scoped.bySaved.map((field, index) => {
    const previous = form.values?.[index] ?? null
    if (!field || !isStorableValue(field)) return field ? null : previous
    const value = data[field.name]
    return value === undefined || value === null ? previous : value
  })
  form.values = values
  form.seed = seed
  form.fillCount = (form.fillCount || 0) + 1
  form.updatedAt = Date.now()
  if (scoped.scope.persisted) await updateSavedForm(form.id, { values, seed, fillCount: form.fillCount })
}

/** Fill from the in-page panel, then report the result in the same panel. */
async function fillAndReport(request: FillRequest) {
  const res = await fillPage(request)
  showPanel({
    tone: res.success ? (res.warning ? 'warning' : 'success') : 'warning',
    title: res.success ? `Filled ${res.filled} of ${res.total} fields` : 'Nothing was filled',
    message: res.warning || (res.reused ? `${res.reused} values continued from last time.` : undefined),
    timeoutMs: 4500,
    actions: res.success ? [{ label: 'Undo', onClick: () => { undoFill() } }] : []
  })
}

/**
 * Use the AI value when it gave one, otherwise the mock value. An empty
 * string from the parser in Safe Filling Mode is a deliberate blank and
 * must not be replaced by a generated sensitive value.
 */
function mergeWithFallback(
  fields: FormField[],
  ai: AIFormData,
  mock: Record<string, any>,
  safeFillingMode: boolean
): Record<string, any> {
  const merged: Record<string, any> = {}
  for (const field of fields) {
    const value = (ai as Record<string, any>)[field.name]
    const deliberateBlank = safeFillingMode && value === '' && isSensitiveField(field)
    const missing = value === undefined || value === null || (value === '' && !deliberateBlank)
    merged[field.name] = missing ? mock[field.name] : value
  }
  return merged
}

function undoFill() {
  if (!lastSnapshot) return { success: false, restored: 0, error: 'Nothing to undo on this page.' }
  const restored = lastSnapshot.restore()
  lastSnapshot = null
  return { success: true, restored }
}

// ---------------------------------------------------------------------------
// Recognize a saved form when the page loads
// ---------------------------------------------------------------------------

const DISMISS_KEY = 'smartfill:dismissed-forms'

function dismissedForms(): string[] {
  try { return JSON.parse(sessionStorage.getItem(DISMISS_KEY) || '[]') } catch { return [] }
}

function dismissForm(id: string) {
  try { sessionStorage.setItem(DISMISS_KEY, JSON.stringify([...dismissedForms(), id])) } catch { /* storage blocked */ }
}

/**
 * Single-page apps render forms after load, so look a few times. Only
 * runs on hosts that have a saved form, and shows the card once.
 */
async function recognizeSavedForm() {
  if (window.top !== window) return
  const settings = await getSettings()
  if (!settings.rememberForms) return
  const forms = await savedFormsFor(location.hostname)
  if (forms.length === 0) return

  for (const delay of [700, 1800, 4000]) {
    await new Promise(r => setTimeout(r, delay))
    if (activeScope || scopeDismissed || pickerActive) return
    const fields = await collectFields()
    const scoped = await resolveScope(fields, settings)
    if (!scoped) continue
    if (dismissedForms().includes(scoped.scope.form.id)) return
    showRecognizedCard(scoped)
    return
  }
}

function showRecognizedCard(scoped: ScopedFields) {
  const summary = scopeSummary(scoped)!
  const actions = summary.hasValues
    ? [
        { label: 'Fill same values', primary: true, title: 'Continue with the values from last time', onClick: () => fillAndReport({ reuse: true }) },
        { label: 'New values', title: 'Generate fresh values', onClick: () => fillAndReport({}) }
      ]
    : [{ label: 'Fill', primary: true, onClick: () => fillAndReport({}) }]
  showPanel({
    tone: 'info',
    title: 'Auto-scanned from your last visit',
    message: `${summary.title} · ${summary.fieldCount} fields · ${summary.score}% match`,
    highlight: scoped.fields.map(f => (f.trigger || f.element) as HTMLElement),
    actions: [
      ...actions,
      { label: 'Not now', onClick: () => dismissForm(summary.formId) }
    ]
  })
}

recognizeSavedForm().catch(() => { /* never break the page */ })

// ---------------------------------------------------------------------------
// Recording helpers (unchanged structurally)
// ---------------------------------------------------------------------------
function generateSelector(element: Element): string {
  if (element.id) {
    return `#${safeEscape(element.id)}`
  }
  // classList works for HTMLElement and SVGElement; className.split
  // can return a non-string (SVGAnimatedString) for SVG nodes.
  if (element.classList && element.classList.length > 0) {
    const classes = Array.from(element.classList)
      .map(c => safeEscape(c))
      .filter(Boolean)
      .join('.')
    if (classes) return `.${classes}`
  }
  const tagName = element.tagName.toLowerCase()
  const parent = element.parentElement
  if (parent) {
    const siblings = Array.from(parent.children).filter(c => c.tagName === element.tagName)
    if (siblings.length > 1) {
      const index = siblings.indexOf(element) + 1
      return `${tagName}:nth-child(${index})`
    }
  }
  return tagName
}

function safeEscape(value: string): string {
  if (!value) return ''
  const css = (window as any).CSS
  if (css && typeof css.escape === 'function') return css.escape(value)
  // Minimal fallback: escape characters that have meaning in CSS
  // selectors. Good enough for the few real-world class names we see.
  return value.replace(/(["\\:#.>+~*[\]()'\s,])/g, '\\$1')
}

async function startRecording(): Promise<{ success: boolean, error?: string }> {
  try {
    if (isRecording) return { success: false, error: "Already recording" }
    const domain = window.location.hostname
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const sessionName = `Session ${new Date().toLocaleTimeString()}`
    currentRecording = {
      id: sessionId, name: sessionName, domain,
      createdAt: new Date(), updatedAt: new Date(), steps: []
    }
    isRecording = true
    recordingStartTime = Date.now()
    await chrome.storage.local.set({
      recordingState: { isRecording: true, status: 'Recording in progress...' }
    })
    setupRecordingListeners()
    return { success: true }
  } catch (error) {
    console.error('Error starting recording:', error)
    return { success: false, error: 'Failed to start recording' }
  }
}

async function stopRecording(): Promise<{ success: boolean, error?: string }> {
  try {
    if (!isRecording || !currentRecording) return { success: false, error: "Not recording" }
    isRecording = false
    cleanupRecordingListeners()
    const sessions = await getStoredSessions()
    sessions.push(currentRecording)
    await chrome.storage.local.set({ recordingSessions: sessions })
    await chrome.storage.local.set({
      recordingState: { isRecording: false, status: 'Ready to record' }
    })
    currentRecording = null
    recordingStartTime = 0
    return { success: true }
  } catch (error) {
    console.error('Error stopping recording:', error)
    return { success: false, error: 'Failed to stop recording' }
  }
}

function setupRecordingListeners() {
  setupDocumentListeners()
  setupElementListeners()
  setupMutationObserver()
}

function setupDocumentListeners() {
  let scrollTimeout: number | null = null
  const scrollHandler = (event: Event) => {
    if (!isRecording) return
    if (scrollTimeout) clearTimeout(scrollTimeout)
    scrollTimeout = window.setTimeout(() => {
      recordInteraction('scroll', document.documentElement, JSON.stringify({
        x: window.scrollX, y: window.scrollY,
        target: event.target === document ? 'document' : 'element'
      }))
    }, 100)
  }
  document.addEventListener('scroll', scrollHandler, true)
  eventListeners.push({ element: document as any, event: 'scroll', handler: scrollHandler })

  const keydownHandler = (event: Event) => {
    if (!isRecording) return
    const kb = event as KeyboardEvent
    const target = kb.target as Element
    if (!target.matches('input, textarea, [contenteditable="true"]')) return
    recordInteraction('keydown', target, JSON.stringify({
      key: kb.key, code: kb.code,
      ctrlKey: kb.ctrlKey, altKey: kb.altKey,
      shiftKey: kb.shiftKey, metaKey: kb.metaKey
    }))
  }
  document.addEventListener('keydown', keydownHandler, true)
  eventListeners.push({ element: document as any, event: 'keydown', handler: keydownHandler })

  const focusHandler = (event: Event) => {
    if (!isRecording) return
    const fe = event as FocusEvent
    const target = fe.target as Element
    if (target.matches('input, textarea, select, [contenteditable="true"]')) {
      recordInteraction('focus', target, '')
    }
  }
  document.addEventListener('focusin', focusHandler, true)
  eventListeners.push({ element: document as any, event: 'focusin', handler: focusHandler })

  const mousedownHandler = (event: Event) => {
    if (!isRecording) return
    const me = event as MouseEvent
    recordInteraction('mousedown', me.target as Element, JSON.stringify({
      x: me.clientX, y: me.clientY, button: me.button
    }))
  }
  document.addEventListener('mousedown', mousedownHandler, true)
  eventListeners.push({ element: document as any, event: 'mousedown', handler: mousedownHandler })
}

function setupElementListeners() {
  document.querySelectorAll('input, textarea, select, button, [role="button"], [onclick], a, [tabindex]')
    .forEach(setupSingleElementListeners)
}

function setupSingleElementListeners(element: Element) {
  const clickHandler = (event: Event) => {
    if (!isRecording) return
    const me = event as MouseEvent
    recordInteraction('click', element, JSON.stringify({
      x: me.clientX, y: me.clientY, button: me.button,
      ctrlKey: me.ctrlKey, shiftKey: me.shiftKey
    }))
  }
  element.addEventListener('click', clickHandler)
  eventListeners.push({ element, event: 'click', handler: clickHandler })

  if (element.matches('input, textarea, select, [contenteditable="true"]')) {
    const inputHandler = (event: Event) => {
      if (!isRecording) return
      const target = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      recordInteraction('input', element, JSON.stringify({
        value: target.value || (target as any).textContent,
        selectionStart: (target as HTMLInputElement).selectionStart,
        selectionEnd: (target as HTMLInputElement).selectionEnd
      }))
    }
    element.addEventListener('input', inputHandler)
    eventListeners.push({ element, event: 'input', handler: inputHandler })

    const changeHandler = (event: Event) => {
      if (!isRecording) return
      const target = event.target as HTMLSelectElement | HTMLInputElement
      recordInteraction('change', element, JSON.stringify({
        value: target.value,
        selectedIndex: (target as HTMLSelectElement).selectedIndex
      }))
    }
    element.addEventListener('change', changeHandler)
    eventListeners.push({ element, event: 'change', handler: changeHandler })
  }

  if (element.matches('form')) {
    const submitHandler = () => { if (isRecording) recordInteraction('submit', element, '') }
    element.addEventListener('submit', submitHandler)
    eventListeners.push({ element, event: 'submit', handler: submitHandler })
  }
}

function setupMutationObserver() {
  const observer = new MutationObserver((mutations) => {
    if (!isRecording) return
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element
          if (element.matches('.modal, .popup, .dialog, [role="dialog"], .overlay')) {
            recordInteraction('modal_open', element, '')
          }
          element.querySelectorAll('input, textarea, select, button, [role="button"], [onclick], a, [tabindex]')
            .forEach(setupSingleElementListeners)
          if (element.matches('input, textarea, select, button, [role="button"], [onclick], a, [tabindex]')) {
            setupSingleElementListeners(element)
          }
        }
      })
      mutation.removedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element
          if (element.matches('.modal, .popup, .dialog, [role="dialog"], .overlay')) {
            recordInteraction('modal_close', element, '')
          }
        }
      })
      if (mutation.type === 'attributes') {
        const element = mutation.target as Element
        if (mutation.attributeName === 'class' || mutation.attributeName === 'style') {
          if (element.matches('.modal, .popup, .dialog, [role="dialog"], .overlay')) {
            const isVisible = element.checkVisibility?.() ?? getComputedStyle(element).display !== 'none'
            recordInteraction(isVisible ? 'modal_show' : 'modal_hide', element, '')
          }
        }
      }
    })
  })
  observer.observe(document.body, {
    childList: true, subtree: true, attributes: true,
    attributeFilter: ['class', 'style', 'hidden']
  })
  ;(window as any).__recordingObserver = observer
}

function recordInteraction(
  type: 'click' | 'input' | 'select' | 'keydown' | 'focus' | 'mousedown' | 'scroll' | 'modal_open' | 'modal_close' | 'modal_show' | 'modal_hide' | 'submit' | 'change',
  element: Element,
  value: string
) {
  if (!isRecording || !currentRecording) return
  const selector = generateSelector(element)
  const timestamp = Date.now() - recordingStartTime
  const step: RecordingStep = {
    id: `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: normalizeStepType(type),
    selector,
    value: value || undefined,
    timestamp,
    data: value ? (isJsonString(value) ? JSON.parse(value) : undefined) : undefined
  }
  currentRecording.steps.push(step)
  currentRecording.updatedAt = new Date()
}

function normalizeStepType(type: string): 'click' | 'input' | 'select' | 'keydown' | 'focus' | 'mousedown' | 'scroll' | 'modal' | 'submit' {
  switch (type) {
    case 'modal_open': case 'modal_close': case 'modal_show': case 'modal_hide': return 'modal'
    case 'change': return 'select'
    default: return type as any
  }
}

function isJsonString(str: string): boolean {
  try { JSON.parse(str); return true } catch { return false }
}

function cleanupRecordingListeners() {
  eventListeners.forEach(({ element, event, handler }) => {
    element.removeEventListener(event, handler)
  })
  eventListeners = []
  const observer = (window as any).__recordingObserver
  if (observer) {
    observer.disconnect()
    delete (window as any).__recordingObserver
  }
}

async function getStoredSessions(): Promise<RecordingSession[]> {
  try {
    const result = await chrome.storage.local.get(['recordingSessions'])
    return result.recordingSessions || []
  } catch {
    return []
  }
}

async function playSession(sessionId: string): Promise<{ success: boolean, error?: string }> {
  try {
    const sessions = await getStoredSessions()
    const session = sessions.find(s => s.id === sessionId)
    if (!session) return { success: false, error: 'Session not found' }
    const sorted = [...session.steps].sort((a, b) => a.timestamp - b.timestamp)
    let last = 0
    for (const step of sorted) {
      const gap = Math.max(0, step.timestamp - last)
      if (gap > 0) await new Promise(r => setTimeout(r, Math.min(gap, 2000)))
      await playStep(step)
      last = step.timestamp
    }
    return { success: true }
  } catch (error) {
    console.error('Error playing session:', error)
    return { success: false, error: 'Playback failed' }
  }
}

async function playStep(step: RecordingStep): Promise<void> {
  try {
    const element = document.querySelector(step.selector)
    if (!element) return
    switch (step.type) {
      case 'click':
        if (step.data && 'x' in step.data && 'y' in step.data) {
          element.dispatchEvent(new MouseEvent('click', {
            bubbles: true, cancelable: true,
            clientX: step.data.x as number, clientY: step.data.y as number,
            button: (step.data.button as number) || 0
          }))
        } else {
          (element as HTMLElement).click()
        }
        break
      case 'input':
        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element.matches('[contenteditable="true"]')) {
          if (element instanceof HTMLElement) element.focus()
          if (step.data && 'value' in step.data) {
            const d = step.data as any
            if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
              element.value = d.value || ''
              if (typeof d.selectionStart === 'number') {
                element.setSelectionRange(d.selectionStart, d.selectionEnd || d.selectionStart)
              }
            } else {
              (element as any).textContent = d.value || ''
            }
          } else {
            if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
              element.value = step.value || ''
            } else {
              (element as any).textContent = step.value || ''
            }
          }
          element.dispatchEvent(new Event('input', { bubbles: true }))
          element.dispatchEvent(new Event('change', { bubbles: true }))
        }
        break
      case 'select':
        if (element instanceof HTMLSelectElement) {
          const v = (step.data as any)?.value ?? step.value ?? ''
          element.value = v
          element.dispatchEvent(new Event('change', { bubbles: true }))
        }
        break
      case 'keydown':
        if (step.data) {
          const d = step.data as any
          element.dispatchEvent(new KeyboardEvent('keydown', {
            key: d.key, code: d.code,
            ctrlKey: d.ctrlKey, altKey: d.altKey,
            shiftKey: d.shiftKey, metaKey: d.metaKey,
            bubbles: true
          }))
        }
        break
      case 'focus':
        if (element instanceof HTMLElement) element.focus()
        break
      case 'mousedown':
        if (step.data) {
          const d = step.data as any
          element.dispatchEvent(new MouseEvent('mousedown', {
            bubbles: true, cancelable: true,
            clientX: d.x, clientY: d.y, button: d.button || 0
          }))
        }
        break
      case 'scroll':
        if (step.data) {
          const d = step.data as any
          window.scrollTo({ left: d.x || 0, top: d.y || 0, behavior: 'smooth' })
        }
        break
      case 'modal':
        if (element instanceof HTMLElement) element.click()
        break
      case 'submit':
        if (element instanceof HTMLFormElement) element.submit()
        else (element as HTMLElement).click()
        break
      default:
        console.warn(`Unknown step type: ${step.type}`)
    }
  } catch (error) {
    console.error('Error playing step:', error)
  }
}
