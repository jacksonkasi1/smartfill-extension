let mutationObserver: MutationObserver | null = null

export function setupDynamicFormWatcher(): void {
  if (mutationObserver) {
    mutationObserver.disconnect()
  }

  mutationObserver = new MutationObserver((mutations) => {
    let hasFormChanges = false

    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element
            if (element.matches('form, input, select, textarea, [class*="form"], [class*="input"]') ||
                element.querySelector('form, input, select, textarea')) {
              hasFormChanges = true
              break
            }
          }
        }
      }
      if (hasFormChanges) break
    }

    if (hasFormChanges) {
      window.dispatchEvent(new CustomEvent('formChanged'))
    }
  })

  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true
  })
}