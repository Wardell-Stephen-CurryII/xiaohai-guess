// 所有装扮的定义表：头像、头像框、称号、徽章、装饰、配色、名字样式。
// tier 是佩戴所需的最低会员等级。

import { TIER_RANK, type Look, type Tier } from './types'

export interface AvatarDef {
  id: string
  emoji: string
  /** 底色，可以是颜色或渐变 */
  bg: string
  tier: Tier
}

export const AVATARS: AvatarDef[] = [
  // 普通
  { id: 'chick', emoji: '🐣', bg: '#FFE9A8', tier: 'free' },
  { id: 'dog', emoji: '🐶', bg: '#FFE3C7', tier: 'free' },
  { id: 'cat', emoji: '🐱', bg: '#FFD8C4', tier: 'free' },
  // VIP
  { id: 'panda', emoji: '🐼', bg: '#D2EDC4', tier: 'vip' },
  { id: 'koala', emoji: '🐨', bg: '#DCE3EA', tier: 'vip' },
  { id: 'fox', emoji: '🦊', bg: '#FFD8B8', tier: 'vip' },
  { id: 'tiger', emoji: '🐯', bg: '#FFE7B0', tier: 'vip' },
  { id: 'lion', emoji: '🦁', bg: '#FFE2A8', tier: 'vip' },
  { id: 'rabbit', emoji: '🐰', bg: '#FFD3E3', tier: 'vip' },
  { id: 'bear', emoji: '🐻', bg: '#EEDFC6', tier: 'vip' },
  { id: 'frog', emoji: '🐸', bg: '#C3ECDD', tier: 'vip' },
  { id: 'monkey', emoji: '🐵', bg: '#F1DEC8', tier: 'vip' },
  { id: 'penguin', emoji: '🐧', bg: '#C9E6F8', tier: 'vip' },
  { id: 'hamster', emoji: '🐹', bg: '#FFE3C7', tier: 'vip' },
  { id: 'octopus', emoji: '🐙', bg: '#FFD3E3', tier: 'vip' },
  { id: 'owl', emoji: '🦉', bg: '#EEDFC6', tier: 'vip' },
  { id: 'ghost', emoji: '👻', bg: '#E7D6FB', tier: 'vip' },
  { id: 'cool', emoji: '😎', bg: '#FFF2AE', tier: 'vip' },
  // SVIP
  { id: 'dragon-face', emoji: '🐲', bg: '#C3ECDD', tier: 'svip' },
  { id: 'whale', emoji: '🐳', bg: '#CFE0FF', tier: 'svip' },
  { id: 'trex', emoji: '🦖', bg: '#D2EDC4', tier: 'svip' },
  { id: 'alien', emoji: '👽', bg: '#D8D5FF', tier: 'svip' },
  { id: 'pumpkin', emoji: '🎃', bg: '#FFD8C4', tier: 'svip' },
  { id: 'cowboy', emoji: '🤠', bg: '#F8E7B5', tier: 'svip' },
  { id: 'ninja', emoji: '🥷', bg: '#DCE3EA', tier: 'svip' },
  { id: 'wizard', emoji: '🧙', bg: '#E7D6FB', tier: 'svip' },
  { id: 'hero', emoji: '🦸', bg: '#FFD3E3', tier: 'svip' },
  { id: 'clown', emoji: '🤡', bg: '#FFF2AE', tier: 'svip' },
  // SVIP 专属底色
  { id: 'gold-dragon', emoji: '🐉', bg: 'linear-gradient(135deg, #FFE38A, #E0A526)', tier: 'svip' },
  { id: 'star-unicorn', emoji: '🦄', bg: 'radial-gradient(circle at 30% 30%, #6B5BD6, #1E1B4B)', tier: 'svip' },
  { id: 'neon-robot', emoji: '🤖', bg: 'linear-gradient(135deg, #22D3EE, #E879F9)', tier: 'svip' },
]

