/**
 * Serves the E2E fixture with the production content script:
 *   bun run build && bun tests/e2e/serve.ts   ->  http://localhost:4317
 * Then in DevTools: `await smartfill('fillForms')`, `window.__unexpectedClicks`.
 */

// ** import utils
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const here = import.meta.dir
const buildDir = join(here, '../../build/chrome-mv3-prod')
/** Looked up per request: every build gets a new hashed file name. */
function contentFile(): string {
  const file = readdirSync(buildDir).find(f => /^content\..*\.js$/.test(f))
  if (!file) throw new Error('Run `bun run build` first.')
  return join(buildDir, file)
}

const port = Number(process.env.PORT || 4317)
Bun.serve({
  port,
  fetch(req) {
    const { pathname } = new URL(req.url)
    if (pathname === '/content.js') return new Response(Bun.file(contentFile()), { headers: { 'content-type': 'text/javascript' } })
    // Optional: `bun build <entry> --format=iife --outfile=build/e2e-debug.js` to poke at internals.
    if (pathname === '/debug.js') return new Response(Bun.file(join(buildDir, '../e2e-debug.js')), { headers: { 'content-type': 'text/javascript' } })
    if (pathname === '/chrome-stub.js') return new Response(Bun.file(join(here, 'chrome-stub.js')), { headers: { 'content-type': 'text/javascript' } })
    // The built popup with a stubbed chrome API: /popup?scope=memory|picked|none
    if (pathname === '/popup') {
      const html = readFileSync(join(buildDir, 'popup.html'), 'utf8').replace('<head>', '<head><script src="/popup-stub.js"></script>')
      return new Response(html, { headers: { 'content-type': 'text/html' } })
    }
    if (pathname === '/popup-stub.js') return new Response(Bun.file(join(here, 'popup-stub.js')), { headers: { 'content-type': 'text/javascript' } })
    const asset = join(buildDir, pathname)
    if (pathname !== '/' && existsSync(asset)) return new Response(Bun.file(asset))
    return new Response(Bun.file(join(here, 'fixture.html')), { headers: { 'content-type': 'text/html' } })
  }
})
console.log(`SmartFill E2E fixture on http://localhost:${port}`)
