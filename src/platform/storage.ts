// 本地数据，见设计文档 6.1：所有数据放在同一个键下，带版本号；
// 读取失败、版本不匹配或字段不合法时回退到默认值，不能让一条坏数据导致应用打不开。
// 版本升级时迁移旧数据，绝不清空（应用内更新不能丢数据）。

import { DEFAULT_SETTINGS, DURATIONS_SEC, type SeenMap, type Settings } from '../game/types'
import { newProfile, parseProfile, parseVip } from '../profile/profileData'
import type { Profile, VipState } from '../profile/types'

export const STORAGE_KEY = 'xiaohai-guess'
const VERSION = 2

export interface StoredData {
  settings: Settings
  seen: SeenMap
  profile: Profile
  vip: VipState | null
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

export function defaultData(rng: () => number = Math.random): StoredData {
  return { settings: { ...DEFAULT_SETTINGS }, seen: {}, profile: newProfile(rng), vip: null }
}

export function loadData(store: KeyValueStore, rng: () => number = Math.random): StoredData {
  try {
    const raw = store.getItem(STORAGE_KEY)
    if (!raw) return defaultData(rng)
    const data: unknown = JSON.parse(raw)
    if (!isRecord(data)) return defaultData(rng)
    // 版本 1：只有设置和已出词，迁移时保留并新建资料
    if (data.version === 1) {
      return { settings: parseSettings(data.settings), seen: parseSeen(data.seen), profile: newProfile(rng), vip: null }
    }
    if (data.version !== VERSION) return defaultData(rng)
    return {
      settings: parseSettings(data.settings),
      seen: parseSeen(data.seen),
      profile: parseProfile(data.profile, rng),
      vip: parseVip(data.vip),
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
