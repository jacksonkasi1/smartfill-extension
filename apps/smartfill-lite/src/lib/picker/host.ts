/**
 * One shadow-rooted overlay host for every piece of SmartFill UI drawn
 * on the page (region picker, panels, field highlights). The host itself
 * never takes pointer events; only the parts that opt in do.
 */

const HOST_ATTR = 'data-smartfill-ui'

let host: HTMLDivElement | null = null
let root: ShadowRoot | null = null

const CSS = `
:host { all: initial; }
.sf-root {
  all: initial;
  position: fixed; inset: 0; pointer-events: none;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI Variable", "Segoe UI", Inter, system-ui, sans-serif;
  font-size: 13px; line-height: 1.4; letter-spacing: -0.01em; color: var(--sf-text);
  -webkit-font-smoothing: antialiased;
  --sf-primary: #0071e3; --sf-primary-hover: #0077ed; --sf-soft: rgba(0, 113, 227, 0.1);
  --sf-success: #248a3d; --sf-success-soft: rgba(52, 199, 89, 0.16); --sf-warning: #b25000;
  --sf-glass: rgba(255, 255, 255, 0.92); --sf-border: rgba(60, 60, 67, 0.14);
  --sf-text: #1d1d1f; --sf-muted: #6e6e73; --sf-surface: rgba(118, 118, 128, 0.1);
  --sf-shadow: 0 1px 1px rgba(0, 0, 0, 0.04), 0 12px 36px rgba(15, 23, 42, 0.16);
}
@media (prefers-color-scheme: dark) {
  .sf-root {
    --sf-primary: #0a84ff; --sf-primary-hover: #409cff; --sf-soft: rgba(10, 132, 255, 0.18);
    --sf-success: #30d158; --sf-success-soft: rgba(48, 209, 88, 0.18); --sf-warning: #ffd60a;
    --sf-glass: rgba(28, 28, 30, 0.92); --sf-border: rgba(255, 255, 255, 0.1);
    --sf-text: #f5f5f7; --sf-muted: rgba(235, 235, 245, 0.62); --sf-surface: rgba(118, 118, 128, 0.24);
    --sf-shadow: 0 1px 1px rgba(0, 0, 0, 0.3), 0 12px 36px rgba(0, 0, 0, 0.5);
  }
}
.sf-root *, .sf-root *::before, .sf-root *::after { box-sizing: border-box; font: inherit; color: inherit; letter-spacing: inherit; }
.sf-root button {
  all: unset; box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  height: 30px; padding: 0 12px; border-radius: 999px; cursor: pointer; font-weight: 500; font-size: 12.5px;
  background: var(--sf-surface); color: var(--sf-text); white-space: nowrap; transition: background 0.15s, opacity 0.15s;
}
.sf-root button:hover:not(:disabled) { background: var(--sf-soft); }
.sf-root button:focus-visible { outline: 2px solid var(--sf-primary); outline-offset: 2px; }
.sf-root button.sf-primary { background: var(--sf-primary); color: #fff; }
.sf-root button.sf-primary:hover:not(:disabled) { background: var(--sf-primary-hover); }
.sf-root button:disabled { opacity: 0.45; cursor: default; }
.sf-root button.sf-link { height: auto; padding: 2px 6px; background: transparent; color: var(--sf-primary); }
.sf-root button.sf-icon { width: 26px; height: 26px; padding: 0; background: transparent; color: var(--sf-muted); }
.sf-root button.sf-icon:hover { background: var(--sf-surface); color: var(--sf-text); }

.sf-card {
  pointer-events: auto; background: var(--sf-glass); border: 1px solid var(--sf-border); border-radius: 14px;
  box-shadow: var(--sf-shadow); -webkit-backdrop-filter: saturate(180%) blur(20px); backdrop-filter: saturate(180%) blur(20px);
}
.sf-dot { flex: none; width: 8px; height: 8px; border-radius: 50%; background: linear-gradient(135deg, #0a84ff, #5e5ce6); }
.sf-muted { color: var(--sf-muted); }

/* ---- picker ---- */
.sf-capture { position: fixed; inset: 0; pointer-events: auto; cursor: crosshair; background: transparent; }
.sf-toolbar {
  position: fixed; top: 14px; left: 50%; transform: translateX(-50%);
  width: max-content; max-width: calc(100vw - 32px);
  display: flex; flex-wrap: wrap; align-items: center; gap: 10px 14px; padding: 10px 12px 10px 16px;
}
.sf-toolbar-copy { display: flex; flex-direction: column; min-width: 0; }
.sf-toolbar-title { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 13.5px; }
.sf-toolbar-hint { font-size: 11.5px; color: var(--sf-muted); }
.sf-count { font-weight: 600; font-size: 12px; color: var(--sf-primary); background: var(--sf-soft); padding: 4px 10px; border-radius: 999px; white-space: nowrap; }
.sf-count.sf-zero { color: var(--sf-muted); background: var(--sf-surface); }
.sf-actions { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }

.sf-box { position: fixed; pointer-events: none; border-radius: 6px; }
.sf-hover { border: 2px solid var(--sf-primary); background: rgba(10, 132, 255, 0.08); }
.sf-container { border: 2px dashed var(--sf-primary); background: rgba(10, 132, 255, 0.04); }
.sf-field { border: 2px solid var(--sf-primary); background: rgba(10, 132, 255, 0.1); border-radius: 5px; }
.sf-field.sf-success { border-color: var(--sf-success); background: var(--sf-success-soft); }
.sf-badge {
  position: absolute; top: -8px; right: -8px; width: 16px; height: 16px; border-radius: 50%;
  background: var(--sf-primary); color: #fff; font-size: 10px; line-height: 16px; text-align: center; font-weight: 700;
}
.sf-tag {
  position: absolute; left: -2px; top: -22px; max-width: 280px; padding: 2px 8px; border-radius: 6px 6px 6px 0;
  background: var(--sf-primary); color: #fff; font-size: 11px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.sf-tag.sf-below { top: auto; bottom: -22px; border-radius: 0 6px 6px 6px; }
.sf-band { position: fixed; pointer-events: none; border: 1.5px solid var(--sf-primary); background: rgba(10, 132, 255, 0.12); border-radius: 4px; }
.sf-band.sf-remove { border-color: #ff3b30; background: rgba(255, 59, 48, 0.1); }

/* ---- page panel ---- */
.sf-panel {
  position: fixed; right: 16px; bottom: 16px; width: 340px; max-width: calc(100vw - 32px);
  padding: 12px 12px 12px 14px; display: flex; flex-direction: column; gap: 8px;
  animation: sf-in 0.18s ease-out;
}
.sf-panel-head { display: flex; align-items: center; gap: 8px; }
.sf-panel-title { flex: 1; min-width: 0; font-weight: 600; font-size: 13.5px; }
.sf-panel-msg { color: var(--sf-muted); font-size: 12.5px; }
.sf-panel.sf-tone-success .sf-dot { background: var(--sf-success); }
.sf-panel.sf-tone-warning .sf-dot { background: var(--sf-warning); }
.sf-spinner {
  width: 12px; height: 12px; border-radius: 50%; border: 2px solid currentColor; border-right-color: transparent;
  animation: sf-spin 0.7s linear infinite;
}
.sf-flash { animation: sf-flash 1.2s ease-out forwards; }
@keyframes sf-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
@keyframes sf-spin { to { transform: rotate(360deg); } }
@keyframes sf-flash { 0% { opacity: 0; } 15% { opacity: 1; } 70% { opacity: 1; } 100% { opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .sf-panel, .sf-flash, .sf-spinner { animation-duration: 0.01s; } }
`

/** The shadow root every SmartFill overlay renders into. Created on first use. */
export function getUiHost(): ShadowRoot {
  if (host && root && host.isConnected) return root
  host = document.createElement('div')
  host.setAttribute(HOST_ATTR, '')
  host.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483647;display:block;margin:0;padding:0;border:0;' +
    'width:100vw;height:100vh;max-width:none;max-height:none;background:transparent;overflow:visible;color:inherit;'
  // A popover lives in the browser's top layer, above (and not made inert by) a modal <dialog>.
  if ('popover' in host) host.setAttribute('popover', 'manual')
  root = host.attachShadow({ mode: 'open' })
  const style = document.createElement('style')
  style.textContent = CSS
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
