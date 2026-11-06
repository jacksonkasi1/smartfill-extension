/**
 * End-to-end over the DOM: detect -> mock -> fill must write form values
 * without ever clicking a button, link or menu on the page.
 */

import { beforeAll, describe, expect, test } from 'bun:test'

// ** import lib
import { giveBox, installDom, page } from '../helpers/dom'

installDom()

let detection: typeof import('../../src/lib/detection')
let filling: typeof import('../../src/lib/filling')
let mock: typeof import('../../src/lib/mock')

beforeAll(async () => {
  detection = await import('../../src/lib/detection')
  filling = await import('../../src/lib/filling')
  mock = await import('../../src/lib/mock')
})

/** Counts every click that reaches a non-field element. */
function trapClicks(): string[] {
  const clicked: string[] = []
  document.addEventListener('click', event => {
    const target = event.target as HTMLElement
    if (target.closest('button, a, [role="button"], [role="menuitem"]')) clicked.push(target.id || target.textContent || target.tagName)
  }, true)
  return clicked
}

async function fillAll() {
  const fields = detection.normalizeFormFields(detection.detectFields(document)).fields
  const generator = new mock.MockGenerator({ profile: mock.PROFILES[0], region: 'us', seed: 42 })
  const data = mock.generateMockData(fields, generator)
  const result = await filling.fillForm(fields, data)
  return { fields, result }
}

describe('filling never clicks page controls', () => {
  test('a form inside an app shell', async () => {
    const get = page(`
      <header>
        <button id="back" class="text-sm">Back</button>
        <button id="theme" aria-pressed="false" class="select-none text-sm">Theme</button>
        <button id="menu" aria-haspopup="menu" aria-expanded="false">Account</button>
        <label><input type="checkbox" id="dark" role="switch"> Dark mode</label>
      </header>
      <form>
        <label for="name">Full name</label><input id="name" name="name">
        <label for="email">Email</label><input id="email" name="email" type="email">
        <label for="country">Country</label>
        <select id="country" name="country"><option value="">Choose</option><option value="US">United States</option><option value="IN">India</option></select>
        <label><input type="checkbox" id="terms" name="terms"> I accept the terms</label>
        <button type="button" aria-expanded="false" id="more">Show more options</button>
        <button type="submit" id="submit">Submit</button>
      </form>`)
    const clicked = trapClicks()
    const { fields, result } = await fillAll()

    expect(fields.map(f => f.element.id)).toEqual(['name', 'email', 'country', 'terms'])
    expect(result.filled).toBe(4)
    expect((get('name') as HTMLInputElement).value).not.toBe('')
    expect((get('email') as HTMLInputElement).value).toContain('@')
    expect((get('country') as HTMLSelectElement).value).not.toBe('')
    expect((get('dark') as HTMLInputElement).checked).toBe(false)
    expect(clicked).toEqual([])
  })

  test('fillCustomSelect refuses anything that is not a dropdown', async () => {
    const get = page(`<button id="toggle" aria-expanded="false">Menu</button><button id="menu" aria-haspopup="menu">Menu</button>`)
    const clicked = trapClicks()
    expect(await filling.fillCustomSelect(get('toggle'), 'x')).toBe(false)
    expect(await filling.fillCustomSelect(get('menu'), 'x')).toBe(false)
    expect(clicked).toEqual([])
  })

  test('a menu that opens from a combobox is never clicked into', async () => {
    const get = page(`<form>
      <label id="l">Plan</label>
      <button type="button" role="combobox" aria-labelledby="l" id="plan">Pick</button>
      <div role="menu" id="pop" hidden><div role="menuitem" id="logout">Log out</div></div>
    </form>`)
    const trigger = get('plan')
    const popup = get('pop')
    giveBox(popup)
    trigger.addEventListener('click', () => { popup.hidden = false })
    const clicked = trapClicks()
    expect(await filling.fillCustomSelect(trigger, 'Log out')).toBe(false)
    expect(clicked.filter(id => id !== 'plan')).toEqual([])
  })

  test('a real listbox gets the matching option', async () => {
    const get = page(`<form>
      <label id="l">Plan</label>
      <button type="button" role="combobox" aria-labelledby="l" aria-controls="lb" id="plan">Pick</button>
      <ul role="listbox" id="lb" hidden>
        <li role="option" id="o1">Free</li><li role="option" id="o2">Pro</li><li role="option" id="o3"><a href="/x">Docs</a></li>
      </ul>
    </form>`)
    const trigger = get('plan')
    const listbox = get('lb')
    giveBox(listbox)
    let chosen = ''
    trigger.addEventListener('mousedown', () => { listbox.hidden = false })
    listbox.addEventListener('click', event => {
      chosen = (event.target as HTMLElement).id
      listbox.hidden = true
    })
    expect(await filling.fillCustomSelect(trigger, 'pro')).toBe(true)
    expect(chosen).toBe('o2')
  })

  test('select matching prefers exact options ("Male" is not "Female")', () => {
    const get = page(`<select id="g"><option value="">-</option><option>Female</option><option>Male</option></select>`)
    expect(filling.fillSelectField(get('g') as HTMLSelectElement, 'Male')).toBe(true)
    expect((get('g') as HTMLSelectElement).value).toBe('Male')
  })

  test('radio groups pick by label, not the first partial match', () => {
    page(`<fieldset><legend>Gender</legend>
      <label><input type="radio" name="g" value="1" id="f"> Female</label>
      <label><input type="radio" name="g" value="2" id="m"> Male</label>
    </fieldset>`)
    const [field] = detection.detectFields(document)
    expect(field.options).toEqual(['Female', 'Male'])
    expect(filling.fillRadioField(field.element as HTMLInputElement, 'Male', document.body, field.group)).toBe(true)
    expect((document.getElementById('m') as HTMLInputElement).checked).toBe(true)
    expect((document.getElementById('f') as HTMLInputElement).checked).toBe(false)
  })

  test('a Radix-style hidden select is filled without a click', async () => {
    const get = page(`<form>
      <label id="l">Plan</label>
      <button type="button" role="combobox" aria-labelledby="l" id="plan"><span>Pick</span></button>
      <select aria-hidden="true" tabindex="-1" name="plan" id="native"><option value=""></option><option value="free">Free</option><option value="pro">Pro</option></select>
    </form>`)
    const native = get('native') as HTMLSelectElement
    // What Radix does: the native select's onChange drives the trigger's text.
    native.addEventListener('change', () => { get('plan').textContent = native.selectedOptions[0].text })
    const clicked = trapClicks()
    const fields = detection.normalizeFormFields(detection.detectFields(document)).fields
    const result = await filling.fillForm(fields, { plan: 'Pro' })
    expect(result.filled).toBe(1)
    expect(native.value).toBe('pro')
    expect(get('plan').textContent).toBe('Pro')
    expect(clicked).toEqual([])
  })
})
