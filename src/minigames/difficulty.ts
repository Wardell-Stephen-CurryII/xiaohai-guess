// 小游戏关卡难度。连连看、消消乐现在都是 100 关，简单 : 中等 : 困难 = 2 : 6 : 2（PATTERN_100）；
// DIFFICULTY_PATTERN 是最早 20 关版本的分布，保留作记录。

export type Difficulty = 'easy' | 'medium' | 'hard'

export const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: '简单', medium: '中等', hard: '困难' }

/** 首次通关奖励的经验值 */
export const CLEAR_XP: Record<Difficulty, number> = { easy: 15, medium: 15, hard: 30 }

/** 第 1~20 关的难度 */
export const DIFFICULTY_PATTERN: Difficulty[] = [
  'easy', 'easy', 'medium', 'easy', 'easy', 'medium', 'easy', 'hard', 'easy', 'medium',
  'easy', 'easy', 'medium', 'easy', 'hard', 'medium', 'easy', 'medium', 'easy', 'hard',
]

/**
 * 100 关的难度（2026-11-27 调整，消消乐和连连看共用）：简单 : 中等 : 困难 = 2 : 6 : 2。
 * 每 10 关一组，组内 2 简单、6 中等、2 困难穿插排列，每组顺序略有不同；第 1 关一定是简单。
 */
const MATCH3_BLOCKS: Difficulty[][] = [
  ['easy', 'medium', 'medium', 'hard', 'medium', 'easy', 'medium', 'medium', 'hard', 'medium'],
  ['easy', 'medium', 'medium', 'medium', 'hard', 'medium', 'easy', 'medium', 'medium', 'hard'],
  ['easy', 'medium', 'hard', 'medium', 'medium', 'easy', 'medium', 'hard', 'medium', 'medium'],
  ['easy', 'medium', 'medium', 'hard', 'easy', 'medium', 'medium', 'medium', 'hard', 'medium'],
  ['easy', 'medium', 'hard', 'medium', 'medium', 'medium', 'easy', 'medium', 'hard', 'medium'],
]
export const PATTERN_100: Difficulty[] = Array.from({ length: 10 }, (_, i) => MATCH3_BLOCKS[i % MATCH3_BLOCKS.length]).flat()

/** 消消乐、连连看都用 100 关 2 : 6 : 2 的分布 */
export const MATCH3_PATTERN = PATTERN_100
export const LINK_PATTERN = PATTERN_100
