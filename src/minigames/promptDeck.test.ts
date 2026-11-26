import { describe, expect, it } from 'vitest'
import { drawPrompt, type SeenPrompts } from './promptDeck'

function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

const bank = { normal: ['n1', 'n2', 'n3', 'n4'], spicy: ['s1', 's2'] }
const empty: SeenPrompts = { normal: [], spicy: [] }

describe('drawPrompt', () => {
  it('劲爆关闭时只出普通题', () => {
    const rng = seeded(1)
    let seen = empty
    for (let i = 0; i < 20; i++) {
      const r = drawPrompt(bank, false, seen, rng)
      expect(r.drawn.spicy).toBe(false)
      expect(bank.normal).toContain(r.drawn.text)
      seen = r.seen
    }
  })

  it('一轮之内不重复，抽完再重新开始', () => {
    const rng = seeded(2)
    let seen = empty
    const first: string[] = []
    for (let i = 0; i < 4; i++) {
      const r = drawPrompt(bank, false, seen, rng)
      first.push(r.drawn.text)
      seen = r.seen
    }
    expect([...first].sort()).toEqual(bank.normal)
    const next = drawPrompt(bank, false, seen, rng, first[3])
    expect(next.drawn.text).not.toBe(first[3])
    expect(next.seen.normal).toEqual([next.drawn.text])
  })

  it('劲爆打开时只出劲爆题，不和普通题混合；抽完一轮再重新开始', () => {
    const rng = seeded(3)
    let seen = empty
    const got: string[] = []
    for (let i = 0; i < 6; i++) {
      const r = drawPrompt(bank, true, seen, rng, got[got.length - 1] ?? null)
      expect(r.drawn.spicy).toBe(true)
      expect(bank.spicy).toContain(r.drawn.text)
      got.push(r.drawn.text)
      seen = r.seen
    }
    // 只有 2 条劲爆题：每两张一轮，且不会连续抽到同一张
    for (let i = 1; i < got.length; i++) expect(got[i]).not.toBe(got[i - 1])
    expect(seen.normal).toEqual([])
  })

  it('题库更新后，已删除的题从记录中去掉', () => {
    const r = drawPrompt(bank, false, { normal: ['old', 'n1'], spicy: [] }, seeded(4))
    expect(r.seen.normal).not.toContain('old')
    expect(r.drawn.text).not.toBe('n1')
  })
})
