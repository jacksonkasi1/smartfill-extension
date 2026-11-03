// ** import types
import type { DetectedForm, DetectResult, FormField } from '@/types/extension'

// ** import utils
import { closestDeep, cssEscape, isRendered, queryAllDeep, rootOf } from './dom'
import { getFieldType, isFieldRequired, isReadonlyCombobox } from './fieldTypes'
import { getFieldName, getFieldId } from './fieldNames'
import { extractLabel, extractContextualInfo, extractGroupLabel, humanize } from './fieldLabels'
import { customSelectOptions, groupOptions, optionLabel, selectOptions } from './fieldOptions'
import { isCustomSelectTrigger, isInsideForm, isPageChrome, isSearchBox, isUiControl } from './safety'

/**
 * Every element that can hold form data. Buttons are only candidates
 * when they declare themselves dropdowns (`role="combobox"` or
 * `aria-haspopup="listbox"`): a theme toggle, a back button or a menu
 * with `aria-expanded` is never treated as a field, so it is never clicked.
 */
const CANDIDATES = [
  'input', 'select', 'textarea',
  '[role="combobox"]', '[aria-haspopup="listbox"]',
  '[contenteditable]:not([contenteditable="false"])'
].join(', ')

const NON_DATA_INPUTS = new Set(['hidden', 'submit', 'button', 'reset', 'image'])

/** Enhancers that hide the real `<select>` and draw their own widget next to it. */
const SELECT_ENHANCERS = '.select2, .select2-container, .chosen-container, .selectize-control, .ts-wrapper, .nice-select, .choices, .bootstrap-select, .ss-main'

export interface DetectOptions {
  root?: ParentNode
}

/**
 * Single-pass detection over the document and its open shadow roots.
 * Returns one virtual form holding every fillable field; nothing is
 * injected into the page.
 */
export async function detectAllForms(options: DetectOptions = {}): Promise<DetectResult> {
  const fields = detectFields(options.root || document)
  if (fields.length === 0) return { success: true, formCount: 0, forms: [] }
  const form: DetectedForm = {
    element: document.body as unknown as HTMLFormElement,
    fields,
    fieldCount: fields.length
  }
  return { success: true, formCount: 1, forms: [form] }
}

export function detectFields(root: ParentNode = document): FormField[] {
  const seen = new Set<Element>()
  const groupKeys = new Set<string>()
  const collected: FormField[] = []
  let index = 0

  for (const el of queryAllDeep(root, CANDIDATES)) {
    if (seen.has(el)) continue
    seen.add(el)
    if (closestDeep(el, '[data-smartfill-ui]')) continue

    const field = toField(el, index, seen, groupKeys)
    if (field) {
      collected.push(field)
      index++
    }
  }
  return collected
}

