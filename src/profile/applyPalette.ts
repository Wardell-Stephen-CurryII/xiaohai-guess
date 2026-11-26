// 把配色写到根元素的 CSS 变量上，全局生效。出题画面使用主题色，不受影响。

import { paletteById } from './catalog'

export function applyPalette(id: string): void {
  const p = paletteById(id)
  const root = document.documentElement
  const vars: Record<string, string> = {
    '--bg': p.bg,
    '--surface': p.surface,
    '--ink': p.ink,
    '--ink-soft': p.inkSoft,
    '--line': p.line,
    '--brand': p.brand,
    '--primary-bg': p.primaryBg,
    '--primary-fg': p.primaryFg,
  }
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v)
  root.style.colorScheme = p.dark ? 'dark' : 'light'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', p.bg)
}
