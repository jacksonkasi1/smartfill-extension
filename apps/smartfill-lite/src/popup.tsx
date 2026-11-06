// ** import core packages
import { memo, useEffect, useRef, useState } from "react"

// ** import types
import type { FillMode, Settings } from "@/lib/settings"
import type { ProfileId, Region } from "@/lib/mock"
import type { StatusState } from "@/components/Status"

// ** import utils
import { isRestrictedUrl, sendToTab } from "@/lib/utils/tabs"

// ** import lib
import { getSettings, isAIReady, resolveVoice, saveSettings } from "@/lib/settings"
import { PROFILES, PROFILE_MAP, REGIONS, newSeed } from "@/lib/mock"
import { IDLE, Status, errorText } from "@/components/Status"
import { useSpeech } from "@/components/useSpeech"
import { Button, Field, IconButton, SelectPicker } from "@/components/ui"
import {
  ChevronIcon,
  MemoryIcon,
  MicIcon,
  RefreshIcon,
  SettingsIcon,
  SparklesIcon,
  TargetIcon,
  TrashIcon,
  UndoIcon,
  WandIcon
} from "@/components/icons"

// ** import constants
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
      <Button className="scope-pick" onClick={onPick} disabled={disabled}>
        <TargetIcon size={15} />
        <span className="scope-pick-copy">
          <strong>Select form area</strong>
          <small>Choose specific fields on this page</small>
        </span>
      </Button>
    )
  }
  const recognized = scope.source === 'memory'
  return (
    <div className={`scope-bar${recognized ? ' recognized' : ''}`} role="status">
      <span className="scope-icon">{recognized ? <MemoryIcon size={15} /> : <TargetIcon size={15} />}</span>
      <span className="scope-copy">
        <strong>{recognized ? 'Saved form recognized' : 'Area selected'}</strong>
        <small title={scope.title}>{scope.title}</small>
        <small>{plural(scope.fieldCount, 'field')}{recognized ? ` · ${scope.score}% match` : ''}</small>
        <span className="scope-actions">
          <Button variant="ghost" size="sm" className="link" onClick={onPick} disabled={disabled} title="Pick the area again">Rescan</Button>
          <Button variant="ghost" size="sm" className="link" onClick={onWholePage} disabled={disabled} title="Fill every field on the page this time">Whole page</Button>
        </span>
      </span>
      {scope.persisted && (
        <IconButton className="small-icon ghost" onClick={onForget} disabled={disabled} title="Forget this saved form" aria-label="Forget this saved form">
          <TrashIcon size={12} />
        </IconButton>
      )}
    </div>
  )
}

