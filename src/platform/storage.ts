// 本地数据，见设计文档 6.1：所有数据放在同一个键下，带版本号；
// 读取失败、版本不匹配或字段不合法时回退到默认值，不能让一条坏数据导致应用打不开。

import { DEFAULT_SETTINGS, DURATIONS_SEC, type SeenMap, type Settings } from '../game/types'

export const STORAGE_KEY = 'xiaohai-guess'
const VERSION = 1

export interface StoredData {
  settings: Settings
  seen: SeenMap
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

export function loadData(store: KeyValueStore): StoredData {
  try {
    const raw = store.getItem(STORAGE_KEY)
    if (!raw) return { settings: { ...DEFAULT_SETTINGS }, seen: {} }
    const data: unknown = JSON.parse(raw)
    if (!isRecord(data) || data.version !== VERSION) return { settings: { ...DEFAULT_SETTINGS }, seen: {} }
    return { settings: parseSettings(data.settings), seen: parseSeen(data.seen) }
  } catch {
    return { settings: { ...DEFAULT_SETTINGS }, seen: {} }
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
