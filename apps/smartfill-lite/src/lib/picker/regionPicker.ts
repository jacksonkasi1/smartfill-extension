// ** import lib
import { bringUiToFront, destroyUiHostIfEmpty, getUiRoot, h, isSmartFillUi, placeBox } from './host'

export interface PickerResult {
  elements: HTMLElement[]
  containers: Element[]
}

export interface PickerOptions {
  /** Every detected fillable field on the page (may live in open shadow roots). */
  fields: HTMLElement[]
  /** Fields that start selected, e.g. from a saved form. */
  initial?: HTMLElement[]
  /** `null` means the user cancelled. */
  onDone: (result: PickerResult | null, fillNow: boolean) => void
}

const DRAG_THRESHOLD = 6
const BLOCKED_EVENTS = ['click', 'dblclick', 'mousedown', 'mouseup', 'pointerdown', 'pointerup', 'auxclick', 'contextmenu'] as const

let activeTeardown: (() => void) | null = null

/** Parent that also crosses open shadow-root boundaries. */
function deepParent(node: Element): Element | null {
  if (node.parentElement) return node.parentElement
  const root = node.getRootNode?.()
  return root instanceof ShadowRoot ? root.host : null
}

function deepContains(ancestor: Element, node: Element): boolean {
  let current: Element | null = node
  while (current) {
    if (current === ancestor) return true
    current = deepParent(current)
  }
  return false
}

/** Topmost page element under a point, descending into open shadow roots. */
function hitTest(x: number, y: number): Element | null {
  if (typeof document.elementsFromPoint !== 'function') return null
  let hit = document.elementsFromPoint(x, y).find(el => !isSmartFillUi(el)) || null
  for (let depth = 0; hit?.shadowRoot && depth < 8; depth++) {
    const inner = hit.shadowRoot.elementsFromPoint?.(x, y).find(el => el !== hit && !isSmartFillUi(el))
    if (!inner || inner === hit) break
    hit = inner
  }
  return hit
}

function hasArea(rect: DOMRect): boolean {
  return rect.width > 0 && rect.height > 0
}

function inside(rect: DOMRect, x: number, y: number, pad = 0): boolean {
  return x >= rect.left - pad && x <= rect.right + pad && y >= rect.top - pad && y <= rect.bottom + pad
}

function describeContainer(el: Element, count: number): string {
  const heading = el.querySelector?.('legend, h1, h2, h3, h4, h5, h6, [role="heading"]')?.textContent?.replace(/\s+/g, ' ').trim()
  const name = heading
    || el.getAttribute('aria-label')
    || (el.id ? `${el.tagName.toLowerCase()}#${el.id}` : el.tagName.toLowerCase())
  const short = name.length > 32 ? `${name.slice(0, 31)}…` : name
  return `${short} · ${count} field${count === 1 ? '' : 's'}`
}

