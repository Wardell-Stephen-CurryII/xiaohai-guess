// 消消乐每关的图块：作者的 3 张头像每关都出现，其余用糖果补足。
// 图块用什么图片不影响难度（难度只和种类数有关），所以可以单独调整，不需要重新校准步数。

import { shuffle } from '../../game/wordDeck'

export const MATCH3_FACES = ['face-1', 'face-2', 'face-3']

/** 和头像的珊瑚色、蓝色、绿色底区分最明显的糖果排在前面 */
export const CANDY_PREFERENCE = ['candy-yellow', 'candy-purple', 'candy-red', 'candy-orange', 'candy-green', 'candy-blue']

function seeded(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

/** 给第 level 关分配 kinds 种图块：3 张头像 + 糖果，位置随关卡打乱（结果固定，可复现） */
export function piecesForLevel(level: number, kinds: number): string[] {
  const candies = CANDY_PREFERENCE.slice(0, Math.max(0, kinds - MATCH3_FACES.length))
  return shuffle([...MATCH3_FACES, ...candies].slice(0, kinds), seeded(level * 2654435761))
}
