// ** import utils
import { byId, cssEscape, rootOf } from './dom'
import { cleanText } from './fieldLabels'

/** Visible text of one radio or checkbox: its `<label>`, the text right after it, or its value. */
export function optionLabel(input: HTMLInputElement): string {
  if (input.id) {
    const forLabel = rootOf(input).querySelector(`label[for="${cssEscape(input.id)}"]`)
    const text = cleanText(forLabel?.textContent)
    if (text) return text
  }
  const wrapping = cleanText(input.closest('label')?.textContent)
  if (wrapping) return wrapping
  const next = cleanText(input.nextElementSibling?.textContent)
  if (next && next.length <= 80) return next
  const aria = cleanText(input.getAttribute('aria-label'))
  if (aria) return aria
  return input.value && input.value !== 'on' ? input.value : ''
}

/** Option values for a group of radios / checkboxes, preferring what the user reads. */
export function groupOptions(members: HTMLInputElement[]): string[] {
  return members.map(input => {
    const label = optionLabel(input)
    const value = input.value && input.value !== 'on' ? input.value : ''
    // Opaque values ("1", "opt_3", a uuid) mean nothing to the AI; the label does.
    if (label && (!value || /^\d+$|^[a-f0-9-]{16,}$|^opt/i.test(value))) return label
    return value || label
  }).filter(Boolean)
}

export function selectOptions(select: HTMLSelectElement): string[] {
  return Array.from(select.options)
    .filter(opt => !opt.disabled && opt.value !== '' && opt.value !== 'undefined')
    .map(opt => opt.value)
}

/** Options of a custom dropdown that are already in the DOM (listbox wired by `aria-controls`, or `data-options`). */
export function customSelectOptions(trigger: HTMLElement): string[] {
  const options: string[] = []
  const controls = trigger.getAttribute('aria-controls') || trigger.getAttribute('aria-owns')
  const listbox = controls ? byId(trigger, controls) : null
  if (listbox) {
    for (const option of Array.from(listbox.querySelectorAll('[role="option"]'))) {
      if (option.getAttribute('aria-disabled') === 'true') continue
      const text = option.getAttribute('data-value') || cleanText(option.textContent)
      if (text && text.length <= 80 && !/^(select|choose|pick)\b/i.test(text)) options.push(text)
    }
  }
  const data = trigger.getAttribute('data-options')
  if (data) {
    try {
      const parsed = JSON.parse(data)
      if (Array.isArray(parsed)) options.push(...parsed.map(opt => typeof opt === 'object' ? opt.value || opt.label : String(opt)))
    } catch {
      options.push(...data.split(/[,;|]/).map(opt => opt.trim()).filter(Boolean))
    }
  }
  return [...new Set(options)].filter(Boolean)
}
