// 默认名字「形容词 + 动物」，以及会员改名的校验。

const ADJECTIVES = [
  '机智的', '快乐的', '淡定的', '勇敢的', '迷糊的', '元气的', '傲娇的', '佛系的', '可爱的', '酷酷的',
  '睡不醒的', '爱笑的', '认真的', '调皮的', '温柔的', '神秘的', '暴躁的', '害羞的', '聪明的', '慢吞吞的',
  '闪亮的', '热情的', '冷静的', '贪吃的', '无敌的', '优雅的', '机灵的', '憨憨的', '开心的', '幸运的',
]

const ANIMALS = [
  '柯基', '熊猫', '水獭', '考拉', '柴犬', '狐狸', '企鹅', '仓鼠', '海豚', '树懒',
  '刺猬', '羊驼', '小猫', '兔子', '松鼠', '浣熊', '鹦鹉', '长颈鹿', '小象', '老虎',
  '狮子', '海豹', '猫头鹰', '袋鼠', '河马', '斑马', '小鹿', '麋鹿', '小熊', '小狗',
]

export function generateName(rng: () => number = Math.random): string {
  const a = ADJECTIVES[Math.floor(rng() * ADJECTIVES.length)]
  const b = ANIMALS[Math.floor(rng() * ANIMALS.length)]
  return a + b
}

export const NAME_MAX = 10

export type NameCheck = { ok: true; name: string } | { ok: false; reason: string }

/** 去掉首尾空白和控制字符，1~10 个字 */
export function validateName(input: string): NameCheck {
  // 去掉控制字符和零宽、方向控制等不可见字符（有意匹配控制字符）
  // oxlint-disable-next-line no-control-regex
  const name = input.replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g, '').trim().replace(/\s+/g, ' ')
  const len = [...name].length
  if (len === 0) return { ok: false, reason: '名字不能为空' }
  if (len > NAME_MAX) return { ok: false, reason: `名字最多 ${NAME_MAX} 个字` }
  return { ok: true, name }
}
