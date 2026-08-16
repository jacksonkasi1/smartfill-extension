// ** import types
import type { FormField, AIFormData } from '@/types/extension'

// ---------------------------------------------------------------------------
// Native value setters that survive React-controlled inputs
// ---------------------------------------------------------------------------
const HTMLInputValueSetter = Object.getOwnPropertyDescriptor(
  HTMLInputElement.prototype, 'value'
)?.set
const HTMLTextAreaValueSetter = Object.getOwnPropertyDescriptor(
  HTMLTextAreaElement.prototype, 'value'
)?.set
const HTMLSelectValueSetter = Object.getOwnPropertyDescriptor(
  HTMLSelectElement.prototype, 'value'
)?.set

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resolve the AI-returned value for a given detected field. Tries
 * exact match, then case-insensitive match, then a containment
 * match. Returns `null` if nothing maps.
 */
export function getFieldValue(field: FormField, data: AIFormData): any {
  if (data[field.name] !== undefined) return data[field.name]

  const lower = field.name.toLowerCase()
  const direct = Object.keys(data).find(k => k.toLowerCase() === lower)
  if (direct) return data[direct]

  let bestKey: string | undefined
  for (const key of Object.keys(data)) {
    const lk = key.toLowerCase()
    if (lk.includes(lower) || lower.includes(lk)) {
      if (!bestKey || key.length < bestKey.length) bestKey = key
    }
  }
  return bestKey !== undefined ? data[bestKey] : null
}

/**
 * Fills a native input, native textarea, or contenteditable element.
 * Uses the native prototype setter to defeat React-controlled wrappers
 * and dispatches a real `input` + `change` + `blur` so the host
 * framework sees the change.
 */
export function fillTextField(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLDivElement,
  value: string
): boolean {
  try {
    if (element instanceof HTMLInputElement && HTMLInputValueSetter) {
      HTMLInputValueSetter.call(element, value)
    } else if (element instanceof HTMLTextAreaElement && HTMLTextAreaValueSetter) {
      HTMLTextAreaValueSetter.call(element, value)
    } else if (element instanceof HTMLElement && element.getAttribute('contenteditable') === 'true') {
      fillContentEditable(element, value)
    } else if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      element.value = value
    } else {
      return false
    }
    triggerEvents(element)
    return true
  } catch (error) {
    console.error('Error filling text field:', error)
    return false
  }
}

/**
 * Native <select> filling. Returns `false` if no option matches.
 *
 * Matching order:
 *   1. exact value match
 *   2. exact text match
 *   3. case-insensitive exact match
 *   4. substring match ONLY when both sides are non-empty
 *      (a blank AI value must NEVER pick a real option via
 *      `"Full Time".includes("")`).
 *
 * If the target is empty, we only select an option whose own value
 * and text are also empty (i.e. a genuine blank / placeholder).
 */
export function fillSelectField(element: HTMLSelectElement, value: string): boolean {
  try {
    if (!element || !element.options) return false
    const target = String(value).trim()
    const targetLower = target.toLowerCase()

    const options = Array.from(element.options)

    if (target === '') {
      const blank = options.find(opt => opt.value === '' && (opt.text || '').trim() === '')
      if (!blank) return false
      if (HTMLSelectValueSetter) {
        HTMLSelectValueSetter.call(element, blank.value)
      } else {
        element.value = blank.value
      }
      triggerEvents(element)
      return true
    }

    const option = options.find(opt => {
      const optValue = (opt.value || '').trim()
      const optText = (opt.text || '').trim()
      const optTextLower = optText.toLowerCase()
      // 1. exact value
      if (optValue === target) return true
      // 2. exact text
      if (optText === target) return true
      // 3. case-insensitive exact
      if (optTextLower === targetLower) return true
      // 4. substring — only when both sides are non-empty
      if (optValue && optValue.toLowerCase().includes(targetLower)) return true
      if (optText && optTextLower.includes(targetLower)) return true
      if (targetLower && optValue.toLowerCase().includes(targetLower)) return true
      return false
    })

    if (!option) return false

    if (HTMLSelectValueSetter) {
      HTMLSelectValueSetter.call(element, option.value)
    } else {
      element.value = option.value
    }
    triggerEvents(element)
    return true
  } catch (error) {
    console.error('Error filling select field:', error)
    return false
  }
}

