// 消消乐核心规则（纯逻辑，便于测试）。
// 交换相邻两块，横或竖连成 3 个以上相同就消除，上面的掉下来补满，可以连锁。
// 特殊块：4 连 → 直线块（横 4 消整行、竖 4 消整列）；L/T 形 → 炸弹（3×3）；5 连 → 彩虹块（和任意一块交换消除场上所有同类）。
// 冰块：格子上的冰层，在上面消除一次就碎。

import { shuffle, type Rng } from '../../game/wordDeck'

export type Special = 'none' | 'row' | 'col' | 'bomb' | 'rainbow'

export interface Piece {
  id: number
  /** 种类（0 起），彩虹块为 -1 */
  kind: number
  special: Special
}

export interface Pos {
  r: number
  c: number
}

export type Goal =
  | { type: 'collect'; kind: number; count: number }
  | { type: 'score'; target: number }
  | { type: 'ice' }

export interface Match3Setup {
  rows: number
  cols: number
  /** 图块种类数 */
  kinds: number
  moves: number
  /** 空洞（不放图块） */
  holes?: Pos[]
  /** 冰块格 */
  ice?: Pos[]
  goals: Goal[]
}

export interface GameState {
  /** null：空洞或暂时为空 */
  grid: (Piece | null)[][]
  holes: boolean[][]
  ice: number[][]
  kinds: number
  movesLeft: number
  score: number
  /** 每个种类已收集数量 */
  collected: number[]
  nextId: number
}

/** 一次消除的动画帧：消掉了哪些格子，以及掉落补满后的棋盘 */
export interface Step {
  cleared: Pos[]
  grid: (Piece | null)[][]
}

const key = (p: Pos) => `${p.r},${p.c}`
const inside = (s: { grid: unknown[][] }, r: number, c: number) => r >= 0 && c >= 0 && r < s.grid.length && c < s.grid[0].length

export const TILE_SCORE = 10

function newPiece(s: GameState, kind: number, special: Special = 'none'): Piece {
  return { id: s.nextId++, kind, special }
}

function cloneGrid(g: (Piece | null)[][]) {
  return g.map((row) => row.map((p) => (p ? { ...p } : null)))
}

// ---------- 初始化 ----------

/** 新开一局：随机填满，开局没有现成的三连，且至少有一步可走 */
export function createGame(setup: Match3Setup, rng: Rng): GameState {
  const holes = Array.from({ length: setup.rows }, () => Array(setup.cols).fill(false))
  for (const h of setup.holes ?? []) holes[h.r][h.c] = true
  const ice = Array.from({ length: setup.rows }, () => Array(setup.cols).fill(0))
  for (const p of setup.ice ?? []) ice[p.r][p.c] = 1
  const s: GameState = {
    grid: [],
    holes,
    ice,
    kinds: setup.kinds,
    movesLeft: setup.moves,
    score: 0,
    collected: Array(setup.kinds).fill(0),
    nextId: 1,
  }
  for (let attempt = 0; attempt < 50; attempt++) {
    s.grid = Array.from({ length: setup.rows }, () => Array(setup.cols).fill(null))
    for (let r = 0; r < setup.rows; r++)
      for (let c = 0; c < setup.cols; c++) {
        if (holes[r][c]) continue
        const banned = new Set<number>()
        const k = (rr: number, cc: number) => (inside(s, rr, cc) ? s.grid[rr][cc]?.kind : undefined)
        if (c >= 2 && k(r, c - 1) === k(r, c - 2) && k(r, c - 1) !== undefined) banned.add(k(r, c - 1) as number)
        if (r >= 2 && k(r - 1, c) === k(r - 2, c) && k(r - 1, c) !== undefined) banned.add(k(r - 1, c) as number)
        const options = Array.from({ length: setup.kinds }, (_, i) => i).filter((i) => !banned.has(i))
        s.grid[r][c] = newPiece(s, options[Math.floor(rng() * options.length)])
      }
    if (findMove(s)) return s
  }
  return s
}

// ---------- 匹配 ----------

interface Run {
  cells: Pos[]
  dir: 'h' | 'v'
  kind: number
}

