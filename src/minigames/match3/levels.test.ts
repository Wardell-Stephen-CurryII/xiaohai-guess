// 消消乐关卡检查：结构正确，并用自动试玩机器人校准难度（真人一般比贪心机器人玩得好）。

import { describe, expect, it } from 'vitest'
import { MATCH3_PATTERN } from '../difficulty'
import { CANDY_TILES, FACE_TILES } from '../tiles'
import { playGreedy } from './bot'
import { MATCH3_LEVELS } from './levels'

function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

const PIECE_IDS = new Set([...CANDY_TILES, ...FACE_TILES].map((t) => t.id))

describe('消消乐关卡结构', () => {
  it('共 100 关，难度 简单 : 中等 : 困难 = 2 : 6 : 2，第 1 关是简单', () => {
    expect(MATCH3_LEVELS).toHaveLength(100)
    MATCH3_LEVELS.forEach((l, i) => {
      expect(l.level).toBe(i + 1)
      expect(l.difficulty).toBe(MATCH3_PATTERN[i])
    })
    const count = (d: string) => MATCH3_LEVELS.filter((l) => l.difficulty === d).length
    expect([count('easy'), count('medium'), count('hard')]).toEqual([20, 60, 20])
    expect(MATCH3_LEVELS[0].difficulty).toBe('easy')
    // 每 10 关里都是 2 : 6 : 2
    for (let b = 0; b < 10; b++) {
      const block = MATCH3_LEVELS.slice(b * 10, b * 10 + 10)
      expect(block.filter((l) => l.difficulty === 'easy')).toHaveLength(2)
      expect(block.filter((l) => l.difficulty === 'hard')).toHaveLength(2)
    }
  })

  it('步数在 14~40 之间', () => {
    for (const l of MATCH3_LEVELS) {
      expect(l.moves).toBeGreaterThanOrEqual(14)
      expect(l.moves).toBeLessThanOrEqual(40)
    }
  })

  it('每关都有作者的 3 张头像', () => {
    for (const l of MATCH3_LEVELS) for (const f of FACE_TILES) expect(l.pieces).toContain(f.id)
  })

  it('图块、目标、冰块、空洞都合法', () => {
    for (const l of MATCH3_LEVELS) {
      expect(l.pieces).toHaveLength(l.kinds)
      for (const id of l.pieces) expect(PIECE_IDS.has(id)).toBe(true)
      expect(new Set(l.pieces).size).toBe(l.kinds)
      for (const g of l.goals) if (g.type === 'collect') expect(g.kind).toBeLessThan(l.kinds)
      if (l.goals.some((g) => g.type === 'ice')) expect(l.ice?.length).toBeGreaterThan(0)
      const holes = new Set((l.holes ?? []).map((p) => `${p.r},${p.c}`))
      for (const p of [...(l.ice ?? []), ...(l.holes ?? [])]) {
        expect(p.r).toBeGreaterThanOrEqual(0)
        expect(p.r).toBeLessThan(l.rows)
        expect(p.c).toBeLessThan(l.cols)
      }
      for (const p of l.ice ?? []) expect(holes.has(`${p.r},${p.c}`)).toBe(false)
    }
  })
})

// 生成时每关已用 24 局校准；这里换一批随机种子复核，按难度汇总，避免单关的运气波动
describe('消消乐难度（自动试玩复核）', () => {
  const N = 8
  const rate = (difficulty: string) => {
    const levels = MATCH3_LEVELS.filter((l) => l.difficulty === difficulty)
    let won = 0
    for (const l of levels) for (let i = 0; i < N; i++) if (playGreedy(l, seeded(31_000 + l.level * 97 + i)).won) won++
    return won / (levels.length * N)
  }
  it('简单最容易，困难最难，且三档都能通关', () => {
    const easy = rate('easy')
    const medium = rate('medium')
    const hard = rate('hard')
    expect(easy).toBeGreaterThan(0.8)
    expect(medium).toBeGreaterThan(0.55)
    expect(medium).toBeLessThan(0.9)
    expect(hard).toBeGreaterThan(0.3)
    expect(hard).toBeLessThan(0.7)
    expect(easy).toBeGreaterThan(medium)
    expect(medium).toBeGreaterThan(hard)
    // 共 800 局，比较耗时
  }, 120_000)
})
