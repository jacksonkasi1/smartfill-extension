// ** import utils
import { closestDeep, containsDeep } from './dom'

/**
 * Guards that keep SmartFill away from page controls that are not form
 * data: theme switches, menu toggles, accordions, language pickers,
 * site search, table filters. Ticking, selecting, typing into or
 * clicking one of these changes the page itself, so every field has to
 * pass these checks before it is filled.
 */

/** Regions that hold site navigation and widgets rather than form data. */
const CHROME_SELECTOR = [
  'nav', 'header', 'footer',
  '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
  '[role="menubar"]', '[role="menu"]', '[role="menuitem"]', '[role="toolbar"]',
  '[role="tablist"]', '[role="tree"]', '[role="grid"]', '[role="treegrid"]',
  'thead'
].join(', ')

/** Chrome that stays chrome even inside a form (a form wrapped around the whole page). */
const HARD_CHROME_SELECTOR = [
  'nav', '[role="navigation"]', '[role="menubar"]', '[role="menu"]', '[role="menuitem"]',
  '[role="toolbar"]', '[role="tablist"]', '[role="tree"]', '[role="grid"]', '[role="treegrid"]', 'thead'
].join(', ')

const FORM_SELECTOR = 'form, [role="form"]'

const words = (list: string[]) => new RegExp(list.map(word => `\\b${word}\\b`).join('|'))

/** Page appearance controls: never form data, wherever they are. */
const THEME_WORDS = words([
  'theme', 'dark ?mode', 'light ?mode', 'night ?mode', 'colou?r ?(scheme|mode)'
])

/**
 * Words that mark a control outside a form as page UI. Only matched
 * against ids, names, aria labels and test ids: a form question's
 * visible text ("Which menu do you prefer?") is not evidence.
 */
const UI_WORDS = words([
  'appearance', 'dark', 'light',
  'menu', 'nav', 'navigation', 'hamburger', 'burger', 'sidebar', 'side ?bar', 'drawer', 'off ?canvas',
  'accordion', 'collapse', 'expand', 'collapsible', 'toggle ?(menu|nav|sidebar|panel|all)',
  'tabs?', 'read ?more', 'show ?more', 'see ?more', 'modal', 'popover', 'dropdown', 'overlay', 'lightbox',
  'sort', 'sort ?by', 'order ?by', 'per ?page', 'page ?size', 'rows ?per ?page', 'show ?entries',
  'results ?per ?page', 'view ?mode', 'filters?', 'facets?', 'refine', 'select ?all', 'select ?row',
  'bulk ?select', 'columns?'
])

/** Class names are noisy (Tailwind `font-light`), so only compound names count. */
const UI_CLASSES = /(theme|dark-?mode|color-?scheme|mode)[-_]?(toggle|switch|switcher|picker)|(toggle|switch)[-_]?(theme|dark|mode)|(menu|nav|sidebar|drawer|hamburger|burger|accordion|collapse|offcanvas|tab|modal|read-?more)[-_]?(toggle|trigger|check|checkbox|input|state|control|radio)|(^|\s)(navbar|nav)-toggler/i

/** Language and currency switchers: page UI when they sit alone, outside a form, with no label. */
const SWITCHER_WORDS = words(['language', 'lang', 'locale', 'currency', 'translate'])

/** Site search, table filters and "jump to" boxes. */
const SEARCH_WORDS = words(['search', 'filter', 'filters', 'query', 'q', 'find', 'lookup', 'jump ?to'])

/**
 * Inside site chrome with no form of its own in between. A `<header>` or
 * `<footer>` inside a form is part of that form; navigation, menus and
 * toolbars are chrome even inside a form wrapped around the whole page.
 */
export function isPageChrome(el: Element): boolean {
  const chrome = closestDeep(el, CHROME_SELECTOR)
  if (!chrome) return false
  const form = closestDeep(el, FORM_SELECTOR)
  if (!form) return true
  // A form inside the header (a login box) is a form.
  if (!containsDeep(form, chrome)) return false
  const hard = closestDeep(el, HARD_CHROME_SELECTOR)
  return Boolean(hard && containsDeep(form, hard))
}

export function isInsideForm(el: Element): boolean {
  return Boolean(closestDeep(el, `${FORM_SELECTOR}, fieldset`))
}

function attributeText(el: Element): string {
  const parts = [
    el.getAttribute('id'), el.getAttribute('name'), el.getAttribute('aria-label'),
    el.getAttribute('title'), el.getAttribute('data-testid'), el.getAttribute('data-test-id')
  ]
  return normalizeWords(parts.filter(Boolean).join(' '))
}

