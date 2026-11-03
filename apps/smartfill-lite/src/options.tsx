// ** import core packages
import { useEffect, useRef, useState } from "react"

// ** import types
import type { LLMProvider, ProviderGroup } from "@/api/ai/constants"
import type { Settings } from "@/lib/settings"
import type { StatusState } from "@/components/Status"
import type { EmailMode, IdentityPrefs } from "@/lib/mock"
import type { SavedForm } from "@/lib/memory"

// ** import lib
import { activeBaseUrl, activeModel, getSettings, resetSettings, resolveVoice, saveSettings, voiceKey } from "@/lib/settings"
import { INBOX_PROVIDERS, PROFILES, REGIONS, parseEmails } from "@/lib/mock"
import { IDLE, Status, errorText } from "@/components/Status"
import { useSpeech } from "@/components/useSpeech"
import { ExternalIcon, MicIcon, RefreshIcon, TrashIcon } from "@/components/icons"
import { clearSavedForms, deleteSavedForm, listSavedForms } from "@/lib/memory"

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

      <label>
        <span className="field-label">Provider</span>
        <select value={provider} onChange={e => update({ provider: e.target.value as LLMProvider })}>
          {GROUPS.map(group => (
            <optgroup key={group} label={PROVIDER_GROUP_LABELS[group]}>
              {PROVIDER_IDS.filter(id => PROVIDERS[id].group === group).map(id => (
                <option key={id} value={id}>{PROVIDERS[id].name}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>

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

      <label>
        <span className="field-label">
          Model
          <span className="label-meta">{models.length > 0 ? `${models.length} available · or type any model ID` : 'Type a model ID'}</span>
        </span>
        <div className="row">
          <input
            type="text"
            list="model-options"
            value={model}
            onChange={e => setFor('models', e.target.value)}
            placeholder={config.defaultModel ? `${config.defaultModel} (default)` : 'e.g. llama3.2'}
            spellCheck={false}
          />
          <datalist id="model-options">
            {models.map(m => <option key={m} value={m} />)}
          </datalist>
          <button type="button" onClick={() => fetchModels(false)} disabled={fetching || !canFetch} title="Fetch models from the provider">
            {fetching ? <span className="spinner" aria-hidden="true" /> : <RefreshIcon size={13} />}
            Fetch
          </button>
        </div>
      </label>

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
              className={identity.emailMode === mode.id ? 'active' : undefined}
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
        <label>
          <span className="field-label">Disposable inbox</span>
          <select value={identity.inboxDomain} onChange={e => set({ inboxDomain: e.target.value })}>
            {INBOX_PROVIDERS.map(p => <option key={p.domain} value={p.domain}>{p.name} · @{p.domain}</option>)}
          </select>
          <p className="hint">A fresh public mailbox per fill, e.g. <code>maya.patel.k3x9@{identity.inboxDomain}</code>. After filling, use <strong>Open inbox</strong> in the popup to read the verification email. Anyone can read these inboxes, so use them only for test accounts.</p>
        </label>
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

      <label>
        <span className="field-label">Speech-to-text</span>
        <select value={choice} onChange={e => setVoice({ provider: e.target.value as Settings['voice']['provider'] })}>
          <option value="auto">Auto · browser, then a service you have a key for</option>
          <option value="browser">Browser only · free, audio never leaves Chrome</option>
          <optgroup label="Services">
            {VOICE_PROVIDER_IDS.map(id => <option key={id} value={id}>{VOICE_PROVIDERS[id].name}</option>)}
          </optgroup>
        </select>
        <p className="hint">{config ? config.note : choice === 'auto' ? autoNote : 'Chrome and Edge only. Brave and some other browsers do not support it.'}</p>
      </label>

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
          <label>
            <span className="field-label">Model <span className="label-meta">or type any model ID</span></span>
            <input
              type="text"
              list="voice-models"
              value={voice.models[service] ?? ''}
              onChange={e => setFor('models', e.target.value)}
              placeholder={`${config.defaultModel} (default)`}
              spellCheck={false}
            />
            <datalist id="voice-models">
              {config.models.map(m => <option key={m} value={m} />)}
            </datalist>
          </label>
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

function SavedFormsCard({ settings, update }: { settings: Settings, update: (patch: Partial<Settings>) => void }) {
  const [forms, setForms] = useState<SavedForm[]>()

  useEffect(() => {
    const load = () => listSavedForms().then(list => setForms([...list].sort((a, b) => b.updatedAt - a.updatedAt)))
    load()
    // The page saves forms while this tab is open.
    const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && changes.formMemory) load()
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [])

  async function remove(id: string) {
    await deleteSavedForm(id)
    setForms(current => current?.filter(f => f.id !== id))
  }

  async function clearAll() {
    if (!confirm('Forget every saved form area?')) return
    await clearSavedForms()
    setForms([])
  }

  return (
    <section className="card">
      <div className="card-head">
        <h2>Saved forms</h2>
        <p>Pick a form area once from the popup. Next visit SmartFill recognizes it (85% or closer match) and fills only those fields.</p>
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
          {forms.map(form => (
            <li key={form.id}>
              <div className="saved-form-info">
                <div className="saved-form-title" title={form.title}>{form.title}</div>
                <div className="saved-form-meta">
                  {form.host}{form.path !== '/' ? form.path : ''} · {form.fields.length} field{form.fields.length === 1 ? '' : 's'}
                  {form.fillCount > 0 ? ` · filled ${form.fillCount}×` : ''} · {new Date(form.updatedAt).toLocaleDateString()}
                </div>
              </div>
              <button type="button" className="small-icon" title="Forget" aria-label={`Forget ${form.title}`} onClick={() => remove(form.id)}>
                <TrashIcon size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {forms && forms.length === 0 && <p className="hint">No saved forms yet. Use “Select form area” in the popup.</p>}
      {forms && forms.length > 1 && (
        <div className="row">
          <button type="button" onClick={clearAll}>Forget all</button>
        </div>
      )}
    </section>
  )
}

function Options() {
  const [settings, setSettings] = useState<Settings>()
  const [saved, setSaved] = useState(false)
  const savedTimer = useRef<number>()
  const focusVoice = location.hash === '#mic' || location.hash === '#voice'

  const speech = useSpeech(text => {
    setSettings(current => {
      if (!current) return current
      const instructions = [current.instructions.trim(), text].filter(Boolean).join(' ')
      saveSettings({ instructions })
      return { ...current, instructions }
    })
  }, settings ? resolveVoice(settings) : undefined)

  useEffect(() => {
    getSettings().then(setSettings)
  }, [])

  function update(patch: Partial<Settings>) {
    setSettings(current => (current ? { ...current, ...patch } : current))
    saveSettings(patch).then(() => {
      setSaved(true)
      window.clearTimeout(savedTimer.current)
      savedTimer.current = window.setTimeout(() => setSaved(false), 1400)
    })
  }

  async function reset() {
    if (!confirm('Reset all SmartFill settings and remove saved API keys?')) return
    setSettings(await resetSettings())
  }

  if (!settings) return <p className="loading">Loading settings…</p>

  const version = chrome.runtime.getManifest().version

  return (
    <div className="settings">
      {focusVoice && <VoiceCard settings={settings} update={update} highlight />}

      <ProviderCard settings={settings} update={update} />

      <section className="card">
        <div className="card-head">
          <h2>Mock data</h2>
          <p>Realistic, clearly fictional values generated on your device — no network.</p>
        </div>
        <div className="grid-2">
          <label>
            <span className="field-label">Industry profile</span>
            <select value={settings.profile} onChange={e => update({ profile: e.target.value as Settings['profile'] })}>
              <option value="auto">Auto-detect from page</option>
              {PROFILES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label>
            <span className="field-label">Region & formats</span>
            <select value={settings.region} onChange={e => update({ region: e.target.value as Settings['region'] })}>
              <option value="auto">Auto-detect</option>
              {Object.values(REGIONS).map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </label>
        </div>
      </section>

      <IdentityCard settings={settings} update={update} />

      <section className="card">
        <div className="card-head">
          <h2>AI instructions</h2>
          <p>Sent with every AI fill as trusted context. Also editable from the popup.</p>
        </div>
        <div className="textarea-wrap">
          <textarea
            rows={4}
            value={settings.instructions}
            onChange={e => setSettings({ ...settings, instructions: e.target.value })}
            onBlur={e => update({ instructions: e.target.value })}
            placeholder={'e.g. I am Priya Sharma, a senior QA engineer at Acme in Chennai.\nUse priya.sharma@acme.test for email fields.'}
          />
          {speech.supported && (
            <button
              type="button"
              className={`mic-button${speech.listening ? ' listening' : ''}${speech.transcribing ? ' busy' : ''}`}
              onClick={speech.toggle}
              aria-label={speech.listening ? 'Stop dictation' : 'Dictate instructions'}
              title={speech.listening ? 'Stop dictation' : 'Dictate instructions'}>
              <MicIcon size={14} />
            </button>
          )}
        </div>
        {speech.transcribing && <Status status={{ tone: 'loading', message: 'Transcribing…' }} />}
        {speech.message && <Status status={{ tone: 'warning', message: speech.error === 'not-allowed' ? `${speech.message} Use “Allow microphone” under Voice input.` : speech.message }} />}
      </section>

      {!focusVoice && <VoiceCard settings={settings} update={update} highlight={false} />}

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

      <SavedFormsCard settings={settings} update={update} />

      <p className="note">
        <strong>Privacy.</strong> Settings and API keys stay in this browser profile’s local extension storage and are never synced.
        Mock data is generated on your device. AI fill sends field labels, options and your instructions — never values
        already typed on the page — directly to the provider you choose. Voice clips go only to the speech-to-text service you pick.
      </p>

      <div className="row footer-row">
        <button type="button" onClick={reset}>Reset settings</button>
        <span className={`saved${saved ? ' on' : ''}`}>Saved</span>
        <span className="version">v{version}</span>
      </div>
    </div>
  )
}

function OptionsPage() {
  useEffect(() => { document.title = 'SmartFill Settings' }, [])
  return (
    <main className="options">
      <header className="brand">
        <img src={iconUrl} alt="" width={48} height={48} />
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
