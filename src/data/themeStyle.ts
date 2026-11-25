// 每个主题的颜色和配图。配图使用系统 emoji（iPhone 上是 Apple 的高清图片），不增加下载体积，离线可用。

import { MIXED_THEME_ID } from '../game/types'

export interface ThemeStyle {
  /** 主题卡片和出题画面的背景色（柔和色，深色文字在上面清晰可读） */
  color: string
  /** 三张相关配图 */
  art: [string, string, string]
}

const STYLES: Record<string, ThemeStyle> = {
  daily: { color: '#FFE3C7', art: ['🏠', '🪥', '☂️'] },
  songs: { color: '#FFD3E3', art: ['🎤', '🎧', '🎵'] },
  history: { color: '#EEDFC6', art: ['🏯', '📜', '⚔️'] },
  animals: { color: '#D2EDC4', art: ['🐼', '🦒', '🐧'] },
  food: { color: '#FFD8C4', art: ['🍜', '🍉', '🧋'] },
  movies: { color: '#D8D5FF', art: ['🎬', '🍿', '🎞️'] },
  people: { color: '#C9E6F8', art: ['🌟', '🎙️', '🏅'] },
  idioms: { color: '#F8E7B5', art: ['📖', '🖌️', '🀄'] },
  sports: { color: '#C3ECDD', art: ['⚽', '🏀', '🏓'] },
  places: { color: '#CFE0FF', art: ['🗺️', '🗼', '🏔️'] },
  games: { color: '#E7D6FB', art: ['🎮', '👾', '🃏'] },
  buzzwords: { color: '#FFF2AE', art: ['💬', '🔥', '😂'] },
  [MIXED_THEME_ID]: { color: '#FFFFFF', art: ['🎲', '🎉', '✨'] },
}

const FALLBACK: ThemeStyle = { color: '#ECE9F3', art: ['🎈', '🎈', '🎈'] }

export function themeStyle(id: string): ThemeStyle {
  return STYLES[id] ?? FALLBACK
}
