// ** LLM Provider Types
export type LLMProvider =
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'deepseek'
  | 'openrouter'
  | 'xai'
  | 'groq'
  | 'mistral'
  | 'together'
  | 'fireworks'
  | 'perplexity'
  | 'cerebras'
  | 'cohere'
  | 'qwen'
  | 'moonshot'
  | 'nvidia'
  | 'sambanova'
  | 'ollamacloud'
  | 'ollama'
  | 'lmstudio'
  | 'custom'

/**
 * Wire protocol a provider speaks. Almost every vendor ships an
 * OpenAI-compatible `/chat/completions` endpoint, so only Anthropic
 * and Gemini need their own adapters.
 */
export type ProviderKind = 'openai' | 'anthropic' | 'gemini'

export type ProviderGroup = 'popular' | 'more' | 'local'

// ** Provider Configuration
export interface ProviderConfig {
  name: string
  kind: ProviderKind
  group: ProviderGroup
  baseUrl: string
  defaultModel: string
  /** Offline suggestions; the live list comes from the provider's /models endpoint. */
  models: string[]
  requiresApiKey: boolean
  /** Users may point the provider at another host (local servers, proxies, custom gateways). */
  editableBaseUrl?: boolean
  /** False when the provider has no public model-listing endpoint. */
  canListModels?: boolean
  keyUrl?: string
  keyHint?: string
}

