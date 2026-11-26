import { describe, expect, it } from 'vitest'
import { applyGravity, BLOCK, EMPTY, findAnyPair, findPath, generateBoard, remaining, removePair, reshuffle, solvableGreedy, type Board } from './board'

const _ = EMPTY
const X = BLOCK

function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

/** 折线的拐弯次数 */
const turns = (p: { r: number; c: number }[]) => p.length - 2

describe('findPath', () => {
  it('相邻、同一行直连', () => {
    const b: Board = [
      [0, 0, 1],
      [1, 2, 2],
    ]
    expect(findPath(b, { r: 0, c: 0 }, { r: 0, c: 1 })).toEqual([{ r: 0, c: 0 }, { r: 0, c: 1 }])
    expect(findPath(b, { r: 1, c: 1 }, { r: 1, c: 2 })).not.toBeNull()
  })

  it('中间有图块挡住的直线不能直连，但可以绕外圈', () => {
    const b: Board = [[0, 1, 0]]
    const p = findPath(b, { r: 0, c: 0 }, { r: 0, c: 2 })
    expect(p).not.toBeNull()
    expect(turns(p!)).toBe(2)
    // 单行棋盘：从上方（第 -1 行）或下方（第 1 行）的外圈绕过去都可以
    expect([-1, 1]).toContain(p![1].r)
  })

  it('拐一个弯', () => {
    const b: Board = [
      [0, _],
      [1, 0],
    ]
    const p = findPath(b, { r: 0, c: 0 }, { r: 1, c: 1 })
    expect(p).toEqual([{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 1, c: 1 }])
  })

  it('需要拐三个弯的不能连', () => {
    // 0 被完全包围在中间，另一个 0 在角落：只能拐三次以上
    const b: Board = [
      [1, 1, 1, 1, 1],
      [1, 2, 2, 2, 1],
      [1, 2, 0, 2, 1],
      [1, 2, 2, 2, 1],
      [1, 1, 1, 1, 0],
    ]
    expect(findPath(b, { r: 2, c: 2 }, { r: 4, c: 4 })).toBeNull()
  })

  it('不同种类、同一个格子、障碍格都不能连', () => {
    const b: Board = [[0, 1, X, 0]]
    expect(findPath(b, { r: 0, c: 0 }, { r: 0, c: 1 })).toBeNull()
    expect(findPath(b, { r: 0, c: 0 }, { r: 0, c: 0 })).toBeNull()
    // 被障碍挡住的同一行：绕外圈仍可连
    expect(findPath(b, { r: 0, c: 0 }, { r: 0, c: 3 })).not.toBeNull()
  })

  it('线不能穿过障碍格', () => {
    const b: Board = [
      [X, X, X],
      [0, X, 0],
      [X, X, X],
    ]
    expect(findPath(b, { r: 1, c: 0 }, { r: 1, c: 2 })).toBeNull()
  })

  it('返回的折线最多拐两个弯，且每段都是横平竖直', () => {
    const b = generateBoard({ rows: 6, cols: 6, types: 6 }, seeded(1))
    const pair = findAnyPair(b)!
    const p = findPath(b, pair[0], pair[1])!
    expect(turns(p)).toBeLessThanOrEqual(2)
    for (let i = 1; i < p.length; i++) expect(p[i].r === p[i - 1].r || p[i].c === p[i - 1].c).toBe(true)
  })
})

describe('generateBoard', () => {
  it('每种图块成对出现，且能全部消完', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const b = generateBoard({ rows: 8, cols: 7, types: 12, blocks: [{ r: 3, c: 3 }, { r: 4, c: 3 }] }, seeded(seed))
      const count = new Map<number, number>()
      for (const row of b) for (const v of row) if (v >= 0) count.set(v, (count.get(v) ?? 0) + 1)
      for (const n of count.values()) expect(n % 2).toBe(0)
      expect(b[3][3]).toBe(BLOCK)
      expect(remaining(b)).toBe(54)
      expect(solvableGreedy(b)).toBe(true)
    }
  })

  it('格子数为奇数时报错', () => {
    expect(() => generateBoard({ rows: 3, cols: 3, types: 2 }, seeded(1))).toThrow()
  })
})

describe('applyGravity（困难关的滑动规则）', () => {
  it('向下：每列图块落到底部，障碍格不动并挡住上方的图块', () => {
    const b: Board = [
      [0, 1, _],
      [_, X, 2],
      [_, _, _],
      [3, _, _],
    ]
    expect(applyGravity(b, 'down')).toEqual([
      [_, 1, _],
      [_, X, _],
      [0, _, _],
      [3, _, 2],
    ])
  })

  it('向左、向右、向上', () => {
    const b: Board = [[_, 0, _, 1]]
    expect(applyGravity(b, 'left')).toEqual([[0, 1, _, _]])
    expect(applyGravity(b, 'right')).toEqual([[_, _, 0, 1]])
    expect(applyGravity([[_], [2], [_]], 'up')).toEqual([[2], [_], [_]])
  })

  it('有滑动规则的关卡也能生成可消完的棋盘', () => {
    for (const g of ['down', 'up', 'left', 'right'] as const) {
      const b = generateBoard({ rows: 9, cols: 7, types: 14, blocks: [{ r: 4, c: 3 }], gravity: g }, seeded(7))
      expect(solvableGreedy(b, g)).toBe(true)
    }
  })
})

describe('removePair 与 reshuffle', () => {
  it('消除后变为空位，不修改原棋盘', () => {
    const b: Board = [[0, 0]]
    const next = removePair(b, { r: 0, c: 0 }, { r: 0, c: 1 })
    expect(next).toEqual([[_, _]])
    expect(b).toEqual([[0, 0]])
  })

  it('重排后图块数量不变、位置不变，且有可连的一对', () => {
    const b = generateBoard({ rows: 6, cols: 6, types: 9 }, seeded(5))
    const half = removePair(b, ...findAnyPair(b)!)
    const r = reshuffle(half, seeded(6))
    const sorted = (x: Board) => x.flat().filter((v) => v >= 0).sort()
    expect(sorted(r)).toEqual(sorted(half))
    r.forEach((row, i) => row.forEach((v, j) => expect(v >= 0).toBe(half[i][j] >= 0)))
    expect(findAnyPair(r)).not.toBeNull()
  })
})
