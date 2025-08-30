import type { FormField } from '@/types/extension'

const COLOR_MAP: Record<string, string> = {
  red: '#ff0000',
  green: '#008000',
  blue: '#0000ff',
  black: '#000000',
  white: '#ffffff',
  yellow: '#ffff00',
  orange: '#ffa500',
  purple: '#800080',
  pink: '#ffc0cb',
  brown: '#a52a2a',
  gray: '#808080',
  grey: '#808080',
  cyan: '#00ffff',
  magenta: '#ff00ff',
  lime: '#00ff00',
  maroon: '#800000',
  navy: '#000080',
  olive: '#808000',
  silver: '#c0c0c0',
  teal: '#008080'
}

export function formatValueForField(value: string, fieldType: FormField['type']): string {
  if (!value || typeof value !== 'string') return value

  switch (fieldType) {
    case 'date':
      return formatDateValue(value)
    case 'time':
      return formatTimeValue(value)
    case 'datetime-local':
      return formatDateTimeValue(value)
    case 'color':
      return formatColorValue(value)
    default:
      return value
  }
}

function formatDateValue(value: string): string {
  const dateFormats = [
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/
  ]

  for (const format of dateFormats) {
    const match = value.match(format)
    if (match) {
      const [, part1, part2, part3] = match
      
      if (part3.length === 4) {
        const month = part1.padStart(2, '0')
        const day = part2.padStart(2, '0')
        const year = part3
        return `${year}-${month}-${day}`
      } else if (part1.length === 4) {
        return value
      }
    }
  }

  const parsedDate = new Date(value)
  if (!isNaN(parsedDate.getTime())) {
    return parsedDate.toISOString().split('T')[0]
  }

  return value
}

function formatTimeValue(value: string): string {
  const timeFormats = [
    /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i,
    /^(\d{1,2}):(\d{2})$/,
    /^(\d{1,2})\s*(AM|PM)$/i
  ]

  for (const format of timeFormats) {
    const match = value.match(format)
    if (match) {
      if (match[3]) {
        let hours = parseInt(match[1])
        const minutes = match[2] || '00'
        const ampm = match[3].toUpperCase()
        
        if (ampm === 'PM' && hours !== 12) {
          hours += 12
        } else if (ampm === 'AM' && hours === 12) {
          hours = 0
        }
        
        return `${hours.toString().padStart(2, '0')}:${minutes}`
      } else {
        return value
      }
    }
  }

  return value
}

function formatDateTimeValue(value: string): string {
  const dateTimeFormats = [
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)?$/i,
    /^(\d{4})-(\d{1,2})-(\d{1,2})T(\d{1,2}):(\d{2})$/
  ]

  for (const format of dateTimeFormats) {
    const match = value.match(format)
    if (match) {
      if (match[6]) {
        const month = match[1].padStart(2, '0')
        const day = match[2].padStart(2, '0')
        const year = match[3]
        let hours = parseInt(match[4])
        const minutes = match[5]
        const ampm = match[6].toUpperCase()
        
        if (ampm === 'PM' && hours !== 12) {
          hours += 12
        } else if (ampm === 'AM' && hours === 12) {
          hours = 0
        }
        
        return `${year}-${month}-${day}T${hours.toString().padStart(2, '0')}:${minutes}`
      } else if (match[1].length === 4) {
        return value
      }
    }
  }

  const parsedDate = new Date(value)
  if (!isNaN(parsedDate.getTime())) {
    return parsedDate.toISOString().slice(0, 16)
  }

  return value
}

function formatColorValue(value: string): string {
  const trimmedValue = value.trim().toLowerCase()
  
  if (trimmedValue.startsWith('#')) {
    return trimmedValue
  }
  
  if (COLOR_MAP[trimmedValue]) {
    return COLOR_MAP[trimmedValue]
  }
  
  const rgbMatch = trimmedValue.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0')
    const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0')
    const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0')
    return `#${r}${g}${b}`
  }
  
  return '#000000'
}