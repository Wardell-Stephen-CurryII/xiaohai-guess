// 生成消消乐关卡：npm run gen:match3
//
// 每关先按难度随机搭配目标、冰块、空洞和图块（固定随机种子，结果可复现），
// 再用自动试玩机器人调整步数：找到让机器人通关率达到目标的最少步数。
// 结果写入 src/minigames/match3/levels.json，游戏直接读取，所有人玩到的关卡一样。

import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { shuffle } from '../src/game/wordDeck'
import { MATCH3_PATTERN, type Difficulty } from '../src/minigames/difficulty'
import { playGreedy } from '../src/minigames/match3/bot'
import type { Goal, Pos } from '../src/minigames/match3/engine'
import type { Match3Level } from '../src/minigames/match3/levels'
import { piecesForLevel } from '../src/minigames/match3/pieces'

const ROWS = 8
const COLS = 8
const CANDIES = ['candy-red', 'candy-orange', 'candy-yellow', 'candy-green', 'candy-blue', 'candy-purple']
const FACES = ['face-1', 'face-2', 'face-3']

/** 机器人通关率目标（找满足该通关率的最少步数）。真人一般玩得比贪心机器人好 */
const TARGET_WIN: Record<Difficulty, number> = { easy: 0.88, medium: 0.7, hard: 0.45 }
const GAMES = 24

function seeded(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

const p = (r: number, c: number): Pos => ({ r, c })
const area = (r0: number, c0: number, r1: number, c1: number) => {
  const out: Pos[] = []
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) out.push(p(r, c))
  return out
}

const HOLE_PATTERNS: Pos[][] = [
  [p(0, 0), p(0, 7), p(7, 0), p(7, 7)],
  [p(3, 3), p(3, 4), p(4, 3), p(4, 4)],
  [p(3, 0), p(4, 0), p(3, 7), p(4, 7)],
  [p(0, 0), p(0, 1), p(1, 0), p(0, 6), p(0, 7), p(1, 7)],
  [p(0, 3), p(0, 4), p(7, 3), p(7, 4)],
  [p(2, 2), p(2, 5), p(5, 2), p(5, 5)],
]

const ICE_REGIONS: Pos[][] = [
  area(3, 1, 4, 6),
  [...area(2, 2, 2, 5), ...area(5, 2, 5, 5), p(3, 2), p(4, 2), p(3, 5), p(4, 5)],
  [...area(1, 0, 1, 7), ...area(6, 0, 6, 7)],
  area(2, 2, 5, 5),
  [...area(0, 0, 1, 7)],
  [...area(5, 0, 7, 7)],
  area(1, 1, 6, 6).filter((q) => (q.r + q.c) % 2 === 0),
]

type Rng = () => number
const pick = <T>(rng: Rng, list: T[]) => list[Math.floor(rng() * list.length)]
const between = (rng: Rng, lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1))

/** scale：目标数量的缩放，用于把步数调到合适的范围 */
function draftLevel(level: number, difficulty: Difficulty, rng: Rng, scale = 1): Omit<Match3Level, 'moves'> {
  const kinds = difficulty === 'easy' ? pick(rng, [5, 6]) : 6
  // 大约每 5 关有一关用作者头像作为图块并收集
  const useFace = level % 5 === 4
  const pieces = shuffle(CANDIES, rng).slice(0, kinds)
  if (useFace) pieces[Math.floor(rng() * kinds)] = FACES[Math.floor(level / 5) % FACES.length]
  const faceKind = pieces.findIndex((x) => x.startsWith('face'))

  const holes: Pos[] = difficulty === 'hard' ? pick(rng, HOLE_PATTERNS) : difficulty === 'medium' && rng() < 0.35 ? pick(rng, HOLE_PATTERNS) : []
  const holeSet = new Set(holes.map((q) => `${q.r},${q.c}`))
  const iceFrom = (lo: number, hi: number) => {
    const region = pick(rng, ICE_REGIONS).filter((q) => !holeSet.has(`${q.r},${q.c}`))
    return shuffle(region, rng).slice(0, Math.min(region.length, Math.round(between(rng, lo, hi) * scale)))
  }
  const collectKinds = (n: number) => shuffle(Array.from({ length: kinds }, (_, i) => i).filter((i) => i !== faceKind), rng).slice(0, n)
  const base = { easy: [22, 28], medium: [26, 34], hard: [30, 38] }[difficulty] as [number, number]
  const per = [Math.round(base[0] * scale), Math.round(base[1] * scale)] as [number, number]

  let goals: Goal[]
  let ice: Pos[] = []
  if (useFace) {
    goals = [{ type: 'collect', kind: faceKind, count: between(rng, per[0], per[1]) }]
    if (difficulty !== 'easy') goals.push({ type: 'collect', kind: collectKinds(1)[0], count: between(rng, per[0], per[1]) })
  } else {
    const roll = rng()
    const kindCount = difficulty === 'hard' ? 3 : difficulty === 'medium' ? pick(rng, [2, 3]) : pick(rng, [1, 2])
    if (difficulty === 'easy') {
      if (roll < 0.55) goals = collectKinds(kindCount).map((k) => ({ type: 'collect', kind: k, count: between(rng, per[0], per[1]) }))
      else if (roll < 0.75) goals = [{ type: 'score', target: 50 * Math.round(between(rng, 60, 76) * scale) }]
      else {
        ice = iceFrom(8, 12)
        goals = [{ type: 'ice' }]
      }
    } else if (difficulty === 'medium') {
      if (roll < 0.35) goals = collectKinds(kindCount).map((k) => ({ type: 'collect', kind: k, count: between(rng, per[0], per[1]) }))
      else if (roll < 0.65) {
        ice = iceFrom(12, 16)
        goals = [{ type: 'ice' }]
      } else if (roll < 0.85) {
        ice = iceFrom(10, 14)
        goals = [{ type: 'ice' }, { type: 'collect', kind: collectKinds(1)[0], count: between(rng, per[0], per[1]) }]
      } else goals = [{ type: 'score', target: 50 * Math.round(between(rng, 80, 96) * scale) }]
    } else {
      if (roll < 0.4) {
        ice = iceFrom(18, 24)
        goals = [{ type: 'ice' }, { type: 'collect', kind: collectKinds(1)[0], count: between(rng, per[0], per[1]) }]
      } else if (roll < 0.7) goals = collectKinds(3).map((k) => ({ type: 'collect', kind: k, count: between(rng, per[0], per[1]) }))
      else {
        ice = iceFrom(20, 26)
        goals = [{ type: 'ice' }]
      }
    }
  }
  return { level, difficulty, rows: ROWS, cols: COLS, kinds, pieces, goals, ...(holes.length ? { holes } : {}), ...(ice.length ? { ice } : {}) }
}

