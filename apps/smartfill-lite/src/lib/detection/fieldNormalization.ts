import type { FormField } from '@/types/extension'

export interface FieldNormalizationStats {
  rawCount: number
  normalizedCount: number
  duplicatesRemoved: number
  unusableRemoved: number
  duplicateGroups: Array<{ kept: string, removed: string[] }>
}

export interface FieldNormalizationResult {
  fields: FormField[]
  stats: FieldNormalizationStats
}

/**
 * Collapses DOM-level candidates into the semantic fields sent to the model.
 * The retained field is always an original candidate, so its DOM reference is
 * still the one used by the existing filling pipeline.
 */
export function normalizeFormFields(rawFields: FormField[]): FieldNormalizationResult {
  const usable = rawFields.filter(isUsableField)
  const groups: FormField[][] = []

  for (const field of usable) {
    const group = groups.find(existing => areLikelyDuplicates(existing[0], field))
    if (group) group.push(field)
    else groups.push([field])
  }

  const fields = groups.map(group => [...group].sort((a, b) => scoreField(b) - scoreField(a))[0])
  const duplicateGroups = groups
    .filter(group => group.length > 1)
    .map(group => {
      const kept = [...group].sort((a, b) => scoreField(b) - scoreField(a))[0]
      return { kept: kept.name, removed: group.filter(f => f !== kept).map(f => f.name) }
    })

  return {
    fields,
    stats: {
      rawCount: rawFields.length,
      normalizedCount: fields.length,
      duplicatesRemoved: usable.length - fields.length,
      unusableRemoved: rawFields.length - usable.length,
      duplicateGroups
    }
  }
}

function isUsableField(field: FormField): boolean {
  if (!field.name || !field.element) return false
  const element = field.element as unknown as HTMLElement
  if (element.hidden || element.getAttribute?.('aria-hidden') === 'true') return false
  if ((element as HTMLInputElement).disabled || element.hasAttribute?.('disabled')) return false
  // A listbox/menu is popup content, not the value-bearing control. Triggers
  // are represented by combobox/button candidates and remain eligible.
  if (element.getAttribute?.('role') === 'listbox' || element.getAttribute?.('role') === 'menu') return false
  return true
}

function areLikelyDuplicates(a: FormField, b: FormField): boolean {
  const aName = normalize(a.name)
  const bName = normalize(b.name)
  // Repeated exact names cannot be represented independently in JSON. Limit
  // this to the same form/section to avoid merging unrelated page regions.
  if (aName && aName === bName && sameScope(a, b)) return true

  const aLabel = semanticText(a)
  const bLabel = semanticText(b)
  if (!aLabel || aLabel !== bLabel || !sameScope(a, b)) return false

  // Equal labels alone are insufficient: e.g. business and finance phone
  // sections. Require a DOM relationship or a framework-generated fallback.
  return areDomRelated(a.element, b.element) || isGeneratedIdentifier(a.id) || isGeneratedIdentifier(b.id)
}

function scoreField(field: FormField): number {
  const element = field.element as unknown as HTMLElement
  let score = 0
  const native =
    (typeof HTMLInputElement !== 'undefined' && element instanceof HTMLInputElement) ||
    (typeof HTMLSelectElement !== 'undefined' && element instanceof HTMLSelectElement) ||
    (typeof HTMLTextAreaElement !== 'undefined' && element instanceof HTMLTextAreaElement)
  if (native) score += 40
  if (field.name && !isGeneratedIdentifier(field.name)) score += 30
  if (field.options?.length) score += 25
  if (field.label && field.label !== 'Unnamed Field') score += 12
  if (field.placeholder) score += 6
  if (element.getAttribute?.('aria-labelledby') || element.getAttribute?.('aria-controls')) score += 5
  if (isGeneratedIdentifier(field.id) || isGeneratedIdentifier(field.name)) score -= 25
  return score
}

function sameScope(a: FormField, b: FormField): boolean {
  const aEl = a.element as unknown as HTMLElement
  const bEl = b.element as unknown as HTMLElement
  const aForm = aEl.closest?.('form, [role="dialog"], fieldset')
  const bForm = bEl.closest?.('form, [role="dialog"], fieldset')
  return !aForm || !bForm || aForm === bForm
}

function areDomRelated(a: HTMLElement, b: HTMLElement): boolean {
  if (a === b) return true
  const aLabelled = a.getAttribute?.('aria-labelledby')
  const bLabelled = b.getAttribute?.('aria-labelledby')
  if (aLabelled && aLabelled === bLabelled) return true
  const aControls = a.getAttribute?.('aria-controls') || a.getAttribute?.('aria-owns')
  const bControls = b.getAttribute?.('aria-controls') || b.getAttribute?.('aria-owns')
  if (aControls && aControls === bControls) return true

  // Form-item wrappers cover Radix/shadcn without binding to their classes.
  const container = (el: HTMLElement) => el.closest?.('[data-slot], [data-radix-popper-content-wrapper], .form-item, .form-group, [role="group"]') || el.parentElement
  const aContainer = container(a)
  const bContainer = container(b)
  return !!aContainer && aContainer === bContainer
}

function semanticText(field: FormField): string {
  return normalize(field.label || field.placeholder || field.name)
}

function normalize(value: string | undefined): string {
  return (value || '').toLowerCase().replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[^a-z0-9]+/g, ' ').trim()
}

function isGeneratedIdentifier(value: string | undefined): boolean {
  return !!value && (/^_r_[a-z0-9_-]+$/i.test(value) || /^radix-/i.test(value) || /-form-item$/i.test(value))
}
