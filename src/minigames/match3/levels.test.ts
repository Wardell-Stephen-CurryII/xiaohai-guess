// 消消乐关卡检查：结构正确，并用自动试玩机器人校准难度（真人一般比贪心机器人玩得好）。

import { describe, expect, it } from 'vitest'
import { DIFFICULTY_PATTERN } from '../difficulty'
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
  it('共 20 关，难度分布与连连看一致', () => {
    expect(MATCH3_LEVELS).toHaveLength(20)
    MATCH3_LEVELS.forEach((l, i) => {
      expect(l.level).toBe(i + 1)
      expect(l.difficulty).toBe(DIFFICULTY_PATTERN[i])
    })
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

describe('消消乐难度（自动试玩 20 局）', () => {
  const N = 20
  const MIN_WIN = { easy: 0.9, medium: 0.6, hard: 0.5 } as const
  for (const l of MATCH3_LEVELS) {
    it(`第 ${l.level} 关（${l.difficulty}）通关率达标`, () => {
      let won = 0
      for (let i = 0; i < N; i++) if (playGreedy(l, seeded(5000 + i * 13 + l.level)).won) won++
      expect(won / N).toBeGreaterThanOrEqual(MIN_WIN[l.difficulty])
      // 困难关不能简单到机器人随便过
      if (l.difficulty === 'hard') expect(won / N).toBeLessThanOrEqual(0.95)
    })
  }
})