function toField(el: HTMLElement, index: number, seen: Set<Element>, groupKeys: Set<string>): FormField | null {
  const tag = el.tagName.toLowerCase()
  const isInput = tag === 'input'
  const inputType = isInput ? ((el as HTMLInputElement).type || 'text').toLowerCase() : ''

  if (isInput && NON_DATA_INPUTS.has(inputType)) return null
  if (!isInput && tag !== 'select' && tag !== 'textarea' && !isCustomSelectTrigger(el) && !isEditingHost(el)) return null
  if (isDisabled(el)) return null
  if (isReadOnly(el) && !isReadonlyCombobox(el)) return null
  if (!isVisibleEnough(el, inputType)) return null

  const explicit = extractLabel(el)

  if (inputType === 'radio' || inputType === 'checkbox') {
    return toGroupField(el as HTMLInputElement, inputType, index, seen, groupKeys)
  }

  const type = getFieldType(el)
  const label = explicit || extractContextualInfo(el)
  const isChoice = type === 'select'
  // A label the page wrote (not one guessed from the name attribute).
  const labelled = Boolean(explicit) || (label !== 'Unnamed Field' && label !== humanize(el.getAttribute('name') || el.id || ''))
  if (isChoice && isUiControl(el, label, labelled)) return null
  // Site search and table filters: typing there filters or navigates the page.
  if (!isChoice && isSearchBox(el)) return null
  // Inline-editable headings and titles are page content; editors in a form or labelled as text boxes are fields.
  if (tag !== 'input' && tag !== 'textarea' && !isChoice && !isFieldLikeEditor(el)) return null

  let element = el
  let trigger: HTMLElement | undefined
  let options: string[] = []

  if (tag === 'select') {
    options = selectOptions(el as HTMLSelectElement)
  } else if (isChoice) {
    // A custom dropdown with no label outside any form is almost always a widget.
    if (!explicit && label === 'Unnamed Field' && !isInsideForm(el)) return null
    // Radix and similar kits keep a hidden native <select> next to the
    // trigger for form autofill. Filling that needs no click at all.
    const bubble = pairedNativeSelect(el)
    if (bubble) {
      seen.add(bubble)
      trigger = el
      element = bubble
      options = selectOptions(bubble)
    } else {
      options = customSelectOptions(el)
    }
  }

  return {
    id: getFieldId(element, index),
    name: getFieldName(element.getAttribute('name') ? element : el, index),
    type,
    value: currentValue(element),
    label,
    placeholder: el.getAttribute('placeholder') || el.getAttribute('data-placeholder') || undefined,
    required: isFieldRequired(el) || isFieldRequired(element),
    element: element as FormField['element'],
    options,
    trigger,
    enhanced: tag === 'select' && hasEnhancerWidget(el) ? true : undefined
  }
}

function isFieldLikeEditor(el: HTMLElement): boolean {
  if (isPageChrome(el)) return false
  if ((el.getAttribute('role') || '').toLowerCase() === 'textbox') return true
  if (/^h[1-6]$/i.test(el.tagName) || el.closest('h1, h2, h3, h4, h5, h6')) return false
  return isInsideForm(el) || el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby') ||
    el.hasAttribute('data-placeholder') || el.hasAttribute('placeholder')
}

function toGroupField(
  el: HTMLInputElement,
  type: 'radio' | 'checkbox',
  index: number,
  seen: Set<Element>,
  groupKeys: Set<string>
): FormField | null {
  const members = groupMembers(el, type).filter(m => !isDisabled(m))
  members.forEach(m => seen.add(m))
  // Members are marked seen above; the key only guards named groups that
  // are reached again through another member.
  if (el.name) {
    const key = groupKey(el, type)
    if (groupKeys.has(key)) return null
    groupKeys.add(key)
  }

  const single = members.length <= 1 && type === 'checkbox'
  const label = single
    ? optionLabel(el) || extractLabel(el) || extractContextualInfo(el)
    : extractGroupLabel(el) || (el.name ? humanize(el.name) : '') || extractContextualInfo(el)
  const explicit = single ? Boolean(optionLabel(el)) : Boolean(extractGroupLabel(el))
  // Theme switches, menu toggles and table row selectors are page UI.
  if (isUiControl(el, label, explicit) || members.some(m => m !== el && isPageChrome(m))) return null
  const optionTexts = members.map(optionLabel)
  if (optionTexts.some(t => /\bdark\b/i.test(t)) && optionTexts.some(t => /\blight\b/i.test(t))) return null

  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 48)
  const name = el.name || (!single && slug) || getFieldName(el, index)
  return {
    id: getFieldId(el, index),
    name,
    type,
    value: currentValue(el),
    label,
    placeholder: undefined,
    required: members.some(m => isFieldRequired(m)),
    element: el,
    options: single ? [] : groupOptions(members),
    group: members.length > 1 || type === 'radio' ? members : undefined
  }
}

