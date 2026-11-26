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

  it('劲爆打开时大约三分之一是劲爆题', () => {
    const big = { normal: Array.from({ length: 500 }, (_, i) => `n${i}`), spicy: Array.from({ length: 500 }, (_, i) => `s${i}`) }
    const rng = seeded(3)
    let seen = empty
    let spicy = 0
    for (let i = 0; i < 600; i++) {
      const r = drawPrompt(big, true, seen, rng)
      if (r.drawn.spicy) spicy++
      seen = r.seen
    }
    expect(spicy / 600).toBeGreaterThan(0.25)
    expect(spicy / 600).toBeLessThan(0.42)
  })

  it('题库更新后，已删除的题从记录中去掉', () => {
    const r = drawPrompt(bank, false, { normal: ['old', 'n1'], spicy: [] }, seeded(4))
    expect(r.seen.normal).not.toContain('old')
    expect(r.drawn.text).not.toBe('n1')
  })
})
