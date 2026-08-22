// ** import types
import type { DetectedForm, DetectResult, FormField } from '@/types/extension'

// ** import utils
import { isFieldFillable } from './fieldValidation'
import { getFieldType, isGroupedField, isModernUIElement } from './fieldTypes'
import { getFieldName, getFieldId } from './fieldNames'
import { extractLabel, extractContextualInfo } from './fieldLabels'
import { getFieldOptions } from './fieldOptions'
import { getFieldSelectors } from './formSelector'

/**
 * Single-pass form detection.
 *
 * Goals (per the Lite spec):
 *  - No fixed React wait — detection starts immediately.
 *  - One combined candidate scan instead of three sequential ones.
 *  - Set-based dedup keyed on the actual Element, not bounding-rect position.
 *  - Cheap checks first (disabled / readonly / tag / type / role), expensive
 *    layout reads only after we know the field is plausibly useful.
 *  - We do NOT append hidden synthetic forms to the page.
 *  - We DO accept modern UI controls (MUI / Ant / ARIA combobox /
 *    contenteditable) alongside traditional form elements, but only when
 *    they look like form controls — never plain Submit / Cancel buttons.
 */
export async function detectAllForms(): Promise<DetectResult> {
  const selectors = getFieldSelectors()
  const candidates = document.querySelectorAll(selectors.join(','))

  const seen = new Set<Element>()
  // Group key is namespaced by the containing form so two unrelated
  // `name="status"` groups in different forms / sections do not collide.
  const groupSeen = new Set<string>()
  const collected: FormField[] = []

  for (const raw of candidates) {
    const el = raw as HTMLElement
    if (!el || seen.has(el)) continue

    if (isQuicklyHidden(el)) continue

    const tag = el.tagName.toLowerCase()

    // ---- tag gate (cheap, no layout) ----
    const isTraditional =
      tag === 'input' || tag === 'select' || tag === 'textarea'
    const isModern = isModernUIElement(el)
    if (!isTraditional && !isModern) continue

    // ---- input type filter ----
    if (tag === 'input') {
      const type = (el as HTMLInputElement).type?.toLowerCase() || 'text'
      if (['hidden', 'submit', 'button', 'reset', 'image'].includes(type)) continue
    }

    // ---- modern UI must look like a form control, not a Submit button ----
    if (!isTraditional && isModern) {
      if (!isFormLikeModernUI(el)) continue
    }

    // ---- state checks ----
    if (isDisabledOrReadOnly(el)) continue

    if (!isFieldFillable(el)) continue

    seen.add(el)

    const fieldType = getFieldType(el)
    const fieldId = getFieldId(el)
    const fieldName = getFieldName(el)
    const value = getQuickValue(el)
    const label = extractLabel(el) || extractContextualInfo(el)
    const required = isFieldRequired(el)
    const formKey = getFormKey(el)

    if (isGroupedField(fieldType)) {
      const groupName = (el as HTMLInputElement).name
      if (!groupName) continue
      const groupKey = `${formKey}:${fieldType}:${groupName}`
      if (groupSeen.has(groupKey)) continue
      groupSeen.add(groupKey)

      collected.push({
        id: fieldId,
        name: groupName,
        type: fieldType,
        value,
        label,
        placeholder: el.getAttribute('placeholder') || undefined,
        required,
        element: el as HTMLInputElement,
        options: getFieldOptions(el as HTMLElement, el.closest('form') || document.body)
      })
    } else {
      collected.push({
        id: fieldId,
        name: fieldName,
        type: fieldType,
        value,
        label,
        placeholder: el.getAttribute('placeholder') || undefined,
        required,
        element: el as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
        options: getFieldOptions(el as HTMLElement, el.closest('form') || document.body)
      })
    }
  }

  if (collected.length === 0) {
    return { success: true, formCount: 0, forms: [] }
  }

  // We return a single virtual form containing every detected field.
  // We do not inject a hidden <form> into the host page.
  const form: DetectedForm = {
    element: document.body as unknown as HTMLFormElement,
    fields: collected,
    fieldCount: collected.length
  }

  return {
    success: true,
    formCount: 1,
    forms: [form]
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Very cheap visibility check. We deliberately avoid `getComputedStyle()` /
 * `getBoundingClientRect()` per candidate to keep detection fast.
 *
 * `el.offsetParent === null` was the old heuristic but it also returns
 * `null` for `position: fixed` elements, which would incorrectly drop
 * valid fixed-position toolbars and dialogs. Instead we trust:
 *   - the HTML5 `hidden` attribute
 *   - `aria-hidden="true"`
 *   - `display:none` only for traditional elements where it is cheap
 *     to look at the inline `style` attribute (no layout reflow).
 *
 * If a field is hidden via external CSS we accept the rare false positive
 * here; the fill step will silently no-op for it.
 */
function isQuicklyHidden(el: HTMLElement): boolean {
  if (el.hidden) return true
  if (el.getAttribute('aria-hidden') === 'true') return true
  // Fast inline-style check without a layout read
  const styleAttr = el.getAttribute('style') || ''
  if (/display\s*:\s*none/i.test(styleAttr) || /visibility\s*:\s*hidden/i.test(styleAttr)) {
    return true
  }
  return false
}

function isDisabledOrReadOnly(el: HTMLElement): boolean {
  if ((el as any).disabled) return true
  if (el.hasAttribute('readonly')) return true
  if (el.hasAttribute('disabled')) return true
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    if (el.readOnly) return true
  }
  return false
}

/**
 * Decide whether a modern UI element (div / button / role=combobox / etc.)
 * actually represents a fillable form control. Plain Submit / Cancel /
 * navigation buttons must be excluded.
 */
function isFormLikeModernUI(el: HTMLElement): boolean {
  // 1. contenteditable is always a fillable text input
  if (el.getAttribute('contenteditable') === 'true') return true

  const role = el.getAttribute('role')
  if (role === 'combobox' || role === 'listbox' || role === 'textbox') return true

  // 2. Anything that already names itself via aria-label / placeholder /
  //    text content with a form-related keyword is acceptable.
  const keywords = [
    'select', 'choose', 'pick', 'dropdown', 'option',
    'date', 'time', 'calendar', 'picker',
    'upload', 'attach', 'browse', 'file',
    'input', 'field', 'text', 'search'
  ]
  const haystack = `${el.className || ''} ${el.getAttribute('aria-label') || ''} ${el.textContent || ''}`.toLowerCase()
  return keywords.some(k => haystack.includes(k))
}

function getQuickValue(el: HTMLElement): string {
  if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
    return el.value || ''
  }
  // contenteditable
  return (el.textContent || '').trim()
}

function isFieldRequired(el: HTMLElement): boolean {
  return el.hasAttribute('required') ||
    el.hasAttribute('data-required') ||
    el.getAttribute('aria-required') === 'true'
}

/**
 * Stable identifier for the closest containing form. Lets us namespace
 * radio / checkbox group names so two unrelated forms can both use
 * `name="status"` without colliding in `groupSeen`.
 */
function getFormKey(el: HTMLElement): string {
  const form = el.closest('form')
  if (!form) {
    // Use the fieldset if present, then fall back to a positional index
    // in the body — good enough to disambiguate unrelated sections.
    const fieldset = el.closest('fieldset')
    if (fieldset) return 'fs:' + (fieldset.id || fieldset.getAttribute('name') || 'anon')
    return 'body'
  }
  if (form.id) return 'f:' + form.id
  const allForms = Array.from(document.forms)
  const idx = allForms.indexOf(form)
  return 'f:idx' + (idx === -1 ? 'x' : idx)
}
