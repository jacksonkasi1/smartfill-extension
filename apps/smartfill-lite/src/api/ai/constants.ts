// ** LLM Provider Types
export type LLMProvider = 'gemini' | 'groq' | 'openrouter'

// ** Provider Configuration
export interface ProviderConfig {
  name: string
  baseUrl: string
  models: ModelConfig[]
  requiresApiKey: boolean
}

export interface ModelConfig {
  id: string
  name: string
  description?: string
}

// ** Gemini Configuration
export const GEMINI_CONFIG: ProviderConfig = {
  name: 'Gemini',
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
  models: [
    { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', description: 'Fast and efficient' },
    { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash (Experimental)', description: 'Latest experimental model' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Fast and versatile' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Most capable' }
  ],
  requiresApiKey: true
}

// ** Groq Configuration
export const GROQ_CONFIG: ProviderConfig = {
  name: 'Groq',
  baseUrl: 'https://api.groq.com/openai/v1',
  models: [
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', description: 'Most capable Llama model' },
    { id: 'llama-3.1-70b-versatile', name: 'Llama 3.1 70B', description: 'Versatile and powerful' },
    { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', description: 'Fast and efficient' },
    { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', description: 'High quality mixture model' },
    { id: 'gemma2-9b-it', name: 'Gemma 2 9B', description: 'Google\'s efficient model' }
  ],
  requiresApiKey: true
}

// ** OpenRouter Configuration
export const OPENROUTER_CONFIG: ProviderConfig = {
  name: 'OpenRouter',
  baseUrl: 'https://openrouter.ai/api/v1',
  models: [
    { id: 'openai/gpt-4o', name: 'GPT-4o', description: 'OpenAI\'s most capable' },
    { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast and affordable' },
    { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', description: 'Anthropic\'s best model' },
    { id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5', description: 'Google\'s advanced model' },
    { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', description: 'Meta\'s powerful model' },
    { id: 'meta-llama/llama-3.1-8b-instruct', name: 'Llama 3.1 8B', description: 'Fast and efficient' }
  ],
  requiresApiKey: true
}

// ** All Providers Map
export const PROVIDERS: Record<LLMProvider, ProviderConfig> = {
  gemini: GEMINI_CONFIG,
  groq: GROQ_CONFIG,
  openrouter: OPENROUTER_CONFIG
}

// ** Default Provider Settings
export const DEFAULT_PROVIDER: LLMProvider = 'gemini'
export const DEFAULT_MODELS: Record<LLMProvider, string> = {
  gemini: 'gemini-2.5-flash-lite',
  groq: 'llama-3.1-8b-instant',
  openrouter: 'openai/gpt-4o-mini'
}

// ** LLM Generation Parameters
export const LLM_GENERATION_CONFIG = {
  temperature: 0.7,
  maxTokens: 2048
} as const