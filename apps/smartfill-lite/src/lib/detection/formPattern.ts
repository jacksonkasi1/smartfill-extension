// ** import types
import type { FormField } from '@/types/extension'

export function detectFormPattern(fields: FormField[]): string {
  const fieldNames = fields.map(f => f.name.toLowerCase())
  const fieldLabels = fields.map(f => f.label?.toLowerCase() || '')
  const allText = [...fieldNames, ...fieldLabels].join(' ')

  if (hasPattern(allText, ['password', 'email', 'username', 'login'])) {
    return 'login'
  }

  if (hasPattern(allText, ['password', 'confirm', 'email', 'register', 'signup'])) {
    return 'registration'
  }

  if (hasPattern(allText, ['name', 'email', 'message', 'subject', 'contact'])) {
    return 'contact'
  }

  if (hasPattern(allText, ['address', 'street', 'city', 'zip', 'state'])) {
    return 'address'
  }

  if (hasPattern(allText, ['firstname', 'lastname', 'phone', 'profile', 'about'])) {
    return 'profile'
  }

  return 'generic'
}

function hasPattern(text: string, keywords: string[]): boolean {
  return keywords.some(keyword => text.includes(keyword))
}