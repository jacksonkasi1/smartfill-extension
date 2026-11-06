/**
 * SmartFill must fill form data and nothing else: theme toggles, back
 * buttons, menus and table filters on the same page are never touched.
 */

import { beforeAll, describe, expect, test } from 'bun:test'

// ** import lib
import { installDom, page } from '../helpers/dom'

installDom()

let detection: typeof import('../../src/lib/detection')

beforeAll(async () => {
  detection = await import('../../src/lib/detection')
})

const detect = () => detection.normalizeFormFields(detection.detectFields(document)).fields
const labels = () => detect().map(f => f.label)

/** A typical app shell: header widgets around a real form. */
const SHELL = `
  <header>
    <button id="back" class="text-sm select-none" aria-label="Back"><svg></svg></button>
    <button id="theme" class="theme-toggle text-sm" aria-pressed="false">Toggle theme</button>
    <button id="menu" aria-expanded="false" aria-haspopup="menu">Account</button>
    <button id="hamburger" aria-expanded="false" class="navbar-toggler">Menu</button>
    <select id="lang"><option>English</option><option>Deutsch</option></select>
    <input id="nav-toggle" type="checkbox">
  </header>
  <nav><button aria-haspopup="listbox" role="combobox" id="nav-combo">Products</button></nav>
  <div class="settings-strip">
    <label><input type="checkbox" role="switch" id="dark"> Dark mode</label>
    <button aria-expanded="true" class="accordion-button" id="faq">What is this?</button>
    <button class="date-picker-btn update-btn" id="update">Update</button>
    <div role="button" class="select-file" id="pseudo">Choose a file</div>
    <label for="sort">Sort by</label>
    <select id="sort"><option value="new">Newest</option><option value="old">Oldest</option></select>
    <select id="jump"><option value="/a">A</option><option value="/b">B</option><option value="/c">C</option></select>
  </div>
  <table><tr><td><input type="checkbox" id="row1"></td><td>Row</td></tr></table>
`

describe('page UI is never a field', () => {
  test('buttons, toggles, menus and switchers are ignored', () => {
    page(`${SHELL}
      <form id="signup">
        <label for="email">Email</label><input id="email" type="email" name="email">
      </form>`)
    const fields = detect()
    expect(fields.map(f => f.element.id)).toEqual(['email'])
  })

  test('isUiControl catches theme, menu and listing controls', () => {
    const get = page(SHELL)
    for (const id of ['dark', 'nav-toggle', 'sort', 'jump', 'row1', 'lang']) {
      expect(detection.isUiControl(get(id))).toBe(true)
    }
  })

  test('custom dropdown triggers need a combobox role or a listbox popup', () => {
    const get = page(`
      <button id="a" aria-expanded="false">More</button>
      <button id="b" aria-haspopup="menu">Menu</button>
      <button id="c" aria-haspopup="true">Open</button>
      <button id="d" role="combobox">Country</button>
      <div id="e" aria-haspopup="listbox">Plan</div>
      <a id="f" role="combobox" href="/x">Link</a>`)
    expect(['a', 'b', 'c', 'd', 'e', 'f'].map(id => detection.isCustomSelectTrigger(get(id)))).toEqual([false, false, false, true, true, false])
  })
})

