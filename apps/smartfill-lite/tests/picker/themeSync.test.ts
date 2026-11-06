// ** import core packages
import { afterEach, describe, expect, test } from 'bun:test'

// ** import lib
import { installDom } from '../helpers/dom'
import { installPageTheme } from '../../src/lib/picker/themeSync'
import { sendToTab } from '../../src/lib/utils/tabs'

// ** import constants
import { OVERLAY_CSS } from '../../src/lib/picker/styles'

installDom()

afterEach(() => {
  const state = globalThis as any
  state.__smartfillThemeSync?.observer.disconnect()
  delete state.__smartfillThemeSync
  document.querySelectorAll('[data-smartfill-ui], [data-theme-test-page]').forEach(node => node.remove())
})

function legacyHost() {
  const host = document.createElement('div')
  host.setAttribute('data-smartfill-ui', '')
  const shadow = host.attachShadow({ mode: 'open' })
  shadow.innerHTML = '<style>.sf-root { background: #202329; color: white; }</style><div class="sf-root"><button>Cancel</button></div>'
  document.documentElement.append(host)
  return shadow
}

describe('page theme refresh', () => {
  test('updates an existing legacy shadow root without replacing controls or touching page styles', () => {
    const pageStyle = document.createElement('style')
    pageStyle.setAttribute('data-theme-test-page', '')
    pageStyle.textContent = 'body { background: black; }'
    document.head.append(pageStyle)
    const shadow = legacyHost()
    const button = shadow.querySelector('button')!
    let clicks = 0
    button.addEventListener('click', () => clicks++)
    installPageTheme(OVERLAY_CSS)
    expect(shadow.querySelector('style')!.textContent).toBe(OVERLAY_CSS)
    expect(shadow.querySelector('button')).toBe(button)
    button.click()
    expect(clicks).toBe(1)
    expect(pageStyle.textContent).toBe('body { background: black; }')
  })

  test('also refreshes hosts created after synchronization, including replacement hosts', async () => {
    installPageTheme(OVERLAY_CSS)
    let shadow = legacyHost()
    await new Promise(resolve => setTimeout(resolve, 10))
    expect(shadow.querySelector('style')!.textContent).toBe(OVERLAY_CSS)
    shadow.host.remove()
    shadow = legacyHost()
    await new Promise(resolve => setTimeout(resolve, 10))
    expect(shadow.querySelector('style')!.textContent).toBe(OVERLAY_CSS)
  })

  test('reuses the observer for identical styles and disconnects it when styles change', () => {
    installPageTheme(OVERLAY_CSS)
    const first = (globalThis as any).__smartfillThemeSync.observer
    installPageTheme(OVERLAY_CSS)
    expect((globalThis as any).__smartfillThemeSync.observer).toBe(first)
    installPageTheme(OVERLAY_CSS + '\n/* updated */')
    expect((globalThis as any).__smartfillThemeSync.observer).not.toBe(first)
  })

  test('a legacy successful ping still refreshes page styles before delivering an action', async () => {
    const previousChrome = (globalThis as any).chrome
    const order: string[] = []
    const shadow = legacyHost()
    ;(globalThis as any).chrome = {
      tabs: { sendMessage: async (_id: number, message: { action: string }) => {
        order.push(message.action)
        return { success: true }
      } },
      scripting: { executeScript: async (script: { func?: (...args: string[]) => void, args?: string[] }) => {
        expect(script.func).toBe(installPageTheme)
        order.push('sync')
        script.func!(...(script.args || []))
      } }
    }
    try {
      await sendToTab(1, { action: 'fillForms' })
      expect(order).toEqual(['ping', 'sync', 'fillForms'])
      expect(shadow.querySelector('style')!.textContent).toBe(OVERLAY_CSS)
    } finally {
      ;(globalThis as any).chrome = previousChrome
    }
  })
})
