/**
 * Cases found in review of the safe-fill branch: each one either touched
 * page UI or lost a real field.
 */

import { beforeAll, describe, expect, test } from 'bun:test'

// ** import lib
import { giveBox, installDom, page } from '../helpers/dom'

installDom()

let detection: typeof import('../../src/lib/detection')
let filling: typeof import('../../src/lib/filling')
let memory: typeof import('../../src/lib/memory')

beforeAll(async () => {
  detection = await import('../../src/lib/detection')
  filling = await import('../../src/lib/filling')
  memory = await import('../../src/lib/memory')
})

const detect = () => detection.normalizeFormFields(detection.detectFields(document)).fields
const labels = () => detect().map(f => f.label)

describe('page UI stays out', () => {
  test('site search and table filter boxes are not fields', () => {
    page(`
      <header><input type="search" role="combobox" aria-label="Search docs"></header>
      <div role="search"><input aria-label="Find products"></div>
      <label>Filter rows <input name="filter"></label>
      <form><label for="n">Name</label><input id="n" name="name"></form>`)
    expect(labels()).toEqual(['Name'])
  })

  test('CSS-only tabs and read-more toggles are left alone', () => {
    page(`
      <input type="radio" name="tabs" id="t1" style="display:none"><label for="t1">Overview</label>
      <input type="radio" name="tabs" id="t2" style="display:none"><label for="t2">Specs</label>
      <input type="checkbox" id="read-more-3" style="display:none"><label for="read-more-3">Read more</label>
      <form><label><input type="checkbox" name="news"> Send me news</label></form>`)
    expect(labels()).toEqual(['Send me news'])
  })

  test('inline-editable headings are not filled', () => {
    page(`<h1 contenteditable="true">Untitled document</h1>
      <form><div contenteditable="true" aria-label="Notes"></div></form>`)
    expect(labels()).toEqual(['Notes'])
  })

  test('a combobox input does not pick from a listbox that was already on screen', async () => {
    page(`<ul role="listbox" id="contacts"><li role="option" id="john">John Smith</li></ul>
      <form><input role="combobox" aria-label="Assignee" id="who"></form>`)
    giveBox(document.getElementById('contacts')!)
    let clicked = false
    document.getElementById('john')!.addEventListener('click', () => { clicked = true })
    await filling.fillComboboxInput(document.getElementById('who') as HTMLInputElement, 'John')
    expect(clicked).toBe(false)
  })

  test('a dropdown that opens nothing gets no Escape (a dialog around it stays open)', async () => {
    page(`<div role="dialog" id="dlg"><form><label id="l">Plan</label><button type="button" role="combobox" aria-labelledby="l" id="plan">Pick</button></form></div>`)
    let escapes = 0
    document.getElementById('dlg')!.addEventListener('keydown', e => { if ((e as KeyboardEvent).key === 'Escape') escapes++ })
    expect(await filling.fillCustomSelect(document.getElementById('plan')!, 'Pro')).toBe(false)
    expect(escapes).toBe(0)
  })
})

describe('real fields are kept', () => {
  test('menu, light and filter words in a form question are fine inside a form', () => {
    page(`<form>
      <label><input type="checkbox" name="veg_menu"> Vegetarian menu</label>
      <fieldset><legend>Roast</legend>
        <label><input type="radio" name="roast" value="light"> Light</label>
        <label><input type="radio" name="roast" value="medium"> Medium</label>
      </fieldset>
    </form>`)
    expect(labels()).toEqual(['Vegetarian menu', 'Roast'])
  })

  test('a header inside a form is part of the form', () => {
    page(`<form><header><label for="c">Country</label><select id="c" name="country"><option value="in">India</option></select></header>
      <footer><label><input type="checkbox" name="terms"> I accept the terms</label></footer></form>`)
    expect(labels()).toEqual(['Country', 'I accept the terms'])
  })

  test('a labelled country / currency select works in a form-less app', () => {
    page(`<div class="card"><div>Currency</div><div><select name="currency"><option>INR</option><option>USD</option></select></div>
      <div>Amount</div><div><input name="amount"></div></div>`)
    expect(labels()).toEqual(['Currency', 'Amount'])
  })

  test('real select2 and Choices markup', () => {
    page(`<form>
      <label for="s">State</label>
      <select id="s" name="state" class="select2-hidden-accessible" aria-hidden="true" tabindex="-1"><option value="ca">CA</option></select>
      <span class="select2 select2-container">CA</span>
      <div class="choices"><select name="city" hidden><option value="sf">SF</option></select><div class="choices__inner">SF</div></div>
    </form>`)
    expect(detect().map(f => f.name)).toEqual(['state', 'city'])
  })

  test('MUI Select does not put its value in the label', () => {
    page(`<form><label id="age-label">Age</label>
      <div role="combobox" aria-haspopup="listbox" id="mui-age" aria-labelledby="age-label mui-age">Twenty</div></form>`)
    expect(labels()).toEqual(['Age'])
  })

  test('nameless radios with no group element form one group', () => {
    page(`<form><p>Size</p><div>
      <label><input type="radio" value="s"> Small</label>
      <label><input type="radio" value="l"> Large</label>
    </div></form>`)
    const fields = detect()
    expect(fields).toHaveLength(1)
    expect(fields[0].group).toHaveLength(2)
  })
})

describe('memory', () => {
  test('small saved forms only match on their own page', () => {
    const sig = (kind: string, label: string) => ({ kind, label, name: label })
    const login = [sig('email', 'email'), sig('password', 'password'), sig('check', 'remember me')]
    const form = { id: 'l', host: 'h', path: '/login', title: 'Login', fields: login, containers: [], createdAt: 1, updatedAt: 1, fillCount: 0 }
    expect(memory.bestFormMatch([form], login, '/settings')).toBeUndefined()
    expect(memory.bestFormMatch([form], login, '/login')).toBeDefined()
  })

  test('non-Latin labels keep their words', () => {
    expect(memory.normalizeLabel('पूरा नाम')).toBe('पूरा नाम')
    expect(memory.normalizeLabel('電話番号')).toBe('電話番号')
  })
})
