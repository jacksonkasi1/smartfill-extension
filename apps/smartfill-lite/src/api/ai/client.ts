// ** import types
import type { AIFormData, FormField } from '@/types/extension'
import type { LLMProvider } from './constants'
import type { PromptContext } from './prompt'

// ** import utils
import { buildPrompt, SYSTEM_PROMPT } from './prompt'
import { parseAIResponse } from './parser'
import { normalizeFormFields } from '@/lib/detection/fieldNormalization'

// ** import constants
import { PROVIDERS, LLM_GENERATION_CONFIG } from './constants'
import { MESSAGE_ACTIONS } from '@/lib/utils/messaging/types'

/** Everything needed to talk to one provider. Resolved from settings by the caller. */
export interface ProviderRequest {
  provider: LLMProvider
  apiKey: string
  model: string
  baseUrl: string
}

export interface ChatRequest extends ProviderRequest {
  system: string
  user: string
}

/**
 * Per-step timings returned alongside the parsed AI data so the
 * content script can log a detailed performance breakdown.
 */
export interface AIResult {
  data: AIFormData
  timings: {
    promptMs: number
    apiMs: number
    parseMs: number
  }
}

/** Maximum time we wait for any single AI provider response. */
const PROVIDER_TIMEOUT_MS = 45_000

/**
 * fetch() with a hard timeout. Aborts the request when the timeout
 * elapses so the UI never hangs on a slow or stuck provider.
 */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number = PROVIDER_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw new Error('AI request timed out. Please try again.')
    throw new Error(`Could not reach ${new URL(url).host}. Check the base URL and your connection.`)
  } finally {
    clearTimeout(timer)
  }
}

/** Turn a provider error response into a short, actionable message. */
async function providerError(response: Response, providerName: string): Promise<Error> {
  let detail = ''
  try {
    const data = await response.json()
    detail = data?.error?.message || data?.message || data?.detail || ''
    if (typeof detail !== 'string') detail = JSON.stringify(detail)
  } catch { /* keep empty */ }

  if (response.status === 401 || response.status === 403) {
    return new Error(`${providerName} rejected the API key. ${detail}`.trim())
  }
  if (response.status === 429) {
    return new Error(`${providerName} rate limit reached. Wait a moment and retry.`)
  }
  if (response.status === 404) {
    return new Error(`${providerName}: model or endpoint not found. ${detail}`.trim())
  }
  return new Error(detail || `${providerName} error ${response.status} ${response.statusText}`)
}

function authHeaders(req: ProviderRequest): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (req.apiKey) headers.Authorization = `Bearer ${req.apiKey}`
  if (req.provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://github.com/jacksonkasi1/smartfill-extension'
    headers['X-Title'] = 'SmartFill'
  }
  return headers
}

// ---------------------------------------------------------------------------
// Chat adapters
// ---------------------------------------------------------------------------

async function callOpenAICompatible(req: ChatRequest): Promise<string> {
  const name = PROVIDERS[req.provider].name
  const messages = [
    { role: 'system', content: req.system },
    { role: 'user', content: req.user }
  ]
  const send = (body: Record<string, unknown>) =>
    fetchWithTimeout(`${req.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: authHeaders(req),
      body: JSON.stringify({ model: req.model, messages, ...body })
    })

  let response = await send({
    temperature: LLM_GENERATION_CONFIG.temperature,
    max_tokens: LLM_GENERATION_CONFIG.maxTokens
  })
  // Reasoning models (o-series, gpt-5, …) reject custom temperature
  // and the legacy max_tokens field. Retry once with defaults.
  if (response.status === 400) {
    const text = await response.clone().text()
    if (/temperature|max_tokens|unsupported/i.test(text)) response = await send({})
  }
  if (!response.ok) throw await providerError(response, name)

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content
  const text = Array.isArray(content) ? content.map((part: any) => part.text ?? '').join('') : content
  if (!text) throw new Error(`${name} returned an empty response.`)
  return text
}

async function callAnthropic(req: ChatRequest): Promise<string> {
  const response = await fetchWithTimeout(`${req.baseUrl}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': req.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: req.model,
      max_tokens: LLM_GENERATION_CONFIG.maxTokens,
      system: req.system,
      messages: [{ role: 'user', content: req.user }]
    })
  })
  if (!response.ok) throw await providerError(response, PROVIDERS.anthropic.name)
  const data = await response.json()
  const text = (data.content || [])
    .filter((block: any) => block.type === 'text')
    .map((block: any) => block.text)
    .join('')
  if (!text) throw new Error('Claude returned an empty response.')
  return text
}

