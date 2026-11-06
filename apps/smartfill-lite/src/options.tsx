// ** import core packages
import { useEffect, useRef, useState } from "react"

// ** import types
import type { LLMProvider, ProviderGroup } from "@/api/ai/constants"
import type { Settings } from "@/lib/settings"
import type { StatusState } from "@/components/Status"
import type { EmailMode, IdentityPrefs } from "@/lib/mock"
import type { SavedForm, SavedValue } from "@/lib/memory"

// ** import lib
import { activeBaseUrl, activeModel, getSettings, resetSettings, resolveVoice, saveSettings, voiceKey } from "@/lib/settings"
import { INBOX_PROVIDERS, PROFILES, REGIONS, parseEmails } from "@/lib/mock"
import { IDLE, Status, errorText } from "@/components/Status"
import { useSpeech } from "@/components/useSpeech"
import { Badge, Button, SelectPicker } from "@/components/ui"
import { ChevronIcon, ExternalIcon, MicIcon, PencilIcon, PinIcon, RefreshIcon, TrashIcon } from "@/components/icons"
import { clearSavedForms, deleteSavedForm, editSavedValue, isEditableField, isPinned, listSavedForms, setValuePinned, updateSavedForm } from "@/lib/memory"

// ** import constants
import { PROVIDERS, PROVIDER_GROUP_LABELS, PROVIDER_IDS } from "@/api/ai/constants"
import { VOICE_PROVIDERS, VOICE_PROVIDER_IDS } from "@/api/voice/constants"
import { MESSAGE_ACTIONS } from "@/lib/utils/messaging/types"

// ** import styles
import "@/styles/theme.css"
import "@/styles/options.css"

// ** import assets
import iconUrl from "data-base64:~assets/icon.png"

const GROUPS: ProviderGroup[] = ['popular', 'more', 'local']

/** Model lists are cached per provider so reopening settings is instant. */
const modelCache = new Map<string, string[]>()

