// 资料数据的创建与校验，供本地存储和存档码共用。坏数据逐字段回退默认值。

import { generateName, validateName } from './names'
import { DEFAULT_LOOK, EMPTY_STATS, type Look, type Profile, type Stats, type VipState } from './types'

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : d)
const str = (v: unknown, d: string) => (typeof v === 'string' && v ? v : d)
const strList = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])

export function newProfile(rng: () => number = Math.random): Profile {
  return { name: generateName(rng), xp: 0, stats: { ...EMPTY_STATS, themesPlayed: [], correctByTheme: {} }, badges: [], look: { ...DEFAULT_LOOK, worn: [] } }
}

function parseStats(v: unknown): Stats {
  const s = isRecord(v) ? v : {}
  const byTheme: Record<string, number> = {}
  if (isRecord(s.correctByTheme)) for (const [k, n] of Object.entries(s.correctByTheme)) byTheme[k] = num(n)
  return {
    games: num(s.games),
    correct: num(s.correct),
    skipped: num(s.skipped),
    bestScore: num(s.bestScore),
    playMs: num(s.playMs),
    themesPlayed: strList(s.themesPlayed),
    correctByTheme: byTheme,
  }
}

function parseLook(v: unknown): Look {
  const l = isRecord(v) ? v : {}
  return {
    avatar: str(l.avatar, DEFAULT_LOOK.avatar),
    frame: str(l.frame, DEFAULT_LOOK.frame),
    title: str(l.title, DEFAULT_LOOK.title),
    worn: strList(l.worn).slice(0, 3),
    decoration: str(l.decoration, DEFAULT_LOOK.decoration),
    palette: str(l.palette, DEFAULT_LOOK.palette),
    nameStyle: str(l.nameStyle, DEFAULT_LOOK.nameStyle),
  }
}

export function parseProfile(v: unknown, rng: () => number = Math.random): Profile {
  if (!isRecord(v)) return newProfile(rng)
  const name = typeof v.name === 'string' ? validateName(v.name) : null
  return {
    name: name && name.ok ? name.name : generateName(rng),
    xp: num(v.xp),
    stats: parseStats(v.stats),
    badges: strList(v.badges),
    look: parseLook(v.look),
  }
}

export function parseVip(v: unknown): VipState | null {
  if (!isRecord(v)) return null
  if (typeof v.code !== 'string' || (v.tier !== 'vip' && v.tier !== 'svip')) return null
  return { code: v.code, tier: v.tier, activatedAt: num(v.activatedAt), lastVerifiedAt: num(v.lastVerifiedAt) }
}
