// 个人资料与会员，见设计文档「个人资料与 VIP」。

export type Tier = 'free' | 'vip' | 'svip'

export const TIER_RANK: Record<Tier, number> = { free: 0, vip: 1, svip: 2 }

export interface Stats {
  games: number
  correct: number
  skipped: number
  bestScore: number
  playMs: number
  /** 玩过的主题（按词所属主题统计，「混合」也算） */
  themesPlayed: string[]
  /** 各主题累计答对数 */
  correctByTheme: Record<string, number>
}

/** 当前佩戴的装扮（都是 catalog 里的 id） */
export interface Look {
  avatar: string
  frame: string
  title: string
  worn: string[]
  decoration: string
  palette: string
  nameStyle: string
}

export interface Profile {
  name: string
  xp: number
  stats: Stats
  /** 已获得的成就徽章 */
  badges: string[]
  look: Look
}

/** 已激活的会员。lastVerifiedAt 超过 30 天会暂停，联网核对后恢复 */
export interface VipState {
  code: string
  tier: 'vip' | 'svip'
  activatedAt: number
  lastVerifiedAt: number
}

export const EMPTY_STATS: Stats = {
  games: 0,
  correct: 0,
  skipped: 0,
  bestScore: 0,
  playMs: 0,
  themesPlayed: [],
  correctByTheme: {},
}

export const DEFAULT_LOOK: Look = {
  avatar: 'chick',
  frame: 'plain',
  title: 'lv1',
  worn: [],
  decoration: 'none',
  palette: 'default',
  nameStyle: 'plain',
}