function ProviderCard({ settings, update }: { settings: Settings, update: (patch: Partial<Settings>) => void }) {
  const provider = settings.provider
  const config = PROVIDERS[provider]
  const apiKey = settings.apiKeys[provider] ?? ''
  const model = settings.models[provider] ?? ''
  const baseUrl = settings.baseUrls[provider] ?? ''
  const [showKey, setShowKey] = useState(false)
  const [models, setModels] = useState<string[]>(config.models)
  const [fetching, setFetching] = useState(false)
  const [status, setStatus] = useState<StatusState>(IDLE)
  const [testing, setTesting] = useState(false)
  const request = useRef(0)

  const canFetch = !config.requiresApiKey || apiKey.trim().length > 8

  async function fetchModels(silent = false) {
    if (!canFetch) return
    const id = ++request.current
    const cacheKey = `${provider}|${activeBaseUrl(settings)}|${apiKey.slice(-6)}`
    if (silent && modelCache.has(cacheKey)) {
      setModels(modelCache.get(cacheKey)!)
      return
    }
    setFetching(true)
    if (!silent) setStatus({ tone: 'loading', message: `Fetching ${config.name} models…` })
    try {
      const res = await chrome.runtime.sendMessage({
        action: MESSAGE_ACTIONS.AI.MODELS,
        provider,
        apiKey,
        baseUrl: activeBaseUrl(settings)
      })
      if (id !== request.current) return
      if (!res?.success) throw new Error(res?.error || 'Could not load models.')
      const list: string[] = res.models.length ? res.models : config.models
      modelCache.set(cacheKey, list)
      setModels(list)
      setStatus(silent ? IDLE : { tone: 'success', message: `${list.length} models available.` })
    } catch (error) {
      if (id !== request.current) return
      setModels(config.models)
      if (!silent) setStatus({ tone: 'error', message: errorText(error) })
    } finally {
      if (id === request.current) setFetching(false)
    }
  }

  // Auto-fetch the live list once a key is entered or the provider changes.
  useEffect(() => {
    setModels(config.models)
    setStatus(IDLE)
    const timer = setTimeout(() => fetchModels(true), 600)
    return () => clearTimeout(timer)
  }, [provider, apiKey, baseUrl])

  async function testConnection() {
    setTesting(true)
    setStatus({ tone: 'loading', message: `Testing ${config.name}…` })
    try {
      const res = await chrome.runtime.sendMessage({
        action: MESSAGE_ACTIONS.AI.TEST,
        provider,
        apiKey,
        model: activeModel(settings),
        baseUrl: activeBaseUrl(settings)
      })
      if (!res?.success) throw new Error(res?.error || 'Connection failed.')
      setStatus({ tone: 'success', message: res.message })
    } catch (error) {
      setStatus({ tone: 'error', message: errorText(error) })
    } finally {
      setTesting(false)
    }
  }

  const setFor = <K extends 'apiKeys' | 'models' | 'baseUrls'>(key: K, value: string) =>
    update({ [key]: { ...settings[key], [provider]: value } } as Partial<Settings>)

  return (
    <section className="card">
      <div className="card-head">
        <h2>AI provider</h2>
        <p>Used by <strong>AI fill</strong>. Mock data works without any key.</p>
      </div>

      <div>
        <span className="field-label">Provider</span>
        <SelectPicker aria-label="AI provider" value={provider}
          onChange={value => update({ provider: value as LLMProvider })}
          searchable
          options={GROUPS.flatMap(group => PROVIDER_IDS.filter(id => PROVIDERS[id].group === group).map(id => ({
            value: id, label: PROVIDERS[id].name, group: PROVIDER_GROUP_LABELS[group],
            description: PROVIDERS[id].requiresApiKey ? 'API key required' : 'Local or custom endpoint'
          })))} />
      </div>

      {(config.requiresApiKey || provider === 'custom') && (
        <label>
          <span className="field-label">
            API key{!config.requiresApiKey && ' (optional)'}
            {config.keyUrl && (
              <a href={config.keyUrl} target="_blank" rel="noreferrer">
                Get a key <ExternalIcon size={11} />
              </a>
            )}
          </span>
          <div className="row">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={e => setFor('apiKeys', e.target.value.trim())}
              placeholder={config.keyHint ? `${config.keyHint}` : 'Paste your API key'}
              autoComplete="off"
              spellCheck={false}
            />
            <button type="button" onClick={() => setShowKey(!showKey)}>{showKey ? 'Hide' : 'Show'}</button>
          </div>
        </label>
      )}

      {config.editableBaseUrl && (
        <label>
          <span className="field-label">Base URL {provider === 'custom' ? '(OpenAI-compatible, ends in /v1)' : ''}</span>
          <input
            type="url"
            value={baseUrl}
            onChange={e => setFor('baseUrls', e.target.value)}
            placeholder={config.baseUrl || 'https://your-gateway.example.com/v1'}
            spellCheck={false}
          />
        </label>
      )}

      <div>
        <span className="field-label">
          Model
          <span className="label-meta">{models.length > 0 ? `${models.length} available · or type any model ID` : 'Type a model ID'}</span>
        </span>
        <div className="row">
          <SelectPicker className="model-picker" aria-label="AI model" value={model || activeModel(settings)}
            onChange={value => setFor('models', value)} searchable allowCustom
            placeholder="Select or enter a model ID"
            options={[...new Set([config.defaultModel, ...models].filter(Boolean))].map(value => ({
              value, label: value, description: value === config.defaultModel ? 'Default model' : undefined
            }))} />
          <button type="button" onClick={() => fetchModels(false)} disabled={fetching || !canFetch} title="Fetch models from the provider">
            {fetching ? <span className="spinner" aria-hidden="true" /> : <RefreshIcon size={13} />}
            Fetch
          </button>
        </div>
      </div>

      <div className="row">
        <button type="button" className="primary" onClick={testConnection} disabled={testing || !canFetch}>
          Test connection
        </button>
      </div>
      <Status status={status} />
    </section>
  )
}

const EMAIL_MODES: Array<{ id: EmailMode, label: string }> = [
  { id: 'random', label: 'Random' },
  { id: 'mine', label: 'My emails' },
  { id: 'inbox', label: 'Temp inbox' }
]

