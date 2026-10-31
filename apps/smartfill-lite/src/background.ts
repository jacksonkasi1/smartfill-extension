// ** import types
import type { LLMProvider } from "@/api/ai/constants"

// ** import utils
import { MessageListener, MESSAGE_ACTIONS } from "@/lib/utils/messaging"
import { isRestrictedUrl, sendToTab } from "@/lib/utils/tabs"

// ** import lib
import { activeBaseUrl, activeModel, getSettings } from "@/lib/settings"

// ** import apis
import { completeChat, listModels } from "@/api/ai/client"

// ** import constants
import { PROVIDERS } from "@/api/ai/constants"

// The background worker owns every network call to an AI provider:
// it holds the host permissions, so provider CORS rules and the
// visited page's CSP never get in the way.

interface ProviderOverride {
  provider?: LLMProvider
  apiKey?: string
  model?: string
  baseUrl?: string
}

/** Resolve provider details from saved settings, letting the options page test unsaved values. */
async function resolveProvider(override: ProviderOverride = {}) {
  const settings = await getSettings()
  const provider = override.provider || settings.provider
  const config = PROVIDERS[provider]
  const apiKey = (override.apiKey ?? settings.apiKeys[provider] ?? '').trim()
  if (config.requiresApiKey && !apiKey) {
    throw new Error(`Add your ${config.name} API key in Settings.`)
  }
  return {
    provider,
    apiKey,
    model: override.model?.trim() || activeModel(settings, provider),
    baseUrl: (override.baseUrl?.trim() || activeBaseUrl(settings, provider)).replace(/\/+$/, '')
  }
}

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Unknown error')

chrome.runtime.onMessage.addListener(
  MessageListener.createAsync<any, any>(async (message) => {
    switch (message.action) {
      case MESSAGE_ACTIONS.AI.COMPLETE: {
        try {
          const req = await resolveProvider()
          const text = await completeChat({ ...req, system: message.system, user: message.user })
          return { success: true, text }
        } catch (error) {
          return { success: false, error: errorMessage(error) }
        }
      }

      case MESSAGE_ACTIONS.AI.MODELS: {
        try {
          const { provider, apiKey, baseUrl } = await resolveProvider(message)
          return { success: true, models: await listModels({ provider, apiKey, baseUrl }) }
        } catch (error) {
          return { success: false, error: errorMessage(error) }
        }
      }

      case MESSAGE_ACTIONS.AI.TEST: {
        try {
          const req = await resolveProvider(message)
          const started = performance.now()
          const reply = await completeChat({
            ...req,
            system: 'Reply with the single word OK.',
            user: 'Connection test'
          })
          const ms = Math.round(performance.now() - started)
          return { success: true, message: `Connected to ${PROVIDERS[req.provider].name} · ${req.model} · ${ms} ms`, reply }
        } catch (error) {
          return { success: false, error: errorMessage(error) }
        }
      }

      case MESSAGE_ACTIONS.POPUP.OPEN: {
        try {
          await chrome.action.openPopup()
          return { success: true }
        } catch (error) {
          return { success: false, error: errorMessage(error) }
        }
      }

      default:
        return { success: false, error: `Unknown action: ${message.action}` }
    }
  })
)

// Keyboard shortcut: fill the active tab with the saved mode and profile.
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'fill-form') return
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id || isRestrictedUrl(tab.url)) return
  try {
    await sendToTab(tab.id, { action: MESSAGE_ACTIONS.FORMS.FILL })
  } catch (error) {
    console.error('[SmartFill] Shortcut fill failed:', error)
  }
})
