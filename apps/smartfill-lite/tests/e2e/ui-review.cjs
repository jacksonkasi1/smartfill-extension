/* Run after build with the fixture server running:
 * node tests/e2e/ui-review.cjs [absolute path to a playwright-core installation]
 * Requires an installed Playwright Chromium, or SMARTFILL_CHROMIUM executable path.
 */
const { chromium } = require(process.argv[2] || 'playwright-core')
const assert = require('node:assert/strict')
const { mkdirSync } = require('node:fs')
const { resolve } = require('node:path')

async function main() {
  const browser = await chromium.launch({ headless: true, ...(process.env.SMARTFILL_CHROMIUM ? { executablePath: process.env.SMARTFILL_CHROMIUM } : {}) })
  try {
    const page = await browser.newPage({ viewport: { width: 1120, height: 900 } })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    const output = resolve(__dirname, '../../docs/ui')
    mkdirSync(output, { recursive: true })
    const url = process.env.SMARTFILL_PREVIEW_URL || 'http://localhost:4317'
    const screenshot = async (name, popup = false) => {
      await page.evaluate(() => Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 5000))]))
      const options = popup ? { clip: { x: 0, y: 0, width: 380, height: Math.min(page.viewportSize().height, await page.locator('body').evaluate(el => el.scrollHeight)) } } : { fullPage: true }
      await page.screenshot({ path: resolve(output, name + '.png'), animations: 'disabled', ...options })
    }
    for (const colorScheme of ['light', 'dark']) {
      const previewSuffix = colorScheme === 'dark' ? 'light-on-dark-system' : 'light'
      console.log('Reviewing default light UI with ' + colorScheme + ' system preference')
      await page.setViewportSize({ width: 380, height: 600 })
      await page.emulateMedia({ colorScheme })
      await page.goto(url + '/popup?scope=memory')
      await page.waitForSelector('.fill-button')
      assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme), 'light')
      assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(250, 250, 250)')
      await page.getByRole('button', { name: 'Fill same values', exact: true }).click()
      await page.waitForSelector('.status.success')
      assert.equal(await page.getByRole('button', { name: 'Undo', exact: true }).isEnabled(), true)
      await page.getByRole('button', { name: 'New values', exact: true }).click()
      await page.waitForSelector('.status.success')
      await page.getByRole('button', { name: 'Undo', exact: true }).click()
      assert.equal(await page.getByRole('button', { name: 'Undo', exact: true }).isDisabled(), true)
      await page.getByRole('button', { name: 'Fill same values', exact: true }).click()
      await page.waitForSelector('.status.success')
      await page.evaluate(() => {
        window.__originalSendMessage = chrome.tabs.sendMessage
        chrome.tabs.sendMessage = async (id, message) => message.action === 'scanForms'
          ? { success: false } : window.__originalSendMessage(id, message)
      })
      await page.getByRole('combobox', { name: 'Region', exact: true }).click()
      await page.getByRole('option', { name: 'US', exact: true }).click()
      await page.getByRole('button', { name: 'Retry', exact: true }).waitFor()
      assert.equal(await page.getByRole('button', { name: 'Undo', exact: true }).isEnabled(), true, 'Undo remains available after a failed rescan')
      await page.getByRole('button', { name: 'Undo', exact: true }).click()
      await page.evaluate(() => { chrome.tabs.sendMessage = window.__originalSendMessage })
      await page.getByRole('button', { name: 'Retry', exact: true }).click()
      await page.getByRole('button', { name: 'Fill same values', exact: true }).waitFor({ state: 'visible' })
      await page.getByRole('radio', { name: 'AI fill' }).click()
      await page.getByRole('textbox', { name: 'Instructions for AI' }).fill('Use fictional test data.')
      await page.getByRole('radio', { name: 'AI fill' }).press('ArrowLeft')
      assert.equal(await page.getByRole('radio', { name: 'Mock data' }).getAttribute('aria-checked'), 'true')
      assert.equal(await page.getByRole('button', { name: /record|replay/i }).count(), 0)
      assert.equal(await page.locator('.popup').evaluate(el => getComputedStyle(el).padding), '12px')
      assert.equal(await page.locator('.hero').evaluate(el => getComputedStyle(el).padding), '16px')
      await page.goto(url + '/popup?scope=memory')
      await page.waitForSelector('.fill-button')
      await screenshot('popup-' + previewSuffix, true)
      await page.getByRole('combobox', { name: 'Industry profile', exact: true }).click()
      await page.getByRole('combobox', { name: 'Search industry profile' }).fill('health')
      await page.getByRole('option', { name: /Healthcare/ }).waitFor()
      const menuBounds = await page.locator('[data-picker-popup]').boundingBox()
      assert.ok(menuBounds.x >= 0 && menuBounds.x + menuBounds.width <= 380, 'Popup menu stays within extension viewport')
      assert.ok(menuBounds.y >= 0 && menuBounds.y + menuBounds.height <= 600, 'Popup menu fits Chrome popup height')
      await screenshot('industry-menu-' + previewSuffix, true)
      await page.keyboard.press('Escape')
      assert.equal(await page.getByRole('combobox', { name: 'Industry profile', exact: true }).evaluate(el => el === document.activeElement), true)
      await page.setViewportSize({ width: 1120, height: 900 })
      await page.goto(url + '/options')
      await page.waitForSelector('.settings-sidebar')
      assert.equal(await page.locator('.options').evaluate(el => getComputedStyle(el).padding), '24px 20px 32px')
      assert.equal(await page.locator('.settings:not([hidden]) .card').first().evaluate(el => getComputedStyle(el).padding), '20px')
      assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme), 'light')
      await screenshot('settings-' + previewSuffix)
      for (const hash of ['ai', 'voice', 'forms', 'about', 'mic', 'general']) {
        await page.locator(`.settings-sidebar a[href="#${hash === 'mic' ? 'voice' : hash}"]`).click()
        assert.equal(await page.locator('.settings:not([hidden])').count(), 1)
      }
      await page.goto(url + '/options#mic')
      await page.getByRole('heading', { name: 'Voice input', level: 1 }).waitFor()
      await page.locator('.settings-sidebar a[href="#ai"]').click()
      await page.getByRole('combobox', { name: 'AI provider', exact: true }).click()
      await page.getByRole('combobox', { name: 'Search ai provider', exact: true }).fill('OpenAI')
      await page.keyboard.press('Enter')
      await page.getByRole('combobox', { name: 'AI model', exact: true }).click()
      await page.getByRole('option', { name: 'gpt-4.1-mini', exact: true }).click()
      await page.getByRole('combobox', { name: 'AI model', exact: true }).click()
      await screenshot('model-picker-' + previewSuffix)
      await page.locator('[data-picker-popup]').screenshot({ path: resolve(output, 'model-menu-' + previewSuffix + '.png'), animations: 'disabled' })
      await page.getByRole('combobox', { name: 'Search ai model', exact: true }).fill('smartfill-custom-test-model')
      await page.keyboard.press('Enter')
      await page.waitForFunction(() => window.__store.settings.models.openai === 'smartfill-custom-test-model')
      assert.equal(await page.locator('[data-picker-popup]').count(), 0)
      await screenshot('ai-settings-' + previewSuffix)
      await page.getByRole('combobox', { name: 'AI model', exact: true }).click()
      await page.getByRole('combobox', { name: 'Search ai model', exact: true }).fill('GPT-4.1-MINI')
      await page.getByRole('option', { name: 'GPT-4.1-MINI', exact: true }).click()
      await page.waitForFunction(() => window.__store.settings.models.openai === 'GPT-4.1-MINI')
      // An asynchronous model refresh must retain a valid active row in an open menu.
      await page.evaluate(() => {
        chrome.runtime.sendMessage = message => message.action === 'aiModels'
          ? new Promise(resolve => { window.__modelsRequested = true; window.__finishModels = resolve })
          : Promise.resolve({ success: false })
      })
      await page.getByPlaceholder('sk-…').fill('local-fixture-test-key')
      await page.waitForFunction(() => window.__modelsRequested === true)
      await page.getByRole('combobox', { name: 'AI model', exact: true }).click()
      await page.keyboard.press('ArrowUp')
      await page.evaluate(() => window.__finishModels({ success: true, models: ['gpt-4.1-mini'] }))
      await page.getByRole('option', { name: 'gpt-5', exact: true }).waitFor({ state: 'hidden' })
      assert.equal(await page.getByRole('combobox', { name: 'Search ai model', exact: true }).evaluate(el => !!document.getElementById(el.getAttribute('aria-activedescendant'))), true)
      await page.keyboard.press('Escape')
      await page.getByPlaceholder('sk-…').fill('')
    }

    // Seed fictional memory through the fixture API, then test editing and pinning.
    await page.goto(url + '/options#forms')
    await page.waitForSelector('.settings-sidebar')
    await page.evaluate(async () => {
      await chrome.storage.local.set({ formMemory: [{
        id: 'ui-review', host: 'example.test', path: '/contacts', title: 'Basic information', containers: [],
        fields: [{ kind: 'text', label: 'full name', name: 'name' }, { kind: 'email', label: 'email address', name: 'email' }, { kind: 'long', label: 'notes', name: 'notes' }],
        values: ['Alex Morgan', 'alex@example.test', 'A fictional contact for reviewing the saved form editor.'],
        pinned: [false, false, false], createdAt: Date.now(), updatedAt: Date.now(), fillCount: 2
      }] })
    })
    await page.locator('.saved-form-toggle').filter({ hasText: 'Basic information' }).click()
    await page.getByRole('textbox', { name: /^Full name/ }).fill('Taylor Morgan')
    await page.getByRole('textbox', { name: /^Full name/ }).press('Tab')
    await page.getByRole('button', { name: 'Unpin Full name', exact: true }).waitFor()
    assert.equal(await page.evaluate(() => window.__store.formMemory[0].values[0]), 'Taylor Morgan')
    await page.getByRole('button', { name: 'Unpin Full name', exact: true }).click()
    await page.getByRole('button', { name: 'Pin Full name', exact: true }).waitFor()
    await screenshot('saved-forms-light-on-dark-system')
    await page.emulateMedia({ colorScheme: 'light' })
    await screenshot('saved-forms-light')
    await page.setViewportSize({ width: 375, height: 850 })
    for (const hash of ['general', 'ai', 'voice', 'forms', 'about']) {
      await page.locator(`.settings-sidebar a[href="#${hash}"]`).click()
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Overflow in ' + hash)
    }
    await page.emulateMedia({ colorScheme: 'dark' })
    await screenshot('settings-narrow-light-on-dark-system')

    // Exercise actual content-script fill/undo and picker (not the popup reply stub).
    await page.setViewportSize({ width: 1120, height: 900 })
    console.log('Reviewing actual content-script fill, undo and picker')
    await page.goto(url)
    await page.waitForFunction(() => typeof window.smartfill === 'function')
    const removedRecorder = await page.evaluate(() => window.smartfill('startRecording'))
    assert.equal(removedRecorder.success, false, 'Legacy recorder messages are no longer supported')
    const filled = await page.evaluate(() => window.smartfill('fillForms'))
    assert.equal(filled.success, true)
    assert.ok(filled.filled > 0)
    assert.ok(await page.locator('#first').inputValue())
    const undone = await page.evaluate(() => window.smartfill('undoFill'))
    assert.equal(undone.success, true)
    assert.equal(await page.locator('#first').inputValue(), '')
    await page.evaluate(() => window.smartfill('pickFormArea'))
    await page.locator('[data-smartfill-ui] .sf-toolbar').waitFor()
    await page.evaluate(() => window.scrollTo(0, 0))
    assert.equal(await page.locator('[data-smartfill-ui] .sf-root').evaluate(el => getComputedStyle(el).colorScheme), 'light')
    await screenshot('picker-light-on-dark-system')
    // Simulate an older content controller holding its dark blue stylesheet.
    await page.evaluate(async () => {
      const shadow = document.querySelector('[data-smartfill-ui]').shadowRoot
      const style = shadow.querySelector('style')
      window.__currentOverlayCss = style.textContent
      style.textContent = '.sf-root { color-scheme: dark; --sf-bg: #202329; --sf-text: #f1f3f7; --sf-primary: #8ab4ff; } .sf-card { background: var(--sf-bg); color: var(--sf-text); }'
      const { installPageTheme } = await import('/theme-sync.js')
      // Like chrome.scripting, execute the function in an isolated closure.
      const serialized = (0, eval)('(' + installPageTheme.toString() + ')')
      serialized(window.__currentOverlayCss)
    })
    assert.equal(await page.locator('[data-smartfill-ui] .sf-toolbar').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(255, 255, 255)')
    assert.equal(await page.locator('[data-smartfill-ui] .sf-dot').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(23, 23, 23)')
    await screenshot('picker-refreshed-legacy')
    await page.locator('[data-smartfill-ui] .sf-toolbar').screenshot({ path: resolve(output, 'picker-toolbar-light.png'), animations: 'disabled' })
    await page.keyboard.press('Escape')
    assert.equal(await page.locator('[data-smartfill-ui] .sf-toolbar').count(), 0)
    // Existing controllers can remove/recreate the host after Cancel/Save.
    await page.evaluate(() => window.smartfill('pickFormArea'))
    await page.locator('[data-smartfill-ui] .sf-toolbar').waitFor()
    assert.equal(await page.locator('[data-smartfill-ui] .sf-toolbar').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(255, 255, 255)')
    await page.setViewportSize({ width: 320, height: 700 })
    await page.waitForFunction(() => {
      const bounds = document.querySelector('[data-smartfill-ui]').shadowRoot.querySelector('.sf-toolbar').getBoundingClientRect()
      return bounds.left >= 0 && bounds.right <= innerWidth
    })
    await page.keyboard.press('Escape')
    await page.setViewportSize({ width: 1120, height: 900 })
    await page.evaluate(() => window.smartfill('pickFormArea'))
    await page.locator('#first').scrollIntoViewIfNeeded()
    const firstField = await page.locator('#first').boundingBox()
    await page.mouse.click(firstField.x + 20, firstField.y + 10)
    await page.getByRole('button', { name: 'Save area', exact: true }).click()
    await page.locator('[data-smartfill-ui] .sf-panel').waitFor()
    assert.equal(await page.locator('[data-smartfill-ui] .sf-panel').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(255, 255, 255)')
    await screenshot('saved-area-panel-light')
    await page.getByRole('button', { name: 'Fill now', exact: true }).click()
    await page.getByRole('button', { name: 'Undo', exact: true }).waitFor()
    assert.equal(await page.locator('[data-smartfill-ui] .sf-panel').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(255, 255, 255)')
    await screenshot('fill-result-panel-light')
    await page.getByRole('button', { name: 'Undo', exact: true }).click()
    await page.reload()
    await page.getByText('Auto-scanned from your last visit', { exact: true }).waitFor()
    assert.equal(await page.locator('[data-smartfill-ui] .sf-panel').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(255, 255, 255)')
    await screenshot('recognized-form-panel-light')
    await page.setViewportSize({ width: 320, height: 700 })
    await page.goto(url + '/options#ai')
    await page.waitForSelector('.settings-sidebar')
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'AI settings fit at 320px')
    assert.deepEqual(errors, [])
    console.log('UI review passed: light default under light/dark system preferences, restored compact padding, navigation, popup bounds, narrow layouts, searchable pickers, fill/undo, saved values and picker Escape; no page errors.')
  } finally {
    await browser.close()
  }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
