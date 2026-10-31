/**
 * Small seeded PRNG (mulberry32). Mock values must be reproducible for
 * a given seed so the same persona is used across every field of a
 * fill, and "Generate again" just means "new seed".
 */
export class Random {
  private state: number

  constructor(seed: number = newSeed()) {
    this.state = seed >>> 0
  }

  next(): number {
    let t = (this.state += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min
  }

  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.next() * items.length)]
  }

  chance(probability: number): boolean {
    return this.next() < probability
  }

  digits(count: number, firstNonZero = false): string {
    let out = ''
    for (let i = 0; i < count; i++) {
      out += i === 0 && firstNonZero ? this.int(1, 9) : this.int(0, 9)
    }
    return out
  }

  letters(count: number): string {
    let out = ''
    for (let i = 0; i < count; i++) out += String.fromCharCode(65 + this.int(0, 25))
    return out
  }

  alnum(count: number): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let out = ''
    for (let i = 0; i < count; i++) out += chars[this.int(0, chars.length - 1)]
    return out
  }
}

export function newSeed(): number {
  return Math.floor(Math.random() * 2 ** 31)
}
