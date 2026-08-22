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
    case 'date':       return formatDateValue(value)
    case 'time':       return formatTimeValue(value)
    case 'datetime-local': return formatDateTimeValue(value)
    case 'color':      return formatColorValue(value)
    default:           return value
  }
}

/**
 * Parse a date string and return a `YYYY-MM-DD` value built from
 * the local calendar components. Avoids `toISOString()` which can
 * shift the day for users east of UTC.
 *
 * Accepts:
 *   2024-01-05
 *   2024-1-5
 *   1/5/2024
 *   01/05/2024
 *   5 January 2024
 */
function formatDateValue(value: string): string {
  const dateFormats: Array<{ re: RegExp; parse: (m: RegExpMatchArray) => [number, number, number] | null }> = [
    {
      // YYYY-MM-DD or YYYY-M-D (unpadded)
      re: /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
      parse: m => [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)]
    },
    {
      // M/D/YYYY
      re: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
      parse: m => [parseInt(m[3], 10), parseInt(m[1], 10), parseInt(m[2], 10)]
    },
    {
      // M-D-YYYY
      re: /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
      parse: m => [parseInt(m[3], 10), parseInt(m[1], 10), parseInt(m[2], 10)]
    }
  ]

  for (const { re, parse } of dateFormats) {
    const match = value.match(re)
    if (!match) continue
    const parsed = parse(match)
    if (!parsed) continue
    const [y, mo, d] = parsed
    if (isValidYMD(y, mo, d)) {
      return `${y}-${pad2(mo)}-${pad2(d)}`
    }
    // The shape matched (so this is clearly meant to be a date) but
    // the components are out of range (e.g. 2024-02-31). Return the
    // original value unchanged so the host can surface it instead of
    // silently rolling over via the Date fallback below.
    return value
  }

  // Last-resort Date parse. Use local components, not toISOString().
  const parsedDate = new Date(value)
  if (!isNaN(parsedDate.getTime())) {
    const y = parsedDate.getFullYear()
    const mo = parsedDate.getMonth() + 1
    const d = parsedDate.getDate()
    if (isValidYMD(y, mo, d)) {
      return `${y}-${pad2(mo)}-${pad2(d)}`
    }
  }

  return value
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0')
}

function isValidYMD(y: number, m: number, d: number): boolean {
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return false
  if (y < 1900 || y > 9999) return false
  if (m < 1 || m > 12) return false
  if (d < 1) return false
  // Validate the actual number of days in the month, including
  // February leap-year handling. This rejects things like
  // 2024-02-31, 2023-02-29, 2023-04-31, etc.
  const lastDay = daysInMonth(y, m)
  if (d > lastDay) return false
  return true
}

/**
 * Number of days in a (year, month) pair, with correct leap-year
 * handling for February.
 */
function daysInMonth(year: number, month: number): number {
  // Standard month lengths for non-February.
  const standard = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  if (month === 2) {
    const leap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0)
    return leap ? 29 : 28
  }
  return standard[month - 1] || 30
}

/**
 * Parse a time string and return `HH:mm` in 24h. Accepts:
 *   17:00
 *   5:30 PM
 *   5 PM
 *   5pm
 *
 * Invalid values such as "13 PM" or "25:00" are returned unchanged
 * so the host can surface them instead of silently producing garbage.
 */
function formatTimeValue(value: string): string {
  const timeFormats: Array<{ re: RegExp; parse: (m: RegExpMatchArray) => string | null }> = [
    // 12:34 PM
    {
      re: /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i,
      parse: m => {
        const h = parseInt(m[1], 10)
        const min = parseInt(m[2], 10)
        const ampm = m[3].toUpperCase()
        return to24h(h, min, ampm)
      }
    },
    // 24h
    {
      re: /^(\d{1,2}):(\d{2})$/,
      parse: m => {
        const h = parseInt(m[1], 10)
        const min = parseInt(m[2], 10)
        if (!isValidHour(h) || !isValidMinute(min)) return null
        return `${pad2(h)}:${pad2(min)}`
      }
    },
    // 5 PM (no minutes)
    {
      re: /^(\d{1,2})\s*(AM|PM)$/i,
      parse: m => {
        const h = parseInt(m[1], 10)
        const ampm = m[2].toUpperCase()
        return to24h(h, 0, ampm)
      }
    }
  ]

  for (const { re, parse } of timeFormats) {
    const m = value.match(re)
    if (m) {
      const out = parse(m)
      if (out !== null) return out
    }
  }
  return value
}