/** 找出所有横竖 3 连以上（彩虹块不参与普通匹配） */
export function findRuns(grid: (Piece | null)[][]): Run[] {
  const runs: Run[] = []
  const rows = grid.length
  const cols = grid[0].length
  const kindAt = (r: number, c: number) => {
    const p = grid[r][c]
    return p && p.kind >= 0 ? p.kind : -1
  }
  for (let r = 0; r < rows; r++) {
    let c = 0
    while (c < cols) {
      const k = kindAt(r, c)
      let e = c + 1
      while (e < cols && k >= 0 && kindAt(r, e) === k) e++
      if (k >= 0 && e - c >= 3) runs.push({ dir: 'h', kind: k, cells: Array.from({ length: e - c }, (_, i) => ({ r, c: c + i })) })
      c = e
    }
  }
  for (let c = 0; c < cols; c++) {
    let r = 0
    while (r < rows) {
      const k = kindAt(r, c)
      let e = r + 1
      while (e < rows && k >= 0 && kindAt(e, c) === k) e++
      if (k >= 0 && e - r >= 3) runs.push({ dir: 'v', kind: k, cells: Array.from({ length: e - r }, (_, i) => ({ r: r + i, c })) })
      r = e
    }
  }
  return runs
}

/** 根据匹配决定生成哪些特殊块（放在交换的位置，否则放在连线的第二格） */
function specialsFor(runs: Run[], swapped: Pos[]): { pos: Pos; kind: number; special: Special }[] {
  const out: { pos: Pos; kind: number; special: Special }[] = []
  const used = new Set<Run>()
  const swappedKeys = new Set(swapped.map(key))
  // L / T 形：横竖两条同色连线相交 → 炸弹
  for (const h of runs.filter((x) => x.dir === 'h')) {
    for (const v of runs.filter((x) => x.dir === 'v')) {
      if (used.has(h) || used.has(v) || h.kind !== v.kind) continue
      const cross = h.cells.find((p) => v.cells.some((q) => q.r === p.r && q.c === p.c))
      if (cross) {
        used.add(h)
        used.add(v)
        out.push({ pos: cross, kind: h.kind, special: h.cells.length >= 5 || v.cells.length >= 5 ? 'rainbow' : 'bomb' })
      }
    }
  }
  for (const run of runs) {
    if (used.has(run) || run.cells.length < 4) continue
    const at = run.cells.find((p) => swappedKeys.has(key(p))) ?? run.cells[1]
    if (run.cells.length >= 5) out.push({ pos: at, kind: -1, special: 'rainbow' })
    else out.push({ pos: at, kind: run.kind, special: run.dir === 'h' ? 'row' : 'col' })
  }
  return out
}

// ---------- 消除与特殊效果 ----------

/** 场上数量最多的普通种类（彩虹块被炸到时用） */
function mostCommonKind(s: GameState): number {
  const n = Array(s.kinds).fill(0)
  for (const row of s.grid) for (const p of row) if (p && p.kind >= 0) n[p.kind]++
  return n.indexOf(Math.max(...n))
}

/** 特殊块被消除时波及的格子 */
function effectCells(s: GameState, p: Pos, piece: Piece, rainbowKind?: number): Pos[] {
  const rows = s.grid.length
  const cols = s.grid[0].length
  switch (piece.special) {
    case 'row':
      return Array.from({ length: cols }, (_, c) => ({ r: p.r, c }))
    case 'col':
      return Array.from({ length: rows }, (_, r) => ({ r, c: p.c }))
    case 'bomb': {
      const out: Pos[] = []
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (inside(s, p.r + dr, p.c + dc)) out.push({ r: p.r + dr, c: p.c + dc })
      return out
    }
    case 'rainbow': {
      const k = rainbowKind ?? mostCommonKind(s)
      const out: Pos[] = []
      s.grid.forEach((row, r) => row.forEach((q, c) => q && q.kind === k && out.push({ r, c })))
      return out
    }
    default:
      return []
  }
}

/**
 * 消除一批格子（会连带触发其中的特殊块），计分、收集、碎冰。
 * keep：本次新生成的特殊块位置，不清除。
 */
