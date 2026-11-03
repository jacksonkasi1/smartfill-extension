// `chrome.*` for previewing the built popup in a normal tab:
//   /popup?scope=memory | picked | none
(() => {
  const scope = new URLSearchParams(location.search).get('scope') || 'memory'
  const fields = [
    ['First name', 'first name'], ['Last name', 'last name'], ['Work email', 'email'], ['Phone', 'phone'],
    ['Role', 'job title'], ['Team', 'text'], ['Country', 'country'], ['I accept the terms', 'consent'], ['Email', 'email']
  ].map(([label, kind], i) => ({ label, kind, required: i < 3, skipped: false, inScope: scope === 'none' || i < 8 }))
  const summary = scope === 'none' ? undefined : {
    source: scope, formId: 'form_demo', title: 'Create your account', persisted: true,
    score: scope === 'memory' ? 94 : 100, fieldCount: 8, hasValues: scope === 'memory', savedAt: Date.now()
  }
  const store = { settings: { mode: 'mock', profile: 'auto', region: 'auto', rememberForms: true } }
  const reply = message => {
    switch (message.action) {
      case 'ping': return { success: true }
      case 'scanForms': return { success: true, host: 'app.example.com', profile: 'saas', autoDetected: true, region: 'in', scope: summary, fields }
      case 'fillForms': return { success: true, filled: 8, total: 8, profile: 'saas', reused: message.reuse ? 8 : 0, scope: summary }
      default: return { success: true }
    }
  }
  window.chrome = {
    runtime: { getManifest: () => ({ version: 'preview', content_scripts: [] }), getURL: p => p, openOptionsPage: () => {} },
    tabs: {
      query: async () => [{ id: 1, url: 'https://app.example.com/signup' }],
      sendMessage: async (_id, message) => reply(message),
      create: async () => {}
    },
    scripting: { executeScript: async () => {} },
    commands: { getAll: async () => [{ name: 'fill-form', shortcut: 'Alt+Shift+F' }] },
    storage: {
      local: { get: async key => (typeof key === 'string' ? { [key]: store[key] } : { ...store }), set: async items => Object.assign(store, items), remove: async () => {} },
      sync: { get: async () => ({}), remove: async () => {} },
      onChanged: { addListener: () => {}, removeListener: () => {} }
    }
  }
  window.close = () => console.log('[popup] window.close()')
})()