async function callGemini(req: ChatRequest): Promise<string> {
  // The key travels in the x-goog-api-key header, not the query string,
  // so it never lands in proxy logs or referer headers.
  const model = req.model.replace(/^models\//, '')
  const response = await fetchWithTimeout(
    `${req.baseUrl}/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': req.apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: req.system }] },
        contents: [{ role: 'user', parts: [{ text: req.user }] }],
        generationConfig: {
          temperature: LLM_GENERATION_CONFIG.temperature,
          maxOutputTokens: LLM_GENERATION_CONFIG.maxTokens,
          // Gemma and older models served by this API reject JSON mode.
          ...(model.startsWith('gemini') ? { responseMimeType: 'application/json' } : {})
        }
      })
    }
  )
  if (!response.ok) throw await providerError(response, PROVIDERS.gemini.name)
  const data = await response.json()
  const text = (data.candidates?.[0]?.content?.parts || []).map((p: any) => p.text ?? '').join('')
  if (!text) throw new Error('Gemini returned an empty response.')
  return text
}

/** Send one chat request to any supported provider. Runs in the background worker. */
export async function completeChat(req: ChatRequest): Promise<string> {
  if (!req.baseUrl) throw new Error('Set a base URL for this provider in Settings.')
  if (!req.model) throw new Error('Choose a model in Settings.')
  switch (PROVIDERS[req.provider].kind) {
    case 'anthropic': return callAnthropic(req)
    case 'gemini': return callGemini(req)
    default: return callOpenAICompatible(req)
  }
}

// ---------------------------------------------------------------------------
// Model listing
// ---------------------------------------------------------------------------

/** Fetch the live model list. Falls back to the built-in suggestions when unsupported. */
export async function listModels(req: Omit<ProviderRequest, 'model'>): Promise<string[]> {
  const config = PROVIDERS[req.provider]
  if (config.canListModels === false) return config.models
  if (!req.baseUrl) throw new Error('Set a base URL first.')

  let response: Response
  if (config.kind === 'gemini') {
    response = await fetchWithTimeout(`${req.baseUrl}/models?pageSize=200`, {
      headers: { 'x-goog-api-key': req.apiKey }
    }, 15_000)
  } else if (config.kind === 'anthropic') {
    response = await fetchWithTimeout(`${req.baseUrl}/models?limit=100`, {
      headers: {
        'x-api-key': req.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      }
    }, 15_000)
  } else {
    response = await fetchWithTimeout(`${req.baseUrl}/models`, { headers: authHeaders({ ...req, model: '' }) }, 15_000)
  }
  if (!response.ok) throw await providerError(response, config.name)

  const data = await response.json()
  let ids: string[]
  if (config.kind === 'gemini') {
    ids = (data.models || [])
      .filter((m: any) => (m.supportedGenerationMethods || []).includes('generateContent'))
      .map((m: any) => String(m.name).replace(/^models\//, ''))
  } else {
    // OpenAI shape is { data: [...] }; Together returns a bare array.
    const list = Array.isArray(data) ? data : data.data || data.models || []
    ids = list.map((m: any) => m.id || m.name).filter(Boolean)
  }
  // Hide embedding / audio / image models that cannot chat.
  const chatOnly = ids.filter(id => !/embed|whisper|tts|dall-e|moderation|rerank|image|audio|transcribe|guard/i.test(id))
  return Array.from(new Set(chatOnly)).sort((a, b) => a.localeCompare(b))
}

// ---------------------------------------------------------------------------
// Form generation (content-script side)
// ---------------------------------------------------------------------------

/**
 * Options forwarded through the fill pipeline. We pass this as a
 * single argument instead of introducing globals so the same
 * function can be exercised under both modes by tests and by the
 * content script.
 */
export interface GenerateFormDataOptions {
  /**
   * Safe Filling Mode. When true, the prompt tells the model to
   * (a) only use sensitive values that came from Custom
   * Instructions, and (b) default consent fields to false. When
   * false (default), every detected field is filled.
   */
  safeFillingMode?: boolean
  /** Industry profile, region and page hints that steer the values. */
  context?: PromptContext
  /** Values for fields the AI leaves out, keyed by field name. */
  fallback?: Record<string, unknown>
}

/**
 * Generate form data with the configured provider. The network call
 * runs in the background service worker: it holds the host
 * permissions, so provider CORS rules and page CSP never apply.
 */
export async function generateFormData(
  fields: FormField[],
  customPrompt?: string,
  options: GenerateFormDataOptions = {}
): Promise<AIResult> {
  fields = normalizeFormFields(fields).fields
  const safeFillingMode = options.safeFillingMode === true

  const t0 = performance.now()
  const prompt = buildPrompt(fields, customPrompt, undefined, { safeFillingMode, context: options.context })
  const promptMs = performance.now() - t0

  const t1 = performance.now()
  const response = await chrome.runtime.sendMessage({
    action: MESSAGE_ACTIONS.AI.COMPLETE,
    system: SYSTEM_PROMPT,
    user: prompt
  })
  if (!response?.success) throw new Error(response?.error || 'AI request failed.')
  const apiMs = performance.now() - t1

  const t2 = performance.now()
  const data = parseAIResponse(response.text, fields, customPrompt, { safeFillingMode, fallback: options.fallback })
  const parseMs = performance.now() - t2

  return { data, timings: { promptMs, apiMs, parseMs } }
}
