// 连连看 20 关。以后加关卡：在末尾追加一行即可。
// 难度靠棋盘大小、图块种类和障碍格控制；可放图块的格子数必须是偶数。

import { DIFFICULTY_PATTERN, type Difficulty } from '../difficulty'
import type { LinkLayout, Pos } from './board'

export interface LinkLevel extends LinkLayout {
  level: number
  difficulty: Difficulty
}

const p = (r: number, c: number): Pos => ({ r, c })

const LAYOUTS: LinkLayout[] = [
  { rows: 4, cols: 4, types: 6 },
  { rows: 5, cols: 4, types: 6 },
  { rows: 6, cols: 6, types: 8 },
  { rows: 6, cols: 4, types: 6 },
  { rows: 5, cols: 6, types: 6 },
  { rows: 7, cols: 6, types: 9 },
  { rows: 6, cols: 5, types: 6 },
  { rows: 8, cols: 7, types: 12, blocks: [p(3, 3), p(4, 3), p(3, 2), p(4, 4)] },
  { rows: 6, cols: 6, types: 7 },
  { rows: 8, cols: 6, types: 10 },
  { rows: 6, cols: 6, types: 6 },
  { rows: 7, cols: 4, types: 7 },
  { rows: 7, cols: 6, types: 9, blocks: [p(3, 2), p(3, 3)] },
  { rows: 6, cols: 5, types: 7 },
  { rows: 8, cols: 7, types: 13, blocks: [p(2, 2), p(2, 4), p(5, 2), p(5, 4), p(3, 3), p(4, 3)] },
  { rows: 8, cols: 6, types: 10 },
  { rows: 6, cols: 6, types: 8 },
  { rows: 8, cols: 6, types: 11, blocks: [p(0, 0), p(7, 5)] },
  { rows: 7, cols: 6, types: 8 },
  { rows: 9, cols: 7, types: 14, blocks: [p(4, 1), p(4, 3), p(4, 5), p(2, 3), p(6, 3)] },
]

export const LINK_LEVELS: LinkLevel[] = LAYOUTS.map((l, i) => ({ ...l, level: i + 1, difficulty: DIFFICULTY_PATTERN[i] }))