export interface FrameDef {
  id: string
  name: string
  tier: Tier
  /** 点缀 emoji 及位置 */
  ornament?: { emoji: string; at: 'top' | 'bottom' | 'corner' }
  animated?: boolean
}

export const FRAMES: FrameDef[] = [
  { id: 'plain', name: '默认', tier: 'free' },
  { id: 'silver', name: '银边', tier: 'free' },
  { id: 'gold', name: '金边', tier: 'vip' },
  { id: 'rainbow', name: '彩虹', tier: 'vip' },
  { id: 'sakura', name: '樱花', tier: 'vip', ornament: { emoji: '🌸', at: 'corner' } },
  { id: 'ice', name: '冰晶', tier: 'vip', ornament: { emoji: '❄️', at: 'corner' } },
  { id: 'fire', name: '火焰', tier: 'vip', ornament: { emoji: '🔥', at: 'bottom' } },
  { id: 'jade', name: '国风', tier: 'vip', ornament: { emoji: '🏮', at: 'corner' } },
  { id: 'neon', name: '霓虹', tier: 'svip', animated: true },
  { id: 'galaxy', name: '银河', tier: 'svip' },
  { id: 'crown', name: '皇冠', tier: 'svip', ornament: { emoji: '👑', at: 'top' } },
  { id: 'pixel', name: '像素', tier: 'svip', ornament: { emoji: '👾', at: 'corner' } },
]

export type TitleRarity = 'level' | 'rare' | 'epic' | 'legend'

export interface TitleDef {
  id: string
  name: string
  rarity: TitleRarity
  tier: Tier
  /** 等级称号需要达到的等级 */
  minLevel?: number
}

/** 等级与称号：经验达到 xp 即升到该级 */
export const LEVELS: { level: number; xp: number; title: string }[] = [
  { level: 1, xp: 0, title: '猜词萌新' },
  { level: 2, xp: 100, title: '初来乍嗨' },
  { level: 3, xp: 300, title: '比划学徒' },
  { level: 4, xp: 600, title: '嘴替上线' },
  { level: 5, xp: 1000, title: '默契担当' },
  { level: 6, xp: 1600, title: '猜词达人' },
  { level: 7, xp: 2500, title: '气氛组长' },
  { level: 8, xp: 4000, title: '一点就通' },
  { level: 9, xp: 6000, title: '嗨场王者' },
  { level: 10, xp: 9000, title: '猜神本神' },
]

const RARE = ['气氛担当', '灵魂画手', '戏精本精', '嘴强王者', '夸夸群主', '人间显眼包', '表情包本包', '反应神速']
const EPIC = ['猜词刺客', '默契天花板', '比划艺术家', '读心术大师', '派对发动机', '欢乐制造机', '词库行走者', '全场最佳辅助']
const LEGEND = ['小嗨代言人', '猜词之神', '嗨翻全场', '宇宙最强大脑', '永远的C位', '传说中的老板']

export const TITLES: TitleDef[] = [
  ...LEVELS.map((l) => ({ id: `lv${l.level}`, name: l.title, rarity: 'level' as const, tier: 'free' as const, minLevel: l.level })),
  ...RARE.map((name, i) => ({ id: `rare${i + 1}`, name, rarity: 'rare' as const, tier: 'vip' as const })),
  ...EPIC.map((name, i) => ({ id: `epic${i + 1}`, name, rarity: 'epic' as const, tier: 'vip' as const })),
  ...LEGEND.map((name, i) => ({ id: `legend${i + 1}`, name, rarity: 'legend' as const, tier: 'svip' as const })),
]

export const RARITY_LABEL: Record<TitleRarity, string> = { level: '等级', rare: '稀有', epic: '史诗', legend: '传说' }

export interface BadgeDef {
  id: string
  name: string
  emoji: string
  /** 获得条件说明 */
  desc: string
  /** 奖章底色渐变 */
  colors: [string, string]
  /** achievement：玩出来的；member：会员自动获得 */
  kind: 'achievement' | 'member'
  /** 会员徽章所需等级 */
  tier?: 'vip' | 'svip'
  shiny?: boolean
}

