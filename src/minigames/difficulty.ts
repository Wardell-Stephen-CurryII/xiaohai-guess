// 小游戏关卡难度：简单最多、困难最少，穿插排列（每个游戏 20 关：简单 11、中等 6、困难 3）。

export type Difficulty = 'easy' | 'medium' | 'hard'

export const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: '简单', medium: '中等', hard: '困难' }

/** 首次通关奖励的经验值 */
export const CLEAR_XP: Record<Difficulty, number> = { easy: 15, medium: 15, hard: 30 }

/** 第 1~20 关的难度 */
export const DIFFICULTY_PATTERN: Difficulty[] = [
  'easy', 'easy', 'medium', 'easy', 'easy', 'medium', 'easy', 'hard', 'easy', 'medium',
  'easy', 'easy', 'medium', 'easy', 'hard', 'medium', 'easy', 'medium', 'easy', 'hard',
]
