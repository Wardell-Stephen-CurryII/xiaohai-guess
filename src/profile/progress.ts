// 经验、等级、统计和成就。一局结束时调用 applyRound。

import type { Card } from '../game/types'
import { LEVELS } from './catalog'
import type { Profile } from './types'

export const XP_PER_GAME = 20
export const XP_PER_CORRECT = 10

export interface LevelInfo {
  level: number
  title: string
  xp: number
  /** 当前等级的起点经验 */
  floor: number
  /** 下一级所需经验；满级为 null */
  next: number | null
  /** 当前等级内的进度 0~1 */
  progress: number
}

export function levelFor(xp: number): LevelInfo {
  let idx = 0
  for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i].xp) idx = i
  const cur = LEVELS[idx]
  const nxt = LEVELS[idx + 1] ?? null
  return {
    level: cur.level,
    title: cur.title,
    xp,
    floor: cur.xp,
    next: nxt ? nxt.xp : null,
    progress: nxt ? (xp - cur.xp) / (nxt.xp - cur.xp) : 1,
  }
}

export interface RoundInput {
  correct: Card[]
  skipped: Card[]
  durationSec: number
  /** 是否在暂停菜单中提前结束 */
  endedEarly: boolean
  playedMs: number
  /** 结束时的本地小时（0~23） */
  hour: number
  /** 全部主题 id，用于判断「全主题制霸」 */
  allThemeIds: readonly string[]
}

export interface RoundReward {
  profile: Profile
  xpGained: number
  newBadges: string[]
  levelUp: { from: number; to: number; title: string } | null
}

/** 本局可能新获得的成就（不含已拥有的） */
export function earnedBadges(p: Profile, r: RoundInput): string[] {
  const s = p.stats
  const n = r.correct.length
  const got: string[] = []
  if (s.games >= 1) got.push('first')
  if (n >= 10) got.push('ten')
  if (s.correct >= 100) got.push('hundred')
  if (s.correct >= 1000) got.push('thousand')
  if (n >= 5 && r.skipped.length === 0) got.push('clean')
  if (r.durationSec === 60 && !r.endedEarly && n >= 15) got.push('speed')
  if (r.durationSec === 300 && !r.endedEarly) got.push('marathon')
  if (r.hour >= 23 || r.hour < 4) got.push('night')
  if (r.hour >= 5 && r.hour < 7) got.push('early')
  if (r.allThemeIds.length > 0 && r.allThemeIds.every((id) => s.themesPlayed.includes(id))) got.push('all-themes')
  if ((s.correctByTheme.idioms ?? 0) >= 100) got.push('idiom-master')
  if ((s.correctByTheme.songs ?? 0) >= 100) got.push('song-king')
  return got.filter((id) => !p.badges.includes(id))
}

/** 把一局的结果计入资料。没有翻过任何词的局只记时长，不算局数和经验（避免刷经验）。 */
export function applyRound(p: Profile, r: RoundInput): RoundReward {
  const answered = r.correct.length + r.skipped.length
  const counted = answered > 0
  const xpGained = counted ? (r.endedEarly ? 0 : XP_PER_GAME) + r.correct.length * XP_PER_CORRECT : 0

  const correctByTheme = { ...p.stats.correctByTheme }
  for (const c of r.correct) correctByTheme[c.themeId] = (correctByTheme[c.themeId] ?? 0) + 1
  const themesPlayed = [...p.stats.themesPlayed]
  for (const c of [...r.correct, ...r.skipped]) if (!themesPlayed.includes(c.themeId)) themesPlayed.push(c.themeId)

  const next: Profile = {
    ...p,
    xp: p.xp + xpGained,
    stats: {
      games: p.stats.games + (counted ? 1 : 0),
      correct: p.stats.correct + r.correct.length,
      skipped: p.stats.skipped + r.skipped.length,
      bestScore: Math.max(p.stats.bestScore, r.correct.length),
      playMs: p.stats.playMs + Math.max(0, r.playedMs),
      themesPlayed,
      correctByTheme,
    },
  }
  const newBadges = counted ? earnedBadges(next, r) : []
  next.badges = [...p.badges, ...newBadges]

  const before = levelFor(p.xp)
  const after = levelFor(next.xp)
  return {
    profile: next,
    xpGained,
    newBadges,
    levelUp: after.level > before.level ? { from: before.level, to: after.level, title: after.title } : null,
  }
}