export const BADGES: BadgeDef[] = [
  { id: 'first', name: '初次登场', emoji: '🎉', desc: '完成第一局', colors: ['#FFE38A', '#F59E0B'], kind: 'achievement' },
  { id: 'ten', name: '十连对', emoji: '🔟', desc: '一局答对 10 个', colors: ['#A7F3D0', '#10B981'], kind: 'achievement' },
  { id: 'hundred', name: '百词斩', emoji: '💯', desc: '累计答对 100 个', colors: ['#FECACA', '#EF4444'], kind: 'achievement' },
  { id: 'thousand', name: '千词王', emoji: '🏆', desc: '累计答对 1000 个', colors: ['#FDE68A', '#D97706'], kind: 'achievement' },
  { id: 'clean', name: '零跳过', emoji: '🎯', desc: '一局答对至少 5 个且没有跳过', colors: ['#BFDBFE', '#3B82F6'], kind: 'achievement' },
  { id: 'speed', name: '手速王', emoji: '⚡', desc: '1 分钟一局答对 15 个', colors: ['#FEF08A', '#EAB308'], kind: 'achievement' },
  { id: 'marathon', name: '马拉松', emoji: '🏃', desc: '玩完一局 5 分钟', colors: ['#C7D2FE', '#6366F1'], kind: 'achievement' },
  { id: 'night', name: '夜猫子', emoji: '🦉', desc: '晚上 11 点后玩一局', colors: ['#C4B5FD', '#4C1D95'], kind: 'achievement' },
  { id: 'early', name: '早起鸟', emoji: '🐦', desc: '早上 7 点前玩一局', colors: ['#BAE6FD', '#0EA5E9'], kind: 'achievement' },
  { id: 'all-themes', name: '全主题制霸', emoji: '🌈', desc: '12 个主题都猜过', colors: ['#FBCFE8', '#A855F7'], kind: 'achievement' },
  { id: 'idiom-master', name: '成语大师', emoji: '📜', desc: '成语主题累计答对 100 个', colors: ['#FDE68A', '#B45309'], kind: 'achievement' },
  { id: 'song-king', name: '歌王', emoji: '🎤', desc: '歌曲主题累计答对 100 个', colors: ['#FBCFE8', '#DB2777'], kind: 'achievement' },
  { id: 'milktea', name: '奶茶支持者', emoji: '🧋', desc: 'VIP 会员', colors: ['#FDE7C8', '#C08A4B'], kind: 'member', tier: 'vip' },
  { id: 'pioneer', name: '首批支持者', emoji: '🌟', desc: '2026 年内开通会员', colors: ['#FEF3C7', '#F59E0B'], kind: 'member', tier: 'vip' },
  { id: 'diamond', name: '钻石会员', emoji: '💎', desc: 'SVIP 会员', colors: ['#CFFAFE', '#0891B2'], kind: 'member', tier: 'svip', shiny: true },
  { id: 'crown', name: '嗨王之冠', emoji: '👑', desc: 'SVIP 会员', colors: ['#FFE38A', '#B45309'], kind: 'member', tier: 'svip', shiny: true },
]

export interface DecorationDef {
  id: string
  name: string
  tier: Tier
  /** 撒在背景上的元素 */
  items: string[]
  /** 动画方式 */
  motion: 'none' | 'twinkle' | 'fall' | 'rise' | 'drift' | 'burst'
}

