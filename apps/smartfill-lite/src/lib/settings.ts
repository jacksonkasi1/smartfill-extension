// ** import types
import type { LLMProvider } from '@/api/ai/constants'
import type { ProfileId } from '@/lib/mock/profiles'
import type { Region } from '@/lib/mock/regions'

// ** import constants
import { DEFAULT_PROVIDER, PROVIDERS, isProvider } from '@/api/ai/constants'

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
  safeFillingMode: false
}

const STORAGE_KEY = 'settings'

/**
 * API keys live in `chrome.storage.local` (never synced to the
 * Google account). Releases up to 1.0.3 kept everything in
 * `chrome.storage.sync`; those values are migrated once on first read.
 */
export async function getSettings(): Promise<Settings> {
  const stored = await chrome.storage.local.get(STORAGE_KEY)
  if (stored[STORAGE_KEY]) return { ...DEFAULT_SETTINGS, ...stored[STORAGE_KEY] }

  const migrated = await migrateLegacySettings()
  await chrome.storage.local.set({ [STORAGE_KEY]: migrated })
  return migrated
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
      callback({ ...DEFAULT_SETTINGS, ...changes[STORAGE_KEY].newValue })
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
