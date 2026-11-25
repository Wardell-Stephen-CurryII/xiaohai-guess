export type Outcome = 'correct' | 'skip'

/** 一个主题对应一个词库文件，见设计文档 3.2 */
export interface Theme {
  id: string
  name: string
  /** 首页显示顺序，越小越靠前 */
  order: number
  words: string[]
}

/** 「混合」：从所有主题出题 */
export const MIXED_THEME_ID = 'mixed'

/** 牌堆中的一张牌。记录主题是为了在「混合」模式下也能按主题做跨局去重。 */
export interface Card {
  themeId: string
  text: string
}

export interface RoundRecord {
  card: Card
  outcome: Outcome
}

export type Sensitivity = 'low' | 'medium' | 'high'

export const DURATIONS_SEC = [60, 120, 180, 240, 300] as const
export type DurationSec = (typeof DURATIONS_SEC)[number]

export interface Settings {
  themeId: string
  durationSec: DurationSec
  soundOn: boolean
  sensitivity: Sensitivity
}

export const DEFAULT_SETTINGS: Settings = {
  themeId: MIXED_THEME_ID,
  durationSec: 60,
  soundOn: true,
  sensitivity: 'medium',
}

/** 每个主题已经出过的词，用于跨局去重 */
export type SeenMap = Record<string, string[]>
