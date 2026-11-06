import { afterEach, beforeAll, describe, expect, test } from 'bun:test'

// ** import lib
import { installDom } from '../helpers/dom'

const win = installDom()

let picker: typeof import('../../src/lib/picker')

beforeAll(async () => {
  picker = await import('../../src/lib/picker')
})

function hostRoot(): ShadowRoot | null {
  const host = document.querySelector('[data-smartfill-ui]')
  return host ? host.shadowRoot : null
}

function pageWithFields() {
  document.body.innerHTML = `
    <form id="signup"><input id="a"><input id="b"><input id="c"></form>
    <button id="theme">Theme</button>`
  return ['a', 'b', 'c'].map(id => document.getElementById(id) as unknown as HTMLElement)
}

function key(name: string) {
  window.dispatchEvent(new win.KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }) as any)
}

afterEach(() => {
  document.querySelectorAll('[data-smartfill-ui]').forEach(el => el.remove())
  document.body.innerHTML = ''
})

describe('startRegionPicker', () => {
  test('creates the host and shows the initial selection count', () => {
    const fields = pageWithFields()
    const stop = picker.startRegionPicker({ fields, initial: [fields[0], fields[2]], onDone: () => {} })
    const root = hostRoot()
    expect(root).not.toBeNull()
    expect(root!.querySelector('.sf-count')!.textContent).toBe('2 fields selected')
    expect(root!.querySelector('.sf-toolbar-title')!.textContent).toContain('Select the form to fill')
    stop()
    expect(document.querySelector('[data-smartfill-ui]')).toBeNull()
  })

  test('Escape cancels and removes the UI and listeners', () => {
    const fields = pageWithFields()
    const calls: Array<[unknown, boolean]> = []
    picker.startRegionPicker({ fields, initial: [fields[0]], onDone: (r, fill) => calls.push([r, fill]) })
    key('Escape')
    expect(calls).toEqual([[null, false]])
    expect(document.querySelector('[data-smartfill-ui]')).toBeNull()
    key('Escape')
    key('Enter')
    expect(calls).toHaveLength(1)
  })

  test('Enter saves and fills with the selected elements in field order', () => {
    const fields = pageWithFields()
    let result: any
    let fillNow = false
    picker.startRegionPicker({ fields, initial: [fields[2], fields[0]], onDone: (r, f) => { result = r; fillNow = f } })
    key('Enter')
    expect(fillNow).toBe(true)
    expect(result.elements.map((e: HTMLElement) => e.id)).toEqual(['a', 'c'])
    expect(result.containers[0].id).toBe('signup')
    expect(document.querySelector('[data-smartfill-ui]')).toBeNull()
  })

  test('Enter does nothing with an empty selection', () => {
    const fields = pageWithFields()
    let calls = 0
    const stop = picker.startRegionPicker({ fields, onDone: () => { calls++ } })
    key('Enter')
    expect(calls).toBe(0)
    expect((hostRoot()!.querySelector('.sf-primary') as HTMLButtonElement).disabled).toBe(true)
    stop()
  })

  test('starting again tears down the previous picker', () => {
    const fields = pageWithFields()
    picker.startRegionPicker({ fields, onDone: () => {} })
    const stop = picker.startRegionPicker({ fields, onDone: () => {} })
    expect(hostRoot()!.querySelectorAll('.sf-toolbar')).toHaveLength(1)
    stop()
  })

  test('page clicks are blocked while picking', () => {
    const fields = pageWithFields()
    let themeClicks = 0
    document.getElementById('theme')!.addEventListener('click', () => { themeClicks++ })
    const stop = picker.startRegionPicker({ fields, onDone: () => {} })
    document.getElementById('theme')!.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true }) as any)
    expect(themeClicks).toBe(0)
    stop()
    document.getElementById('theme')!.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true }) as any)
    expect(themeClicks).toBe(1)
  })
})

describe('showPagePanel', () => {
  test('renders title, message and actions; close removes it', () => {
    let clicked = 0
    const close = picker.showPagePanel({
      title: 'Recognized this form',
      message: '94% match',
      actions: [{ label: 'Fill', primary: true, onClick: () => { clicked++ } }, { label: 'Rescan', onClick: () => {} }]
    })
    const root = hostRoot()!
    expect(root.querySelector('.sf-panel-title')!.textContent).toBe('Recognized this form')
    expect(root.querySelector('.sf-panel-msg')!.textContent).toBe('94% match')
    const buttons = Array.from(root.querySelectorAll('.sf-actions button')).map(b => b.textContent)
    expect(buttons).toEqual(['Fill', 'Rescan'])
    ;(root.querySelector('.sf-actions .sf-primary') as HTMLButtonElement).click()
    expect(clicked).toBe(1)
    expect(document.querySelector('[data-smartfill-ui]')).toBeNull()
    close()
  })

  test('a new panel replaces the old one', () => {
    picker.showPagePanel({ title: 'One' })
    const close = picker.showPagePanel({ title: 'Two' })
    const titles = Array.from(hostRoot()!.querySelectorAll('.sf-panel-title')).map(t => t.textContent)
    expect(titles).toEqual(['Two'])
    close()
    expect(document.querySelector('[data-smartfill-ui]')).toBeNull()
  })

  test('isSmartFillUi recognizes the host and its shadow content', () => {
    const close = picker.showPagePanel({ title: 'x' })
    const host = document.querySelector('[data-smartfill-ui]')!
    expect(picker.isSmartFillUi(host)).toBe(true)
    expect(picker.isSmartFillUi(host.shadowRoot!.querySelector('.sf-panel'))).toBe(true)
    expect(picker.isSmartFillUi(document.body)).toBe(false)
    close()
  })
})
