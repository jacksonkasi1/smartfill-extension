// ** import types
import type { LLMProvider } from '@/api/ai/constants'
import type { ProfileId } from '@/lib/mock/profiles'
import type { Region } from '@/lib/mock/regions'
import type { IdentityPrefs } from '@/lib/mock/identity'

// ** import constants
import { DEFAULT_PROVIDER, PROVIDERS, isProvider } from '@/api/ai/constants'
import { DEFAULT_IDENTITY } from '@/lib/mock/identity'

export type FillMode = 'mock' | 'ai'

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
  /** Fixed password and email strategy used by both mock and AI fills. */
  identity: IdentityPrefs
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
  identity: DEFAULT_IDENTITY
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
  return { ...DEFAULT_SETTINGS, ...stored, identity: { ...DEFAULT_IDENTITY, ...stored.identity } }
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

/**
 * Whisper endpoint for voice input in browsers without a speech
 * service (Brave). Groq first: its Whisper tier is free and fast.
 */
export function transcriberFor(settings: Settings): { url: string, apiKey: string, model: string } | undefined {
  const groq = settings.apiKeys.groq?.trim()
  if (groq) return { url: 'https://api.groq.com/openai/v1/audio/transcriptions', apiKey: groq, model: 'whisper-large-v3-turbo' }
  const openai = settings.apiKeys.openai?.trim()
  if (openai) return { url: 'https://api.openai.com/v1/audio/transcriptions', apiKey: openai, model: 'whisper-1' }
  return undefined
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
