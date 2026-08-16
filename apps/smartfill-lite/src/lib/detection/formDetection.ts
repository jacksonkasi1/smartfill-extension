// ** import types
import type { DetectedForm, DetectResult, FormField } from '@/types/extension'

// ** import utils
import { isFieldFillable } from './fieldValidation'
import { getFieldType, isGroupedField } from './fieldTypes'
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
 */
export async function detectAllForms(): Promise<DetectResult> {
  const selectors = getFieldSelectors()
  const candidates = document.querySelectorAll(selectors.join(','))

  const seen = new Set<Element>()
  const groupSeen = new Set<string>() // for radio / checkbox by name
  const collected: FormField[] = []

  for (const raw of candidates) {
    const el = raw as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    if (!el || seen.has(el)) continue

    // Cheap, layout-free checks first
    if (el.disabled) continue
    if (isReadOnly(el)) continue
    if (el.hasAttribute('hidden')) continue
    if (el.offsetParent === null && el.tagName !== 'BODY') {
      // offsetParent is null for `display:none` ancestors. This is a cheap
      // visibility heuristic that does not force a layout if the element
      // is not actually display:none (the browser short-circuits).
      continue
    }

    const tag = el.tagName.toLowerCase()
    if (!['input', 'select', 'textarea', 'button'].includes(tag)) continue

    if (tag === 'input') {
      const type = (el as HTMLInputElement).type?.toLowerCase() || 'text'
      if (['hidden', 'submit', 'button', 'reset', 'image'].includes(type)) continue
    }

    if (!isFieldFillable(el)) continue

    seen.add(el)

    const fieldType = getFieldType(el)
    const fieldId = getFieldId(el)
    const fieldName = getFieldName(el)
    const value = getQuickValue(el)
    const label = extractLabel(el) || extractContextualInfo(el)
    const required = isFieldRequired(el)

    if (isGroupedField(fieldType)) {
      const groupKey = (el as HTMLInputElement).name
      if (!groupKey) continue
      if (groupSeen.has(groupKey)) continue
      groupSeen.add(groupKey)

      collected.push({
        id: fieldId,
        name: groupKey,
        type: fieldType,
        value,
        label,
        placeholder: el.getAttribute('placeholder') || undefined,
        required,
        element: el,
        options: getFieldOptions(el, document.body)
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
        element: el,
        options: getFieldOptions(el, document.body)
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

function getQuickValue(el: HTMLElement): string {
  const input = el as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  return input.value || ''
}

function isReadOnly(el: HTMLElement): boolean {
  if (el.hasAttribute('readonly')) return true
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    return el.readOnly
  }
  return false
}

function isFieldRequired(el: HTMLElement): boolean {
  return el.hasAttribute('required') ||
    el.hasAttribute('data-required') ||
    el.getAttribute('aria-required') === 'true'
}
