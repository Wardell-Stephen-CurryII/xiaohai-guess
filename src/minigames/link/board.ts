// 连连看核心规则（纯逻辑）：两个相同图块之间能用最多拐两个弯的线连起来就消除。
// 线只能经过空位；棋盘外围一圈视为空位，线可以绕到外面。

import { shuffle, type Rng } from '../../game/wordDeck'

export const EMPTY = -1
/** 障碍格：不能放图块，线也不能穿过 */
export const BLOCK = -2

/** 棋盘：board[r][c] 为图块种类（>= 0）、EMPTY 或 BLOCK */
export type Board = number[][]

export interface Pos {
  r: number
  c: number
}

const rowsOf = (b: Board) => b.length
const colsOf = (b: Board) => b[0]?.length ?? 0

/** 坐标是否可以走线：外围一圈（-1 或 rows/cols）视为空 */
function passable(b: Board, r: number, c: number): boolean {
  if (r < -1 || c < -1 || r > rowsOf(b) || c > colsOf(b)) return false
  if (r === -1 || c === -1 || r === rowsOf(b) || c === colsOf(b)) return true
  return b[r][c] === EMPTY
}

/** a、b 之间的直线段（不含两端）是否都可走 */
function clearLine(b: Board, a: Pos, z: Pos): boolean {
  if (a.r === z.r) {
    const [lo, hi] = a.c < z.c ? [a.c, z.c] : [z.c, a.c]
    for (let c = lo + 1; c < hi; c++) if (!passable(b, a.r, c)) return false
    return true
  }
  if (a.c === z.c) {
    const [lo, hi] = a.r < z.r ? [a.r, z.r] : [z.r, a.r]
    for (let r = lo + 1; r < hi; r++) if (!passable(b, r, a.c)) return false
    return true
  }
  return false
}

/**
 * 两个图块之间的连线（最多拐两个弯）。能连返回折线的各个端点（含起点和终点），不能连返回 null。
 * 要求两个位置不同、都有图块且种类相同。
 */
export function findPath(b: Board, a: Pos, z: Pos): Pos[] | null {
  if (a.r === z.r && a.c === z.c) return null
  const ta = b[a.r]?.[a.c]
  if (ta === undefined || ta < 0 || ta !== b[z.r]?.[z.c]) return null

  // 不拐弯
  if (clearLine(b, a, z)) return [a, z]

  // 拐一个弯：拐点为 (a.r, z.c) 或 (z.r, a.c)
  for (const p of [{ r: a.r, c: z.c }, { r: z.r, c: a.c }]) {
    if (passable(b, p.r, p.c) && clearLine(b, a, p) && clearLine(b, p, z)) return [a, p, z]
  }

  // 拐两个弯：从 a 沿四个方向走，每个空位作为第一个拐点，再试一个弯到 z
  const dirs = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ]
  let best: Pos[] | null = null
  for (const [dr, dc] of dirs) {
    let r = a.r + dr
    let c = a.c + dc
    while (passable(b, r, c)) {
      const p = { r, c }
      for (const q of [{ r: p.r, c: z.c }, { r: z.r, c: p.c }]) {
        if ((q.r === p.r && q.c === p.c) || !passable(b, q.r, q.c)) continue
        if (clearLine(b, p, q) && clearLine(b, q, z)) {
          const path = [a, p, q, z]
          // 取最短的那条，线看起来更自然
          if (!best || pathLength(path) < pathLength(best)) best = path
        }
      }
      r += dr
      c += dc
    }
  }
  return best
}

const pathLength = (p: Pos[]) =>
  p.slice(1).reduce((s, q, i) => s + Math.abs(q.r - p[i].r) + Math.abs(q.c - p[i].c), 0)

/** 剩余图块数 */
export function remaining(b: Board): number {
  let n = 0
  for (const row of b) for (const v of row) if (v >= 0) n++
  return n
}

/** 找一对能连的图块（提示用）；没有返回 null */
export function findAnyPair(b: Board): [Pos, Pos] | null {
  const byType = new Map<number, Pos[]>()
  b.forEach((row, r) =>
    row.forEach((v, c) => {
      if (v >= 0) byType.set(v, [...(byType.get(v) ?? []), { r, c }])
    }),
  )
  for (const list of byType.values()) {
    for (let i = 0; i < list.length; i++)
      for (let j = i + 1; j < list.length; j++) if (findPath(b, list[i], list[j])) return [list[i], list[j]]
  }
  return null
}

export function removePair(b: Board, a: Pos, z: Pos): Board {
  const next = b.map((row) => [...row])
  next[a.r][a.c] = EMPTY
  next[z.r][z.c] = EMPTY
  return next
}