/**
 * Custom dropdown (MUI / Ant / ARIA combobox / etc.) filling.
 *
 * Strategy:
 *   1. Focus + click the trigger so the host UI opens its popup.
 *   2. Resolve the popup element via aria-controls / aria-owns /
 *      active visible [role="listbox"].
 *   3. Match an option by data-value / text / aria-label.
 *   4. Click it.
 *   5. Trigger input/change on the trigger so React / Vue pick it up.
 *
 * Uses a short bounded polling wait only if the popup is rendered
 * asynchronously (typically <150 ms in modern UI kits).
 */
export async function fillCustomSelect(
  trigger: HTMLElement,
  value: string
): Promise<boolean> {
  try {
    trigger.focus()

    // Some popups open on click rather than focus — try clicking the trigger.
    trigger.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))
    trigger.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }))
    trigger.click()

    const popup = await resolveCustomSelectPopup(trigger, 250)
    if (!popup) return false

    const option = findCustomOption(popup, value)
    if (!option) return false

    option.scrollIntoView({ block: 'nearest' })
    option.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
    option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))
    option.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }))
    option.click()

    // The host framework is listening on the trigger, not the option.
    trigger.dispatchEvent(new Event('input', { bubbles: true }))
    trigger.dispatchEvent(new Event('change', { bubbles: true }))
    trigger.dispatchEvent(new Event('blur', { bubbles: true }))

    return true
  } catch (error) {
    console.error('Error filling custom select:', error)
    return false
  }
}

export function fillRadioField(
  element: HTMLInputElement,
  value: string,
  container: Element
): boolean {
  try {
    const name = element.name
    if (!name) return false

    const radios = container.querySelectorAll(
      `input[name="${cssEscape(name)}"][type="radio"]`
    ) as NodeListOf<HTMLInputElement>

    const target = String(value).trim()
    const targetLower = target.toLowerCase()
    for (const radio of radios) {
      const label = (
        radio.nextElementSibling?.textContent?.trim() ||
        radio.closest('label')?.textContent?.trim() ||
        radio.value ||
        radio.getAttribute('aria-label') ||
        ''
      ).trim()
      const lowered = label.toLowerCase()
      if (target === '' || label === '') continue
      if (
        label === target ||
        lowered === targetLower ||
        lowered.includes(targetLower) ||
        targetLower.includes(lowered)
      ) {
        radio.focus()
        radio.checked = true
        triggerEvents(radio)
        return true
      }
    }
    return false
  } catch (error) {
    console.error('Error filling radio field:', error)
    return false
  }
}

export function fillCheckboxField(
  element: HTMLInputElement,
  value: any,
  container?: Element
): boolean {
  try {
    if (Array.isArray(value)) {
      return fillCheckboxGroup(element, value, container || document.body)
    }

    element.focus()
    const shouldCheck = shouldCheckFromValue(value)
    element.checked = shouldCheck
    triggerEvents(element)
    return true
  } catch (error) {
    console.error('Error filling checkbox field:', error)
    return false
  }
}

export function fillCheckboxGroup(
  element: HTMLInputElement,
  values: string[],
  container: Element
): boolean {
  try {
    const name = element.name
    if (!name) return false

    const checkboxes = container.querySelectorAll(
      `input[name="${cssEscape(name)}"][type="checkbox"]`
    ) as NodeListOf<HTMLInputElement>
    const loweredTargets = values
      .map(v => String(v).trim().toLowerCase())
      .filter(t => t.length > 0)
    let filled = 0

    for (const cb of checkboxes) {
      const rawLabel =
        cb.nextElementSibling?.textContent?.trim() ||
        cb.closest('label')?.textContent?.trim() ||
        cb.value ||
        cb.getAttribute('aria-label') ||
        ''
      const label = rawLabel.trim()
      // Skip empty-label candidates — they can otherwise match any
      // target via `target.includes("")`.
      const lowered = label.toLowerCase()
      let matched = false
      if (label && loweredTargets.length > 0) {
        matched = loweredTargets.some(t =>
          lowered === t || (lowered && t && (lowered.includes(t) || t.includes(lowered)))
        )
      }
      cb.focus()
      cb.checked = matched
      triggerEvents(cb)
      if (matched) filled++
    }

    return filled > 0
  } catch (error) {
    console.error('Error filling checkbox group:', error)
    return false
  }
}

/**
 * Fill a contenteditable element with text, dispatching a real
 * `InputEvent` so framework handlers (React / Vue) update.
 */