function normalizeWords(text: string): string {
  return text.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().replace(/[^a-z0-9]+/g, ' ')
}

/** No other field within a few levels: a lone widget rather than part of a form. */
function standsAlone(el: Element): boolean {
  let node: Element | null = el.parentElement
  for (let depth = 0; node && depth < 3; depth++, node = node.parentElement) {
    if (node.querySelectorAll('input:not([type="hidden"]), select, textarea').length > 1) return false
  }
  return true
}

/** Native `<select>` whose options are links: changing it navigates away. */
export function isNavigationSelect(select: HTMLSelectElement): boolean {
  const values = Array.from(select.options).map(o => o.value).filter(Boolean)
  if (values.length === 0) return false
  const links = values.filter(v => /^(https?:|\/|\.\.?\/|#)/i.test(v))
  return links.length >= Math.max(2, Math.ceil(values.length / 2)) || select.hasAttribute('onchange') && links.length > 0
}

/**
 * Site search or a table filter box. Typing there filters or navigates
 * the page, and its suggestion lists are links in disguise.
 */
export function isSearchBox(el: HTMLElement): boolean {
  const type = (el as HTMLInputElement).type?.toLowerCase?.() || ''
  const role = (el.getAttribute('role') || '').toLowerCase()
  if (closestDeep(el, '[role="search"], search')) return true
  if (type === 'search' || role === 'searchbox') return !isInsideForm(el) || isPageChrome(el) || Boolean(closestDeep(el, 'form[role="search"]'))
  if (isPageChrome(el)) return true
  const text = `${attributeText(el)} ${normalizeWords(el.getAttribute('placeholder') || '')}`
  return !isInsideForm(el) && SEARCH_WORDS.test(text)
}

/**
 * Whether a checkbox, radio, select or custom dropdown is page UI that
 * must not be changed. `label` is the field's resolved label text and
 * `labelled` says whether the page gave it a label of its own.
 */
export function isUiControl(el: HTMLElement, label = '', labelled = false): boolean {
  if (isPageChrome(el)) return true

  const role = (el.getAttribute('role') || '').toLowerCase()
  if (role === 'tab' || role === 'menuitemcheckbox' || role === 'menuitemradio' || role === 'treeitem') return true

  const attrs = attributeText(el)
  if (THEME_WORDS.test(`${attrs} ${normalizeWords(label)}`)) return true
  const inForm = isInsideForm(el)
  if (!inForm) {
    if (UI_WORDS.test(attrs)) return true
    if (UI_CLASSES.test(typeof el.className === 'string' ? el.className : '')) return true
    if (!labelled && SWITCHER_WORDS.test(`${attrs} ${normalizeWords(label)}`) && standsAlone(el)) return true
  }

  // Switches usually apply a setting the moment they flip (and theme
  // toggles are almost always switches), so only touch ones in a form.
  if (role === 'switch' && !inForm) return true

  if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio') && !inForm) {
    // Row-selection checkboxes in data tables.
    if (el.type === 'checkbox' && closestDeep(el, 'table, [role="row"]')) return true
    // CSS-only tabs, "read more" and modal toggles: a hidden, nameless
    // input driven by its label's :checked state.
    if (!el.name && !isRenderedBox(el)) return true
  }

  if (el instanceof HTMLSelectElement && isNavigationSelect(el)) return true
  return false
}

/** Has a layout box of its own (custom checkboxes keep a 1px sr-only box; CSS hacks use display:none). */
function isRenderedBox(el: HTMLElement): boolean {
  if (typeof (el as any).checkVisibility === 'function') return (el as any).checkVisibility()
  return getComputedStyle(el).display !== 'none'
}

/**
 * A non-native element that behaves like a `<select>`: an ARIA
 * combobox or a trigger that opens a listbox. Menu buttons
 * (`aria-haspopup="menu"` / `"true"`), disclosure buttons
 * (`aria-expanded` alone) and links never qualify.
 */
export function isCustomSelectTrigger(el: Element): boolean {
  const tag = el.tagName.toLowerCase()
  if (tag === 'a' || tag === 'input' || tag === 'select' || tag === 'textarea') return false
  const role = (el.getAttribute('role') || '').toLowerCase()
  if (role === 'combobox') return true
  const popup = (el.getAttribute('aria-haspopup') || '').toLowerCase()
  return popup === 'listbox'
}
