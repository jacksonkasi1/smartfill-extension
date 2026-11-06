import { readFileSync, writeFileSync } from 'node:fs'

const source = readFileSync(new URL('../src/styles/tokens.ts', import.meta.url), 'utf8')
const css = source.match(/String\.raw`\r?\n([\s\S]*?)`/)?.[1]
if (!css) throw new Error('Theme token source could not be read')
writeFileSync(new URL('../src/styles/tokens.css', import.meta.url), `/* Generated from tokens.ts. Do not edit directly. */\n${css}`)
const font = readFileSync(new URL('../src/assets/fonts/geist-latin.woff2', import.meta.url)).toString('base64')
writeFileSync(new URL('../src/styles/font-data.ts', import.meta.url), `// Generated from the locally bundled OFL-licensed Geist font. Do not edit.\nexport const geistFontData = 'data:font/woff2;base64,${font}'\n`)