/** Radios / checkboxes answering the same question: same name in the same form, else the same radiogroup or fieldset. */
function groupMembers(el: HTMLInputElement, type: 'radio' | 'checkbox'): HTMLInputElement[] {
  const scope: ParentNode = el.form || rootOf(el)
  if (el.name) {
    const all = Array.from(scope.querySelectorAll<HTMLInputElement>(`input[type="${type}"][name="${cssEscape(el.name)}"]`))
    // Without a form, the same name in two unrelated sections is two questions.
    return el.form ? all : all.filter(m => !m.form && sameSection(m, el))
  }
  if (type === 'checkbox') return [el]
  const nameless = (root: Element) => Array.from(root.querySelectorAll<HTMLInputElement>('input[type="radio"]')).filter(m => !m.name)
  const container = closestDeep(el, '[role="radiogroup"], fieldset')
  if (container) return nameless(container)
  // No group element: the nearest ancestor that holds sibling nameless radios.
  let node = el.parentElement
  for (let depth = 0; node && depth < 4; depth++, node = node.parentElement) {
    const found = nameless(node)
    if (found.length > 1) return found
  }
  return [el]
}

function sameSection(a: Element, b: Element): boolean {
  const section = (el: Element) => closestDeep(el, 'fieldset, [role="radiogroup"], [role="group"], section, [role="dialog"], form')
  return section(a) === section(b)
}

const groupIds = new WeakMap<object, number>()
let nextGroupId = 0
function groupKey(el: HTMLInputElement, type: string): string {
  const owner = el.form || closestDeep(el, 'fieldset, section, [role="dialog"]') || rootOf(el)
  if (!groupIds.has(owner)) groupIds.set(owner, nextGroupId++)
  return `${groupIds.get(owner)}:${type}:${el.name}`
}

/** The hidden native `<select>` a Radix-style trigger keeps in sync. */
function pairedNativeSelect(trigger: HTMLElement): HTMLSelectElement | null {
  // Only a direct neighbour: a select elsewhere in the same form belongs to another field.
  for (const candidate of [trigger.nextElementSibling, trigger.previousElementSibling]) {
    if (candidate instanceof HTMLSelectElement && candidate.getAttribute('aria-hidden') === 'true') return candidate
  }
  return null
}

function isEditingHost(el: HTMLElement): boolean {
  if (!isEditable(el)) return false
  const parent = el.parentElement
  return !parent || !isEditable(parent)
}

function isEditable(el: HTMLElement): boolean {
  if (el.isContentEditable) return true
  const attr = el.getAttribute('contenteditable')
  return attr !== null && attr.toLowerCase() !== 'false'
}

function isDisabled(el: HTMLElement): boolean {
  if ((el as HTMLInputElement).disabled) return true
  if (el.hasAttribute('disabled')) return true
  if (el.getAttribute('aria-disabled') === 'true') return true
  if (el.closest('fieldset[disabled]')) return true
  try {
    if (el.matches(':disabled')) return true
  } catch { /* selector unsupported */ }
  return false
}

function isReadOnly(el: HTMLElement): boolean {
  if ((el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) && el.readOnly) return true
  return el.getAttribute('aria-readonly') === 'true'
}

/**
 * Text boxes must be rendered (hidden ones are other wizard steps or
 * spam honeypots). Custom-styled checkboxes hide the real input and
 * show its label; enhanced selects hide the real `<select>` and draw a
 * widget beside it. Those count as visible.
 */
function isVisibleEnough(el: HTMLElement, inputType: string): boolean {
  if (inputType === 'checkbox' || inputType === 'radio') {
    if (isRendered(el)) return true
    const input = el as HTMLInputElement
    const labels = Array.from(input.labels || [])
    return labels.some(label => isRendered(label))
  }
  if (el.getAttribute('aria-hidden') === 'true' && el.tagName !== 'SELECT') return false
  if (isRendered(el)) return true
  return el.tagName === 'SELECT' && hasEnhancerWidget(el)
}

/** select2 / Chosen draw their widget right after the select; bootstrap-select / Choices wrap it. */
function hasEnhancerWidget(el: HTMLElement): boolean {
  const widget = el.closest(SELECT_ENHANCERS) ||
    Array.from(el.parentElement?.children || []).find(c => c !== el && c.matches(SELECT_ENHANCERS))
  return Boolean(widget && isRendered(widget))
}

function currentValue(el: HTMLElement): string {
  if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
    return el.value || ''
  }
  return (el.textContent || '').trim()
}