function clearCells(s: GameState, start: Pos[], wave: number, keep: Set<string>, rainbowKinds = new Map<string, number>()): Pos[] {
  const done = new Set<string>()
  const queue = [...start]
  const cleared: Pos[] = []
  while (queue.length) {
    const p = queue.shift() as Pos
    const k = key(p)
    if (done.has(k) || !inside(s, p.r, p.c) || s.holes[p.r][p.c]) continue
    done.add(k)
    const piece = s.grid[p.r][p.c]
    if (!piece) continue
    if (keep.has(k)) continue
    if (piece.special !== 'none') queue.push(...effectCells(s, p, piece, rainbowKinds.get(k)))
    cleared.push(p)
  }
  for (const p of cleared) {
    const piece = s.grid[p.r][p.c] as Piece
    if (piece.kind >= 0) s.collected[piece.kind]++
    s.score += TILE_SCORE * wave
    if (s.ice[p.r][p.c] > 0) s.ice[p.r][p.c]--
    s.grid[p.r][p.c] = null
  }
  return cleared
}

/** 掉落并从顶部补充新块 */
function gravity(s: GameState, rng: Rng) {
  const rows = s.grid.length
  const cols = s.grid[0].length
  for (let c = 0; c < cols; c++) {
    const slots: number[] = []
    for (let r = rows - 1; r >= 0; r--) if (!s.holes[r][c]) slots.push(r)
    const pieces = slots.map((r) => s.grid[r][c]).filter((p): p is Piece => !!p)
    slots.forEach((r, i) => {
      s.grid[r][c] = pieces[i] ?? newPiece(s, Math.floor(rng() * s.kinds))
    })
  }
}

/** 从当前棋盘开始，反复消除三连、掉落，直到稳定 */
function cascade(s: GameState, rng: Rng, swapped: Pos[], firstWave: number, steps: Step[]) {
  let wave = firstWave
  for (let guard = 0; guard < 50; guard++) {
    const runs = findRuns(s.grid)
    if (runs.length === 0) return
    const specials = specialsFor(runs, wave === firstWave ? swapped : [])
    const keep = new Set(specials.map((x) => key(x.pos)))
    const cells = runs.flatMap((r) => r.cells)
    // 新特殊块所在格子上的原图块也算被消除（计入收集），再换成特殊块
    for (const sp of specials) {
      const old = s.grid[sp.pos.r][sp.pos.c]
      if (old && old.kind >= 0) s.collected[old.kind]++
      if (s.ice[sp.pos.r][sp.pos.c] > 0) s.ice[sp.pos.r][sp.pos.c]--
      s.score += TILE_SCORE * wave
    }
    const cleared = clearCells(s, cells, wave, keep)
    for (const sp of specials) s.grid[sp.pos.r][sp.pos.c] = newPiece(s, sp.kind, sp.special)
    gravity(s, rng)
    steps.push({ cleared: [...cleared, ...specials.map((x) => x.pos)], grid: cloneGrid(s.grid) })
    wave++
  }
}

// ---------- 走一步 ----------

export const adjacent = (a: Pos, b: Pos) => Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1

export type MoveResult = { ok: false } | { ok: true; state: GameState; steps: Step[] }

function cloneState(s: GameState): GameState {
  return { ...s, grid: cloneGrid(s.grid), ice: s.ice.map((r) => [...r]), collected: [...s.collected] }
}

/** 交换两块。无效（不相邻、空洞、交换后不能消除）返回 ok: false，不消耗步数 */
export function applyMove(state: GameState, a: Pos, b: Pos, rng: Rng): MoveResult {
  if (!adjacent(a, b) || !inside(state, a.r, a.c) || !inside(state, b.r, b.c)) return { ok: false }
  const pa = state.grid[a.r][a.c]
  const pb = state.grid[b.r][b.c]
  if (!pa || !pb || state.movesLeft <= 0) return { ok: false }
  const s = cloneState(state)
  const steps: Step[] = []

  // 彩虹块：和谁交换就消除场上所有同类；两个彩虹块清空全场
  if (pa.special === 'rainbow' || pb.special === 'rainbow') {
    const rainbowPos = pa.special === 'rainbow' ? a : b
    const other = pa.special === 'rainbow' ? pb : pa
    const otherPos = pa.special === 'rainbow' ? b : a
    let targets: Pos[]
    if (other.special === 'rainbow') {
      targets = []
      s.grid.forEach((row, r) => row.forEach((p, c) => p && targets.push({ r, c })))
    } else {
      targets = [rainbowPos, otherPos]
      s.grid.forEach((row, r) => row.forEach((p, c) => p && p.kind === other.kind && targets.push({ r, c })))
    }
    s.grid[rainbowPos.r][rainbowPos.c] = { ...(s.grid[rainbowPos.r][rainbowPos.c] as Piece), special: 'none', kind: -1 }
    const cleared = clearCells(s, targets, 1, new Set())
    gravity(s, rng)
    steps.push({ cleared, grid: cloneGrid(s.grid) })
    cascade(s, rng, [], 2, steps)
    s.movesLeft--
    return { ok: true, state: s, steps }
  }

  // 两个特殊块（直线 / 炸弹）交换：同时触发
  if (pa.special !== 'none' && pb.special !== 'none') {
    s.grid[a.r][a.c] = pb
    s.grid[b.r][b.c] = pa
    const cleared = clearCells(s, [a, b], 1, new Set())
    gravity(s, rng)
    steps.push({ cleared, grid: cloneGrid(s.grid) })
    cascade(s, rng, [], 2, steps)
    s.movesLeft--
    return { ok: true, state: s, steps }
  }

  // 普通交换：必须能形成三连
  s.grid[a.r][a.c] = pb
  s.grid[b.r][b.c] = pa
  if (findRuns(s.grid).length === 0) return { ok: false }
  cascade(s, rng, [a, b], 1, steps)
  s.movesLeft--
  return { ok: true, state: s, steps }
}

