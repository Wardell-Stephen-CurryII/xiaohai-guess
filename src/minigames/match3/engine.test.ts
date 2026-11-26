import { describe, expect, it } from 'vitest'
import {
  allGoalsDone,
  applyMove,
  createGame,
  findMove,
  findRuns,
  goalProgress,
  iceLeft,
  reshuffle,
  starsFor,
  type GameState,
  type Piece,
  type Special,
} from './engine'

function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

/**
 * 用字符画搭棋盘：数字为种类，'.' 为空洞；
 * 特殊块写法：'R' 横向直线(种类0)、'C' 竖向直线(种类0)、'B' 炸弹(种类0)、'*' 彩虹
 */
function boardFrom(rows: string[], kinds = 5): GameState {
  let id = 1
  const piece = (ch: string): Piece | null => {
    if (ch === '.') return null
    const sp: Record<string, Special> = { R: 'row', C: 'col', B: 'bomb', '*': 'rainbow' }
    if (sp[ch]) return { id: id++, kind: ch === '*' ? -1 : 0, special: sp[ch] }
    return { id: id++, kind: Number(ch), special: 'none' }
  }
  const grid = rows.map((r) => [...r].map(piece))
  return {
    grid,
    holes: rows.map((r) => [...r].map((ch) => ch === '.')),
    ice: rows.map((r) => [...r].map(() => 0)),
    kinds,
    movesLeft: 10,
    score: 0,
    collected: Array(kinds).fill(0),
    nextId: id,
  }
}

const noNulls = (s: GameState) => s.grid.every((row, r) => row.every((p, c) => s.holes[r][c] || p !== null))

describe('createGame', () => {
  it('开局没有现成三连、有步可走，空洞和冰块正确', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const s = createGame({ rows: 8, cols: 8, kinds: 5, moves: 20, goals: [], holes: [{ r: 0, c: 0 }], ice: [{ r: 3, c: 3 }] }, seeded(seed))
      expect(findRuns(s.grid)).toEqual([])
      expect(findMove(s)).not.toBeNull()
      expect(s.grid[0][0]).toBeNull()
      expect(noNulls(s)).toBe(true)
      expect(iceLeft(s)).toBe(1)
    }
  })
})

describe('applyMove', () => {
  it('不能形成三连的交换无效，不消耗步数', () => {
    const s = boardFrom(['012', '120', '201'])
    expect(applyMove(s, { r: 0, c: 0 }, { r: 0, c: 1 }, seeded(1))).toEqual({ ok: false })
    expect(applyMove(s, { r: 0, c: 0 }, { r: 2, c: 2 }, seeded(1))).toEqual({ ok: false })
  })

  it('三连消除：计分、收集、步数减一、掉落补满', () => {
    // 交换 (1,2) 和 (0,2)：第 0 行变成 0 0 0
    const s = boardFrom(['0012', '3401', '2341', '4123'])
    const r = applyMove(s, { r: 0, c: 2 }, { r: 1, c: 2 }, seeded(2))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.state.collected[0]).toBeGreaterThanOrEqual(3)
    expect(r.state.movesLeft).toBe(9)
    expect(r.state.score).toBeGreaterThanOrEqual(30)
    expect(noNulls(r.state)).toBe(true)
    expect(r.steps.length).toBeGreaterThanOrEqual(1)
    expect(r.steps[0].cleared).toHaveLength(3)
  })

  it('横向 4 连生成直线块（消整行），放在交换的位置', () => {
    // 第 0 行 0 0 1 0 3，把第 1 行第 2 列的 0 换上来 → 0 0 0 0 3（4 连）
    const s = boardFrom(['00103', '23014', '34312', '41234', '12341'])
    const r = applyMove(s, { r: 0, c: 2 }, { r: 1, c: 2 }, () => 0.99)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const specials = r.state.grid.flat().filter((p) => p && p.special === 'row')
    expect(specials.length).toBe(1)
    expect(r.steps[0].cleared).toContainEqual({ r: 0, c: 2 })
  })

  it('5 连生成彩虹块', () => {
    const s = boardFrom(['00100', '23032', '34312', '41234', '12341'])
    const r = applyMove(s, { r: 0, c: 2 }, { r: 1, c: 2 }, () => 0.99)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.state.grid.flat().filter((p) => p && p.special === 'rainbow')).toHaveLength(1)
  })

  it('L 形生成炸弹', () => {
    // 第 0 行 0 0 _，第 1、2 行第 2 列是 0；把 (0,3) 的 0 换到 (0,2)
    const s = boardFrom(['00103', '12034', '34012', '41234', '23412'])
    const r = applyMove(s, { r: 0, c: 2 }, { r: 0, c: 3 }, () => 0.99)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.state.grid.flat().filter((p) => p && p.special === 'bomb')).toHaveLength(1)
  })

  it('直线块被消除时清掉整行', () => {
    // 第 1 行有一个横向直线块 R（种类 0），通过竖向三连把它消掉
    const s = boardFrom(['10234', 'R1432', '01342', '23413'])
    const r = applyMove(s, { r: 0, c: 0 }, { r: 0, c: 1 }, () => 0.99)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    // 第 0 列三个 0 + 第 1 行其余 4 格
    expect(r.steps[0].cleared.length).toBeGreaterThanOrEqual(7)
  })

  it('彩虹块和任意块交换：消除场上所有同类', () => {
    const s = boardFrom(['*1212', '21212', '12121'])
    const r = applyMove(s, { r: 0, c: 0 }, { r: 0, c: 1 }, () => 0.99)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    // 种类 1 一共 7 个，加上彩虹块自己
    expect(r.state.collected[1]).toBeGreaterThanOrEqual(7)
  })

  it('在冰块上消除会碎冰', () => {
    const s = boardFrom(['0012', '3401', '2341', '4123'])
    s.ice[0][0] = 1
    s.ice[3][3] = 1
    const r = applyMove(s, { r: 0, c: 2 }, { r: 1, c: 2 }, seeded(3))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.state.ice[0][0]).toBe(0)
    expect(r.state.ice[3][3]).toBe(1)
    expect(s.ice[0][0]).toBe(1)
  })

  it('空洞不会被填充', () => {
    const s = boardFrom(['0012', '34.1', '2341', '4123'])
    const r = applyMove(s, { r: 0, c: 2 }, { r: 0, c: 3 }, seeded(4))
    if (r.ok) expect(r.state.grid[1][2]).toBeNull()
  })
})

describe('reshuffle 与目标', () => {
  it('洗牌后没有现成三连且有步可走，图块数量不变', () => {
    const s = createGame({ rows: 6, cols: 6, kinds: 5, moves: 20, goals: [] }, seeded(9))
    const t = reshuffle(s, seeded(10))
    expect(findRuns(t.grid)).toEqual([])
    expect(findMove(t)).not.toBeNull()
    expect(t.grid.flat().filter(Boolean)).toHaveLength(36)
  })

  it('目标进度与星级', () => {
    const s = boardFrom(['012'])
    s.collected[1] = 5
    s.score = 900
    expect(goalProgress(s, { type: 'collect', kind: 1, count: 8 })).toEqual({ done: false, left: 3 })
    expect(goalProgress(s, { type: 'score', target: 800 }).done).toBe(true)
    expect(goalProgress(s, { type: 'ice' }).done).toBe(true)
    expect(allGoalsDone(s, [{ type: 'score', target: 800 }, { type: 'collect', kind: 1, count: 5 }])).toBe(true)
    expect([starsFor(10, 25), starsFor(3, 25), starsFor(1, 25)]).toEqual([3, 2, 1])
  })
})
