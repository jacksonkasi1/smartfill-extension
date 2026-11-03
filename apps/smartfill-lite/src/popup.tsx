// ** import core packages
import { memo, useEffect, useRef, useState } from "react"

// ** import types
import type { FillMode, Settings } from "@/lib/settings"
import type { ProfileId, Region } from "@/lib/mock"
import type { StatusState } from "@/components/Status"

// ** import utils
import { isRestrictedUrl, sendToTab } from "@/lib/utils/tabs"

// ** import lib
import { activeModel, getSettings, isAIReady, resolveVoice, saveSettings } from "@/lib/settings"
import { PROFILES, PROFILE_MAP, REGIONS, newSeed } from "@/lib/mock"
import { IDLE, Status, errorText } from "@/components/Status"
import { useSpeech } from "@/components/useSpeech"
import {
  ArrowLeftIcon,
  ChevronIcon,
  MemoryIcon,
  MicIcon,
  PlayIcon,
  RecordIcon,
  RefreshIcon,
  SettingsIcon,
  SparklesIcon,
  StopIcon,
  TargetIcon,
  TrashIcon,
  UndoIcon,
  WandIcon
} from "@/components/icons"

// ** import constants
import { PROVIDERS } from "@/api/ai/constants"
import { MESSAGE_ACTIONS } from "@/lib/utils/messaging/types"

// ** import styles
import "@/styles/theme.css"
import "@/styles/popup.css"

// ** import assets
import iconUrl from "data-base64:~assets/icon.png"

interface ActiveTab {
  id: number
  host: string
  restricted: boolean
}

interface ScannedField {
  label: string
  kind: string
  required: boolean
  skipped: boolean
  inScope: boolean
}

interface ScopeSummary {
  source: 'picked' | 'memory'
  formId: string
  title: string
  persisted: boolean
  score: number
  fieldCount: number
  hasValues: boolean
  savedAt: number
}

interface ScanResult {
  fields: ScannedField[]
  profile: ProfileId
  autoDetected: boolean
  region: Region
  scope?: ScopeSummary
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

async function getActiveTab(): Promise<ActiveTab> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (tab?.id === undefined) throw new Error('No active tab found.')
  let host = 'this page'
  try { host = tab.url ? new URL(tab.url).host || tab.url : host } catch { /* keep default */ }
  return { id: tab.id, host, restricted: isRestrictedUrl(tab.url) }
}

function openOptions(hash = '') {
  if (hash) chrome.tabs.create({ url: chrome.runtime.getURL(`options.html${hash}`) })
  else chrome.runtime.openOptionsPage()
  window.close()
}

// ---------------------------------------------------------------------------
// Detected fields list
// ---------------------------------------------------------------------------
const FieldList = memo(function FieldList({ fields, scoped }: { fields: ScannedField[], scoped: boolean }) {
  if (fields.length === 0) return <p className="card empty">No form fields found on this page.</p>
  const inArea = fields.filter(f => f.inScope)
  const required = inArea.filter(f => f.required).length
  // Fields of the picked area first; the rest stay listed, dimmed, for context.
  const ordered = scoped ? [...inArea, ...fields.filter(f => !f.inScope)] : fields
  return (
    <details className="card fields">
      <summary>
        <span>{scoped ? 'Fields in area' : 'Detected fields'}</span>
        <span className="summary-value">
          <strong>{scoped ? `${inArea.length} of ${fields.length}` : fields.length}</strong>
          {required > 0 && <span>· {required} required</span>}
          <ChevronIcon size={14} />
        </span>
      </summary>
      <ul>
        {ordered.map((field, index) => (
          <li key={index} className={field.skipped || !field.inScope ? 'skipped' : undefined}>
            <span className="name">
              {field.label}
              {field.required && <span className="required"> *</span>}
            </span>
            <span className="kind">{!field.inScope ? 'outside area' : field.skipped ? 'skipped' : field.kind}</span>
          </li>
        ))}
      </ul>
    </details>
  )
})

