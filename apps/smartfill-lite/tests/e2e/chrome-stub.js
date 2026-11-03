// Minimal `chrome.*` for running the built content script in a plain page.
// Messages are sent with `window.smartfill(action, extra)`.
(() => {
  // Kept in localStorage so a reload behaves like the next visit.
  const KEY = 'smartfill-e2e-store'
  const store = JSON.parse(localStorage.getItem(KEY) || '{}')
  const persist = () => localStorage.setItem(KEY, JSON.stringify(store))
  const storageListeners = []
  const messageListeners = []
  const clone = value => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)))

  window.chrome = {
    runtime: {
      onMessage: { addListener: fn => messageListeners.push(fn) },
      sendMessage: async () => ({ success: false }),
      getManifest: () => ({ version: 'e2e', content_scripts: [] })
    },
    storage: {
      local: {
        async get(keys) {
          const list = typeof keys === 'string' ? [keys] : Array.isArray(keys) ? keys : Object.keys(store)
          const out = {}
          for (const key of list) if (key in store) out[key] = clone(store[key])
          return out
        },
        async set(items) {
          const changes = {}
          for (const [key, value] of Object.entries(items)) {
            changes[key] = { oldValue: store[key], newValue: clone(value) }
            store[key] = clone(value)
          }
          persist()
          storageListeners.forEach(fn => fn(changes, 'local'))
        },
        async remove(keys) {
          for (const key of [].concat(keys)) delete store[key]
          persist()
        }
      },
      sync: { get: async () => ({}), remove: async () => {} },
      onChanged: { addListener: fn => storageListeners.push(fn), removeListener: () => {} }
    }
  }

  window.__store = store
  window.__resetStore = () => localStorage.removeItem(KEY)
  window.smartfill = (action, extra = {}) => new Promise(resolve => {
    messageListeners[0]({ action, ...extra }, {}, resolve)
  })
})()
