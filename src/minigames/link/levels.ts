// 连连看 100 关（2026-11-27 起）：简单 : 中等 : 困难 = 2 : 6 : 2，穿插排列。
// 原「中等」改为现在的简单，原「困难」改为现在的中等，新设计的困难加入「消除后图块滑动」规则。
// 关卡用固定随机种子生成，所有人玩到的布局相同；每局的图块摆放仍是随机的，并保证一定能消完。

import { LINK_PATTERN, type Difficulty } from '../difficulty'
import type { Gravity, LinkLayout, Pos } from './board'

export interface LinkLevel extends LinkLayout {
  level: number
  difficulty: Difficulty
}

/** 关卡集的版本：关卡整体更换时加 1，本机保存的通关记录随之清零（经验不受影响） */
export const LINK_LEVEL_SET = 2

const p = (r: number, c: number): Pos => ({ r, c })

function seeded(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

type Rng = () => number
const pick = <T>(rng: Rng, list: readonly T[]) => list[Math.floor(rng() * list.length)]

/** 8×7 棋盘的障碍格布局（偶数个，保证可放图块的格子数为偶数） */
const BLOCKS_8x7: Pos[][] = [
  [p(3, 3), p(4, 3), p(3, 2), p(4, 4)],
  [p(2, 2), p(2, 4), p(5, 2), p(5, 4), p(3, 3), p(4, 3)],
  [p(0, 3), p(7, 3), p(3, 0), p(4, 6)],
  [p(1, 1), p(1, 5), p(6, 1), p(6, 5)],
  [p(3, 1), p(4, 1), p(3, 5), p(4, 5), p(0, 3), p(7, 3)],
]

/** 9×7 棋盘的障碍格布局（奇数个，9×7=63，减去奇数个后为偶数） */
const BLOCKS_9x7: Pos[][] = [
  [p(4, 1), p(4, 3), p(4, 5), p(2, 3), p(6, 3)],
  [p(4, 3), p(2, 1), p(2, 5), p(6, 1), p(6, 5)],
  [p(0, 3), p(8, 3), p(4, 0), p(4, 6), p(4, 3)],
  [p(3, 2), p(3, 4), p(5, 2), p(5, 4), p(4, 3), p(1, 3), p(7, 3)],
  [p(4, 2), p(4, 3), p(4, 4)],
]

const GRAVITIES: Gravity[] = ['down', 'left', 'up', 'right']

function layoutFor(level: number, difficulty: Difficulty): LinkLayout {
  const rng = seeded(level * 7919 + 17)
  // 越往后越难一点：图块种类随关卡缓慢增加
  const progress = (level - 1) / 99
  if (difficulty === 'easy') {
    // 相当于原来的中等：6×6 到 8×6，8~11 种
    const size = pick(rng, [
      { rows: 6, cols: 6 },
      { rows: 7, cols: 6 },
      { rows: 8, cols: 6 },
    ] as const)
    return { ...size, types: 8 + Math.round(progress * 2) + (size.rows === 8 ? 1 : 0) }
  }
  if (difficulty === 'medium') {
    // 相当于原来的困难：8×7，12~14 种，4~6 个障碍格
    return { rows: 8, cols: 7, types: 12 + Math.round(progress * 2), blocks: pick(rng, BLOCKS_8x7) }
  }
  // 新的困难：9×7，14~16 种，障碍格，且消除后图块会滑动
  return { rows: 9, cols: 7, types: 14 + Math.round(progress * 2), blocks: pick(rng, BLOCKS_9x7), gravity: GRAVITIES[level % GRAVITIES.length] }
}

export const LINK_LEVELS: LinkLevel[] = LINK_PATTERN.map((difficulty, i) => ({ ...layoutFor(i + 1, difficulty), level: i + 1, difficulty }))

export const GRAVITY_LABEL: Record<Gravity, string> = {
  down: '图块会往下落',
  up: '图块会往上移',
  left: '图块会往左移',
  right: '图块会往右移',
}
