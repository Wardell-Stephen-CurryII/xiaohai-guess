// 消消乐 100 关（2026-11-27 起）：简单 : 中等 : 困难 = 2 : 6 : 2，穿插排列。
// 关卡由 scripts/gen-match3-levels.ts 生成（npm run gen:match3），步数用自动试玩机器人校准，
// 结果保存在 levels.json，所有人玩到的关卡相同。要加关卡或调整难度，改生成脚本后重新生成。
// pieces：本关使用的图块（糖果或作者头像），collect 目标的 kind 是 pieces 里的下标。

import type { Difficulty } from '../difficulty'
import type { Match3Setup } from './engine'
import data from './levels.json'

export interface Match3Level extends Match3Setup {
  level: number
  difficulty: Difficulty
  pieces: string[]
}

export const MATCH3_LEVELS = data as Match3Level[]

/** 关卡集的版本：关卡整体更换时加 1，本机保存的星数随之清零（经验不受影响） */
export const MATCH3_LEVEL_SET = 2
