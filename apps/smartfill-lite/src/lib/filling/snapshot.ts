// ** import types
import type { FormField } from '@/types/extension'

// ** import utils
import { triggerEvents } from './fieldFiller'

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLElement

interface Entry {
  element: Control
  value?: string
  checked?: boolean
}

/**
 * Captures what each field looked like before a fill so the popup's
 * Undo can put the page back exactly as the user left it.
 */
export class FillSnapshot {
  private entries: Entry[] = []

  static capture(fields: FormField[]): FillSnapshot {
    const snapshot = new FillSnapshot()
    for (const field of fields) {
      const el = field.element as Control
      if (el instanceof HTMLInputElement && (el.type === 'radio' || el.type === 'checkbox') && el.name) {
        const scope = el.form || document
        scope.querySelectorAll<HTMLInputElement>(`input[type="${el.type}"][name="${CSS.escape(el.name)}"]`)
          .forEach(input => snapshot.entries.push({ element: input, checked: input.checked }))
      } else if (el instanceof HTMLInputElement && (el.type === 'radio' || el.type === 'checkbox')) {
        snapshot.entries.push({ element: el, checked: el.checked })
      } else if ('value' in el) {
        snapshot.entries.push({ element: el, value: (el as HTMLInputElement).value })
      } else if (el.isContentEditable) {
        snapshot.entries.push({ element: el, value: el.textContent || '' })
      }
    }
    return snapshot
  }

  get size(): number {
    return this.entries.length
  }

  restore(): number {
    let restored = 0
    for (const entry of this.entries) {
      const el = entry.element
      if (!el.isConnected) continue
      if (entry.checked !== undefined && el instanceof HTMLInputElement) {
        if (el.checked === entry.checked) continue
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'checked')?.set?.call(el, entry.checked)
      } else if (entry.value !== undefined && 'value' in el) {
        if ((el as HTMLInputElement).value === entry.value) continue
        const proto = Object.getPrototypeOf(el)
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
        if (setter) setter.call(el, entry.value)
        else (el as HTMLInputElement).value = entry.value
      } else if (entry.value !== undefined) {
        if (el.textContent === entry.value) continue
        el.textContent = entry.value
      } else {
        continue
      }
      triggerEvents(el)
      restored++
    }
    return restored
  }
}