// ** All Providers Map
export const PROVIDERS: Record<LLMProvider, ProviderConfig> = {
  openai: {
    name: 'OpenAI',
    kind: 'openai',
    group: 'popular',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4.1-mini',
    models: ['gpt-4.1-mini', 'gpt-4.1', 'gpt-4o-mini', 'gpt-4o', 'gpt-5-mini', 'gpt-5'],
    requiresApiKey: true,
    keyUrl: 'https://platform.openai.com/api-keys',
    keyHint: 'sk-…'
  },
  anthropic: {
    name: 'Anthropic Claude',
    kind: 'anthropic',
    group: 'popular',
    baseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-haiku-5-5',
    models: ['claude-haiku-5-5', 'claude-sonnet-5-5', 'claude-opus-5-5'],
    requiresApiKey: true,
    keyUrl: 'https://console.anthropic.com/settings/keys',
    keyHint: 'sk-ant-…'
  },
  gemini: {
    name: 'Google Gemini',
    kind: 'gemini',
    group: 'popular',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemini-2.5-flash',
    models: ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-pro', 'gemini-2.0-flash'],
    requiresApiKey: true,
    keyUrl: 'https://aistudio.google.com/app/apikey',
    keyHint: 'AIza…'
  },
  deepseek: {
    name: 'DeepSeek',
    kind: 'openai',
    group: 'popular',
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    requiresApiKey: true,
    keyUrl: 'https://platform.deepseek.com/api_keys',
    keyHint: 'sk-…'
  },
  openrouter: {
    name: 'OpenRouter',
    kind: 'openai',
    group: 'popular',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'openai/gpt-4o-mini',
    models: [
      'openai/gpt-4o-mini',
      'anthropic/claude-sonnet-4',
      'google/gemini-2.5-flash',
      'deepseek/deepseek-chat',
      'meta-llama/llama-3.3-70b-instruct'
    ],
    requiresApiKey: true,
    keyUrl: 'https://openrouter.ai/keys',
    keyHint: 'sk-or-…'
  },
  xai: {
    name: 'xAI Grok',
    kind: 'openai',
    group: 'popular',
    baseUrl: 'https://api.x.ai/v1',
    defaultModel: 'grok-3-mini',
    models: ['grok-3-mini', 'grok-3', 'grok-4'],
    requiresApiKey: true,
    keyUrl: 'https://console.x.ai',
    keyHint: 'xai-…'
  },
  groq: {
    name: 'Groq',
    kind: 'openai',
    group: 'popular',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b'],
    requiresApiKey: true,
    keyUrl: 'https://console.groq.com/keys',
    keyHint: 'gsk_…'
  },
  mistral: {
    name: 'Mistral AI',
    kind: 'openai',
    group: 'more',
    baseUrl: 'https://api.mistral.ai/v1',
    defaultModel: 'mistral-small-latest',
    models: ['mistral-small-latest', 'mistral-medium-latest', 'mistral-large-latest'],
    requiresApiKey: true,
    keyUrl: 'https://console.mistral.ai/api-keys'
  },
  together: {
    name: 'Together AI',
    kind: 'openai',
    group: 'more',
    baseUrl: 'https://api.together.xyz/v1',
    defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    models: ['meta-llama/Llama-3.3-70B-Instruct-Turbo', 'Qwen/Qwen2.5-72B-Instruct-Turbo', 'deepseek-ai/DeepSeek-V3'],
    requiresApiKey: true,
    keyUrl: 'https://api.together.ai/settings/api-keys'
  },
  fireworks: {
    name: 'Fireworks AI',
    kind: 'openai',
    group: 'more',
    baseUrl: 'https://api.fireworks.ai/inference/v1',
    defaultModel: 'accounts/fireworks/models/llama-v3p3-70b-instruct',
    models: ['accounts/fireworks/models/llama-v3p3-70b-instruct', 'accounts/fireworks/models/deepseek-v3'],
    requiresApiKey: true,
    keyUrl: 'https://fireworks.ai/account/api-keys'
  },
  perplexity: {
    name: 'Perplexity',
    kind: 'openai',
    group: 'more',
    baseUrl: 'https://api.perplexity.ai',
    defaultModel: 'sonar',
    models: ['sonar', 'sonar-pro'],
    requiresApiKey: true,
    canListModels: false,
    keyUrl: 'https://www.perplexity.ai/settings/api',
    keyHint: 'pplx-…'
  },
  cerebras: {
    name: 'Cerebras',
    kind: 'openai',
    group: 'more',
    baseUrl: 'https://api.cerebras.ai/v1',
    defaultModel: 'llama-3.3-70b',
    models: ['llama-3.3-70b', 'llama3.1-8b', 'gpt-oss-120b'],
    requiresApiKey: true,
    keyUrl: 'https://cloud.cerebras.ai'
  },
  cohere: {
    name: 'Cohere',
    kind: 'openai',
    group: 'more',
    baseUrl: 'https://api.cohere.ai/compatibility/v1',
    defaultModel: 'command-a-03-2025',
    models: ['command-a-03-2025', 'command-r-plus', 'command-r'],
    requiresApiKey: true,
    canListModels: false,
    keyUrl: 'https://dashboard.cohere.com/api-keys'
  },
  qwen: {
    name: 'Alibaba Qwen',
    kind: 'openai',
    group: 'more',
    baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-plus',
    models: ['qwen-plus', 'qwen-turbo', 'qwen-max'],
    requiresApiKey: true,
    editableBaseUrl: true,
    keyUrl: 'https://modelstudio.console.alibabacloud.com'
  },
  moonshot: {
    name: 'Moonshot Kimi',
    kind: 'openai',
    group: 'more',
    baseUrl: 'https://api.moonshot.ai/v1',
    defaultModel: 'moonshot-v1-8k',
    models: ['moonshot-v1-8k', 'moonshot-v1-32k'],
    requiresApiKey: true,
    keyUrl: 'https://platform.moonshot.ai/console/api-keys'
  },
  nvidia: {
    name: 'NVIDIA NIM',
    kind: 'openai',
    group: 'more',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    defaultModel: 'meta/llama-3.3-70b-instruct',
    models: ['meta/llama-3.3-70b-instruct', 'meta/llama-3.1-8b-instruct'],
    requiresApiKey: true,
    keyUrl: 'https://build.nvidia.com',
    keyHint: 'nvapi-…'
  },
  sambanova: {
    name: 'SambaNova',
    kind: 'openai',
    group: 'more',
    baseUrl: 'https://api.sambanova.ai/v1',
    defaultModel: 'Meta-Llama-3.3-70B-Instruct',
    models: ['Meta-Llama-3.3-70B-Instruct', 'DeepSeek-V3-0324'],
    requiresApiKey: true,
    keyUrl: 'https://cloud.sambanova.ai/apis'
  },
  ollamacloud: {
    name: 'Ollama Cloud',
    kind: 'openai',
    group: 'more',
    baseUrl: 'https://ollama.com/v1',
    defaultModel: 'gpt-oss:120b',
    models: ['gpt-oss:120b', 'gpt-oss:20b', 'deepseek-v3.1:671b', 'qwen3-coder:480b'],
    requiresApiKey: true,
    keyUrl: 'https://ollama.com/settings/keys'
  },
  ollama: {
    name: 'Ollama (local)',
    kind: 'openai',
    group: 'local',
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3.2',
    models: ['llama3.2', 'qwen2.5', 'mistral'],
    requiresApiKey: false,
    editableBaseUrl: true
  },
  lmstudio: {
    name: 'LM Studio (local)',
    kind: 'openai',
    group: 'local',
    baseUrl: 'http://localhost:1234/v1',
    defaultModel: '',
    models: [],
    requiresApiKey: false,
    editableBaseUrl: true
  },
  custom: {
    name: 'Custom (OpenAI-compatible)',
    kind: 'openai',
    group: 'local',
    baseUrl: '',
    defaultModel: '',
    models: [],
    requiresApiKey: false,
    editableBaseUrl: true
  }
}

export const PROVIDER_IDS = Object.keys(PROVIDERS) as LLMProvider[]

export const PROVIDER_GROUP_LABELS: Record<ProviderGroup, string> = {
  popular: 'Popular',
  more: 'More providers',
  local: 'Local & custom'
}

// ** Default Provider Settings
export const DEFAULT_PROVIDER: LLMProvider = 'gemini'

export function isProvider(value: unknown): value is LLMProvider {
  return typeof value === 'string' && value in PROVIDERS
}

// ** LLM Generation Parameters
export const LLM_GENERATION_CONFIG = {
  temperature: 0.7,
  maxTokens: 4096
} as const
