// ** import utils
import { byId, closestDeep, cssEscape, parentOf, rootOf } from './dom'

/** Controls, plus the widgets select enhancers draw (their text is the current value, not a label). */
const CONTROL_SELECTOR = [
  'input', 'select', 'textarea', 'button', '[role="combobox"]', '[role="listbox"]',
  '[contenteditable]:not([contenteditable="false"])',
  '.select2-container', '.chosen-container', '.selectize-control', '.ts-wrapper', '.nice-select'
].join(', ')

/** Wrappers most UI kits put around one label + one control. */
const FIELD_WRAPPER = [
  '.form-group', '.form-field', '.form-item', '.form-row', '.field', '.input-group', '.mb-3',
  '[class*="FormItem"]', '[class*="form-item"]', '[class*="FormControl"]', '[class*="form-control-wrapper"]',
  '[class*="TextField"]', '[class*="field-wrapper"]', '[class*="Field_"]', '[class*="field_"]',
  '[data-slot="form-item"]', '[data-field]', '.ant-form-item', '.MuiFormControl-root', '.mat-mdc-form-field', '.v-input'
].join(', ')

const LABEL_LIKE = 'label, legend, [class*="label" i], [class*="Label"], [data-slot="form-label"]'

/** Text of an element without the text of controls nested in it (a select's options, a button). */
function ownText(node: Element | null): string {
  if (!node) return ''
  if (!node.querySelector(CONTROL_SELECTOR)) return cleanText(node.textContent)
  const clone = node.cloneNode(true) as Element
  const nested = Array.from(clone.querySelectorAll(`${CONTROL_SELECTOR}, option, script, style`))
  // Remove outermost matches only: a select's options go with it.
  nested.filter(child => !nested.some(other => other !== child && other.contains(child))).forEach(child => child.parentNode?.removeChild(child))
  return cleanText(clone.textContent)
}

function labelledBy(element: HTMLElement): string {
  // MUI lists the control itself, which would put the current value in the label.
  const ids = (element.getAttribute('aria-labelledby') || '').split(/\s+/).filter(id => id && id !== element.id)
  return cleanText(ids.map(id => byId(element, id)?.textContent || '').join(' '))
}

/** The label the page author attached to the control: `aria-labelledby`, `<label for>` or a wrapping `<label>`. */
export function extractLabel(element: HTMLElement): string {
  const fromAria = labelledBy(element)
  if (fromAria) return fromAria

  const id = element.id
  if (id) {
    const label = rootOf(element).querySelector(`label[for="${cssEscape(id)}"]`)
    const text = ownText(label)
    if (text) return text
  }

  const parentLabel = element.closest('label')
  if (parentLabel) {
    const text = ownText(parentLabel)
    if (text) return text
  }

  return ''
}

/** Best-effort label when the page has no real one. */
export function extractContextualInfo(element: HTMLElement): string {
  for (const attr of ['aria-label', 'placeholder', 'data-placeholder', 'title']) {
    const value = cleanText(element.getAttribute(attr))
    if (value) return value
  }

  const wrapper = closestDeep(element, FIELD_WRAPPER)
  // A wrapper around several controls (a spacing utility, a whole row) says nothing about this one.
  if (wrapper && wrapper.querySelectorAll('input:not([type="hidden"]), select, textarea').length <= 1) {
    const label = Array.from(wrapper.querySelectorAll(LABEL_LIKE)).find(l => !l.contains(element) && !l.matches(CONTROL_SELECTOR))
    const text = ownText(label || null)
    if (text && text.length <= 80) return text
  }

  const sibling = previousText(element)
  if (sibling) return sibling

  const cell = tableHeader(element)
  if (cell) return cell

  const parent = parentOf(element)
  if (parent) {
    const parentText = ownText(parent)
    if (parentText && parentText.length < 100) return parentText
  }

  const name = element.getAttribute('name') || element.getAttribute('id')
  if (name) return humanize(name)

  return 'Unnamed Field'
}

/**
 * The question a radio or checkbox group answers ("Gender", not "Male"):
 * a fieldset legend, a radiogroup label, or the wrapper's label.
 */
export function extractGroupLabel(element: HTMLElement): string {
  const group = closestDeep(element, '[role="radiogroup"], [role="group"], fieldset')
  if (group) {
    const aria = labelledBy(group as HTMLElement) || cleanText(group.getAttribute('aria-label'))
    if (aria) return aria
    const legend = group.querySelector('legend')
    if (legend) return ownText(legend)
  }
  const wrapper = closestDeep(element, FIELD_WRAPPER)
  if (wrapper) {
    const label = Array.from(wrapper.querySelectorAll(LABEL_LIKE))
      .find(l => !l.contains(element) && !l.querySelector('input') && !(l as HTMLLabelElement).htmlFor)
    const text = ownText(label || null)
    if (text && text.length <= 80) return text
  }
  return ''
}

/** Nearest preceding sibling (of the element or its wrapper) that has short text. */
function previousText(element: HTMLElement): string {
  let node: Element | null = element
  for (let depth = 0; node && depth < 2; depth++) {
    let sibling = node.previousElementSibling
    while (sibling) {
      if (sibling.matches(CONTROL_SELECTOR) || sibling.querySelector('input, select, textarea')) return ''
      // A label that belongs to another control is not ours.
      const forId = sibling.getAttribute('for')
      if (sibling.tagName === 'LABEL' && forId && forId !== element.id) return ''
      const text = ownText(sibling)
      if (text) return text.length <= 80 ? text : ''
      sibling = sibling.previousElementSibling
    }
    node = node.parentElement
    if (node && node.querySelectorAll('input, select, textarea').length > 1) break
  }
  return ''
}

/** For controls in a table: the column header, or the row's first cell. */
function tableHeader(element: HTMLElement): string {
  const cell = element.closest('td')
  if (!cell) return ''
  const row = cell.parentElement as HTMLTableRowElement | null
  const index = Array.from(row?.children || []).indexOf(cell)
  const table = cell.closest('table')
  const header = table?.querySelector(`thead tr > :nth-child(${index + 1})`)
  const headerText = ownText(header || null)
  if (headerText) return headerText
  const first = row?.firstElementChild
  return first && first !== cell ? ownText(first) : ''
}

export function humanize(name: string): string {
  return name
    .replace(/\[\]$/, '')
    .replace(/[_\-.[\]]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, l => l.toUpperCase())
}

export function cleanText(text: string | null | undefined): string {
  if (!text) return ''
  return text.replace(/[\u200b-\u200d\ufeff]/g, '').trim().replace(/\s+/g, ' ').replace(/\s*[*:]+\s*$/, '').replace(/^\*\s*/, '').trim()
}