function Popup() {
  const [tab, setTab] = useState<ActiveTab>()
  const [settings, setSettings] = useState<Settings>()
  const [scan, setScan] = useState<ScanResult>()
  const [scanning, setScanning] = useState(true)
  const [scanFailed, setScanFailed] = useState(false)
  const [status, setStatus] = useState<StatusState>(IDLE)
  const [statusAction, setStatusAction] = useState<{ label: string, onClick: () => void }>()
  const [busy, setBusy] = useState<'fill' | 'regenerate' | 'undo'>()
  const [canUndo, setCanUndo] = useState(false)
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
        else setScanning(false)
      } catch (error) {
        if (!cancelled) {
          setScanning(false)
          setStatus({ tone: 'error', message: errorText(error) })
        }
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
    setScanning(true)
    setScanFailed(false)
    try {
      const res = await sendToTab<ScanResult & { success: boolean }>(target.id, { action: MESSAGE_ACTIONS.FORMS.SCAN })
      if (res?.success) setScan(res)
      else setScanFailed(true)
    } catch {
      setScanFailed(true)
    } finally {
      setScanning(false)
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
    try {
      await saveSettings(patch)
      if (refresh) rescan()
    } catch (error) {
      showStatus({ tone: 'error', message: `Could not save settings. ${errorText(error)}` })
    }
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
        if (!isAIReady(settings)) setStatusAction({ label: 'Set up AI', onClick: () => openOptions('#ai') })
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
  const actionDisabled = !tab || !settings || tab.restricted || Boolean(busy)
  const disabled = actionDisabled || scanning || scanFailed || scan?.fields.length === 0
  const detectedName = scan ? PROFILE_MAP[scan.profile]?.name : undefined
  const scope = scan?.scope
  // A recognized form filled before can continue with the same values.
  const canContinue = Boolean(scope?.hasValues)

  return (
    <main className="popup">
      <header className="header">
        <img className="logo" src={iconUrl} alt="" width={32} height={32} />
        <div className="title">
          <h1>SmartFill</h1>
          <p className="site" title={tab?.host}>{tab ? tab.host : 'Detecting page…'}</p>
        </div>
        <IconButton className="icon-button" onClick={() => openOptions()} title="Settings" aria-label="Settings">
          <SettingsIcon size={16} />
        </IconButton>
      </header>

      {tab?.restricted && (
        <Status status={{ tone: 'warning', message: 'Browser pages can’t be filled. Open a website with a form.' }} />
      )}

      <div className="segmented" role="radiogroup" aria-label="Fill mode">
            {(['mock', 'ai'] as FillMode[]).map(m => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                tabIndex={mode === m ? 0 : -1}
                className={mode === m ? 'active' : undefined}
                disabled={!settings || Boolean(busy)}
                onKeyDown={event => {
                  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return
                  event.preventDefault()
                  const next: FillMode = event.key === 'Home' ? 'mock' : event.key === 'End' ? 'ai' : m === 'mock' ? 'ai' : 'mock'
                  const group = event.currentTarget.parentElement
                  update({ mode: next })
                  const buttons = group?.querySelectorAll<HTMLButtonElement>('button')
                  buttons?.[next === 'mock' ? 0 : 1]?.focus()
                }}
                onClick={() => update({ mode: m })}>
                {m === 'mock' ? <WandIcon size={13} /> : <SparklesIcon size={13} />}
                {m === 'mock' ? 'Mock data' : 'AI fill'}
              </button>
            ))}
          </div>

        <section className="card hero">
          <div className="pickers">
            <div className="picker-field">
            <span className="picker-label">Industry</span>
            <SelectPicker
              aria-label="Industry profile"
              value={settings?.profile ?? 'auto'}
              disabled={!settings || Boolean(busy)}
              searchable
              options={[{ value: 'auto', label: 'Auto-detect', description: 'Choose from the page', group: 'Automatic' }, ...PROFILES.map(p => ({ value: p.id, label: p.name, group: 'Industries' }))]}
              onChange={value => update({ profile: value as Settings['profile'] }, true)} />
            </div>
            <div className="picker-field">
            <span className="picker-label">Region</span>
            <SelectPicker
              aria-label="Region"
              value={settings?.region ?? 'auto'}
              disabled={!settings || Boolean(busy)}
              options={[{ value: 'auto', label: 'Auto', description: 'Match this page' }, ...Object.values(REGIONS).map(r => ({ value: r.id, label: r.id.toUpperCase(), description: r.label }))]}
              onChange={value => update({ region: value as Settings['region'] }, true)} />
            </div>
          </div>
          {settings?.profile === 'auto' && detectedName && (
            <p className="detected">
              Detected <strong>{detectedName}</strong>{settings.region === 'auto' && scan ? ` · ${REGIONS[scan.region].label}` : ''}
            </p>
          )}

          {mode === 'ai' && settings && (
            <Field label="AI instructions" hint="Optional context for this fill">
            <div className="textarea-wrap instructions">
              <textarea
                rows={2}
                aria-label="Instructions for AI"
                placeholder="e.g. A senior doctor in Chennai"
                value={settings.instructions}
                onChange={e => setSettings({ ...settings, instructions: e.target.value })}
                onBlur={e => update({ instructions: e.target.value })}
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
            </Field>
          )}

          {mode === 'ai' && settings && !aiReady && (
            <div className="setup-notice">
              <span>Connect an AI provider to use AI fill.</span>
              <Button variant="ghost" size="sm" onClick={() => openOptions('#ai')}>Set up AI</Button>
            </div>
          )}

          {tab && !tab.restricted && scan && scan.fields.length > 0 && (
            <ScopeBar scope={scope} disabled={disabled} onPick={pickArea} onWholePage={wholePage} onForget={forget} />
          )}

          <Button
            variant="primary"
            className={`fill-button${busy === 'fill' || busy === 'regenerate' ? ' busy' : ''}`}
            aria-busy={busy === 'fill' || busy === 'regenerate'}
            onClick={async () => {
              try {
                if (settings) await saveSettings({ instructions: settings.instructions })
                await fill(false, canContinue)
              } catch (error) {
                showStatus({ tone: 'error', message: `Could not save instructions. ${errorText(error)}` })
              }
            }}
            title={canContinue ? 'Continue with the values SmartFill filled last time' : undefined}
            disabled={disabled}>
            {busy === 'fill' || busy === 'regenerate'
              ? <span className="spinner" aria-hidden="true" />
              : canContinue ? <MemoryIcon size={17} /> : mode === 'ai' ? <SparklesIcon size={17} /> : <WandIcon size={17} />}
            {busy === 'fill' || busy === 'regenerate' ? 'Filling…' : canContinue ? 'Fill same values' : mode === 'ai' ? 'Fill with AI' : 'Fill form'}
          </Button>

          <div className="secondary-actions">
            <Button variant="ghost" size="sm" className="link" onClick={() => fill(true)} disabled={disabled}>
              <RefreshIcon size={13} />
              {canContinue ? (mode === 'ai' ? 'New AI values' : 'New values') : 'Generate again'}
            </Button>
            <span className="divider" aria-hidden="true" />
            <Button variant="ghost" size="sm" className="link" onClick={undo} disabled={actionDisabled || !canUndo}>
              <UndoIcon size={13} />
              Undo
            </Button>
          </div>

          {scan && <FieldList fields={scan.fields} scoped={Boolean(scan.scope)} />}
        </section>

      <Status status={status} action={statusAction} />

      {scanning && <div className="scan-state" role="status"><span className="spinner" aria-hidden="true" />Scanning this page…</div>}
      {scanFailed && <Status status={{ tone: 'warning', message: 'Could not read this page. Refresh the website and try again.' }} action={{ label: 'Retry', onClick: () => rescan() }} />}

      {shortcut.length > 0 && (
        <footer className="footer">
          <span className="shortcut" title="Keyboard shortcut">
            {shortcut.map(key => <kbd key={key}>{key}</kbd>)}
          </span>
        </footer>
      )}
    </main>
  )
}

export default Popup
