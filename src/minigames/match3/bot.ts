// 自动试玩机器人（只用于测试和关卡校准，不打包进游戏界面）。
// 贪心策略：每一步试遍所有有效交换，选让目标进度最多的一步。真人会更有策略，通关率通常比它高。

import type { Rng } from '../../game/wordDeck'
import { allGoalsDone, applyMove, createGame, findRuns, goalProgress, reshuffle, type GameState, type Goal, type Pos } from './engine'
import type { Match3Level } from './levels'

/** 列出所有有效的交换 */
export function listMoves(s: GameState): [Pos, Pos][] {
  const out: [Pos, Pos][] = []
  const g = s.grid
  for (let r = 0; r < g.length; r++)
    for (let c = 0; c < g[0].length; c++)
      for (const [dr, dc] of [
        [0, 1],
        [1, 0],
      ]) {
        const r2 = r + dr
        const c2 = c + dc
        if (r2 >= g.length || c2 >= g[0].length) continue
        const a = g[r][c]
        const b = g[r2][c2]
        if (!a || !b) continue
        if (a.special !== 'none' && b.special !== 'none') {
          out.push([{ r, c }, { r: r2, c: c2 }])
          continue
        }
        if (a.special === 'rainbow' || b.special === 'rainbow') {
          out.push([{ r, c }, { r: r2, c: c2 }])
          continue
        }
        g[r][c] = b
        g[r2][c2] = a
        if (findRuns(g).length > 0) out.push([{ r, c }, { r: r2, c: c2 }])
        g[r][c] = a
        g[r2][c2] = b
      }
  return out
}

function progressScore(s: GameState, goals: Goal[]): number {
  let n = 0
  for (const g of goals) {
    const { left } = goalProgress(s, g)
    n -= g.type === 'score' ? left / 30 : g.type === 'ice' ? left * 3 : left * 2
  }
  return n
}

export function playGreedy(level: Match3Level, rng: Rng): { won: boolean; movesLeft: number } {
  let s = createGame(level, rng)
  let evalSeed = 1
  const evalRng = () => {
    evalSeed = (evalSeed * 1664525 + 1013904223) % 4294967296
    return evalSeed / 4294967296
  }
  while (s.movesLeft > 0 && !allGoalsDone(s, level.goals)) {
    const moves = listMoves(s)
    if (moves.length === 0) {
      s = reshuffle(s, rng)
      continue
    }
    let best = moves[0]
    let bestScore = -Infinity
    for (const m of moves) {
      const r = applyMove(s, m[0], m[1], evalRng)
      if (!r.ok) continue
      const created = r.state.grid.flat().filter((p) => p && p.special !== 'none').length
      const v = progressScore(r.state, level.goals) + created * 1.5 + rng() * 0.01
      if (v > bestScore) {
        bestScore = v
        best = m
      }
    }
    const r = applyMove(s, best[0], best[1], rng)
    if (!r.ok) break
    s = r.state
  }
  return { won: allGoalsDone(s, level.goals), movesLeft: s.movesLeft }
}
