// ** import types
import type { LLMProvider } from '@/api/ai/constants'

/**
 * Speech-to-text services for voice instructions. The Web Speech API
 * is free but missing in Brave and some Chromium builds, so a recorded
 * clip can instead be sent to one of these.
 */
export type VoiceProviderId =
  | 'groq'
  | 'openai'
  | 'elevenlabs'
  | 'deepgram'
  | 'assemblyai'
  | 'gemini'
  | 'mistral'
  | 'together'
  | 'fireworks'
  | 'custom'

/** Request shape each service expects. */
export type VoiceApiKind = 'openai' | 'elevenlabs' | 'deepgram' | 'assemblyai' | 'gemini'

export interface VoiceProviderConfig {
  name: string
  kind: VoiceApiKind
  baseUrl: string
  defaultModel: string
  /** Suggestions; any model ID can be typed. */
  models: string[]
  keyUrl?: string
  keyHint?: string
  /** One-line note shown under the picker. */
  note: string
  /** Same account as this AI provider, so its key is reused when no voice key is set. */
  sharesKeyWith?: LLMProvider
}

export const VOICE_PROVIDERS: Record<VoiceProviderId, VoiceProviderConfig> = {
  groq: {
    name: 'Groq Whisper',
    kind: 'openai',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'whisper-large-v3-turbo',
    models: ['whisper-large-v3-turbo', 'whisper-large-v3'],
    keyUrl: 'https://console.groq.com/keys',
    keyHint: 'gsk_…',
    note: 'Free tier, very fast. Best default.',
    sharesKeyWith: 'groq'
  },
  openai: {
    name: 'OpenAI',
    kind: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini-transcribe',
    models: ['gpt-4o-mini-transcribe', 'gpt-4o-transcribe', 'whisper-1'],
    keyUrl: 'https://platform.openai.com/api-keys',
    keyHint: 'sk-…',
    note: 'High accuracy, paid per minute.',
    sharesKeyWith: 'openai'
  },
  elevenlabs: {
    name: 'ElevenLabs Scribe',
    kind: 'elevenlabs',
    baseUrl: 'https://api.elevenlabs.io/v1',
    defaultModel: 'scribe_v1',
    models: ['scribe_v1', 'scribe_v1_experimental'],
    keyUrl: 'https://elevenlabs.io/app/settings/api-keys',
    keyHint: 'sk_…',
    note: 'Strong on accents and 99 languages.'
  },
  deepgram: {
    name: 'Deepgram',
    kind: 'deepgram',
    baseUrl: 'https://api.deepgram.com/v1',
    defaultModel: 'nova-3',
    models: ['nova-3', 'nova-2'],
    keyUrl: 'https://console.deepgram.com',
    note: 'Fast, with free starting credit.'
  },
  assemblyai: {
    name: 'AssemblyAI',
    kind: 'assemblyai',
    baseUrl: 'https://api.assemblyai.com/v2',
    defaultModel: 'universal',
    models: ['universal', 'slam-1', 'best', 'nano'],
    keyUrl: 'https://www.assemblyai.com/dashboard',
    note: 'Accurate; takes a few seconds longer.'
  },
  gemini: {
    name: 'Google Gemini',
    kind: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemini-2.5-flash',
    models: ['gemini-2.5-flash', 'gemini-2.5-flash-lite'],
    keyUrl: 'https://aistudio.google.com/apikey',
    keyHint: 'AIza…',
    note: 'Free tier; transcribes with a Gemini model.',
    sharesKeyWith: 'gemini'
  },
  mistral: {
    name: 'Mistral Voxtral',
    kind: 'openai',
    baseUrl: 'https://api.mistral.ai/v1',
    defaultModel: 'voxtral-mini-latest',
    models: ['voxtral-mini-latest'],
    keyUrl: 'https://console.mistral.ai/api-keys',
    note: 'Low cost, multilingual.',
    sharesKeyWith: 'mistral'
  },
  together: {
    name: 'Together AI',
    kind: 'openai',
    baseUrl: 'https://api.together.xyz/v1',
    defaultModel: 'openai/whisper-large-v3',
    models: ['openai/whisper-large-v3'],
    keyUrl: 'https://api.together.ai/settings/api-keys',
    note: 'Hosted Whisper large-v3.',
    sharesKeyWith: 'together'
  },
  fireworks: {
    name: 'Fireworks AI',
    kind: 'openai',
    baseUrl: 'https://audio-prod.api.fireworks.ai/v1',
    defaultModel: 'whisper-v3',
    models: ['whisper-v3', 'whisper-v3-turbo'],
    keyUrl: 'https://fireworks.ai/account/api-keys',
    keyHint: 'fw_…',
    note: 'Hosted Whisper v3.',
    sharesKeyWith: 'fireworks'
  },
  custom: {
    name: 'Custom (OpenAI-compatible)',
    kind: 'openai',
    baseUrl: '',
    defaultModel: 'whisper-1',
    models: [],
    note: 'Any /audio/transcriptions server: LocalAI, Speaches, faster-whisper-server, a proxy.'
  }
}

export const VOICE_PROVIDER_IDS = Object.keys(VOICE_PROVIDERS) as VoiceProviderId[]

/** Order tried in "Auto" when no voice provider is picked: free and fast first. */
export const VOICE_AUTO_ORDER: VoiceProviderId[] = ['groq', 'openai', 'gemini', 'mistral', 'together', 'fireworks']