/** Which part of the page gets filled: a picked area, a recognized saved form, or everything. */
function ScopeBar({ scope, disabled, onPick, onWholePage, onForget }: {
  scope?: ScopeSummary
  disabled: boolean
  onPick: () => void
  onWholePage: () => void
  onForget: () => void
}) {
  if (!scope) {
    return (
      <button type="button" className="scope-pick" onClick={onPick} disabled={disabled}>
        <TargetIcon size={15} />
        <span className="scope-pick-copy">
          <strong>Select form area</strong>
          <small>Click or drag over it · remembered next visit</small>
        </span>
      </button>
    )
  }
  const recognized = scope.source === 'memory'
  return (
    <div className={`scope-bar${recognized ? ' recognized' : ''}`} role="status">
      <span className="scope-icon">{recognized ? <MemoryIcon size={15} /> : <TargetIcon size={15} />}</span>
      <span className="scope-copy">
        <strong>{recognized ? 'Auto-scanned from last visit' : 'Area selected'}</strong>
        <small title={scope.title}>{scope.title}</small>
        <small>{plural(scope.fieldCount, 'field')}{recognized ? ` · ${scope.score}% match` : ''}</small>
        <span className="scope-actions">
          <button type="button" className="link" onClick={onPick} disabled={disabled} title="Pick the area again">Rescan</button>
          <button type="button" className="link" onClick={onWholePage} disabled={disabled} title="Fill every field on the page this time">Whole page</button>
        </span>
      </span>
      {scope.persisted && (
        <button type="button" className="small-icon ghost" onClick={onForget} disabled={disabled} title="Forget this saved form" aria-label="Forget this saved form">
          <TrashIcon size={12} />
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Recorder (record and replay interactions on the current site)
// ---------------------------------------------------------------------------
function Recorder({ tab, onStatus }: { tab: ActiveTab, onStatus: (s: StatusState) => void }) {
  const [recording, setRecording] = useState(false)
  const [sessions, setSessions] = useState<any[]>([])

  async function loadSessions() {
    const { recordingSessions = [], recordingState } = await chrome.storage.local.get(['recordingSessions', 'recordingState'])
    setSessions(recordingSessions.filter((s: any) => s.domain === tab.host.split(':')[0]))
    setRecording(Boolean(recordingState?.isRecording))
  }

  useEffect(() => { loadSessions() }, [])

  async function run(action: string, extra: Record<string, unknown> = {}) {
    try {
      const res = await sendToTab(tab.id, { action, ...extra })
      if (!res?.success) throw new Error(res?.error || 'Action failed.')
      return true
    } catch (error) {
      onStatus({ tone: 'error', message: errorText(error) })
      return false
    }
  }

  async function toggle() {
    if (recording) {
      if (await run(MESSAGE_ACTIONS.RECORDING.STOP)) onStatus({ tone: 'success', message: 'Session saved.' })
    } else if (await run(MESSAGE_ACTIONS.RECORDING.START)) {
      onStatus({ tone: 'loading', message: 'Recording… interact with the page, then stop.' })
    }
    loadSessions()
  }

  async function play(id: string) {
    onStatus({ tone: 'loading', message: 'Replaying session…' })
    if (await run(MESSAGE_ACTIONS.RECORDING.PLAY, { sessionId: id })) onStatus({ tone: 'success', message: 'Replay finished.' })
  }

  async function remove(id: string) {
    const { recordingSessions = [] } = await chrome.storage.local.get('recordingSessions')
    await chrome.storage.local.set({ recordingSessions: recordingSessions.filter((s: any) => s.id !== id) })
    loadSessions()
  }

  return (
    <section className="card recorder">
      <div className="recorder-state">
        <span className={`rec-dot${recording ? ' on' : ''}`} />
        {recording ? 'Recording in progress' : 'Record clicks and typing, replay later'}
      </div>
      <button type="button" className={`record-button${recording ? ' stop' : ''}`} onClick={toggle} disabled={tab.restricted}>
        {recording ? <StopIcon size={14} /> : <RecordIcon size={15} />}
        {recording ? 'Stop & save' : 'Start recording'}
      </button>
      {sessions.length > 0 && (
        <ul className="sessions">
          {sessions.map(session => (
            <li key={session.id}>
              <div className="session-info">
                <div className="session-name">{session.name}</div>
                <div className="session-meta">{plural(session.steps?.length || 0, 'step')}</div>
              </div>
              <button type="button" className="small-icon" title="Replay" aria-label="Replay" onClick={() => play(session.id)}>
                <PlayIcon size={12} />
              </button>
              <button type="button" className="small-icon" title="Delete" aria-label="Delete" onClick={() => remove(session.id)}>
                <TrashIcon size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Popup
// ---------------------------------------------------------------------------
function Popup() {
  const [tab, setTab] = useState<ActiveTab>()
  const [settings, setSettings] = useState<Settings>()
  const [scan, setScan] = useState<ScanResult>()
  const [status, setStatus] = useState<StatusState>(IDLE)
  const [statusAction, setStatusAction] = useState<{ label: string, onClick: () => void }>()
  const [busy, setBusy] = useState<'fill' | 'regenerate' | 'undo'>()
  const [canUndo, setCanUndo] = useState(false)
  const [view, setView] = useState<'fill' | 'record'>('fill')
  const [shortcut, setShortcut] = useState<string[]>([])
  const seed = useRef(newSeed())

  const speech = useSpeech(text => {
    if (!settings) return
    const instructions = [settings.instructions.trim(), text].filter(Boolean).join(' ')
    update({ instructions })
  }, settings ? resolveVoice(settings) : undefined)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [activeTab, saved] = await Promise.all([getActiveTab(), getSettings()])
        if (cancelled) return
        setTab(activeTab)
        setSettings(saved)
        if (!activeTab.restricted) await rescan(activeTab)
      } catch (error) {
        if (!cancelled) setStatus({ tone: 'error', message: errorText(error) })
      }
    })()
    chrome.commands?.getAll?.().then(commands => {
      const key = commands.find(c => c.name === 'fill-form')?.shortcut
      if (key) setShortcut(key.split('+'))
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (speech.error === 'not-allowed' || speech.error === 'service-not-allowed') {
      setStatus({ tone: 'warning', message: 'Microphone access is needed for voice input.' })
      setStatusAction({ label: 'Allow', onClick: () => openOptions('#voice') })
    } else if (speech.message) {
      setStatus({ tone: 'warning', message: speech.message })
      if (speech.error === 'no-transcriber' || speech.error === 'no-key') {
        setStatusAction({ label: 'Set up voice', onClick: () => openOptions('#voice') })
      }
    }
  }, [speech.error])

  async function rescan(target = tab) {
    if (!target || target.restricted) return
    try {
      const res = await sendToTab<ScanResult & { success: boolean }>(target.id, { action: MESSAGE_ACTIONS.FORMS.SCAN })
      if (res?.success) setScan(res)
    } catch {
      // Pages that block script injection still let the user open settings.
    }
  }

  function showStatus(next: StatusState) {
    setStatusAction(undefined)
    setStatus(next)
  }

  /** Save immediately so the content script and the shortcut see the same choice. */
  async function update(patch: Partial<Settings>, refresh = false) {
    if (!settings) return
    setSettings({ ...settings, ...patch })
    await saveSettings(patch)
    if (refresh) rescan()
  }

  async function fill(regenerate: boolean, reuse = false) {
    if (!tab || !settings || busy) return
    if (regenerate) seed.current = newSeed()
    setBusy(regenerate ? 'regenerate' : 'fill')
    showStatus({
      tone: 'loading',
      message: reuse ? 'Filling your saved values…' : settings.mode === 'ai' ? 'AI is writing values…' : 'Filling mock data…'
    })
    try {
      // Continuing with saved values uses the saved seed, so leave it to the page.
      const res = await sendToTab(tab.id, { action: MESSAGE_ACTIONS.FORMS.FILL, seed: reuse ? undefined : seed.current, reuse })
      if (!res?.success) throw new Error(res?.errors?.[0] || res?.error || 'Nothing was filled.')
      if (res.scope) setScan(current => (current ? { ...current, scope: res.scope } : current))
      const where = res.scope ? ` in ${res.scope.source === 'memory' ? 'saved form' : 'area'}` : ''
      const reused = res.reused ? ` · ${res.reused} continued` : ''
      const summary = `Filled ${res.filled} of ${plural(res.total, 'field')}${where}${reused} · ${PROFILE_MAP[res.profile as ProfileId]?.name ?? ''}`
      if (res.warning) {
        showStatus({ tone: 'warning', message: `${summary}. ${res.warning}` })
        if (!isAIReady(settings)) setStatusAction({ label: 'Set up AI', onClick: () => openOptions() })
      } else {
        showStatus({ tone: 'success', message: res.inbox ? `${summary} · ${res.inbox.email}` : `${summary}.` })
        if (res.inbox) setStatusAction({ label: 'Open inbox', onClick: () => chrome.tabs.create({ url: res.inbox.url }) })
      }
      setCanUndo(true)
    } catch (error) {
      showStatus({ tone: 'error', message: errorText(error) })
    } finally {
      setBusy(undefined)
    }
  }

  async function undo() {
    if (!tab || busy) return
    setBusy('undo')
    try {
      const res = await sendToTab(tab.id, { action: MESSAGE_ACTIONS.FORMS.UNDO })
      if (!res?.success) throw new Error(res?.error || 'Nothing to undo.')
      showStatus({ tone: 'success', message: `Restored ${plural(res.restored, 'field')}.` })
      setCanUndo(false)
    } catch (error) {
      showStatus({ tone: 'error', message: errorText(error) })
    } finally {
      setBusy(undefined)
    }
  }

  async function pickArea() {
    if (!tab || busy) return
    try {
      const res = await sendToTab(tab.id, { action: MESSAGE_ACTIONS.FORMS.PICK })
      if (!res?.success) throw new Error(res?.error || 'Could not start the picker.')
      // The picker lives on the page; the popup would cover it.
      window.close()
    } catch (error) {
      showStatus({ tone: 'error', message: errorText(error) })
    }
  }

  async function wholePage() {
    if (!tab) return
    await sendToTab(tab.id, { action: MESSAGE_ACTIONS.FORMS.CLEAR_SCOPE }).catch(() => undefined)
    await rescan()
    showStatus({ tone: 'success', message: 'Filling the whole page this time.' })
  }

  async function forget() {
    if (!tab || !scan?.scope) return
    await sendToTab(tab.id, { action: MESSAGE_ACTIONS.FORMS.FORGET, formId: scan.scope.formId }).catch(() => undefined)
    await rescan()
    showStatus({ tone: 'success', message: 'Saved form removed.' })
  }

  const mode: FillMode = settings?.mode ?? 'mock'
  const aiReady = settings ? isAIReady(settings) : false
  const disabled = !tab || !settings || tab.restricted || Boolean(busy)
  const detectedName = scan ? PROFILE_MAP[scan.profile]?.name : undefined
  const scope = scan?.scope
  // A recognized form filled before can continue with the same values.
  const canContinue = Boolean(scope?.hasValues)

  return (
    <main className="popup">
      <header className="header">
        <img className="logo" src={iconUrl} alt="" width={36} height={36} />
        <div className="title">
          <h1>SmartFill</h1>
          <p className="site" title={tab?.host}>{tab ? tab.host : 'Detecting page…'}</p>
        </div>
        <button
          type="button"
          className={`icon-button${view === 'record' ? ' active' : ''}`}
          onClick={() => setView(view === 'fill' ? 'record' : 'fill')}
          title={view === 'fill' ? 'Record & replay' : 'Back to fill'}
          aria-label={view === 'fill' ? 'Record and replay' : 'Back to fill'}>
          {view === 'fill' ? <RecordIcon size={15} /> : <ArrowLeftIcon size={15} />}
        </button>
        <button type="button" className="icon-button" onClick={() => openOptions()} title="Settings" aria-label="Settings">
          <SettingsIcon size={16} />
        </button>
      </header>

      {tab?.restricted && (
        <Status status={{ tone: 'warning', message: 'Browser pages can’t be filled. Open a website with a form.' }} />
      )}

      {view === 'record' && tab ? (
        <Recorder tab={tab} onStatus={showStatus} />
      ) : (
        <section className="card hero">
          <div className="segmented" role="radiogroup" aria-label="Fill mode">
            {(['mock', 'ai'] as FillMode[]).map(m => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                className={mode === m ? 'active' : undefined}
                disabled={!settings}
                onClick={() => update({ mode: m })}>
                {m === 'mock' ? <WandIcon size={13} /> : <SparklesIcon size={13} />}
                {m === 'mock' ? 'Mock data' : 'AI fill'}
              </button>
            ))}
          </div>

          <div className="pickers">
            <select
              aria-label="Industry profile"
              value={settings?.profile ?? 'auto'}
              disabled={!settings}
              onChange={e => update({ profile: e.target.value as Settings['profile'] }, true)}>
              <option value="auto">Auto-detect industry</option>
              {PROFILES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select
              aria-label="Region"
              value={settings?.region ?? 'auto'}
              disabled={!settings}
              onChange={e => update({ region: e.target.value as Settings['region'] }, true)}>
              <option value="auto">Auto</option>
              {Object.values(REGIONS).map(r => <option key={r.id} value={r.id}>{r.id.toUpperCase()}</option>)}
            </select>
          </div>
          {settings?.profile === 'auto' && detectedName && (
            <p className="detected">
              Detected <strong>{detectedName}</strong>{settings.region === 'auto' && scan ? ` · ${REGIONS[scan.region].label}` : ''}
            </p>
          )}

          {mode === 'ai' && settings && (
            <div className="textarea-wrap instructions">
              <textarea
                rows={2}
                aria-label="Instructions for AI"
                placeholder="Optional instructions, e.g. “Senior doctor in Chennai, use @acme.in emails”"
                value={settings.instructions}
                onChange={e => setSettings({ ...settings, instructions: e.target.value })}
                onBlur={e => saveSettings({ instructions: e.target.value })}
              />
              {speech.supported && (
                <button
                  type="button"
                  className={`mic-button${speech.listening ? ' listening' : ''}${speech.transcribing ? ' busy' : ''}`}
                  onClick={speech.toggle}
                  title={speech.listening ? 'Stop dictation' : 'Dictate instructions'}
                  aria-label={speech.listening ? 'Stop dictation' : 'Dictate instructions'}>
                  <MicIcon size={14} />
                </button>
              )}
            </div>
          )}

          {tab && !tab.restricted && scan && scan.fields.length > 0 && (
            <ScopeBar scope={scope} disabled={disabled} onPick={pickArea} onWholePage={wholePage} onForget={forget} />
          )}

          <button
            type="button"
            className={`primary fill-button${busy === 'fill' || busy === 'regenerate' ? ' busy' : ''}`}
            onClick={async () => {
              if (settings) await saveSettings({ instructions: settings.instructions })
              fill(false, canContinue)
            }}
            title={canContinue ? 'Continue with the values SmartFill filled last time' : undefined}
            disabled={disabled}>
            {busy === 'fill' || busy === 'regenerate'
              ? <span className="spinner" aria-hidden="true" />
              : canContinue ? <MemoryIcon size={17} /> : mode === 'ai' ? <SparklesIcon size={17} /> : <WandIcon size={17} />}
            {canContinue ? 'Fill same values' : mode === 'ai' ? 'Fill with AI' : 'Fill form'}
          </button>

          <div className="secondary-actions">
            <button type="button" className="link" onClick={() => fill(true)} disabled={disabled}>
              <RefreshIcon size={13} />
              {canContinue ? (mode === 'ai' ? 'New AI values' : 'New values') : 'Generate again'}
            </button>
            <span className="divider" aria-hidden="true" />
            <button type="button" className="link" onClick={undo} disabled={disabled || !canUndo}>
              <UndoIcon size={13} />
              Undo
            </button>
          </div>
        </section>
      )}

      <Status status={status} action={statusAction} />

      {view === 'fill' && scan && <FieldList fields={scan.fields} scoped={Boolean(scan.scope)} />}

      <footer className="footer">
        <button type="button" className={`ai-status${aiReady ? ' on' : ''}`} onClick={() => openOptions()}>
          <span className="dot" />
          <span>
            {settings && aiReady
              ? `AI · ${PROVIDERS[settings.provider].name} · ${activeModel(settings)}`
              : 'AI not set up · Mock works offline'}
          </span>
        </button>
        {shortcut.length > 0 && (
          <span className="shortcut" title="Keyboard shortcut">
            {shortcut.map(key => <kbd key={key}>{key}</kbd>)}
          </span>
        )}
      </footer>
    </main>
  )
}

export default Popup
