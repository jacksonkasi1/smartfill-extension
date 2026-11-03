// ** import types
import type { LLMProvider } from '@/api/ai/constants'
import type { ProfileId } from '@/lib/mock/profiles'
import type { Region } from '@/lib/mock/regions'
import type { IdentityPrefs } from '@/lib/mock/identity'
import type { VoiceProviderId } from '@/api/voice/constants'
import type { VoiceTarget } from '@/api/voice/transcribe'

// ** import constants
import { DEFAULT_PROVIDER, PROVIDERS, isProvider } from '@/api/ai/constants'
import { DEFAULT_IDENTITY } from '@/lib/mock/identity'
import { VOICE_AUTO_ORDER, VOICE_PROVIDERS, VOICE_PROVIDER_IDS } from '@/api/voice/constants'

export type FillMode = 'mock' | 'ai'

export interface VoiceSettings {
  /** 'auto': browser speech, then the first service with a key. 'browser': never upload audio. */
  provider: VoiceProviderId | 'auto' | 'browser'
  apiKeys: Partial<Record<VoiceProviderId, string>>
  models: Partial<Record<VoiceProviderId, string>>
  /** Only for the custom OpenAI-compatible server. */
  customBaseUrl: string
}

export interface Settings {
  mode: FillMode
  /** 'auto' picks the industry profile from the page. */
  profile: ProfileId | 'auto'
  region: Region | 'auto'
  instructions: string
  provider: LLMProvider
  apiKeys: Partial<Record<LLMProvider, string>>
  models: Partial<Record<LLMProvider, string>>
  baseUrls: Partial<Record<LLMProvider, string>>
  /** Leave values the user already typed on the page untouched. */
  keepExisting: boolean
  /** Default OFF — see parser.ts for what the protection layer does. */
  safeFillingMode: boolean
  /** Save picked form areas and recognize them on later visits. */
  rememberForms: boolean
  /** Fixed password and email strategy used by both mock and AI fills. */
  identity: IdentityPrefs
  voice: VoiceSettings
}

export const DEFAULT_SETTINGS: Settings = {
  mode: 'mock',
  profile: 'auto',
  region: 'auto',
  instructions: '',
  provider: DEFAULT_PROVIDER,
  apiKeys: {},
  models: {},
  baseUrls: {},
  keepExisting: false,
  safeFillingMode: false,
  rememberForms: true,
  identity: DEFAULT_IDENTITY,
  voice: { provider: 'auto', apiKeys: {}, models: {}, customBaseUrl: '' }
}

const STORAGE_KEY = 'settings'

/**
 * API keys live in `chrome.storage.local` (never synced to the
 * Google account). Releases up to 1.0.3 kept everything in
 * `chrome.storage.sync`; those values are migrated once on first read.
 */
export async function getSettings(): Promise<Settings> {
  const stored = await chrome.storage.local.get(STORAGE_KEY)
  if (stored[STORAGE_KEY]) return withDefaults(stored[STORAGE_KEY])

  const migrated = await migrateLegacySettings()
  await chrome.storage.local.set({ [STORAGE_KEY]: migrated })
  return migrated
}

/** Fill in fields added after the settings were first saved. */
function withDefaults(stored: Partial<Settings>): Settings {
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    identity: { ...DEFAULT_IDENTITY, ...stored.identity },
    voice: { ...DEFAULT_SETTINGS.voice, ...stored.voice }
  }
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(await getSettings()), ...patch }
  await chrome.storage.local.set({ [STORAGE_KEY]: next })
  return next
}

export async function resetSettings(): Promise<Settings> {
  await chrome.storage.local.set({ [STORAGE_KEY]: DEFAULT_SETTINGS })
  return DEFAULT_SETTINGS
}

export function onSettingsChanged(callback: (settings: Settings) => void): () => void {
  const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area === 'local' && changes[STORAGE_KEY]?.newValue) {
      callback(withDefaults(changes[STORAGE_KEY].newValue))
    }
  }
  chrome.storage.onChanged.addListener(listener)
  return () => chrome.storage.onChanged.removeListener(listener)
}