function IdentityCard({ settings, update }: { settings: Settings, update: (patch: Partial<Settings>) => void }) {
  const identity = settings.identity
  const [showPassword, setShowPassword] = useState(false)
  const [emailText, setEmailText] = useState(identity.emails.join('\n'))
  const set = (patch: Partial<IdentityPrefs>) => update({ identity: { ...identity, ...patch } })

  const first = identity.emails[0]
  const aliasExample = first ? `${first.split('@')[0].split('+')[0]}+k3x9a@${first.split('@')[1]}` : 'you+k3x9a@gmail.com'

  return (
    <section className="card">
      <div className="card-head">
        <h2>Login details</h2>
        <p>Reuse the same password and emails you test with. Applies to both Mock and AI fill.</p>
      </div>

      <label>
        <span className="field-label">Password</span>
        <div className="row">
          <input
            type={showPassword ? 'text' : 'password'}
            value={identity.password}
            onChange={e => set({ password: e.target.value })}
            placeholder="Empty = a new strong password every fill"
            autoComplete="new-password"
            spellCheck={false}
          />
          <button type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Hide' : 'Show'}</button>
        </div>
      </label>

      <div>
        <span className="field-label">Email</span>
        <div className="segmented" role="radiogroup" aria-label="Email source">
          {EMAIL_MODES.map(mode => (
            <button
              key={mode.id}
              type="button"
              role="radio"
              aria-checked={identity.emailMode === mode.id}
              tabIndex={identity.emailMode === mode.id ? 0 : -1}
              className={identity.emailMode === mode.id ? 'active' : undefined}
              onKeyDown={event => {
                const index = EMAIL_MODES.findIndex(item => item.id === mode.id)
                const next = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? (index + 1) % EMAIL_MODES.length
                  : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? (index + EMAIL_MODES.length - 1) % EMAIL_MODES.length
                  : event.key === 'Home' ? 0 : event.key === 'End' ? EMAIL_MODES.length - 1 : undefined
                if (next === undefined) return
                event.preventDefault()
                set({ emailMode: EMAIL_MODES[next].id })
                ;(event.currentTarget.parentElement?.children[next] as HTMLButtonElement | undefined)?.focus()
              }}
              onClick={() => set({ emailMode: mode.id })}>
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {identity.emailMode === 'random' && (
        <p className="hint">A realistic address on <code>example.com</code> that matches the generated name. Nothing is delivered.</p>
      )}

      {identity.emailMode === 'mine' && (
        <>
          <label>
            <span className="field-label">Your emails <span className="label-meta">one per line · picked at random</span></span>
            <textarea
              rows={3}
              value={emailText}
              onChange={e => setEmailText(e.target.value)}
              onBlur={() => {
                const emails = parseEmails(emailText)
                setEmailText(emails.join('\n'))
                set({ emails })
              }}
              placeholder={'jackson@gmail.com\nqa.team@company.com'}
              spellCheck={false}
            />
          </label>
          <label className="toggle">
            <input type="checkbox" checked={identity.emailAlias} onChange={e => set({ emailAlias: e.target.checked })} />
            <span className="toggle-copy">
              Add a random +alias
              <small>{identity.emailAlias ? `Each fill becomes e.g. ${aliasExample}. Gmail, Outlook and most providers still deliver it to you.` : 'Off: the same address is used every time.'}</small>
            </span>
          </label>
        </>
      )}

      {identity.emailMode === 'inbox' && (
        <div>
          <span className="field-label">Disposable inbox</span>
          <SelectPicker aria-label="Disposable inbox provider" value={identity.inboxDomain}
            onChange={value => set({ inboxDomain: value })}
            options={INBOX_PROVIDERS.map(p => ({ value: p.domain, label: p.name, description: `@${p.domain}` }))} />
          <p className="hint">A fresh public mailbox per fill, e.g. <code>maya.patel.k3x9@{identity.inboxDomain}</code>. After filling, use <strong>Open inbox</strong> in the popup to read the verification email. Anyone can read these inboxes, so use them only for test accounts.</p>
        </div>
      )}
    </section>
  )
}

function VoiceCard({ settings, update, highlight }: { settings: Settings, update: (patch: Partial<Settings>) => void, highlight: boolean }) {
  const voice = settings.voice
  const choice = voice.provider
  const service = choice === 'auto' || choice === 'browser' ? undefined : choice
  const config = service ? VOICE_PROVIDERS[service] : undefined
  const [showKey, setShowKey] = useState(false)
  const [mic, setMic] = useState<StatusState>(IDLE)
  const plan = resolveVoice(settings)

  const setVoice = (patch: Partial<Settings['voice']>) => update({ voice: { ...voice, ...patch } })
  const setFor = (key: 'apiKeys' | 'models', value: string) => {
    if (service) setVoice({ [key]: { ...voice[key], [service]: value } })
  }

  async function allowMic() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(t => t.stop())
      setMic({ tone: 'success', message: 'Microphone enabled. The mic in the popup now works too.' })
    } catch {
      setMic({ tone: 'error', message: 'Microphone was blocked. Allow it from the address bar and try again.' })
    }
  }

  const sharedKey = service && !voice.apiKeys[service]?.trim() && config?.sharesKeyWith ? voiceKey(settings, service) : ''
  const autoNote = plan.target
    ? `Uses the browser’s free speech recognition, and ${VOICE_PROVIDERS[plan.target.provider].name} where it is unavailable (e.g. Brave).`
    : 'Uses the browser’s free speech recognition. Brave has none: pick a service below or add a Groq/OpenAI key under AI provider.'

  return (
    <section className={`card${highlight ? ' highlight' : ''}`} id="voice">
      <div className="card-head">
        <h2>Voice input</h2>
        <p>Dictate AI instructions with the mic. Pick a speech-to-text service if your browser has no built-in one.</p>
      </div>

      <div>
        <span className="field-label">Speech-to-text</span>
        <SelectPicker aria-label="Speech-to-text provider" value={choice}
          onChange={value => setVoice({ provider: value as Settings['voice']['provider'] })}
          options={[
            { value: 'auto', label: 'Automatic', description: 'Browser first, then a configured service', group: 'Browser' },
            { value: 'browser', label: 'Browser speech recognition', description: 'Use your browser’s built-in recognition', group: 'Browser' },
            ...VOICE_PROVIDER_IDS.map(id => ({ value: id, label: VOICE_PROVIDERS[id].name, group: 'Services' }))
          ]} />
        <p className="hint">{config ? config.note : choice === 'auto' ? autoNote : 'Chrome and Edge only. Brave and some other browsers do not support it.'}</p>
      </div>

      {service && config && (
        <>
          {service === 'custom' && (
            <label>
              <span className="field-label">Base URL <span className="label-meta">ends in /v1</span></span>
              <input
                type="url"
                value={voice.customBaseUrl}
                onChange={e => setVoice({ customBaseUrl: e.target.value })}
                placeholder="http://localhost:8000/v1"
                spellCheck={false}
              />
            </label>
          )}
          <label>
            <span className="field-label">
              API key{service === 'custom' && ' (optional)'}
              {config.keyUrl && (
                <a href={config.keyUrl} target="_blank" rel="noreferrer">
                  Get a key <ExternalIcon size={11} />
                </a>
              )}
            </span>
            <div className="row">
              <input
                type={showKey ? 'text' : 'password'}
                value={voice.apiKeys[service] ?? ''}
                onChange={e => setFor('apiKeys', e.target.value.trim())}
                placeholder={sharedKey ? `Using your ${PROVIDERS[config.sharesKeyWith!].name} key from AI provider` : config.keyHint || 'Paste your API key'}
                autoComplete="off"
                spellCheck={false}
              />
              <button type="button" onClick={() => setShowKey(!showKey)}>{showKey ? 'Hide' : 'Show'}</button>
            </div>
          </label>
          <div>
            <span className="field-label">Model <span className="label-meta">or type any model ID</span></span>
            <SelectPicker aria-label="Speech-to-text model" value={voice.models[service] || config.defaultModel}
              onChange={value => setFor('models', value)} searchable allowCustom
              options={[...new Set([config.defaultModel, ...config.models].filter(Boolean))].map(value => ({
                value, label: value, description: value === config.defaultModel ? 'Default model' : undefined
              }))} />
          </div>
        </>
      )}

      <div className="row">
        <button type="button" onClick={allowMic}><MicIcon size={14} /> Allow microphone</button>
        <span className="hint mic-hint">Needed once, then the popup mic works on every site.</span>
      </div>
      <Status status={mic} />
    </section>
  )
}

const KIND_LABELS: Record<string, string> = {
  text: 'Text', email: 'Email', tel: 'Phone', number: 'Number', date: 'Date', long: 'Long text',
  choice: 'Choice', radio: 'Option', check: 'Checkbox', password: 'Password', file: 'File'
}

/** "work email" -> "Work email" */
function displayLabel(label: string): string {
  return label ? label.charAt(0).toUpperCase() + label.slice(1) : 'Unnamed field'
}

function valueText(value: SavedValue | null | undefined): string {
  if (value === null || value === undefined) return ''
  return Array.isArray(value) ? value.join(', ') : String(value)
}

/** Text typed in the editor, back to the shape the field stored. */
function parseValue(text: string, previous: SavedValue | null | undefined): SavedValue | null {
  const trimmed = text.trim()
  if (!trimmed) return null
  if (Array.isArray(previous)) return trimmed.split(',').map(part => part.trim()).filter(Boolean)
  return text
}

function SavedValuesEditor({ form }: { form: SavedForm }) {
  const [status, setStatus] = useState<StatusState>(IDLE)
  const save = async (patch: Partial<SavedForm>) => {
    try {
      await updateSavedForm(form.id, patch)
      setStatus({ tone: 'success', message: 'Saved in this browser.' })
    } catch (error) {
      setStatus({ tone: 'error', message: `Could not save this change. Try again. ${errorText(error)}` })
    }
  }

  function commit(index: number, value: SavedValue | null) {
    const before = form.values?.[index] ?? null
    // Leaving a field without changing it is not an edit, so it does not pin.
    if (JSON.stringify(before) === JSON.stringify(value)) return
    save(editSavedValue(form, index, value))
  }

  return (
    <div className="saved-values" id={`saved-form-${form.id}`}>
      <label>
        <span className="field-label">Form name</span>
        <input
          type="text"
          key={`title:${form.title}`}
          defaultValue={form.title}
          onBlur={e => {
            const title = e.target.value.trim()
            if (title && title !== form.title) save({ title })
          }}
        />
      </label>
      <p className="hint">
        Edit a value and it is <strong>pinned</strong>: SmartFill uses it on every fill of this form, “New values” included,
        and never overwrites it. Clear a value to let SmartFill generate it again.
      </p>
      <ul className="saved-value-list">
        {form.fields.map((field, index) => {
          const value = form.values?.[index]
          const pinned = isPinned(form, index)
          const editable = isEditableField(field)
          const hasValue = value !== null && value !== undefined
          const id = `sv-${form.id}-${index}`
          return (
            <li key={index} className={pinned ? 'pinned' : undefined}>
              <label htmlFor={id} className="saved-value-label">
                <span title={field.label}>{displayLabel(field.label)}</span>
                <small>{KIND_LABELS[field.kind] || field.kind}{pinned ? ' · Pinned' : ''}</small>
              </label>
              <div className="saved-value-input">
                {!editable ? (
                  <span className="hint">Never stored</span>
                ) : field.kind === 'check' ? (
                  <label className="saved-value-check">
                    <input id={id} type="checkbox" checked={value === true} onChange={e => commit(index, e.target.checked)} />
                    {hasValue ? (value === true ? 'Checked' : 'Unchecked') : 'Not saved yet'}
                  </label>
                ) : field.kind === 'long' ? (
                  <textarea
                    id={id}
                    rows={2}
                    key={`${index}:${valueText(value)}`}
                    defaultValue={valueText(value)}
                    placeholder="Generated on fill"
                    onBlur={e => commit(index, parseValue(e.target.value, value))}
                  />
                ) : (
                  <input
                    id={id}
                    type="text"
                    key={`${index}:${valueText(value)}`}
                    defaultValue={valueText(value)}
                    placeholder={Array.isArray(value) ? 'Comma-separated' : 'Generated on fill'}
                    spellCheck={false}
                    onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                    onBlur={e => commit(index, parseValue(e.target.value, value))}
                  />
                )}
              </div>
              {editable ? (
                <button
                  type="button"
                  className={`small-icon pin${pinned ? ' on' : ''}`}
                  disabled={!hasValue}
                  aria-pressed={pinned}
                  title={pinned ? 'Pinned: used on every fill. Click to let fills change it.' : 'Pin: use this value on every fill'}
                  aria-label={`${pinned ? 'Unpin' : 'Pin'} ${displayLabel(field.label)}`}
                  onClick={() => save(setValuePinned(form, index, !pinned))}>
                  <PinIcon size={13} />
                </button>
              ) : <span />}
            </li>
          )
        })}
      </ul>
      <Status status={status} />
    </div>
  )
}

function SavedFormsCard({ settings, update }: { settings: Settings, update: (patch: Partial<Settings>) => void }) {
  const [forms, setForms] = useState<SavedForm[]>()
  const [open, setOpen] = useState<string>()
  const [status, setStatus] = useState<StatusState>(IDLE)

  useEffect(() => {
    // Newest first by creation, so a form does not jump while its values are edited.
    const load = () => listSavedForms()
      .then(list => setForms([...list].sort((a, b) => b.createdAt - a.createdAt)))
      .catch(error => setStatus({ tone: 'error', message: `Could not load saved forms. ${errorText(error)}` }))
    load()
    // The page saves forms while this tab is open.
    const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && changes.formMemory) load()
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [])

  async function remove(form: SavedForm) {
    if (!confirm(`Forget “${form.title}” and its saved values?`)) return
    try {
      await deleteSavedForm(form.id)
      setForms(current => current?.filter(f => f.id !== form.id))
      setStatus({ tone: 'success', message: 'Saved form removed.' })
    } catch (error) {
      setStatus({ tone: 'error', message: `Could not remove this form. ${errorText(error)}` })
    }
  }

  async function clearAll() {
    if (!confirm('Forget every saved form area?')) return
    try {
      await clearSavedForms()
      setForms([])
      setStatus({ tone: 'success', message: 'All saved forms removed.' })
    } catch (error) {
      setStatus({ tone: 'error', message: `Could not remove saved forms. ${errorText(error)}` })
    }
  }

  return (
    <section className="card">
      <div className="card-head">
        <h2>Saved forms</h2>
        <p>Pick an area from the popup. SmartFill recognizes it on your next visit and fills those fields.</p>
      </div>
      <label className="toggle">
        <input type="checkbox" checked={settings.rememberForms} onChange={e => update({ rememberForms: e.target.checked })} />
        <span className="toggle-copy">
          Remember picked form areas
          <small>Stores field labels, and the last filled values except passwords, card numbers and IDs, in this browser only.</small>
        </span>
      </label>
      {forms && forms.length > 0 && (
        <ul className="saved-forms">
          {forms.map(form => {
            const expanded = open === form.id
            const stored = form.values?.filter(v => v !== null && v !== undefined).length || 0
            const pinned = form.pinned?.filter(Boolean).length || 0
            return (
              <li key={form.id}>
                <div className="saved-form-row">
                  <button
                    type="button"
                    className="saved-form-toggle"
                    aria-expanded={expanded}
                    aria-controls={expanded ? `saved-form-${form.id}` : undefined}
                    title="Edit saved values"
                    onClick={() => setOpen(expanded ? undefined : form.id)}>
                    <ChevronIcon size={13} className="chevron" />
                    <span className="saved-form-info">
                      <span className="saved-form-title" title={form.title}>{form.title}</span>
                      <span className="saved-form-host" title={`${form.host}${form.path}`}>{form.host}{form.path !== '/' ? form.path : ''}</span>
                      <span className="saved-form-meta">
                        {form.fields.length} field{form.fields.length === 1 ? '' : 's'}
                        {stored > 0 ? ` · ${stored} saved` : ''}{pinned > 0 ? ` · ${pinned} pinned` : ''}
                        {form.fillCount > 0 ? ` · filled ${form.fillCount}×` : ''} · {new Date(form.updatedAt).toLocaleDateString()}
                      </span>
                    </span>
                    <PencilIcon size={13} className="edit-hint" />
                  </button>
                  <button type="button" className="small-icon" title="Forget" aria-label={`Forget ${form.title}`} onClick={() => remove(form)}>
                    <TrashIcon size={13} />
                  </button>
                </div>
                {expanded && <SavedValuesEditor form={form} />}
              </li>
            )
          })}
        </ul>
      )}
      {!forms && status.tone !== 'error' && <Status status={{ tone: 'loading', message: 'Loading saved forms…' }} />}
      {forms && forms.length === 0 && <div className="note"><strong>No saved forms yet</strong><p className="hint">Open SmartFill on a page with a form and choose “Select form area”. It will appear here after you save the area.</p></div>}
      {forms && forms.length > 1 && (
        <div className="row">
          <Button variant="danger" onClick={clearAll}>Forget all forms</Button>
        </div>
      )}
      <Status status={status} />
    </section>
  )
}

const SETTINGS_PAGES = [
  { id: 'general', label: 'General', description: 'Set your defaults for everyday form filling.' },
  { id: 'ai', label: 'AI configuration', description: 'Connect a provider and give AI the context it needs.' },
  { id: 'voice', label: 'Voice input', description: 'Choose how SmartFill transcribes your instructions.' },
  { id: 'forms', label: 'Saved forms', description: 'Manage remembered areas and the values you reuse.' },
  { id: 'about', label: 'Privacy & about', description: 'Your data, keyboard shortcut and extension details.' }
] as const
type SettingsPage = typeof SETTINGS_PAGES[number]['id']

function pageFromHash(): SettingsPage {
  const hash = location.hash.slice(1)
  if (hash === 'mic') return 'voice'
  return SETTINGS_PAGES.find(page => page.id === hash)?.id || 'general'
}

function Options() {
  const [settings, setSettings] = useState<Settings>()
  const [saved, setSaved] = useState(false)
  const [page, setPage] = useState<SettingsPage>(pageFromHash)
  const [storageStatus, setStorageStatus] = useState<StatusState>(IDLE)
  const savedTimer = useRef<number>()

  const speech = useSpeech(text => {
    if (!settings) return
    update({ instructions: [settings.instructions.trim(), text].filter(Boolean).join(' ') })
  }, settings ? resolveVoice(settings) : undefined)

  useEffect(() => {
    getSettings().then(setSettings).catch(error => setStorageStatus({ tone: 'error', message: `Could not load settings. ${errorText(error)}` }))
    const onHash = () => {
      setPage(pageFromHash())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onHash)
    return () => {
      window.removeEventListener('hashchange', onHash)
      window.clearTimeout(savedTimer.current)
    }
  }, [])

  function persist(patch: Partial<Settings>) {
    setSaved(false)
    setStorageStatus(IDLE)
    return saveSettings(patch).then(() => {
      setSaved(true)
      window.clearTimeout(savedTimer.current)
      savedTimer.current = window.setTimeout(() => setSaved(false), 2400)
    }).catch(error => {
      setSaved(false)
      setStorageStatus({ tone: 'error', message: `Changes could not be saved. Try editing the setting again. ${errorText(error)}` })
    })
  }

  function update(patch: Partial<Settings>) {
    setSettings(current => (current ? { ...current, ...patch } : current))
    void persist(patch)
  }

  async function reset() {
    if (!confirm('Reset all SmartFill settings and remove saved API keys?')) return
    try {
      setSettings(await resetSettings())
      setStorageStatus({ tone: 'success', message: 'Settings reset. Saved form areas are unchanged.' })
    } catch (error) {
      setStorageStatus({ tone: 'error', message: `Could not reset settings. ${errorText(error)}` })
    }
  }

  if (!settings) return <div className="settings-loading"><Status status={storageStatus.tone === 'idle' ? { tone: 'loading', message: 'Loading settings…' } : storageStatus} /></div>

  const version = chrome.runtime.getManifest().version
  const currentPage = SETTINGS_PAGES.find(item => item.id === page)!

  return (
    <div className="settings-shell">
      <aside className="settings-sidebar">
        <span className="nav-label">Preferences</span>
        <nav aria-label="Settings sections">
          {SETTINGS_PAGES.map(item => (
            <a key={item.id} href={`#${item.id}`} aria-current={page === item.id ? 'page' : undefined}>
              {item.label}
            </a>
          ))}
        </nav>
        <p className="sidebar-note">Preferences stay in this browser.</p>
      </aside>
      <div className="settings-main">
        <header className="page-heading">
          <div><h1>{currentPage.label}</h1><p>{currentPage.description}</p></div>
          <span className="save-indicator" role="status">{saved ? 'Changes saved' : 'Saves automatically'}</span>
        </header>
        <Status status={storageStatus} />
        <div className="settings" hidden={page !== 'ai'}>

      <ProviderCard settings={settings} update={update} />
      <section className="card">
        <div className="card-head">
          <h2>Instructions</h2>
          <p>Give AI context to use on every fill. You can also edit this in the popup.</p>
        </div>
        <label className="textarea-wrap">
          <span className="field-label">Your instructions</span>
          <textarea rows={5} value={settings.instructions}
            onChange={e => setSettings({ ...settings, instructions: e.target.value })}
            onBlur={e => update({ instructions: e.target.value })}
            placeholder={'e.g. Use a senior QA engineer at Acme in Chennai.\nUse @acme.test email addresses.'} />
          {speech.supported && <button type="button"
            className={`mic-button${speech.listening ? ' listening' : ''}${speech.transcribing ? ' busy' : ''}`}
            onClick={speech.toggle} aria-label={speech.listening ? 'Stop dictation' : 'Dictate instructions'}
            title={speech.listening ? 'Stop dictation' : 'Dictate instructions'}><MicIcon size={16} /></button>}
        </label>
        {speech.transcribing && <Status status={{ tone: 'loading', message: 'Transcribing…' }} />}
        {speech.message && <Status status={{ tone: 'warning', message: speech.error === 'not-allowed' ? `${speech.message} Enable your microphone in Voice input.` : speech.message }} />}
      </section>
        </div>
        <div className="settings" hidden={page !== 'general'}>

      <section className="card">
        <div className="card-head">
          <h2>Mock data</h2>
          <p>Realistic, clearly fictional values generated on your device — no network.</p>
        </div>
        <div className="grid-2">
          <div>
            <span className="field-label">Industry profile</span>
            <SelectPicker aria-label="Default industry profile" value={settings.profile}
              onChange={value => update({ profile: value as Settings['profile'] })} searchable
              options={[{ value: 'auto', label: 'Auto-detect from page' }, ...PROFILES.map(p => ({ value: p.id, label: p.name }))]} />
          </div>
          <div>
            <span className="field-label">Region & formats</span>
            <SelectPicker aria-label="Default region and formats" value={settings.region}
              onChange={value => update({ region: value as Settings['region'] })}
              options={[{ value: 'auto', label: 'Auto-detect' }, ...Object.values(REGIONS).map(r => ({ value: r.id, label: r.label }))]} />
          </div>
        </div>
      </section>

      <IdentityCard settings={settings} update={update} />

      <section className="card">
        <div className="card-head">
          <h2>Filling</h2>
        </div>
        <label className="toggle">
          <input type="checkbox" checked={settings.keepExisting} onChange={e => update({ keepExisting: e.target.checked })} />
          <span className="toggle-copy">
            Keep values already on the page
            <small>Only fill empty fields. Values SmartFill wrote can still be regenerated.</small>
          </span>
        </label>
        <label className="toggle">
          <input type="checkbox" checked={settings.safeFillingMode} onChange={e => update({ safeFillingMode: e.target.checked })} />
          <span className="toggle-copy">
            Safe Filling Mode
            <small>Leave passwords, IDs and card fields blank unless your instructions provide them, and leave consent boxes unchecked.</small>
          </span>
        </label>
        <p className="note">
          Shortcut: press <kbd>Alt</kbd> <kbd>Shift</kbd> <kbd>F</kbd> on any page to fill with your current mode.{' '}
          <button type="button" className="inline-link" onClick={() => chrome.tabs.create({ url: 'chrome://extensions/shortcuts' })}>
            Change shortcut
          </button>
        </p>
      </section>
        </div>
        <div className="settings" hidden={page !== 'voice'}><VoiceCard settings={settings} update={update} highlight={false} /></div>
        <div className="settings" hidden={page !== 'forms'}>
      <SavedFormsCard settings={settings} update={update} />
        </div>
        <div className="settings" hidden={page !== 'about'}>
          <section className="card">
            <div className="card-head"><h2>Your data stays yours</h2><p>SmartFill stores your preferences in this browser profile.</p></div>
            <dl className="privacy-list">
              <div><dt>Settings & API keys</dt><dd>Stored locally in extension storage. Never synced to your browser account.</dd></div>
              <div><dt>Mock data</dt><dd>Generated on your device and works offline.</dd></div>
              <div><dt>AI fill</dt><dd>Field labels, options and your instructions go directly to your chosen provider. Values already typed on the page are not sent.</dd></div>
              <div><dt>Voice input</dt><dd>Service-based voice clips go to your selected transcription provider. Browser speech recognition is managed by your browser.</dd></div>
              <div><dt>Saved forms</dt><dd>Saved in this browser. Passwords, card numbers and IDs are never remembered.</dd></div>
            </dl>
          </section>
          <section className="card">
            <div className="card-head"><h2>SmartFill <Badge>v{version}</Badge></h2><p>AI form filling and realistic test data.</p></div>
            <div className="setting-action-row"><span>Fill the current page</span><span><kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>F</kbd></span></div>
            <div><Button onClick={() => chrome.tabs.create({ url: 'chrome://extensions/shortcuts' })}>Change keyboard shortcut</Button></div>
          </section>
          <section className="card reset-section">
            <div className="card-head"><h2>Reset preferences</h2><p>Restore defaults and remove saved API keys. Saved form areas are kept.</p></div>
            <div><Button variant="danger" onClick={reset}>Reset settings</Button></div>
          </section>
        </div>
      </div>
    </div>
  )
}

function OptionsPage() {
  useEffect(() => { document.title = 'SmartFill Settings' }, [])
  return (
    <main className="options">
      <header className="brand">
        <img src={iconUrl} alt="" width={32} height={32} />
        <div>
          <span className="brand-name">SmartFill</span>
          <p>Settings</p>
        </div>
      </header>
      <Options />
    </main>
  )
}

export default OptionsPage
