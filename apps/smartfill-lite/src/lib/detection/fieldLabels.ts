export function extractLabel(element: HTMLElement): string {
  const id = element.id
  if (id) {
    const label = document.querySelector(`label[for="${id}"]`)
    if (label) return cleanText(label.textContent)
  }

  const parentLabel = element.closest('label')
  if (parentLabel) {
    const labelText = parentLabel.textContent || ''
    const elementText = element.textContent || ''
    return cleanText(labelText.replace(elementText, ''))
  }

  return ''
}

export function extractContextualInfo(element: HTMLElement): string {
  const placeholder = element.getAttribute('placeholder')
  if (placeholder) return cleanText(placeholder)

  const ariaLabel = element.getAttribute('aria-label')
  if (ariaLabel) return cleanText(ariaLabel)

  const title = element.getAttribute('title')
  if (title) return cleanText(title)

  const parent = element.parentElement
  if (parent) {
    let sibling = element.previousElementSibling
    while (sibling && !sibling.textContent?.trim()) {
      sibling = sibling.previousElementSibling
    }
    if (sibling?.textContent?.trim()) {
      return cleanText(sibling.textContent)
    }

    const parentText = parent.textContent?.replace(element.textContent || '', '').trim()
    if (parentText && parentText.length < 100) {
      return cleanText(parentText)
    }
  }

  const name = element.getAttribute('name') || element.getAttribute('id')
  if (name) {
    return name.replace(/[_-]/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase())
  }

  return 'Unnamed Field'
}

function cleanText(text: string | null): string {
  if (!text) return ''
  return text.trim().replace(/\s+/g, ' ').replace(/[*:]+$/, '').trim()
}