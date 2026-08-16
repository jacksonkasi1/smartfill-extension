export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function triggerEvents(element: HTMLElement): void {
  const events = ['input', 'change', 'blur', 'keyup']
  events.forEach(eventType => {
    element.dispatchEvent(new Event(eventType, { bubbles: true, cancelable: true }))
  })
}