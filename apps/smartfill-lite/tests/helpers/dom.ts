import { Window } from 'happy-dom'

const DOM_GLOBALS = [
  'window', 'document', 'navigator', 'location', 'sessionStorage', 'localStorage',
  'Node', 'Element', 'Document', 'DocumentFragment', 'ShadowRoot', 'Text', 'NodeFilter',
  'Event', 'CustomEvent', 'KeyboardEvent', 'MouseEvent', 'PointerEvent', 'InputEvent', 'FocusEvent',
  'MutationObserver', 'Range', 'DOMRect', 'CSS', 'requestAnimationFrame', 'cancelAnimationFrame'
]

/**
 * One happy-dom window shared by every DOM test file (bun runs the
 * files in one process, so per-file windows would fight over globals).
 */
export function installDom(): Window {
  const g = globalThis as any
  if (g.__smartfillWindow) return g.__smartfillWindow
  const win = new Window({ url: 'https://example.test/signup', width: 1280, height: 800 })
  const w = win as any
  for (const key of DOM_GLOBALS) {
    const value = w[key]
    g[key] = typeof value === 'function' && /^[a-z]/.test(key) ? value.bind(win) : value
  }
  for (const key of Object.getOwnPropertyNames(w)) {
    if (/^(HTML|SVG)\w*Element$/.test(key)) g[key] = w[key]
  }
  g.getComputedStyle = w.getComputedStyle.bind(win)
  if (!g.CSS) g.CSS = { escape: (v: string) => v.replace(/([^a-zA-Z0-9_-])/g, '\\$1') }
  g.__smartfillWindow = win
  return win
}

/** Replace the page body and return a lookup by id. */
export function page(html: string): (id: string) => HTMLElement {
  document.body.innerHTML = html
  return (id: string) => document.getElementById(id) as HTMLElement
}

/** Give an element a non-zero layout box (happy-dom has no layout). */
export function giveBox(el: Element, rect = { left: 10, top: 10, width: 200, height: 30 }): void {
  ;(el as any).getBoundingClientRect = () => ({ ...rect, x: rect.left, y: rect.top, right: rect.left + rect.width, bottom: rect.top + rect.height, toJSON() {} })
}
