// 词库体检，见设计文档 3.2。修改词库后运行 npm test 检查。

import { describe, expect, it } from 'vitest'
import { MIXED_THEME_ID } from '../game/types'
import { THEMES } from './themes'

const MIN_WORDS_PER_THEME = 500
const MAX_WORDS_PER_THEME = 2000
const MIN_CHARS = 2
const MAX_CHARS = 8

describe('词库体检', () => {
  it('共 12 个主题，包含日常、歌曲、历史', () => {
    expect(THEMES).toHaveLength(12)
    const names = THEMES.map((t) => t.name)
    for (const n of ['日常', '歌曲', '历史']) expect(names).toContain(n)
  })

  it('主题 id 唯一、合法，且不与「混合」冲突', () => {
    const ids = THEMES.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) {
      expect(id).toMatch(/^[a-z][a-z0-9-]*$/)
      expect(id).not.toBe(MIXED_THEME_ID)
    }
  })

  it('同一个词只出现在一个主题里（避免「混合」模式中重复出题）', () => {
    const owner = new Map<string, string>()
    const dup: string[] = []
    for (const t of THEMES) {
      for (const w of t.words) {
        const prev = owner.get(w)
        if (prev && prev !== t.id) dup.push(`${w}（${prev} / ${t.id}）`)
        else owner.set(w, t.id)
      }
    }
    expect(dup).toEqual([])
  })

  it('显示顺序唯一', () => {
    const orders = THEMES.map((t) => t.order)
    expect(new Set(orders).size).toBe(orders.length)
  })

  for (const theme of THEMES) {
    describe(`${theme.name}（${theme.id}）`, () => {
      it(`${MIN_WORDS_PER_THEME}~${MAX_WORDS_PER_THEME} 个词`, () => {
        expect(theme.words.length).toBeGreaterThanOrEqual(MIN_WORDS_PER_THEME)
        expect(theme.words.length).toBeLessThanOrEqual(MAX_WORDS_PER_THEME)
      })

      it('没有重复的词', () => {
        const dup = theme.words.filter((w, i) => theme.words.indexOf(w) !== i)
        expect(dup).toEqual([])
      })

      it(`每个词 ${MIN_CHARS}~${MAX_CHARS} 个字，无首尾空格`, () => {
        const bad = theme.words.filter((w) => {
          const n = [...w].length
          return w !== w.trim() || n < MIN_CHARS || n > MAX_CHARS
        })
        expect(bad).toEqual([])
      })
    })
  }
})
