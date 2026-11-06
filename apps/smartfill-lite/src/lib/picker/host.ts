/**
 * One shadow-rooted overlay host for every piece of SmartFill UI drawn
 * on the page (region picker, panels, field highlights). The host itself
 * never takes pointer events; only the parts that opt in do.
 */

// ** import lib
import { registerUiFont } from '@/styles/font'

// ** import constants
import { OVERLAY_CSS } from './styles'

const HOST_ATTR = 'data-smartfill-ui'

let host: HTMLDivElement | null = null
let root: ShadowRoot | null = null

/** The shadow root every SmartFill overlay renders into. Created on first use. */
export function getUiHost(): ShadowRoot {
  registerUiFont(document)
  if (host && root && host.isConnected) return root
  host = document.createElement('div')
  host.setAttribute(HOST_ATTR, '')
  host.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483647;display:block;margin:0;padding:0;border:0;' +
    'width:100vw;height:100vh;max-width:none;max-height:none;background:transparent;overflow:visible;color:inherit;'
  // A popover lives in the browser's top layer, above (and not made inert by) a modal <dialog>.
  if ('popover' in host) host.setAttribute('popover', 'manual')
  root = host.attachShadow({ mode: 'open' })
  const style = document.createElement('style')
  style.textContent = OVERLAY_CSS
  const container = document.createElement('div')
  container.className = 'sf-root'
  root.append(style, container)
  document.documentElement.appendChild(host)
  bringUiToFront()
  return root
}

/**
 * Re-enter the top layer so the overlay sits above a dialog or
 * fullscreen element opened after it. A no-op where popovers are missing.
 */
export function bringUiToFront(): void {
  const el = host as (HTMLElement & { showPopover?: () => void, hidePopover?: () => void }) | null
  if (!el?.showPopover) return
  try {
    if (el.matches(':popover-open')) el.hidePopover?.()
    el.showPopover()
  } catch { /* not connected yet, or popovers unsupported */ }
}

/** The element overlay pieces are appended to. */
export function getUiRoot(): HTMLElement {
  return getUiHost().querySelector('.sf-root') as HTMLElement
}

export function isSmartFillUi(node: Node | null): boolean {
  let current: Node | null = node
  while (current) {
    if (current === host) return true
    if (current instanceof Element && current.hasAttribute?.(HOST_ATTR)) return true
    current = current.parentNode || (current as ShadowRoot).host || null
  }
  return false
}

export function destroyUiHostIfEmpty(): void {
  if (!host || !root) return
  const container = root.querySelector('.sf-root')
  if (container && container.childElementCount > 0) return
  host.remove()
  host = null
  root = null
}

/** Small DOM builder used by the overlay modules. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag)
  if (className) el.className = className
  if (text !== undefined) el.textContent = text
  return el
}

/** Position an absolutely-fixed overlay box over a viewport rect. */
export function placeBox(box: HTMLElement, rect: { left: number, top: number, width: number, height: number }, pad = 0): void {
  box.style.left = `${rect.left - pad}px`
  box.style.top = `${rect.top - pad}px`
  box.style.width = `${rect.width + pad * 2}px`
  box.style.height = `${rect.height + pad * 2}px`
}
