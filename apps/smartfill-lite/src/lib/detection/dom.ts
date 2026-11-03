/**
 * DOM helpers that understand open shadow roots. Web-component forms
 * (Lightning, Ionic, Shoelace, Lit) keep their inputs inside shadow
 * roots, where `document.querySelectorAll` and `closest()` never look.
 */

/** Every element matching `selector` in `root` and in all open shadow roots below it, in document order. */
export function queryAllDeep(root: ParentNode, selector: string): HTMLElement[] {
  const found: HTMLElement[] = []
  const visit = (scope: ParentNode) => {
    for (const el of Array.from(scope.querySelectorAll<HTMLElement>('*'))) {
      if (el.matches(selector)) found.push(el)
      if (el.shadowRoot) visit(el.shadowRoot)
    }
  }
  visit(root)
  return found
}

/** Parent that crosses shadow boundaries: an element in a shadow root has its host as parent. */
export function parentOf(node: Node): Element | null {
  if (node.parentElement) return node.parentElement
  const root = node.getRootNode?.()
  return root && root !== node && 'host' in root ? (root as ShadowRoot).host : null
}

/** `closest()` that keeps climbing out of shadow roots. */
export function closestDeep(el: Element, selector: string): Element | null {
  let current: Element | null = el
  while (current) {
    const hit = current.closest(selector)
    if (hit) return hit
    const root = current.getRootNode()
    current = 'host' in root ? (root as ShadowRoot).host : null
  }
  return null
}

/** `contains()` that sees into shadow roots. */
export function containsDeep(ancestor: Node, node: Node): boolean {
  let current: Node | null = node
  while (current) {
    if (current === ancestor) return true
    current = current.parentNode || (current as ShadowRoot).host || null
  }
  return false
}

/** Document or shadow root the element lives in, for id and `label[for]` lookups. */
export function rootOf(el: Element): Document | ShadowRoot {
  const root = el.getRootNode()
  return root instanceof ShadowRoot || root instanceof Document ? root : document
}

export function byId(el: Element, id: string): HTMLElement | null {
  const root = rootOf(el)
  return (root as Document).getElementById?.(id) ?? root.querySelector<HTMLElement>(`#${cssEscape(id)}`)
}

export function cssEscape(value: string): string {
  const css = (globalThis as any).CSS
  if (css && typeof css.escape === 'function') return css.escape(value)
  return value.replace(/([^a-zA-Z0-9_-])/g, '\\$1')
}

/**
 * Whether the element is rendered at all (not display:none / hidden /
 * visibility:hidden anywhere up the tree). Opacity-0 and clipped
 * "sr-only" inputs count as rendered: custom checkboxes rely on them.
 */
export function isRendered(el: Element): boolean {
  if ((el as HTMLElement).hidden) return false
  if (typeof (el as any).checkVisibility === 'function') {
    return (el as any).checkVisibility({ visibilityProperty: true })
  }
  // Environments without layout (tests): walk the computed styles.
  let current: Element | null = el
  while (current) {
    if ((current as HTMLElement).hidden) return false
    const style = getComputedStyle(current)
    if (style.display === 'none') return false
    if (current === el && style.visibility === 'hidden') return false
    current = parentOf(current)
  }
  return true
}

/** Short CSS path, preferring ids, so a saved area can be found again. */
export function cssPath(el: Element): string {
  const parts: string[] = []
  let current: Element | null = el
  while (current && current.nodeType === 1 && parts.length < 8) {
    const tag = current.tagName.toLowerCase()
    if (current.id && !/\d{3,}|^(:|radix-|_r_|mui-|react-)/i.test(current.id)) {
      parts.unshift(`${tag}#${cssEscape(current.id)}`)
      break
    }
    const parent: Element | null = current.parentElement
    if (!parent) {
      parts.unshift(tag)
      break
    }
    const same = Array.from(parent.children).filter(c => c.tagName === current!.tagName)
    parts.unshift(same.length > 1 ? `${tag}:nth-of-type(${same.indexOf(current) + 1})` : tag)
    current = parent
  }
  return parts.join(' > ')
}

/** Lowest element containing every node in the list (shadow aware). */
export function commonAncestor(nodes: Element[]): Element | null {
  if (nodes.length === 0) return null
  let candidate: Element | null = nodes[0]
  while (candidate) {
    const c = candidate
    if (nodes.every(n => containsDeep(c, n))) return candidate
    candidate = parentOf(candidate)
  }
  return null
}
