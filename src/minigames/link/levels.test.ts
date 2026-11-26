import { describe, expect, it } from 'vitest'
import { DIFFICULTY_PATTERN } from '../difficulty'
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
  it('共 20 关，难度：简单 11、中等 6、困难 3，第 1 关是简单', () => {
    expect(LINK_LEVELS).toHaveLength(20)
    const count = (d: string) => DIFFICULTY_PATTERN.filter((x) => x === d).length
    expect([count('easy'), count('medium'), count('hard')]).toEqual([11, 6, 3])
    expect(LINK_LEVELS[0].difficulty).toBe('easy')
    LINK_LEVELS.forEach((l, i) => expect(l.level).toBe(i + 1))
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

  it('每关都能生成可以消完的棋盘（障碍格在棋盘内，可放格子数为偶数）', () => {
    for (const l of LINK_LEVELS) {
      for (const b of l.blocks ?? []) {
        expect(b.r).toBeGreaterThanOrEqual(0)
        expect(b.r).toBeLessThan(l.rows)
        expect(b.c).toBeLessThan(l.cols)
      }
      for (let seed = 1; seed <= 5; seed++) {
        const board = generateBoard(l, seeded(seed * 31 + l.level))
        expect(remaining(board)).toBe(l.rows * l.cols - (l.blocks?.length ?? 0))
        expect(solvableGreedy(board)).toBe(true)
      }
    }
  })
})
