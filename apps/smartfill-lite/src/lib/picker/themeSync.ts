/**
 * Serialized by chrome.scripting: keep this function self-contained. Update only
 * SmartFill's open shadow roots, preserving their UI nodes, state and listeners.
 */
export function installPageTheme(css: string, fontData?: string): void {
  const state = globalThis as typeof globalThis & {
    __smartfillThemeSync?: { css: string, observer: MutationObserver }
  }
  const selector = '[data-smartfill-ui]'

  function refresh(host: Element) {
    const shadow = host.shadowRoot
    if (!shadow) return
    let style = shadow.querySelector<HTMLStyleElement>('style[data-smartfill-theme]') || shadow.querySelector('style')
    if (!style) {
      style = document.createElement('style')
      shadow.prepend(style)
    }
    style.setAttribute('data-smartfill-theme', '')
    if (style.textContent !== css) style.textContent = css
  }

  document.querySelectorAll(selector).forEach(refresh)
  if (state.__smartfillThemeSync?.css !== css) {
    state.__smartfillThemeSync?.observer.disconnect()
    const observer = new MutationObserver(records => {
      for (const record of records) {
        for (const node of Array.from(record.addedNodes)) {
          // The extension's injected document can use a different global
          // realm, so `instanceof Element` is not reliable here.
          if (node.nodeType !== 1) continue
          const element = node as Element
          if (element.matches(selector)) refresh(element)
        }
      }
    })
    // SmartFill appends its overlay hosts directly to the document element.
    observer.observe(document.documentElement, { childList: true, subtree: true })
    state.__smartfillThemeSync = { css, observer }
  }

  if (fontData && typeof FontFace !== 'undefined' && document.fonts &&
      !Array.from(document.fonts).some(face => face.family === 'SmartFill Geist' && face.status !== 'error')) {
    const face = new FontFace('SmartFill Geist', `url(${fontData})`, { weight: '100 900', style: 'normal' })
    document.fonts.add(face)
    void face.load().catch(() => { /* retain the local sans-serif fallback */ })
  }
}