// ---------------------------------------------------------------------------
// Provider helpers shared by the popup, options page and background
// ---------------------------------------------------------------------------

export function activeModel(settings: Settings, provider: LLMProvider = settings.provider): string {
  return settings.models[provider]?.trim() || PROVIDERS[provider].defaultModel
}

export function activeBaseUrl(settings: Settings, provider: LLMProvider = settings.provider): string {
  const custom = PROVIDERS[provider].editableBaseUrl ? settings.baseUrls[provider]?.trim() : ''
  return (custom || PROVIDERS[provider].baseUrl).replace(/\/+$/, '')
}

/** True when the AI mode has everything it needs to make a request. */
export function isAIReady(settings: Settings): boolean {
  const config = PROVIDERS[settings.provider]
  if (config.requiresApiKey && !settings.apiKeys[settings.provider]?.trim()) return false
  if (!activeBaseUrl(settings)) return false
  return Boolean(activeModel(settings))
}

/** Key for a voice service: its own, else the matching AI provider's key. */
export function voiceKey(settings: Settings, provider: VoiceProviderId): string {
  const own = settings.voice.apiKeys[provider]?.trim()
  if (own) return own
  const shared = VOICE_PROVIDERS[provider].sharesKeyWith
  return shared ? settings.apiKeys[shared]?.trim() || '' : ''
}

function voiceTarget(settings: Settings, provider: VoiceProviderId): VoiceTarget | undefined {
  const config = VOICE_PROVIDERS[provider]
  const apiKey = voiceKey(settings, provider)
  const baseUrl = (provider === 'custom' ? settings.voice.customBaseUrl.trim() : config.baseUrl).replace(/\/+$/, '')
  if (!baseUrl || (provider !== 'custom' && !apiKey)) return undefined
  return { provider, apiKey, baseUrl, model: settings.voice.models[provider]?.trim() || config.defaultModel }
}

export interface VoicePlan {
  /** 'cloud' records straight away; 'auto' tries browser speech first; 'browser' never uploads. */
  mode: 'auto' | 'browser' | 'cloud'
  target?: VoiceTarget
}

export function resolveVoice(settings: Settings): VoicePlan {
  const choice = settings.voice.provider
  if (choice === 'browser') return { mode: 'browser' }
  if (choice !== 'auto') return { mode: 'cloud', target: voiceTarget(settings, choice) }
  // Services the user gave a voice key to win, then shared AI keys.
  const explicit = VOICE_PROVIDER_IDS.filter(id => settings.voice.apiKeys[id]?.trim())
  for (const id of [...explicit, ...VOICE_AUTO_ORDER]) {
    const target = voiceTarget(settings, id)
    if (target) return { mode: 'auto', target }
  }
  return { mode: 'auto' }
}

async function migrateLegacySettings(): Promise<Settings> {
  try {
    const legacy = await chrome.storage.sync.get([
      'llmProvider', 'llmModel', 'llmApiKeys', 'safeFillingMode', 'customInstructions'
    ])
    const provider = isProvider(legacy.llmProvider) ? legacy.llmProvider : DEFAULT_PROVIDER
    const settings: Settings = {
      ...DEFAULT_SETTINGS,
      provider,
      apiKeys: { ...(legacy.llmApiKeys || {}) },
      models: legacy.llmModel ? { [provider]: legacy.llmModel } : {},
      safeFillingMode: legacy.safeFillingMode === true,
      instructions: typeof legacy.customInstructions === 'string' ? legacy.customInstructions : ''
    }
    // A user who already configured a key came for AI filling.
    if (settings.apiKeys[provider]) settings.mode = 'ai'
    await chrome.storage.sync.remove(['llmApiKeys'])
    return settings
  } catch {
    return DEFAULT_SETTINGS
  }
}