/** 图块滑动方向（困难关）：每次消除后，剩下的图块朝这个方向移动补空位；障碍格不动，会挡住图块 */
export type Gravity = 'down' | 'up' | 'left' | 'right'

export function applyGravity(b: Board, dir: Gravity): Board {
  const rows = b.length
  const cols = b[0].length
  const next = b.map((row) => [...row])
  const vertical = dir === 'down' || dir === 'up'
  const lines = vertical ? cols : rows
  const len = vertical ? rows : cols
  const toward = dir === 'down' || dir === 'right'
  for (let line = 0; line < lines; line++) {
    const get = (i: number) => (vertical ? next[i][line] : next[line][i])
    const set = (i: number, v: number) => (vertical ? (next[i][line] = v) : (next[line][i] = v))
    // 按障碍格把这一行 / 列切成几段，每段内把图块推到靠近方向的一端
    let start = 0
    while (start < len) {
      while (start < len && get(start) === BLOCK) start++
      let end = start
      while (end < len && get(end) !== BLOCK) end++
      const tiles: number[] = []
      for (let i = start; i < end; i++) if (get(i) >= 0) tiles.push(get(i))
      for (let i = start; i < end; i++) set(i, EMPTY)
      if (toward) tiles.forEach((v, k) => set(end - tiles.length + k, v))
      else tiles.forEach((v, k) => set(start + k, v))
      start = end
    }
  }
  return next
}

/** 贪心消除到底：能消完说明一定有解（用于生成棋盘时验证）；有滑动规则时按规则模拟 */
export function solvableGreedy(b: Board, gravity?: Gravity): boolean {
  let cur = b
  while (remaining(cur) > 0) {
    const pair = findAnyPair(cur)
    if (!pair) return false
    cur = removePair(cur, pair[0], pair[1])
    if (gravity) cur = applyGravity(cur, gravity)
  }
  return true
}

export interface LinkLayout {
  rows: number
  cols: number
  /** 使用的图块种类数（从 0 开始编号） */
  types: number
  /** 障碍格 */
  blocks?: Pos[]
  /** 消除后图块滑动的方向（困难关） */
  gravity?: Gravity
}

/** 每种图块成对出现，按种类轮流分配，尽量均匀；轮流的顺序随机，多出来的对数不会总落在同几种上 */
function tilesFor(count: number, types: number, rng: Rng): number[] {
  const order = shuffle(Array.from({ length: types }, (_, i) => i), rng)
  const tiles: number[] = []
  for (let i = 0; tiles.length < count; i++) tiles.push(order[i % types], order[i % types])
  return tiles
}

function cellsOf(layout: LinkLayout): Pos[] {
  const blocked = new Set((layout.blocks ?? []).map((p) => `${p.r},${p.c}`))
  const cells: Pos[] = []
  for (let r = 0; r < layout.rows; r++) for (let c = 0; c < layout.cols; c++) if (!blocked.has(`${r},${c}`)) cells.push({ r, c })
  return cells
}

/** 生成一个保证能消完的棋盘 */
export function generateBoard(layout: LinkLayout, rng: Rng, maxTries = 200): Board {
  const cells = cellsOf(layout)
  if (cells.length % 2 !== 0) throw new Error('可放图块的格子数必须是偶数')
  let last: Board | null = null
  for (let i = 0; i < maxTries; i++) {
    const board: Board = Array.from({ length: layout.rows }, () => Array(layout.cols).fill(EMPTY))
    for (const p of layout.blocks ?? []) board[p.r][p.c] = BLOCK
    const tiles = shuffle(tilesFor(cells.length, layout.types, rng), rng)
    cells.forEach((p, k) => (board[p.r][p.c] = tiles[k]))
    if (solvableGreedy(board, layout.gravity)) return board
    last = board
  }
  // 极少见：多次都没生成出可解的棋盘，返回最后一个（游戏中卡住时会自动重排）
  return last as Board
}

/** 打乱剩余图块的位置，保证打乱后至少有一对能连，并尽量整体可解 */
export function reshuffle(b: Board, rng: Rng, maxTries = 100, gravity?: Gravity): Board {
  const cells: Pos[] = []
  const tiles: number[] = []
  b.forEach((row, r) =>
    row.forEach((v, c) => {
      if (v >= 0) {
        cells.push({ r, c })
        tiles.push(v)
      }
    }),
  )
  let fallback: Board = b
  for (let i = 0; i < maxTries; i++) {
    const next = b.map((row) => [...row])
    const mixed = shuffle(tiles, rng)
    cells.forEach((p, k) => (next[p.r][p.c] = mixed[k]))
    if (solvableGreedy(next, gravity)) return next
    if (findAnyPair(next)) fallback = next
  }
  return fallback
}
