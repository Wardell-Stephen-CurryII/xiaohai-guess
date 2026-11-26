import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../game/types'
import { newProfile } from '../profile/profileData'
import { defaultData, loadData, saveData, STORAGE_KEY, type KeyValueStore } from './storage'

function memoryStore(initial?: string): KeyValueStore & { value: string | null } {
  return {
    value: initial ?? null,
    getItem() {
      return this.value
    },
    setItem(_k: string, v: string) {
      this.value = v
    },
  }
}

const rng = () => 0
const defaults = defaultData(rng)

describe('storage', () => {
  it('没有数据时返回默认值，并生成默认名字', () => {
    const d = loadData(memoryStore(), rng)
    expect(d).toEqual(defaults)
    expect(d.profile.name).toBe('机智的柯基')
    expect(d.vip).toBeNull()
  })

  it('写入后可以读回', () => {
    const store = memoryStore()
    const data = {
      settings: { themeId: 'songs', durationSec: 180 as const, soundOn: false, sensitivity: 'high' as const },
      seen: { songs: ['青花瓷'] },
      profile: { ...newProfile(rng), name: '小嗨', xp: 320 },
      vip: { code: 'ABCD1234EFGH', tier: 'svip' as const, activatedAt: 1, lastVerifiedAt: 2 },
    }
    expect(saveData(store, data)).toBe(true)
    expect(loadData(store, rng)).toEqual(data)
  })

  it('从版本 1 迁移：保留设置和已出词，新建资料', () => {
    const v1 = JSON.stringify({
      version: 1,
      settings: { themeId: 'history', durationSec: 120, soundOn: false, sensitivity: 'low' },
      seen: { history: ['秦始皇'] },
    })
    const d = loadData(memoryStore(v1), rng)
    expect(d.settings).toEqual({ themeId: 'history', durationSec: 120, soundOn: false, sensitivity: 'low' })
    expect(d.seen).toEqual({ history: ['秦始皇'] })
    expect(d.profile).toEqual(newProfile(rng))
    expect(d.vip).toBeNull()
  })

  it('JSON 损坏时回退默认值', () => {
    expect(loadData(memoryStore('{not json'), rng)).toEqual(defaults)
  })

  it('未知版本时回退默认值', () => {
    expect(loadData(memoryStore(JSON.stringify({ version: 99, settings: { soundOn: false } })), rng)).toEqual(defaults)
  })

  it('单个字段不合法时只回退该字段', () => {
    const raw = JSON.stringify({
      version: 2,
      settings: { themeId: 'history', durationSec: 45, soundOn: 'yes', sensitivity: 'high' },
      seen: { history: ['秦始皇', 3], bad: 'x' },
      profile: { name: '小嗨', xp: 'lots' },
      vip: { tier: 'gold' },
    })
    const d = loadData(memoryStore(raw), rng)
    expect(d.settings).toEqual({ ...DEFAULT_SETTINGS, themeId: 'history', sensitivity: 'high' })
    expect(d.seen).toEqual({ history: ['秦始皇'] })
    expect(d.profile.name).toBe('小嗨')
    expect(d.profile.xp).toBe(0)
    expect(d.vip).toBeNull()
  })

  it('读写抛出异常时不崩溃', () => {
    const broken: KeyValueStore = {
      getItem() {
        throw new Error('denied')
      },
      setItem() {
        throw new Error('quota')
      },
    }
    expect(loadData(broken, rng)).toEqual(defaults)
    expect(saveData(broken, defaults)).toBe(false)
  })

  it('使用统一的存储键', () => {
    expect(STORAGE_KEY).toBe('xiaohai-guess')
  })
})