function to24h(h: number, min: number, ampm: string): string | null {
  if (ampm === 'PM') {
    if (h < 1 || h > 12) return null
    const hh = h === 12 ? 12 : h + 12
    if (!isValidHour(hh) || !isValidMinute(min)) return null
    return `${pad2(hh)}:${pad2(min)}`
  }
  if (ampm === 'AM') {
    if (h < 1 || h > 12) return null
    const hh = h === 12 ? 0 : h
    if (!isValidHour(hh) || !isValidMinute(min)) return null
    return `${pad2(hh)}:${pad2(min)}`
  }
  return null
}

function isValidHour(h: number): boolean {
  return Number.isInteger(h) && h >= 0 && h <= 23
}
function isValidMinute(m: number): boolean {
  return Number.isInteger(m) && m >= 0 && m <= 59
}

/**
 * `datetime-local` value. Accepts:
 *   2024-01-05T09:30
 *   2024-1-5T9:30
 *   1/5/2024 9:30 AM
 *   1/5/2024 21:30
 *
 * Returns `YYYY-MM-DDTHH:mm` built from local components, or the
 * original value if the input is unparseable / out of range.
 */
function formatDateTimeValue(value: string): string {
  // ISO-style: 2024-01-05T09:30 or 2024-1-5T9:30
  const iso = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})T(\d{1,2}):(\d{2})$/)
  if (iso) {
    const y = parseInt(iso[1], 10)
    const mo = parseInt(iso[2], 10)
    const d = parseInt(iso[3], 10)
    const h = parseInt(iso[4], 10)
    const mi = parseInt(iso[5], 10)
    if (isValidYMD(y, mo, d) && isValidHour(h) && isValidMinute(mi)) {
      return `${y}-${pad2(mo)}-${pad2(d)}T${pad2(h)}:${pad2(mi)}`
    }
    // Pattern matched but out of range. Return unchanged rather than
    // falling through to new Date() which would silently roll over
    // (e.g. 2024-02-31T09:30 -> 2024-03-02T09:30).
    return value
  }

  // US-style: 1/5/2024 9:30 AM  or  01/05/2024 21:30
  const us = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)?$/i)
  if (us) {
    const mo = parseInt(us[1], 10)
    const d = parseInt(us[2], 10)
    const y = parseInt(us[3], 10)
    const hhRaw = parseInt(us[4], 10)
    const mi = parseInt(us[5], 10)
    const ampm = us[6] ? us[6].toUpperCase() : null
    let hh = hhRaw
    if (ampm === 'PM') hh = hhRaw === 12 ? 12 : hhRaw + 12
    if (ampm === 'AM') hh = hhRaw === 12 ? 0 : hhRaw
    if (isValidYMD(y, mo, d) && isValidHour(hh) && isValidMinute(mi)) {
      return `${y}-${pad2(mo)}-${pad2(d)}T${pad2(hh)}:${pad2(mi)}`
    }
    return value
  }

  // Fallback: try Date.parse and use LOCAL components, not toISOString.
  const parsed = new Date(value)
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear()
    const mo = parsed.getMonth() + 1
    const d = parsed.getDate()
    const h = parsed.getHours()
    const mi = parsed.getMinutes()
    if (isValidYMD(y, mo, d) && isValidHour(h) && isValidMinute(mi)) {
      return `${y}-${pad2(mo)}-${pad2(d)}T${pad2(h)}:${pad2(mi)}`
    }
  }

  return value
}

function formatColorValue(value: string): string {
  const trimmedValue = value.trim().toLowerCase()
  if (trimmedValue.startsWith('#')) return trimmedValue
  if (COLOR_MAP[trimmedValue]) return COLOR_MAP[trimmedValue]
  const rgbMatch = trimmedValue.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0')
    const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0')
    const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0')
    return `#${r}${g}${b}`
  }
  return '#000000'
}
