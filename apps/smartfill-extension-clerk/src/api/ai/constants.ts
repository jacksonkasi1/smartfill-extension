export type AIProviderKey = 'gemini' | 'groq' | 'openai' | 'openrouter'

type ProviderType = 'gemini' | 'openai-compatible'

export interface AIProviderConfig {
  label: string
  keyStorage: string
  modelStorage: string
  defaultModel: string
  type: ProviderType
  endpoint: string
  keyPlaceholder: string
  modelPlaceholder: string
  extraHeaders?: Record<string, string>
}

export const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models'

export const AI_PROVIDERS: Record<AIProviderKey, AIProviderConfig> = {
  gemini: {
    label: 'Google Gemini',
    keyStorage: 'geminiApiKey',
    modelStorage: 'geminiModel',
    defaultModel: 'gemini-2.5-flash-lite',
    type: 'gemini',
    endpoint: GEMINI_API_BASE_URL,
    keyPlaceholder: 'Enter your Gemini API key',
    modelPlaceholder: 'e.g. gemini-2.0-flash-lite',
  },
  groq: {
    label: 'Groq',
    keyStorage: 'groqApiKey',
    modelStorage: 'groqModel',
    defaultModel: 'llama3-70b-8192',
    type: 'openai-compatible',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    keyPlaceholder: 'Enter your Groq API key',
    modelPlaceholder: 'e.g. llama3-70b-8192',
  },
  openai: {
    label: 'OpenAI (ChatGPT)',
    keyStorage: 'openaiApiKey',
    modelStorage: 'openaiModel',
    defaultModel: 'gpt-4o-mini',
    type: 'openai-compatible',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    keyPlaceholder: 'Enter your OpenAI API key',
    modelPlaceholder: 'e.g. gpt-4o-mini',
  },
  openrouter: {
    label: 'OpenRouter',
    keyStorage: 'openrouterApiKey',
    modelStorage: 'openrouterModel',
    defaultModel: 'openrouter/google/gemini-flash-1.5',
    type: 'openai-compatible',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    keyPlaceholder: 'Enter your OpenRouter API key',
    modelPlaceholder: 'e.g. openrouter/google/gemini-flash-1.5',
    extraHeaders: {
      'HTTP-Referer': 'https://smartfill-extension',
      'X-Title': 'SmartFill Extension'
    }
  }
}

export const DEFAULT_AI_PROVIDER: AIProviderKey = 'gemini'