describe('form fields are found', () => {
  test('a mixed signup form', () => {
    page(`${SHELL}
      <form id="signup">
        <label for="first">First name</label><input id="first" name="first_name">
        <input id="last" TYPE="TEXT" name="last_name" placeholder="Last name">
        <label>Work email <input type="EMAIL" name="work_email" id="work_email"></label>
        <label>Employees <input type="numeric" name="employees"></label>
        <fieldset>
          <legend>Gender</legend>
          <label><input type="radio" name="gender" value="m"> Male</label>
          <label><input type="radio" name="gender" value="f"> Female</label>
        </fieldset>
        <label><input type="checkbox" id="terms"> I agree to the terms</label>
        <label id="plan-label">Plan</label>
        <button type="button" role="combobox" aria-labelledby="plan-label" id="plan">Select a plan</button>
        <select aria-hidden="true" tabindex="-1" name="plan" style="position:absolute;width:1px;height:1px">
          <option value=""></option><option value="free">Free</option><option value="pro">Pro</option>
        </select>
        <div contenteditable="true" aria-label="About you" id="about"></div>
        <button type="submit">Create account</button>
      </form>`)
    const fields = detect()
    expect(fields.map(f => f.label)).toEqual([
      'First name', 'Last name', 'Work email', 'Employees', 'Gender', 'I agree to the terms', 'Plan', 'About you'
    ])
    const gender = fields.find(f => f.label === 'Gender')!
    expect(gender.type).toBe('radio')
    expect(gender.options).toEqual(['m', 'f'])
    expect(gender.group).toHaveLength(2)

    const plan = fields.find(f => f.label === 'Plan')!
    // The hidden native select is filled instead of clicking the trigger.
    expect(plan.element.tagName).toBe('SELECT')
    expect(plan.trigger?.id).toBe('plan')
    expect(plan.options).toEqual(['free', 'pro'])

    expect(fields.find(f => f.label === 'About you')!.type).toBe('textarea')
  })

  test('inputs inside open shadow roots', () => {
    page(`<form><my-field id="host"></my-field></form>`)
    const host = document.getElementById('host')!
    const root = host.attachShadow({ mode: 'open' })
    root.innerHTML = `<label for="inner">Company</label><input id="inner" name="company">`
    expect(labels()).toEqual(['Company'])
  })

  test('copy-pasted names stay separate fields with unique keys', () => {
    page(`<form>
      <label for="p1">Phone</label><input id="p1" name="phone">
      <label for="p2">Alternate phone</label><input id="p2" name="phone">
    </form>`)
    const fields = detect()
    expect(fields.map(f => f.name)).toEqual(['phone', 'phone__2'])
    expect(fields.map(f => f.label)).toEqual(['Phone', 'Alternate phone'])
  })

  test('nameless radios group by their radiogroup', () => {
    page(`<div role="radiogroup" aria-label="Size">
      <label><input type="radio" value="s"> Small</label>
      <label><input type="radio" value="l"> Large</label>
    </div>`)
    const fields = detect()
    expect(fields).toHaveLength(1)
    expect(fields[0].label).toBe('Size')
    expect(fields[0].group).toHaveLength(2)
  })

  test('hidden text inputs are skipped, custom-styled checkboxes are kept', () => {
    page(`<form>
      <input name="honeypot_trap" style="display:none">
      <div style="display:none"><input name="step2_city"></div>
      <input type="checkbox" id="news" style="display:none"><label for="news">Send me updates</label>
      <div><select name="state" style="display:none"><option value="ca">CA</option></select><span class="select2 select2-container">CA</span></div>
    </form>`)
    // select2 / Chosen hide the real select and draw their widget beside it.
    expect(labels()).toEqual(['Send me updates', 'State'])
  })

  test('a label wrapping a select does not include the option text', () => {
    page(`<form><label>Country <select name="c"><option>India</option><option>Japan</option></select></label></form>`)
    expect(labels()).toEqual(['Country'])
  })

  test('disabled, readonly and SmartFill UI elements are skipped', () => {
    page(`<form>
      <input name="a" disabled><input name="b" readonly>
      <fieldset disabled><input name="c"></fieldset>
      <input name="d" aria-disabled="true">
      <input name="ok">
    </form><div data-smartfill-ui><input name="ours"></div>`)
    expect(detect().map(f => f.name)).toEqual(['ok'])
  })

  test('switches inside a form are form data', () => {
    page(`<form><label><input type="checkbox" role="switch" name="notify"> Email notifications</label></form>`)
    expect(labels()).toEqual(['Email notifications'])
  })
})
