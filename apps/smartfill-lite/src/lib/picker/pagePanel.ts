// ** import lib
import { bringUiToFront, destroyUiHostIfEmpty, getUiRoot, h, placeBox } from './host'

export interface PanelAction {
  label: string
  primary?: boolean
  title?: string
  onClick: () => void | Promise<void>
}

export interface PanelOptions {
  title: string
  message?: string
  actions?: PanelAction[]
  /** Fields outlined while the card is hovered. */
  highlight?: HTMLElement[]
  timeoutMs?: number
  tone?: 'info' | 'success' | 'warning'
}

let closeActive: (() => void) | null = null

function drawOutlines(layer: HTMLElement, elements: HTMLElement[], extraClass = '') {
  layer.replaceChildren()
  for (const el of elements) {
    if (!el.isConnected) continue
    const rect = el.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) continue
    const box = h('div', `sf-box sf-field${extraClass}`)
    placeBox(box, rect, 2)
    layer.append(box)
  }
}

/** A compact card in the page's bottom-right corner. Showing a new one replaces the old. */
export function showPagePanel(options: PanelOptions): () => void {
  closeActive?.()

  const ui = getUiRoot()
  bringUiToFront()
  const outlines = h('div', 'sf-layer')
  const card = h('div', `sf-card sf-panel sf-tone-${options.tone || 'info'}`)
  card.setAttribute('role', 'status')
  card.setAttribute('aria-live', 'polite')

  const head = h('div', 'sf-panel-head')
  const titleEl = h('div', 'sf-panel-title', options.title)
  const close = h('button', 'sf-icon', '✕')
  close.type = 'button'
  close.title = 'Close'
  close.setAttribute('aria-label', 'Close')
  head.append(h('span', 'sf-dot'), titleEl, close)
  card.append(head)

  if (options.message) card.append(h('div', 'sf-panel-msg', options.message))

  let closed = false
  let timer = 0
  let hovering = false
  let frame = 0

  if (options.actions?.length) {
    const row = h('div', 'sf-actions')
    for (const action of options.actions) {
      const button = h('button', action.primary ? 'sf-primary' : '', action.label)
      button.type = 'button'
      if (action.title) button.title = action.title
      button.addEventListener('click', async () => {
        if (button.disabled) return
        let pending: void | Promise<void> = undefined
        try {
          pending = action.onClick()
        } catch (error) {
          console.error('[SmartFill] Panel action failed:', error)
        }
        if (pending && typeof (pending as Promise<void>).then === 'function') {
          row.querySelectorAll('button').forEach(b => { b.disabled = true })
          button.prepend(h('span', 'sf-spinner'))
          try {
            await pending
          } catch (error) {
            console.error('[SmartFill] Panel action failed:', error)
          }
        }
        closePanel()
      })
      row.append(button)
    }
    card.append(row)
  }

  const highlight = options.highlight || []
  function trackOutlines() {
    if (!hovering || closed) return
    drawOutlines(outlines, highlight)
    frame = requestAnimationFrame(trackOutlines)
  }

  function arm() {
    if (!options.timeoutMs || closed) return
    window.clearTimeout(timer)
    timer = window.setTimeout(closePanel, options.timeoutMs)
  }

  card.addEventListener('mouseenter', () => {
    hovering = true
    window.clearTimeout(timer)
    trackOutlines()
  })
  card.addEventListener('mouseleave', () => {
    hovering = false
    cancelAnimationFrame(frame)
    outlines.replaceChildren()
    arm()
  })
  close.addEventListener('click', () => closePanel())

  function closePanel() {
    if (closed) return
    closed = true
    if (closeActive === closePanel) closeActive = null
    window.clearTimeout(timer)
    cancelAnimationFrame(frame)
    card.remove()
    outlines.remove()
    destroyUiHostIfEmpty()
  }

  ui.append(outlines, card)
  closeActive = closePanel
  arm()
  return closePanel
}

/** A brief outline pulse on each field, e.g. right after a fill. */
export function flashFields(elements: HTMLElement[], tone: 'success' | 'info' = 'success'): void {
  if (elements.length === 0) return
  const layer = h('div', 'sf-layer sf-flash')
  drawOutlines(layer, elements, tone === 'success' ? ' sf-success' : '')
  if (!layer.childElementCount) return
  getUiRoot().append(layer)
  window.setTimeout(() => {
    layer.remove()
    destroyUiHostIfEmpty()
  }, 1200)
}
