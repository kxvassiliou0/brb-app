import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export function readFile(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8')
}

export const css = readFile('src/index.css')

const themeBlock = (() => {
  const block = css.match(/@theme\s*\{([\s\S]*?)\n\}/)?.[1]
  if (!block) throw new Error('No @theme block found in src/index.css')
  return block
})()

function collect(pattern: RegExp): Record<string, string> {
  const entries: Record<string, string> = {}
  for (const match of themeBlock.matchAll(pattern)) {
    const name = match[1]
    const value = match[2]
    if (name && value) entries[name] = value.trim()
  }
  return entries
}

export const colorTokens = collect(/--color-([a-z0-9-]+):\s*(#[0-9a-f]{6});/gi)

export const fontTokens = collect(/--font-([a-z0-9-]+):\s*([^;]+);/gi)

export function color(name: string): string {
  const value = colorTokens[name]
  if (!value) throw new Error(`Unknown colour token: --color-${name}`)
  return value.toLowerCase()
}

function channel(value: number): number {
  const c = value / 255
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

export function relativeLuminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16)
  return (
    0.2126 * channel((n >> 16) & 255) +
    0.7152 * channel((n >> 8) & 255) +
    0.0722 * channel(n & 255)
  )
}

export function contrastRatio(a: string, b: string): number {
  const x = relativeLuminance(a)
  const y = relativeLuminance(b)
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}
