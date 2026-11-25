// 出题牌堆与跨局去重，见设计文档 3.2。纯函数，随机数生成器由调用方传入。

import { MIXED_THEME_ID, type Card, type SeenMap, type Theme } from './types'

export type Rng = () => number

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** 所选主题包含的主题列表；「混合」返回全部主题 */
export function themesFor(themes: readonly Theme[], themeId: string): Theme[] {
  if (themeId === MIXED_THEME_ID) return [...themes]
  return themes.filter((t) => t.id === themeId)
}

/** 所选主题的词条总数 */
export function wordCount(themes: readonly Theme[], themeId: string): number {
  return themesFor(themes, themeId).reduce((n, t) => n + t.words.length, 0)
}

/**
 * 生成一局的牌堆：没出过的词洗牌后排在前面，出过的词洗牌后排在后面。
 * 牌堆包含所选主题的全部词，一局内不重复；一局用完整个牌堆时从头循环（见 nextIndex）。
 */
export function createDeck(themes: readonly Theme[], themeId: string, seen: SeenMap, rng: Rng): Card[] {
  const fresh: Card[] = []
  const used: Card[] = []
  for (const theme of themesFor(themes, themeId)) {
    const seenSet = new Set(seen[theme.id] ?? [])
    for (const text of theme.words) {
      ;(seenSet.has(text) ? used : fresh).push({ themeId: theme.id, text })
    }
  }
  return [...shuffle(fresh, rng), ...shuffle(used, rng)]
}

/** 下一张牌的位置。牌堆用完时从头循环。 */
export function nextIndex(deck: readonly Card[], index: number): number {
  return deck.length === 0 ? 0 : (index + 1) % deck.length
}

/**
 * 把本局出现过的词记入已出词表。
 * 某个主题的词全部出过之后，清空该主题的记录，下一轮重新开始。
 */
export function markSeen(themes: readonly Theme[], seen: SeenMap, shown: readonly Card[]): SeenMap {
  const next: SeenMap = {}
  for (const [id, words] of Object.entries(seen)) next[id] = [...words]
  for (const card of shown) {
    const list = (next[card.themeId] ??= [])
    if (!list.includes(card.text)) list.push(card.text)
  }
  for (const theme of themes) {
    const list = next[theme.id]
    if (!list) continue
    const valid = new Set(theme.words)
    // 词库更新后已删除的词不再保留
    const kept = list.filter((w) => valid.has(w))
    next[theme.id] = kept.length >= theme.words.length ? [] : kept
  }
  return next
}