/** 找一步可走的（提示用）；没有返回 null */
export function findMove(state: GameState): [Pos, Pos] | null {
  const g = state.grid
  for (let r = 0; r < g.length; r++)
    for (let c = 0; c < g[0].length; c++) {
      for (const [dr, dc] of [
        [0, 1],
        [1, 0],
      ]) {
        const r2 = r + dr
        const c2 = c + dc
        if (!inside(state, r2, c2)) continue
        const a = g[r][c]
        const b = g[r2][c2]
        if (!a || !b) continue
        if (a.special === 'rainbow' || b.special === 'rainbow') return [{ r, c }, { r: r2, c: c2 }]
        if (a.special !== 'none' && b.special !== 'none') return [{ r, c }, { r: r2, c: c2 }]
        g[r][c] = b
        g[r2][c2] = a
        const ok = findRuns(g).length > 0
        g[r][c] = a
        g[r2][c2] = b
        if (ok) return [{ r, c }, { r: r2, c: c2 }]
      }
    }
  return null
}

/** 没有可走的步时重新洗牌（保留特殊块），保证洗完没有现成三连且有步可走 */
export function reshuffle(state: GameState, rng: Rng): GameState {
  const s = cloneState(state)
  const cells: Pos[] = []
  const pieces: Piece[] = []
  s.grid.forEach((row, r) =>
    row.forEach((p, c) => {
      if (p) {
        cells.push({ r, c })
        pieces.push(p)
      }
    }),
  )
  for (let i = 0; i < 100; i++) {
    const mixed = shuffle(pieces, rng)
    cells.forEach((p, k) => (s.grid[p.r][p.c] = mixed[k]))
    if (findRuns(s.grid).length === 0 && findMove(s)) return s
  }
  // 极少见：换一批新块
  return { ...createGame({ rows: s.grid.length, cols: s.grid[0].length, kinds: s.kinds, moves: s.movesLeft, goals: [] }, rng), holes: s.holes, ice: s.ice, score: s.score, collected: s.collected, movesLeft: s.movesLeft }
}

// ---------- 目标与星级 ----------

export function iceLeft(s: GameState): number {
  return s.ice.reduce((n, row) => n + row.reduce((a, b) => a + b, 0), 0)
}

export function goalProgress(s: GameState, g: Goal): { done: boolean; left: number } {
  if (g.type === 'collect') {
    const left = Math.max(0, g.count - s.collected[g.kind])
    return { done: left === 0, left }
  }
  if (g.type === 'score') {
    const left = Math.max(0, g.target - s.score)
    return { done: left === 0, left }
  }
  const left = iceLeft(s)
  return { done: left === 0, left }
}

export const allGoalsDone = (s: GameState, goals: Goal[]) => goals.every((g) => goalProgress(s, g).done)

/** 星级：剩余步数 ≥ 30% 三星，≥ 10% 两星，否则一星 */
export function starsFor(movesLeft: number, moves: number): number {
  const ratio = movesLeft / moves
  return ratio >= 0.3 ? 3 : ratio >= 0.1 ? 2 : 1
}