function winRate(level: Match3Level, games: number): number {
  let won = 0
  for (let i = 0; i < games; i++) if (playGreedy(level, seeded(900_000 + level.level * 101 + i * 7)).won) won++
  return won / games
}

/** 找满足目标通关率的最少步数（二分） */
function tuneMoves(draft: Omit<Match3Level, 'moves'>): { moves: number; rate: number } {
  const target = TARGET_WIN[draft.difficulty]
  let lo = 8
  let hi = MAX_MOVES + 5
  let best = { moves: hi, rate: winRate({ ...draft, moves: hi }, GAMES) }
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const rate = winRate({ ...draft, moves: mid }, GAMES)
    if (rate >= target) {
      best = { moves: mid, rate }
      hi = mid - 1
    } else lo = mid + 1
  }
  return best
}

/** 合适的步数范围：太少显得仓促，太多显得拖沓 */
const MIN_MOVES = 14
const MAX_MOVES = 40

const t0 = Date.now()
const levels: Match3Level[] = []
for (let i = 0; i < MATCH3_PATTERN.length; i++) {
  const level = i + 1
  const difficulty = MATCH3_PATTERN[i]
  let scale = 1
  let chosen: { draft: Omit<Match3Level, 'moves'>; moves: number; rate: number } | null = null
  for (let attempt = 0; attempt < 12 && !chosen; attempt++) {
    const draft = draftLevel(level, difficulty, seeded(level * 7919 + attempt * 104729), scale)
    const { moves, rate } = tuneMoves(draft)
    const ok = rate >= TARGET_WIN[difficulty] && moves >= MIN_MOVES && moves <= MAX_MOVES
    if (ok) chosen = { draft, moves, rate }
    else if (rate >= TARGET_WIN[difficulty] && moves < MIN_MOVES) scale *= 1.35 // 太快：加大目标
    else scale = Math.max(0.5, scale * 0.85) // 太难或步数太多：减小目标、换一种布局
  }
  if (!chosen) throw new Error(`第 ${level} 关多次尝试都没有调出合适的难度`)
  const { draft, moves, rate } = chosen
  // 图块图片不影响难度，最后统一分配：每关都有作者的 3 张头像
  levels.push({ ...draft, moves, pieces: piecesForLevel(level, draft.kinds) })
  const goalText = draft.goals.map((g) => (g.type === 'collect' ? `收集${g.count}` : g.type === 'score' ? `分数${g.target}` : `冰${draft.ice?.length}`)).join('+')
  console.log(`L${String(level).padStart(3)} ${difficulty.padEnd(6)} ${goalText.padEnd(18)} 步数 ${String(moves).padStart(2)}  机器人通关率 ${(rate * 100).toFixed(0)}%`)
}
writeFileSync(resolve(import.meta.dirname, '../src/minigames/match3/levels.json'), JSON.stringify(levels, null, 1) + '\n')
console.log(`完成：${levels.length} 关，用时 ${((Date.now() - t0) / 1000).toFixed(0)} 秒`)
