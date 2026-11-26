// 本地数据，见设计文档 6.1：所有数据放在同一个键下，带版本号；
// 读取失败、版本不匹配或字段不合法时回退到默认值，不能让一条坏数据导致应用打不开。
// 版本升级时迁移旧数据，绝不清空（应用内更新不能丢数据）。

import { DEFAULT_SETTINGS, DURATIONS_SEC, type SeenMap, type Settings } from '../game/types'
import { newProfile, parseProfile, parseVip } from '../profile/profileData'
import type { Profile, VipState } from '../profile/types'
import type { SeenPrompts } from '../minigames/promptDeck'

export const STORAGE_KEY = 'xiaohai-guess'
const VERSION = 4

/** 小游戏进度：连连看记录已通过的关卡；消消乐记录每关最高星数 */
export interface MiniGameProgress {
  link: { cleared: number[] }
  match3: { stars: Record<string, number> }
}

/** 真心话 / 大冒险：公开的劲爆开关，以及抽过的题（跨次不重复） */
export interface TodData {
  spicy: boolean
  seen: { truth: SeenPrompts; dare: SeenPrompts }
}

export interface StoredData {
  settings: Settings
  seen: SeenMap
  profile: Profile
  vip: VipState | null
  tod: TodData
  minigames: MiniGameProgress
}

/** localStorage 的最小接口，便于测试 */
export type KeyValueStore = Pick<Storage, 'getItem' | 'setItem'>

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

function parseSettings(v: unknown): Settings {
  const s = isRecord(v) ? v : {}
  return {
    themeId: typeof s.themeId === 'string' && s.themeId ? s.themeId : DEFAULT_SETTINGS.themeId,
    durationSec: (DURATIONS_SEC as readonly unknown[]).includes(s.durationSec)
      ? (s.durationSec as Settings['durationSec'])
      : DEFAULT_SETTINGS.durationSec,
    soundOn: typeof s.soundOn === 'boolean' ? s.soundOn : DEFAULT_SETTINGS.soundOn,
    sensitivity:
      s.sensitivity === 'low' || s.sensitivity === 'medium' || s.sensitivity === 'high'
        ? s.sensitivity
        : DEFAULT_SETTINGS.sensitivity,
  }
}

function parseSeen(v: unknown): SeenMap {
  if (!isRecord(v)) return {}
  const out: SeenMap = {}
  for (const [k, list] of Object.entries(v)) {
    if (Array.isArray(list)) out[k] = list.filter((w): w is string => typeof w === 'string')
  }
  return out
}

const strList = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])

export function defaultTod(): TodData {
  return { spicy: false, seen: { truth: { normal: [], spicy: [] }, dare: { normal: [], spicy: [] } } }
}

function parseTod(v: unknown): TodData {
  if (!isRecord(v)) return defaultTod()
  const seen = isRecord(v.seen) ? v.seen : {}
  const pair = (x: unknown): SeenPrompts => {
    const r = isRecord(x) ? x : {}
    return { normal: strList(r.normal), spicy: strList(r.spicy) }
  }
  return { spicy: v.spicy === true, seen: { truth: pair(seen.truth), dare: pair(seen.dare) } }
}

export function defaultMiniGames(): MiniGameProgress {
  return { link: { cleared: [] }, match3: { stars: {} } }
}

function parseMiniGames(v: unknown): MiniGameProgress {
  const d = isRecord(v) ? v : {}
  const link = isRecord(d.link) ? d.link : {}
  const match3 = isRecord(d.match3) ? d.match3 : {}
  const cleared = Array.isArray(link.cleared)
    ? [...new Set(link.cleared.filter((n): n is number => Number.isInteger(n) && n > 0))].sort((a, b) => a - b)
    : []
  const stars: Record<string, number> = {}
  if (isRecord(match3.stars)) {
    for (const [k, n] of Object.entries(match3.stars)) if (Number.isInteger(n) && (n as number) >= 1 && (n as number) <= 3) stars[k] = n as number
  }
  return { link: { cleared }, match3: { stars } }
}

export function defaultData(rng: () => number = Math.random): StoredData {
  return { settings: { ...DEFAULT_SETTINGS }, seen: {}, profile: newProfile(rng), vip: null, tod: defaultTod(), minigames: defaultMiniGames() }
}

export function loadData(store: KeyValueStore, rng: () => number = Math.random): StoredData {
  try {
    const raw = store.getItem(STORAGE_KEY)
    if (!raw) return defaultData(rng)
    const data: unknown = JSON.parse(raw)
    if (!isRecord(data)) return defaultData(rng)
    // 版本 1：只有设置和已出词，迁移时保留并新建资料
    if (data.version === 1) {
      return { settings: parseSettings(data.settings), seen: parseSeen(data.seen), profile: newProfile(rng), vip: null, tod: defaultTod(), minigames: defaultMiniGames() }
    }
    // 版本 2、3 → 4：缺少的部分（真心话大冒险、小游戏进度）用默认值补上，其余原样保留
    if (data.version !== 2 && data.version !== 3 && data.version !== VERSION) return defaultData(rng)
    return {
      settings: parseSettings(data.settings),
      seen: parseSeen(data.seen),
      profile: parseProfile(data.profile, rng),
      vip: parseVip(data.vip),
      tod: parseTod(data.tod),
      minigames: parseMiniGames(data.minigames),
    }
  } catch {
    return defaultData(rng)
  }
}

/** 写入失败（如存储空间满、隐私模式）时返回 false，不抛出异常 */
export function saveData(store: KeyValueStore, data: StoredData): boolean {
  try {
    store.setItem(STORAGE_KEY, JSON.stringify({ version: VERSION, ...data }))
    return true
  } catch {
    return false
  }
}

/** 申请持久存储，降低系统空间不足时清理数据的可能（浏览器不支持时忽略） */
export function requestPersistentStorage(): void {
  try {
    void navigator.storage?.persist?.()
  } catch {
    // 忽略
  }
}
