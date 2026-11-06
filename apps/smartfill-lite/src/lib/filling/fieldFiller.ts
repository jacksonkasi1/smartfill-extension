// ** import types
import type { FormField, AIFormData } from '@/types/extension'

// ** import utils
import { byId, cssEscape } from '@/lib/detection/dom'
import { optionLabel } from '@/lib/detection/fieldOptions'
import { isReadonlyCombobox } from '@/lib/detection/fieldTypes'
import { isCustomSelectTrigger, isInsideForm, isPageChrome } from '@/lib/detection/safety'

// ** import constants
import { CUSTOM_POPUP_BUDGET_MS } from './constants'

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
// React intercepts the prototype `checked` property as well; using
// the native setter is what survives React-controlled checkbox and
// radio inputs.
const HTMLInputCheckedSetter = Object.getOwnPropertyDescriptor(
  HTMLInputElement.prototype, 'checked'
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
    } else if (element instanceof HTMLElement && (element.isContentEditable || element.hasAttribute('contenteditable'))) {
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

/**
 * Native <select> filling. Returns `false` if no option matches.
 *
 * Exact matches (value, text, case-insensitive text) win over partial
 * ones, so "Male" never lands on "Female". A blank target only selects
 * a genuinely blank option.
 */
export function fillSelectField(element: HTMLSelectElement, value: string): boolean {
  try {
    if (!element || !element.options) return false
    const target = String(value).trim()
    const options = Array.from(element.options).filter(opt => !opt.disabled)

    const option = target === ''
      ? options.find(opt => opt.value === '' && (opt.text || '').trim() === '')
      : bestMatch(options, target, opt => [opt.value, opt.text])
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
 * Custom dropdown (Radix / MUI / Ant / Headless UI / ARIA combobox).
 *
 * Only elements that declare themselves dropdowns are ever clicked
 * (`role="combobox"` or `aria-haspopup="listbox"`), and only a popup
 * with `role="listbox"` is accepted, so a menu button can never fire a
 * menu action. If no listbox opens the trigger is closed again.
 */
export async function fillCustomSelect(trigger: HTMLElement, value: string): Promise<boolean> {
  try {
    if (!isCustomSelectTrigger(trigger) && !isReadonlyCombobox(trigger)) return false
    // Detection already vetted the label; this is the last line against nav widgets.
    if (isPageChrome(trigger)) return false

    const before = visibleListboxes()
    const popup = await openListbox(trigger, before)
    if (!popup) {
      // Something without a listbox may have opened; close only that.
      if (trigger.getAttribute('aria-expanded') === 'true') closePopup(trigger)
      return false
    }

    const option = findCustomOption(popup, value) ?? randomCustomOption(popup)
    if (!option) {
      closePopup(trigger, popup)
      return false
    }

    option.scrollIntoView?.({ block: 'nearest' })
    pointerSequence(option, ['pointerover', 'pointerenter', 'mouseover', 'pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'])

    // The host framework is listening on the trigger, not the option.
    trigger.dispatchEvent(new Event('input', { bubbles: true }))
    trigger.dispatchEvent(new Event('change', { bubbles: true }))

    await sleep(20)
    // Multi-select listboxes stay open after a pick; close them.
    if (popup.isConnected && isElementVisible(popup)) closePopup(trigger, popup)
    return true
  } catch (error) {
    console.error('Error filling custom select:', error)
    return false
  }
}

/**
 * Editable combobox (react-select, autocompletes): type the value, then
 * pick the matching suggestion if the widget shows one. When nothing
 * matches the typed text is left as it is.
 */
export async function fillComboboxInput(input: HTMLInputElement, value: string): Promise<boolean> {
  // Listboxes already on screen (a contact list, a transfer list) are not this input's suggestions.
  const before = visibleListboxes()
  if (!fillTextField(input, value)) return false
  // Suggestions outside a form are usually search results that navigate.
  if (isPageChrome(input) || !isInsideForm(input)) return true
  const popup = await waitForListbox(input, before, 250)
  if (!popup) return true
  const option = findCustomOption(popup, value)
  if (option) pointerSequence(option, ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'])
  else closePopup(input, popup)
  return true
}

export function fillRadioField(
  element: HTMLInputElement,
  value: string,
  container: Element,
  members?: HTMLInputElement[]
): boolean {
  try {
    const radios = members?.length
      ? members
      : element.name
        ? Array.from(container.querySelectorAll<HTMLInputElement>(`input[name="${cssEscape(element.name)}"][type="radio"]`))
        : [element]

    const target = String(value).trim()
    if (!target) return false
    const radio = bestMatch(radios, target, r => [optionLabel(r), r.value === 'on' ? '' : r.value])
    if (!radio) return false

    radio.focus({ preventScroll: true })
    // Use the native checked setter so React-controlled forms
    // pick up the change rather than reverting it.
    if (HTMLInputCheckedSetter) {
      HTMLInputCheckedSetter.call(radio, true)
    } else {
      radio.checked = true
    }
    triggerEvents(radio, true)
    return true
  } catch (error) {
    console.error('Error filling radio field:', error)
    return false
  }
}

export function fillCheckboxField(
  element: HTMLInputElement,
  value: any,
  container?: Element,
  members?: HTMLInputElement[]
): boolean {
  try {
    if (Array.isArray(value) || (members && members.length > 1)) {
      const values = Array.isArray(value) ? value : [value]
      return fillCheckboxGroup(element, values.map(String), container || document.body, members)
    }

    element.focus({ preventScroll: true })
    const shouldCheck = shouldCheckFromValue(value)

    // Use the native checked setter so React-controlled forms
    // pick up the change rather than reverting it.
    if (HTMLInputCheckedSetter) {
      HTMLInputCheckedSetter.call(element, shouldCheck)
    } else {
      element.checked = shouldCheck
    }
    triggerEvents(element, true)
    return true
  } catch (error) {
    console.error('Error filling checkbox field:', error)
    return false
  }
}

export function fillCheckboxGroup(
  element: HTMLInputElement,
  values: string[],
  container: Element,
  members?: HTMLInputElement[]
): boolean {
  try {
    const checkboxes = members?.length
      ? members
      : element.name
        ? Array.from(container.querySelectorAll<HTMLInputElement>(`input[name="${cssEscape(element.name)}"][type="checkbox"]`))
        : [element]
    const targets = values.map(v => String(v).trim()).filter(t => t.length > 0)
    const chosen = new Set<HTMLInputElement>()
    for (const target of targets) {
      const match = bestMatch(checkboxes, target, cb => [optionLabel(cb), cb.value === 'on' ? '' : cb.value])
      if (match) chosen.add(match)
    }

    for (const cb of checkboxes) {
      const shouldCheck = chosen.has(cb)
      if (cb.checked === shouldCheck) continue
      // Use the native checked setter so React-controlled forms
      // pick up the change rather than reverting it.
      if (HTMLInputCheckedSetter) {
        HTMLInputCheckedSetter.call(cb, shouldCheck)
      } else {
        cb.checked = shouldCheck
      }
      triggerEvents(cb, true)
    }

    return chosen.size > 0
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

/**
 * `input` + `change` + `blur`, which is what frameworks listen for.
 * Checkables skip `blur` and never get a synthetic click, which would
 * toggle them a second time.
 */
export function triggerEvents(element: HTMLElement, checkable = false): void {
  const events = checkable ? ['input', 'change'] : ['input', 'change', 'blur']
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

/**
 * The candidate whose text equals the target, else the one that
 * contains it (or is contained by it) most tightly. Empty texts never
 * match, so a blank value cannot pick a real option.
 */
function bestMatch<T>(candidates: T[], target: string, texts: (candidate: T) => Array<string | null | undefined>): T | undefined {
  const goal = normalizeOption(target)
  if (!goal) return undefined
  let partial: { item: T, gap: number } | undefined
  for (const item of candidates) {
    for (const raw of texts(item)) {
      const text = normalizeOption(raw || '')
      if (!text) continue
      if (text === goal) return item
      if (text.includes(goal) || goal.includes(text)) {
        const gap = Math.abs(text.length - goal.length)
        if (!partial || gap < partial.gap) partial = { item, gap }
      }
    }
  }
  return partial?.item
}

function normalizeOption(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ')
}

function pointerSequence(target: HTMLElement, types: string[]): void {
  const rect = target.getBoundingClientRect()
  const init = {
    bubbles: true, cancelable: true, composed: true, button: 0,
    clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2
  }
  for (const type of types) {
    if (type === 'click') {
      target.click()
    } else if (type.startsWith('pointer') && typeof PointerEvent === 'function') {
      target.dispatchEvent(new PointerEvent(type, { ...init, pointerType: 'mouse', isPrimary: true, buttons: type === 'pointerdown' ? 1 : 0 }))
    } else if (type.startsWith('mouse')) {
      target.dispatchEvent(new MouseEvent(type, { ...init, buttons: type === 'mousedown' ? 1 : 0 }))
    }
  }
}

/**
 * Open the dropdown the way a user would, one step at a time, stopping
 * as soon as a listbox shows: kits open on pointerdown (Radix),
 * mousedown (MUI, Ant), click (Headless UI) or the keyboard. Firing
 * everything at once would open and immediately close some of them.
 */
async function openListbox(trigger: HTMLElement, before: Set<Element>): Promise<HTMLElement | null> {
  trigger.focus({ preventScroll: true })
  const steps: Array<() => void> = [
    () => pointerSequence(trigger, ['pointerdown', 'mousedown']),
    () => pointerSequence(trigger, ['pointerup', 'mouseup', 'click']),
    () => trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', code: 'ArrowDown', bubbles: true, cancelable: true }))
  ]
  const share = Math.floor(CUSTOM_POPUP_BUDGET_MS / steps.length)
  for (const step of steps) {
    step()
    const popup = await waitForListbox(trigger, before, share)
    if (popup) return popup
  }
  return null
}

async function waitForListbox(trigger: HTMLElement, before: Set<Element>, budgetMs: number): Promise<HTMLElement | null> {
  const start = performance.now()
  do {
    const popup = findListbox(trigger, before)
    if (popup) return popup
    await sleep(25)
  } while (performance.now() - start < budgetMs)
  return null
}

const LISTBOX_SELECTOR = '[role="listbox"], .ant-select-dropdown:not(.ant-select-dropdown-hidden)'
const OPTION_SELECTOR = '[role="option"], .ant-select-item-option'

/**
 * The popup this trigger opened: the element named by `aria-controls`
 * when it is a listbox, else a listbox that was not visible before.
 */
function findListbox(trigger: HTMLElement, before: Set<Element>): HTMLElement | null {
  const explicit = trigger.getAttribute('aria-controls') || trigger.getAttribute('aria-owns')
  if (explicit) {
    const el = byId(trigger, explicit) || document.getElementById(explicit)
    if (el && isElementVisible(el) && (el.matches(LISTBOX_SELECTOR) || el.querySelector(OPTION_SELECTOR))) {
      return el.matches(LISTBOX_SELECTOR) ? el : (el.querySelector<HTMLElement>('[role="listbox"]') || el)
    }
  }
  for (const el of Array.from(document.querySelectorAll<HTMLElement>(LISTBOX_SELECTOR))) {
    if (!isElementVisible(el) || before.has(el)) continue
    if (el.querySelector(OPTION_SELECTOR)) return el
  }
  return null
}

/** Listboxes visible right now, by identity (a live list that changes size is still the same list). */
function visibleListboxes(): Set<Element> {
  return new Set(Array.from(document.querySelectorAll<HTMLElement>(LISTBOX_SELECTOR)).filter(isElementVisible))
}

/**
 * Close a popup SmartFill opened. Escape goes to the popup (or the
 * trigger that owns it) and stops there, so a dialog holding the form
 * never sees it and stays open.
 */
function closePopup(trigger: HTMLElement, popup?: HTMLElement): void {
  const escape = new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true })
  const target = popup || trigger
  const stop = (event: Event) => {
    if (event.target === target) event.stopPropagation()
  }
  // Bubble-phase listener on the target's parent: the kit's own handlers
  // on the target and the trigger run first, dialogs further up do not.
  const parent = target.parentElement
  parent?.addEventListener('keydown', stop)
  target.dispatchEvent(escape)
  parent?.removeEventListener('keydown', stop)
}

function usableOptions(popup: HTMLElement): HTMLElement[] {
  return Array.from(popup.querySelectorAll<HTMLElement>(OPTION_SELECTOR)).filter(option =>
    option.getAttribute('aria-disabled') !== 'true' &&
    !option.hasAttribute('data-disabled') &&
    !option.classList.contains('ant-select-item-option-disabled') &&
    // An option that is (or wraps) a link would navigate.
    !option.closest('a[href]') && !option.querySelector('a[href]')
  )
}

function findCustomOption(popup: HTMLElement, value: string): HTMLElement | null {
  const target = String(value).trim()
  // Empty target must never pick a real option.
  if (!target) return null
  return bestMatch(usableOptions(popup), target, opt => [
    opt.getAttribute('data-value'), opt.getAttribute('aria-label'), opt.textContent
  ]) ?? null
}

/** Any real option, used when the generated value is not in the list. */
function randomCustomOption(popup: HTMLElement): HTMLElement | null {
  const real = usableOptions(popup).filter(o => !/^(select|choose|pick|none|--)/i.test((o.textContent || '').trim()))
  return real.length ? real[Math.floor(Math.random() * real.length)] : null
}

function isElementVisible(el: HTMLElement): boolean {
  if (el.hidden) return false
  if (el.getAttribute('aria-hidden') === 'true') return false
  const rect = el.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}