export function startRegionPicker(options: PickerOptions): () => void {
  activeTeardown?.()

  const fields = options.fields.filter(Boolean)
  const fieldSet = new Set(fields)
  const selectedFields = new Set<HTMLElement>((options.initial || []).filter(f => fieldSet.has(f)))
  const selectedContainers = new Set<Element>()

  // Hover state: the ladder of ancestors that contain more and more fields.
  let ladder: Element[] = []
  let level = 0
  let hoverBase: Element | null = null

  let drag: { x: number, y: number, moved: boolean, remove: boolean } | null = null
  /** When the last pointerdown/up pick happened; the click that follows it is not a second pick. */
  let lastPointerPick = 0
  let band: { left: number, top: number, right: number, bottom: number } | null = null
  let dirty = true
  let frame = 0
  let finished = false

  const fieldsIn = (container: Element) => fields.filter(f => deepContains(container, f))

  // ---- DOM ----
  const ui = getUiRoot()
  bringUiToFront()
  const layer = h('div', 'sf-layer')
  const capture = h('div', 'sf-capture')
  const toolbar = h('div', 'sf-card sf-toolbar')
  toolbar.setAttribute('role', 'dialog')
  toolbar.setAttribute('aria-label', 'SmartFill form selection')

  const copy = h('div', 'sf-toolbar-copy')
  const title = h('div', 'sf-toolbar-title')
  title.append(h('span', 'sf-dot'), h('span', '', 'Select the form to fill'))
  const hint = h('div', 'sf-toolbar-hint', 'Click a form · drag to draw an area · Shift+click a field to toggle it · ↑/↓ widen/narrow')
  copy.append(title, hint)

  const count = h('span', 'sf-count')
  count.setAttribute('aria-live', 'polite')
  const clear = h('button', 'sf-link', 'Clear')
  clear.type = 'button'
  const cancel = h('button', '', 'Cancel')
  cancel.type = 'button'
  cancel.title = 'Esc'
  const save = h('button', '', 'Save area')
  save.type = 'button'
  const saveFill = h('button', 'sf-primary', 'Save & fill')
  saveFill.type = 'button'
  saveFill.title = 'Enter'
  const actions = h('div', 'sf-actions')
  actions.append(count, clear, cancel, save, saveFill)
  toolbar.append(copy, actions)

  ui.append(layer, capture, toolbar)

  clear.addEventListener('click', () => {
    selectedFields.clear()
    selectedContainers.clear()
    changed()
  })
  cancel.addEventListener('click', () => finish(false, false))
  save.addEventListener('click', () => finish(true, false))
  saveFill.addEventListener('click', () => finish(true, true))

  function changed() {
    const n = selectedFields.size
    count.textContent = `${n} field${n === 1 ? '' : 's'} selected`
    count.classList.toggle('sf-zero', n === 0)
    clear.style.display = n > 0 ? '' : 'none'
    save.disabled = n === 0
    saveFill.disabled = n === 0
    dirty = true
  }

  // ---- hover ----
  function updateHover(x: number, y: number) {
    const hit = hitTest(x, y)
    if (!hit) {
      if (ladder.length) { ladder = []; hoverBase = null; dirty = true }
      return
    }
    const next: Element[] = []
    let last = 1
    for (let el: Element | null = hit; el && el !== document.documentElement; el = deepParent(el)) {
      const n = fieldsIn(el).length
      if (n >= 2 && n > last) {
        next.push(el)
        last = n
      }
    }
    const base = next[0] || null
    if (base !== hoverBase) {
      hoverBase = base
      level = 0
    }
    ladder = next
    level = Math.min(level, Math.max(0, ladder.length - 1))
    dirty = true
  }

  const hovered = () => ladder[level] || null

  function fieldAt(x: number, y: number): HTMLElement | null {
    let best: HTMLElement | null = null
    let bestArea = Infinity
    for (const field of fields) {
      const rect = field.getBoundingClientRect()
      if (!hasArea(rect) || !inside(rect, x, y, 4)) continue
      const area = rect.width * rect.height
      if (area < bestArea) { best = field; bestArea = area }
    }
    if (best) return best
    const hit = hitTest(x, y)
    // Only the field under the pointer (or one it is inside), never a field the hit element merely contains.
    return hit ? fields.find(f => f === hit || deepContains(f, hit)) || null : null
  }

  function toggleField(field: HTMLElement) {
    if (selectedFields.has(field)) selectedFields.delete(field)
    else selectedFields.add(field)
    changed()
  }

  function toggleContainer(container: Element) {
    const inner = fieldsIn(container)
    if (selectedContainers.has(container)) {
      selectedContainers.delete(container)
      inner.forEach(f => selectedFields.delete(f))
    } else {
      // A wider area replaces the narrower ones it covers.
      for (const other of Array.from(selectedContainers)) {
        if (deepContains(container, other)) selectedContainers.delete(other)
      }
      selectedContainers.add(container)
      inner.forEach(f => selectedFields.add(f))
    }
    changed()
  }

  function applyBand(remove: boolean) {
    if (!band) return
    for (const field of fields) {
      const rect = field.getBoundingClientRect()
      if (!hasArea(rect)) continue
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      if (cx < band.left || cx > band.right || cy < band.top || cy > band.bottom) continue
      if (remove) selectedFields.delete(field)
      else selectedFields.add(field)
    }
    changed()
  }

  // ---- events ----
  const fromToolbar = (event: Event) => event.composedPath().some(n => n === toolbar)

  function onBlocked(event: Event) {
    if (fromToolbar(event)) {
      // A drag released over the toolbar ends there, with nothing picked.
      if (event.type === 'pointerup' && drag) {
        drag = null
        band = null
        dirty = true
      }
      return
    }
    event.preventDefault()
    event.stopImmediatePropagation()
    const e = event as PointerEvent
    if (event.type === 'pointerdown' && e.button === 0) {
      drag = { x: e.clientX, y: e.clientY, moved: false, remove: e.altKey }
    } else if (event.type === 'pointerup' && drag) {
      const wasDrag = drag.moved
      const remove = drag.remove || e.altKey
      drag = null
      lastPointerPick = performance.now()
      if (wasDrag) {
        applyBand(remove)
        band = null
        dirty = true
        return
      }
      // The ladder may be stale if the pointer did not move since the last frame.
      updateHover(e.clientX, e.clientY)
      pick(e.clientX, e.clientY, e.shiftKey)
    } else if (event.type === 'click' && e.button === 0 && (e.clientX !== 0 || e.clientY !== 0) &&
      performance.now() - lastPointerPick > 500) {
      // A bare click with no pointer events before it (assistive tech,
      // automation): treat it as a tap where it landed. Keyboard clicks
      // report (0, 0) and are ignored.
      updateHover(e.clientX, e.clientY)
      pick(e.clientX, e.clientY, e.shiftKey)
    }
  }

  function pick(x: number, y: number, single: boolean) {
    if (single) {
      const field = fieldAt(x, y)
      if (field) toggleField(field)
      return
    }
    const container = hovered()
    if (container) toggleContainer(container)
    else {
      const field = fieldAt(x, y)
      if (field) toggleField(field)
    }
  }

  function onMove(event: Event) {
    if (fromToolbar(event)) return
    const e = event as PointerEvent
    if (drag) {
      const dx = e.clientX - drag.x
      const dy = e.clientY - drag.y
      if (!drag.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) drag.moved = true
      if (drag.moved) {
        band = {
          left: Math.min(drag.x, e.clientX), top: Math.min(drag.y, e.clientY),
          right: Math.max(drag.x, e.clientX), bottom: Math.max(drag.y, e.clientY)
        }
        dirty = true
        return
      }
    }
    updateHover(e.clientX, e.clientY)
  }

  function onKey(event: KeyboardEvent) {
    if (event.key === 'Escape') finish(false, false)
    else if (event.key === 'Enter') {
      // Enter on a focused toolbar button activates that button instead.
      const button = event.composedPath().find(n => n instanceof HTMLButtonElement)
      if (button && button !== saveFill) return
      if (selectedFields.size === 0) return
      finish(true, true)
    } else if (event.key === 'ArrowUp') {
      if (level < ladder.length - 1) { level++; dirty = true }
    } else if (event.key === 'ArrowDown') {
      if (level > 0) { level--; dirty = true }
    } else return
    event.preventDefault()
    event.stopImmediatePropagation()
  }

  const onViewport = () => { dirty = true }

  for (const type of BLOCKED_EVENTS) window.addEventListener(type, onBlocked, true)
  window.addEventListener('pointermove', onMove, true)
  window.addEventListener('keydown', onKey, true)
  window.addEventListener('scroll', onViewport, true)
  window.addEventListener('resize', onViewport)

  // ---- drawing ----
  function render() {
    frame = requestAnimationFrame(render)
    if (!dirty) return
    dirty = false
    layer.replaceChildren()

    for (const container of selectedContainers) {
      const rect = container.getBoundingClientRect()
      if (!hasArea(rect)) continue
      const box = h('div', 'sf-box sf-container')
      placeBox(box, rect, 4)
      layer.append(box)
    }

    const hover = hovered()
    if (hover && !drag?.moved) {
      const rect = hover.getBoundingClientRect()
      if (hasArea(rect)) {
        const box = h('div', 'sf-box sf-hover')
        placeBox(box, rect, 4)
        const tag = h('div', `sf-tag${rect.top < 30 ? ' sf-below' : ''}`, describeContainer(hover, fieldsIn(hover).length))
        box.append(tag)
        layer.append(box)
      }
    }

    for (const field of selectedFields) {
      const rect = field.getBoundingClientRect()
      if (!hasArea(rect)) continue
      const box = h('div', 'sf-box sf-field')
      placeBox(box, rect, 2)
      box.append(h('span', 'sf-badge', '✓'))
      layer.append(box)
    }

    if (band) {
      const box = h('div', `sf-band${drag?.remove ? ' sf-remove' : ''}`)
      placeBox(box, { left: band.left, top: band.top, width: band.right - band.left, height: band.bottom - band.top })
      layer.append(box)
    }
  }

  // ---- result ----
  function lowestCommonAncestor(elements: Element[]): Element | null {
    if (elements.length === 0) return null
    for (let el: Element | null = elements[0]; el; el = deepParent(el)) {
      if (elements.every(other => deepContains(el!, other))) return el
    }
    return document.body
  }

  function result(): PickerResult {
    const elements = fields.filter(f => selectedFields.has(f))
    const containers = Array.from(selectedContainers)
    const loose = elements.filter(f => !containers.some(c => deepContains(c, f)))
    if (loose.length) {
      const lca = lowestCommonAncestor(loose)
      if (lca) containers.push(lca)
    }
    return { elements, containers }
  }

  function teardown() {
    if (activeTeardown === stop) activeTeardown = null
    cancelAnimationFrame(frame)
    for (const type of BLOCKED_EVENTS) window.removeEventListener(type, onBlocked, true)
    window.removeEventListener('pointermove', onMove, true)
    window.removeEventListener('keydown', onKey, true)
    window.removeEventListener('scroll', onViewport, true)
    window.removeEventListener('resize', onViewport)
    layer.remove()
    capture.remove()
    toolbar.remove()
    destroyUiHostIfEmpty()
  }

  function finish(saved: boolean, fillNow: boolean) {
    if (finished) return
    if (saved && selectedFields.size === 0) return
    finished = true
    const value = saved ? result() : null
    teardown()
    options.onDone(value, saved && fillNow)
  }

  function stop() {
    if (finished) return
    finished = true
    teardown()
  }
  activeTeardown = stop

  changed()
  frame = requestAnimationFrame(render)
  saveFill.focus?.()

  return stop
}
