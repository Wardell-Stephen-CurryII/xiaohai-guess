import { describe, expect, it } from 'vitest'
import { LINK_PATTERN } from '../difficulty'
import { FACE_TILES, LINK_TILES, tilesForLevel } from '../tiles'
import { generateBoard, remaining, solvableGreedy } from './board'
import { LINK_LEVELS } from './levels'

function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

describe('连连看关卡', () => {
  it('共 100 关，难度 简单 : 中等 : 困难 = 2 : 6 : 2，第 1 关是简单', () => {
    expect(LINK_LEVELS).toHaveLength(100)
    LINK_LEVELS.forEach((l, i) => {
      expect(l.level).toBe(i + 1)
      expect(l.difficulty).toBe(LINK_PATTERN[i])
    })
    const count = (d: string) => LINK_LEVELS.filter((l) => l.difficulty === d).length
    expect([count('easy'), count('medium'), count('hard')]).toEqual([20, 60, 20])
    expect(LINK_LEVELS[0].difficulty).toBe('easy')
  })

  it('难度递进：简单的棋盘比中等小，困难才有滑动规则', () => {
    const avg = (d: string, f: (l: (typeof LINK_LEVELS)[number]) => number) => {
      const ls = LINK_LEVELS.filter((l) => l.difficulty === d)
      return ls.reduce((s, l) => s + f(l), 0) / ls.length
    }
    expect(avg('easy', (l) => l.types)).toBeLessThan(avg('medium', (l) => l.types))
    expect(avg('medium', (l) => l.types)).toBeLessThan(avg('hard', (l) => l.types))
    for (const l of LINK_LEVELS) expect(!!l.gravity).toBe(l.difficulty === 'hard')
    // 新的简单至少相当于原来的中等（6×6、8 种以上）
    for (const l of LINK_LEVELS.filter((x) => x.difficulty === 'easy')) {
      expect(l.rows * l.cols).toBeGreaterThanOrEqual(36)
      expect(l.types).toBeGreaterThanOrEqual(8)
    }
  })

  it('棋盘适合手机屏幕：最多 7 列、9 行', () => {
    for (const l of LINK_LEVELS) {
      expect(l.cols).toBeLessThanOrEqual(7)
      expect(l.rows).toBeLessThanOrEqual(9)
    }
  })

  it('图块种类够用，每关都有 3 张头像', () => {
    for (const l of LINK_LEVELS) {
      expect(l.types).toBeLessThanOrEqual(LINK_TILES.length)
      const tiles = tilesForLevel(l.level, l.types)
      expect(tiles).toHaveLength(l.types)
      expect(new Set(tiles.map((t) => t.id)).size).toBe(l.types)
      for (const f of FACE_TILES) expect(tiles).toContain(f)
    }
  })

  it('每关都能生成可以消完的棋盘（含滑动规则；障碍格在棋盘内，可放格子数为偶数）', () => {
    for (const l of LINK_LEVELS) {
      for (const b of l.blocks ?? []) {
        expect(b.r).toBeGreaterThanOrEqual(0)
        expect(b.r).toBeLessThan(l.rows)
        expect(b.c).toBeLessThan(l.cols)
      }
      const board = generateBoard(l, seeded(l.level * 31))
      expect(remaining(board)).toBe(l.rows * l.cols - (l.blocks?.length ?? 0))
      expect(solvableGreedy(board, l.gravity)).toBe(true)
    }
  }, 60_000)
})
