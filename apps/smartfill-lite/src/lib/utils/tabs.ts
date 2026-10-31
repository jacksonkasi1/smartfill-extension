// ** import constants
import { MESSAGE_ACTIONS } from './messaging/types'

const RESTRICTED_URL = /^(chrome|edge|brave|about|devtools|view-source|chrome-extension|moz-extension):|^https:\/\/chrome(webstore)?\.google\.com\/webstore|^https:\/\/chromewebstore\.google\.com/

export function isRestrictedUrl(url: string | undefined): boolean {
  return !url || RESTRICTED_URL.test(url)
}

/**
 * Make sure the content script is listening in the tab. Tabs opened
 * before the extension was installed or updated have no content
 * script yet, so it is injected on demand. Plasmo hashes the bundle
 * name, so the file is read from the manifest instead of hard-coded.
 */
export async function ensureContentScript(tabId: number): Promise<void> {
  try {
    const pong = await chrome.tabs.sendMessage(tabId, { action: MESSAGE_ACTIONS.FORMS.PING })
    if (pong?.success) return
  } catch { /* not injected yet */ }

  const files = chrome.runtime.getManifest().content_scripts?.flatMap(script => script.js || []) || []
  if (files.length === 0) throw new Error('Content script is missing from the build.')
  await chrome.scripting.executeScript({ target: { tabId, allFrames: false }, files })
}

/** Send a message to the tab's content script, injecting it first when needed. */
export async function sendToTab<T = any>(tabId: number, message: Record<string, unknown>): Promise<T> {
  await ensureContentScript(tabId)
  return chrome.tabs.sendMessage(tabId, message)
}
