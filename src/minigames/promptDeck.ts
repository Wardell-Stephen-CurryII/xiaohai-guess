// 真心话 / 大冒险抽卡：随机出题、不重复，抽完一轮再重新开始。纯函数，便于测试。

import { shuffle, type Rng } from '../game/wordDeck'

export interface PromptBank {
  normal: string[]
  spicy: string[]
}

/** 已经抽过的题（存文字，题库更新后也能对上） */
export interface SeenPrompts {
  normal: string[]
  spicy: string[]
}

export interface Drawn {
  text: string
  spicy: boolean
}

function pickFrom(pool: string[], seen: string[], avoid: string | null, rng: Rng): { text: string; seen: string[] } {
  const poolSet = new Set(pool)
  let kept = seen.filter((x) => poolSet.has(x))
  let unseen = pool.filter((x) => !kept.includes(x))
  if (unseen.length === 0) {
    // 这一类抽完了，重新开始；尽量不和刚才那张相同
    kept = []
    unseen = pool.length > 1 && avoid ? pool.filter((x) => x !== avoid) : pool
  }
  const text = shuffle(unseen, rng)[0]
  return { text, seen: [...kept, text] }
}

/** 劲爆打开时只抽劲爆题，关闭时只抽普通题，两者不混合 */
export function drawPrompt(
  bank: PromptBank,
  spicyOn: boolean,
  seen: SeenPrompts,
  rng: Rng,
  current: string | null = null,
): { drawn: Drawn; seen: SeenPrompts } {
  if (spicyOn && bank.spicy.length > 0) {
    const r = pickFrom(bank.spicy, seen.spicy, current, rng)
    return { drawn: { text: r.text, spicy: true }, seen: { ...seen, spicy: r.seen } }
  }
  const r = pickFrom(bank.normal, seen.normal, current, rng)
  return { drawn: { text: r.text, spicy: false }, seen: { ...seen, normal: r.seen } }
}