export const DECORATIONS: DecorationDef[] = [
  { id: 'none', name: '无', tier: 'free', items: [], motion: 'none' },
  { id: 'confetti', name: '彩带', tier: 'free', items: ['🎊', '🎉'], motion: 'none' },
  { id: 'stars', name: '星空', tier: 'vip', items: ['✨', '⭐'], motion: 'twinkle' },
  { id: 'balloons', name: '气球', tier: 'vip', items: ['🎈'], motion: 'rise' },
  { id: 'bubbles', name: '泡泡', tier: 'vip', items: ['🫧'], motion: 'rise' },
  { id: 'hearts', name: '爱心', tier: 'vip', items: ['💖', '💕'], motion: 'drift' },
  { id: 'sakura', name: '樱花飘落', tier: 'svip', items: ['🌸'], motion: 'fall' },
  { id: 'snow', name: '雪花', tier: 'svip', items: ['❄️'], motion: 'fall' },
  { id: 'clouds', name: '国风祥云', tier: 'svip', items: ['☁️', '🏮'], motion: 'drift' },
  { id: 'pixel', name: '像素星星', tier: 'svip', items: ['👾', '⭐'], motion: 'twinkle' },
  { id: 'fireworks', name: '烟花', tier: 'svip', items: ['🎆', '🎇'], motion: 'burst' },
]

export interface PaletteDef {
  id: string
  name: string
  tier: Tier
  dark: boolean
  bg: string
  surface: string
  ink: string
  inkSoft: string
  line: string
  brand: string
  /** 主要按钮 */
  primaryBg: string
  primaryFg: string
}

export const PALETTES: PaletteDef[] = [
  { id: 'default', name: '默认', tier: 'free', dark: false, bg: '#F5F3F8', surface: '#FFFFFF', ink: '#1F1C2C', inkSoft: '#6F6B80', line: '#E4E0EC', brand: '#1E2B45', primaryBg: '#1F1C2C', primaryFg: '#FFFFFF' },
  { id: 'night', name: '夜间', tier: 'free', dark: true, bg: '#14151C', surface: '#1F2029', ink: '#ECEBF2', inkSoft: '#9A98AA', line: '#2E2F3A', brand: '#ECEBF2', primaryBg: '#ECEBF2', primaryFg: '#14151C' },
  { id: 'mint', name: '薄荷', tier: 'vip', dark: false, bg: '#EEF7F3', surface: '#FFFFFF', ink: '#14332A', inkSoft: '#5D7A70', line: '#D5E9E1', brand: '#16624B', primaryBg: '#16624B', primaryFg: '#FFFFFF' },
  { id: 'sea', name: '海盐蓝', tier: 'vip', dark: false, bg: '#EEF3FA', surface: '#FFFFFF', ink: '#14233D', inkSoft: '#5F6E86', line: '#D8E2F0', brand: '#1E4B8F', primaryBg: '#1E4B8F', primaryFg: '#FFFFFF' },
  { id: 'milktea', name: '奶茶', tier: 'vip', dark: false, bg: '#F7F0E8', surface: '#FFFCF8', ink: '#3A2A1E', inkSoft: '#85705E', line: '#EADDCD', brand: '#7A5433', primaryBg: '#7A5433', primaryFg: '#FFFFFF' },
  { id: 'sakura', name: '樱花', tier: 'vip', dark: false, bg: '#FBF0F3', surface: '#FFFFFF', ink: '#3B1F2B', inkSoft: '#8A6674', line: '#F1DCE3', brand: '#A63D62', primaryBg: '#A63D62', primaryFg: '#FFFFFF' },
  { id: 'matcha', name: '抹茶', tier: 'vip', dark: false, bg: '#F1F4EA', surface: '#FFFFFF', ink: '#26311B', inkSoft: '#6C7760', line: '#DFE6D3', brand: '#4F6B2C', primaryBg: '#4F6B2C', primaryFg: '#FFFFFF' },
  { id: 'blackgold', name: '黑金', tier: 'svip', dark: true, bg: '#0F0E0C', surface: '#1C1A16', ink: '#F3E6C4', inkSoft: '#A89B7C', line: '#2F2B22', brand: '#E3B85C', primaryBg: '#E3B85C', primaryFg: '#14120E' },
  { id: 'starry', name: '星夜紫', tier: 'svip', dark: true, bg: '#151229', surface: '#221D3D', ink: '#EEEAFE', inkSoft: '#A39CC7', line: '#332C58', brand: '#B9A6FF', primaryBg: '#B9A6FF', primaryFg: '#151229' },
]