export function fillContentEditable(element: HTMLElement, value: string): boolean {
  try {
    element.focus()

    // Select all existing content, then replace with the new value.
    const range = document.createRange()
    range.selectNodeContents(element)
    const sel = window.getSelection()
    if (sel) {
      sel.removeAllRanges()
      sel.addRange(range)
    }

    if (typeof document.execCommand === 'function') {
      // execCommand triggers the same input/change pipeline a real
      // user keystroke would. Fall back to textContent if the
      // browser no longer supports it (some modern Chrome flags).
      try {
        document.execCommand('insertText', false, value)
        triggerEvents(element)
        return true
      } catch {
        /* fall through to textContent path */
      }
    }

    element.textContent = value
    element.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      inputType: 'insertText',
      data: value
    }))
    element.dispatchEvent(new Event('change', { bubbles: true }))
    return true
  } catch (error) {
    console.error('Error filling contenteditable:', error)
    return false
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

export function triggerEvents(element: HTMLElement): void {
  const events = ['input', 'change', 'blur']
  for (const type of events) {
    element.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }))
  }
}

function shouldCheckFromValue(value: any): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase()
    if (v === 'true' || v === '1' || v === 'yes' || v === 'on' || v === 'checked') return true
    if (v === 'false' || v === '0' || v === 'no' || v === 'off' || v === 'unchecked' || v === '') return false
  }
  return Boolean(value)
}

async function resolveCustomSelectPopup(
  trigger: HTMLElement,
  totalBudgetMs: number
): Promise<HTMLElement | null> {
  const start = performance.now()
  const pollInterval = 25
  const explicit = trigger.getAttribute('aria-controls') || trigger.getAttribute('aria-owns')
  if (explicit) {
    const el = document.getElementById(explicit)
    if (el) return el
  }

  while (performance.now() - start < totalBudgetMs) {
    const popup = findVisibleListboxNear(trigger)
    if (popup) return popup
    await sleep(pollInterval)
  }
  return null
}

function findVisibleListboxNear(trigger: HTMLElement): HTMLElement | null {
  // 1. A listbox already attached to the body / portal
  const all = document.querySelectorAll('[role="listbox"]')
  for (const el of Array.from(all)) {
    if (isElementVisible(el as HTMLElement)) return el as HTMLElement
  }
  // 2. aria-controls might point to something that just appeared
  const ac = trigger.getAttribute('aria-controls')
  if (ac) {
    const el = document.getElementById(ac)
    if (el && isElementVisible(el)) return el
  }
  // 3. A portal that lives next to the trigger
  let parent: HTMLElement | null = trigger.parentElement
  for (let i = 0; i < 4 && parent; i++) {
    const popup = parent.querySelector('[role="listbox"], [role="menu"]')
    if (popup && isElementVisible(popup as HTMLElement)) return popup as HTMLElement
    parent = parent.parentElement
  }
  return null
}

function findCustomOption(popup: HTMLElement, value: string): HTMLElement | null {
  const target = String(value).trim().toLowerCase()
  // Empty target must never pick a real option. Without this guard
  // "Full Time".includes("") would be true for any option.
  if (!target) return null

  const candidates = popup.querySelectorAll(
    '[role="option"], li[role="option"], li[role="menuitem"], [data-value], li'
  )

  for (const c of Array.from(candidates)) {
    const opt = c as HTMLElement
    const dv = (opt.getAttribute('data-value') || '').trim().toLowerCase()
    const text = (opt.textContent || '').trim().toLowerCase()
    const aria = (opt.getAttribute('aria-label') || '').trim().toLowerCase()

    // 1. exact data-value
    if (dv && dv === target) return opt
    // 2. exact text
    if (text && text === target) return opt
    // 3. exact aria-label
    if (aria && aria === target) return opt
    // 4. case-insensitive exact (already lowercased)
    // 5. substring / fuzzy — only when both sides are non-empty
    if (dv && dv.includes(target)) return opt
    if (text && text.includes(target)) return opt
    if (aria && aria.includes(target)) return opt
    if (dv && target.includes(dv)) return opt
    if (text && target.includes(text)) return opt
    if (aria && target.includes(aria)) return opt
  }
  return null
}

function isElementVisible(el: HTMLElement): boolean {
  if (el.hidden) return false
  if (el.getAttribute('aria-hidden') === 'true') return false
  const rect = el.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) return false
  return true
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

/**
 * CSS.escape polyfill-ish for attribute selectors that contain
 * characters like `:` or `.`. We support the common case; the
 * browser's built-in `CSS.escape` is preferred when available.
 */
function cssEscape(value: string): string {
  const css = (window as any).CSS
  if (css && typeof css.escape === 'function') return css.escape(value)
  return value.replace(/(["\\])/g, '\\$1')
}
