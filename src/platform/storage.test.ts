import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../game/types'
import { loadData, saveData, STORAGE_KEY, type KeyValueStore } from './storage'

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

const defaults = { settings: DEFAULT_SETTINGS, seen: {} }

describe('storage', () => {
  it('没有数据时返回默认值', () => {
    expect(loadData(memoryStore())).toEqual(defaults)
  })

  it('写入后可以读回', () => {
    const store = memoryStore()
    const data = {
      settings: { themeId: 'songs', durationSec: 90 as const, soundOn: false, sensitivity: 'high' as const },
      seen: { songs: ['青花瓷'] },
    }
    expect(saveData(store, data)).toBe(true)
    expect(loadData(store)).toEqual(data)
  })

  it('JSON 损坏时回退默认值', () => {
    expect(loadData(memoryStore('{not json'))).toEqual(defaults)
  })

  it('版本不匹配时回退默认值', () => {
    expect(loadData(memoryStore(JSON.stringify({ version: 99, settings: { soundOn: false } })))).toEqual(defaults)
  })

  it('单个字段不合法时只回退该字段', () => {
    const raw = JSON.stringify({
      version: 1,
      settings: { themeId: 'history', durationSec: 45, soundOn: 'yes', sensitivity: 'high' },
      seen: { history: ['秦始皇', 3], bad: 'x' },
    })
    expect(loadData(memoryStore(raw))).toEqual({
      settings: { themeId: 'history', durationSec: 60, soundOn: true, sensitivity: 'high' },
      seen: { history: ['秦始皇'] },
    })
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
    expect(loadData(broken)).toEqual(defaults)
    expect(saveData(broken, defaults)).toBe(false)
  })

  it('使用统一的存储键', () => {
    expect(STORAGE_KEY).toBe('xiaohai-guess')
  })
})
