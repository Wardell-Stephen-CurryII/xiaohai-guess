import { describe, expect, it } from 'vitest'
import { MIXED_THEME_ID, type Theme } from './types'
import { createDeck, markSeen, nextIndex, shuffle, wordCount } from './wordDeck'

/** 可复现的伪随机数 */
function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

const THEMES: Theme[] = [
  { id: 'a', name: 'A', order: 1, words: ['a1', 'a2', 'a3', 'a4'] },
  { id: 'b', name: 'B', order: 2, words: ['b1', 'b2', 'b3'] },
]

describe('shuffle', () => {
  it('不丢失、不重复元素，且不修改原数组', () => {
    const src = [1, 2, 3, 4, 5, 6, 7, 8]
    const out = shuffle(src, seeded(1))
    expect([...out].sort()).toEqual(src)
    expect(src).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })
})

describe('createDeck', () => {
  it('单个主题：只包含该主题的词，且不重复', () => {
    const deck = createDeck(THEMES, 'a', {}, seeded(2))
    expect(deck.map((c) => c.text).sort()).toEqual(['a1', 'a2', 'a3', 'a4'])
    expect(deck.every((c) => c.themeId === 'a')).toBe(true)
  })

  it('混合：包含所有主题的词', () => {
    const deck = createDeck(THEMES, MIXED_THEME_ID, {}, seeded(3))
    expect(deck).toHaveLength(7)
    expect(wordCount(THEMES, MIXED_THEME_ID)).toBe(7)
  })

  it('没出过的词排在前面', () => {
    const deck = createDeck(THEMES, 'a', { a: ['a1', 'a3'] }, seeded(4))
    expect(deck.slice(0, 2).map((c) => c.text).sort()).toEqual(['a2', 'a4'])
    expect(deck.slice(2).map((c) => c.text).sort()).toEqual(['a1', 'a3'])
  })

  it('未知主题返回空牌堆', () => {
    expect(createDeck(THEMES, 'zzz', {}, seeded(5))).toEqual([])
  })
})

describe('nextIndex', () => {
  it('用完后从头循环', () => {
    const deck = createDeck(THEMES, 'b', {}, seeded(6))
    expect(nextIndex(deck, 0)).toBe(1)
    expect(nextIndex(deck, 2)).toBe(0)
    expect(nextIndex([], 0)).toBe(0)
  })
})

describe('markSeen', () => {
  it('记录本局出现的词，不修改原对象', () => {
    const seen = { a: ['a1'] }
    const next = markSeen(THEMES, seen, [
      { themeId: 'a', text: 'a2' },
      { themeId: 'b', text: 'b1' },
    ])
    expect(next).toEqual({ a: ['a1', 'a2'], b: ['b1'] })
    expect(seen).toEqual({ a: ['a1'] })
  })

  it('主题全部出过后清空该主题', () => {
    const next = markSeen(THEMES, { b: ['b1', 'b2'] }, [{ themeId: 'b', text: 'b3' }])
    expect(next.b).toEqual([])
  })

  it('移除词库中已经不存在的词', () => {
    const next = markSeen(THEMES, { a: ['old', 'a1'] }, [])
    expect(next.a).toEqual(['a1'])
  })

  it('连续多局：主题出完之前不出现重复的词', () => {
    const rng = seeded(7)
    let seen = {}
    const shownAll: string[] = []
    // 每局 2 个词，主题 a 共 4 个词：前两局不应重复
    for (let round = 0; round < 2; round++) {
      const deck = createDeck(THEMES, 'a', seen, rng)
      const shown = deck.slice(0, 2)
      shownAll.push(...shown.map((c) => c.text))
      seen = markSeen(THEMES, seen, shown)
    }
    expect(new Set(shownAll).size).toBe(4)
    expect(seen).toEqual({ a: [] })
  })
})
