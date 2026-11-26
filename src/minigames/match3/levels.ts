// 消消乐 20 关。以后加关卡：在末尾追加一行即可。
// pieces：本关使用的图块（糖果或作者头像），collect 目标的 kind 是 pieces 里的下标。
// 难度靠步数、目标数量、图块种类（5 或 6）、冰块和空洞控制，由自动试玩测试校准（match3/levels.test.ts）。

import { DIFFICULTY_PATTERN, type Difficulty } from '../difficulty'
import type { Goal, Match3Setup, Pos } from './engine'

export interface Match3Level extends Match3Setup {
  level: number
  difficulty: Difficulty
  pieces: string[]
}

const p = (r: number, c: number): Pos => ({ r, c })
/** 矩形区域内的所有格子 */
const area = (r0: number, c0: number, r1: number, c1: number): Pos[] => {
  const out: Pos[] = []
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) out.push(p(r, c))
  return out
}
const corners = [p(0, 0), p(0, 7), p(7, 0), p(7, 7)]

const C5 = ['candy-red', 'candy-orange', 'candy-yellow', 'candy-green', 'candy-blue']
const C6 = [...C5, 'candy-purple']
const collect = (kind: number, count: number): Goal => ({ type: 'collect', kind, count })

type Draft = Omit<Match3Level, 'level' | 'difficulty' | 'rows' | 'cols'> & { rows?: number; cols?: number }

const DRAFTS: Draft[] = [
  // 1 简单：收集红心
  { kinds: 5, pieces: C5, moves: 20, goals: [collect(0, 25)] },
  // 2 简单：两种各 15
  { kinds: 5, pieces: C5, moves: 22, goals: [collect(2, 22), collect(4, 22)] },
  // 3 中等：分数
  { kinds: 6, pieces: C6, moves: 24, goals: [{ type: 'score', target: 2800 }] },
  // 4 简单：收集小嗨一号
  { kinds: 5, pieces: ['face-1', ...C5.slice(1)], moves: 20, goals: [collect(0, 22)] },
  // 5 简单
  { kinds: 5, pieces: C5, moves: 20, goals: [collect(3, 30)] },
  // 6 中等：中间 8 块冰
  { kinds: 6, pieces: C6, moves: 18, ice: area(3, 1, 4, 6), goals: [{ type: 'ice' }] },
  // 7 简单
  { kinds: 5, pieces: C5, moves: 22, goals: [collect(1, 26), collect(0, 26)] },
  // 8 困难：四角空洞 + 16 块冰
  { kinds: 6, pieces: C6, moves: 18, holes: corners, ice: [...area(2, 1, 3, 6), ...area(4, 1, 5, 6)].filter((_, i) => i % 3 !== 2), goals: [{ type: 'ice' }, collect(5, 15)] },
  // 9 简单：收集小嗨二号
  { kinds: 5, pieces: [C5[0], 'face-2', ...C5.slice(2)], moves: 20, goals: [collect(1, 22)] },
  // 10 中等：三种各 15
  { kinds: 6, pieces: C6, moves: 26, goals: [collect(0, 22), collect(2, 22), collect(4, 22)] },
  // 11 简单：分数
  { kinds: 5, pieces: C5, moves: 20, goals: [{ type: 'score', target: 3200 }] },
  // 12 简单：6 块冰
  { kinds: 5, pieces: C5, moves: 18, ice: [...area(3, 2, 3, 6), ...area(4, 2, 4, 6)], goals: [{ type: 'ice' }] },
  // 13 中等：十字空洞
  { kinds: 6, pieces: C6, moves: 25, holes: [p(3, 3), p(3, 4), p(4, 3), p(4, 4)], goals: [collect(1, 18), collect(3, 18)] },
  // 14 简单：收集小嗨三号
  { kinds: 5, pieces: [...C5.slice(0, 2), 'face-3', ...C5.slice(3)], moves: 20, goals: [collect(2, 22)] },
  // 15 困难：20 块冰 + 收集红心
  { kinds: 6, pieces: C6, moves: 24, ice: [...area(1, 1, 2, 6), ...area(5, 1, 6, 6)].slice(0, 20), goals: [{ type: 'ice' }, collect(0, 20)] },
  // 16 中等：分数
  { kinds: 6, pieces: C6, moves: 27, goals: [{ type: 'score', target: 3000 }] },
  // 17 简单
  { kinds: 5, pieces: C5, moves: 22, goals: [collect(4, 24), collect(3, 24)] },
  // 18 中等：一圈 12 块冰
  { kinds: 6, pieces: C6, moves: 16, ice: [...area(2, 2, 2, 5), ...area(5, 2, 5, 5), p(3, 2), p(4, 2), p(3, 5), p(4, 5)], goals: [{ type: 'ice' }] },
  // 19 简单：三张头像各 8 个
  { kinds: 5, pieces: ['face-1', 'face-2', 'face-3', 'candy-blue', 'candy-green'], moves: 20, goals: [collect(0, 14), collect(1, 14), collect(2, 14)] },
  // 20 困难：空洞 + 18 块冰 + 收集
  { kinds: 6, pieces: C6, moves: 22, holes: [...corners, p(0, 3), p(0, 4)], ice: [...area(3, 0, 4, 7), p(2, 3), p(2, 4)], goals: [{ type: 'ice' }, collect(2, 18)] },
]

export const MATCH3_LEVELS: Match3Level[] = DRAFTS.map((d, i) => ({
  rows: 8,
  cols: 8,
  ...d,
  level: i + 1,
  difficulty: DIFFICULTY_PATTERN[i],
}))