export interface NameStyleDef {
  id: string
  name: string
  tier: Tier
}

export const NAME_STYLES: NameStyleDef[] = [
  { id: 'plain', name: '普通', tier: 'free' },
  { id: 'gold', name: '金色', tier: 'svip' },
  { id: 'rainbow', name: '彩虹', tier: 'svip' },
  { id: 'neon', name: '霓虹', tier: 'svip' },
]

/** 每个等级能同时佩戴的徽章数 */
export const WORN_LIMIT: Record<Tier, number> = { free: 1, vip: 2, svip: 3 }

// ---- 解锁判断 ----

export interface UnlockContext {
  tier: Tier
  level: number
  /** 已获得的成就徽章 */
  badges: readonly string[]
  /** 会员激活时间（判断「首批支持者」） */
  vipActivatedAt: number | null
}

export const tierAllows = (have: Tier, need: Tier) => TIER_RANK[have] >= TIER_RANK[need]

export function titleUnlocked(t: TitleDef, ctx: UnlockContext): boolean {
  if (t.rarity === 'level') return ctx.level >= (t.minLevel ?? 1)
  return tierAllows(ctx.tier, t.tier)
}

export function badgeUnlocked(b: BadgeDef, ctx: UnlockContext): boolean {
  if (b.kind === 'achievement') return ctx.badges.includes(b.id)
  if (!b.tier || !tierAllows(ctx.tier, b.tier)) return false
  if (b.id === 'pioneer') return ctx.vipActivatedAt !== null && new Date(ctx.vipActivatedAt).getFullYear() <= 2026
  return true
}

const byId = <T extends { id: string }>(list: T[], id: string) => list.find((x) => x.id === id)

/**
 * 把佩戴的装扮限制在当前可用范围内：会员过期、暂停或数据异常时，退回默认项。
 * 存储里保留用户原来的选择，会员恢复后自动重新生效。
 */
export function effectiveLook(look: Look, ctx: UnlockContext): Look {
  const pick = <T extends { id: string; tier: Tier }>(list: T[], id: string, fallback: string) => {
    const item = byId(list, id)
    return item && tierAllows(ctx.tier, item.tier) ? id : fallback
  }
  const title = byId(TITLES, look.title)
  const levelTitle = `lv${Math.max(1, Math.min(ctx.level, LEVELS.length))}`
  return {
    avatar: pick(AVATARS, look.avatar, 'chick'),
    frame: pick(FRAMES, look.frame, 'plain'),
    title: title && titleUnlocked(title, ctx) ? look.title : levelTitle,
    worn: look.worn
      .filter((id, i) => look.worn.indexOf(id) === i)
      .filter((id) => {
        const b = byId(BADGES, id)
        return !!b && badgeUnlocked(b, ctx)
      })
      .slice(0, WORN_LIMIT[ctx.tier]),
    decoration: pick(DECORATIONS, look.decoration, 'none'),
    palette: pick(PALETTES, look.palette, look.palette === 'night' ? 'night' : 'default'),
    nameStyle: pick(NAME_STYLES, look.nameStyle, 'plain'),
  }
}

export const avatarById = (id: string) => byId(AVATARS, id) ?? AVATARS[0]
export const frameById = (id: string) => byId(FRAMES, id) ?? FRAMES[0]
export const titleById = (id: string) => byId(TITLES, id) ?? TITLES[0]
export const badgeById = (id: string) => byId(BADGES, id)
export const decorationById = (id: string) => byId(DECORATIONS, id) ?? DECORATIONS[0]
export const paletteById = (id: string) => byId(PALETTES, id) ?? PALETTES[0]
