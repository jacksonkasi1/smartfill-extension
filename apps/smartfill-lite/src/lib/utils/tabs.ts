// ** import lib
import { installPageTheme } from '@/lib/picker/themeSync'

// ** import constants
import { MESSAGE_ACTIONS } from './messaging/types'
import { OVERLAY_CSS } from '@/lib/picker/styles'
import { geistFontData } from '@/styles/font-data'

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
  // A successful ping can come from an older content script. Refresh its UI
  // styles without injecting duplicate message listeners or losing Undo state.
  await chrome.scripting.executeScript({
    target: { tabId, allFrames: false },
    func: installPageTheme,
    args: [OVERLAY_CSS, geistFontData]
  })
  return chrome.tabs.sendMessage(tabId, message)
}
