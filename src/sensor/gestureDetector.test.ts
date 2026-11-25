import { describe, expect, it } from 'vitest'
import { DEFAULT_PARAMS, GestureDetector, type GestureEvent } from './gestureDetector'

const FRAME = 1000 / 60

/** 以 60Hz 送入一段姿态：每段为 [持续毫秒, 起始 tilt, 结束 tilt]，段内线性变化 */
function run(d: GestureDetector, segments: [number, number, number][]) {
  const events: { t: number; e: GestureEvent }[] = []
  // 从上一个样本的时间继续，保证时间单调递增
  let t = d.lastSampleTime ?? 0
  for (const [ms, from, to] of segments) {
    const n = Math.max(1, Math.round(ms / FRAME))
    for (let i = 0; i < n; i++) {
      t += FRAME
      const e = d.push(t, from + ((to - from) * (i + 1)) / n)
      if (e) events.push({ t, e })
    }
  }
  return { events: events.map((x) => x.e), end: t }
}

/** 先回正，进入 neutral */
function ready(): GestureDetector {
  const d = new GestureDetector()
  const { events } = run(d, [[400, 0, 0]])
  expect(events).toEqual(['ready'])
  expect(d.state).toBe('neutral')
  return d
}

describe('GestureDetector', () => {
  it('初始为等待回正，竖直保持一段时间后发出 ready', () => {
    const d = new GestureDetector()
    expect(d.state).toBe('wait_return')
    expect(run(d, [[100, 0, 0]]).events).toEqual([])
    expect(run(d, [[300, 0, 0]]).events).toEqual(['ready'])
  })

  it('开局时手机已经朝地，不会误判为答对', () => {
    const d = new GestureDetector()
    expect(run(d, [[1000, -80, -80]]).events).toEqual([])
  })

  it('屏幕朝地：只发出一次 correct，回正后 ready', () => {
    const d = ready()
    const { events } = run(d, [
      [200, 0, -80],
      [800, -80, -80],
      [200, -80, 0],
      [400, 0, 0],
    ])
    expect(events).toEqual(['correct', 'ready'])
  })

  it('屏幕朝天：skip', () => {
    const d = ready()
    expect(run(d, [[200, 0, 80], [400, 80, 80]]).events).toEqual(['skip'])
    expect(d.state).toBe('wait_return')
  })

  it('等待回正期间反向翻转不触发', () => {
    const d = ready()
    const { events } = run(d, [
      [200, 0, -80],
      [300, -80, -80],
      [300, -80, 80],
      [400, 80, 80],
    ])
    expect(events).toEqual(['correct'])
  })

  it('越过阈值但持续时间不足不触发', () => {
    const d = new GestureDetector({ ...DEFAULT_PARAMS, smoothingMs: 0 })
    run(d, [[400, 0, 0]])
    expect(run(d, [[100, -80, -80], [400, 0, 0]]).events).toEqual([])
  })

  it('单个尖峰被平滑掉', () => {
    const d = new GestureDetector({ ...DEFAULT_PARAMS, holdMs: 0 })
    run(d, [[400, 0, 0]])
    expect(d.push((d.lastSampleTime as number) + FRAME, -90)).toBeNull()
    expect(d.smoothedTilt).toBeGreaterThan(-40)
  })

  it('竖直姿态附近的抖动不触发', () => {
    const d = ready()
    let t = d.lastSampleTime as number
    const events: GestureEvent[] = []
    for (let i = 0; i < 600; i++) {
      t += FRAME
      const e = d.push(t, 20 * Math.sin(i / 3) + (i % 7) - 3)
      if (e) events.push(e)
    }
    expect(events).toEqual([])
  })

  it('连续 20 次动作，每次恰好一个事件', () => {
    const d = ready()
    const segs: [number, number, number][] = []
    for (let i = 0; i < 20; i++) {
      const target = i % 3 === 0 ? 75 : -75
      segs.push([250, 0, target], [300, target, target], [250, target, 0], [350, 0, 0])
    }
    const { events } = run(d, segs)
    expect(events.filter((e) => e === 'correct')).toHaveLength(13)
    expect(events.filter((e) => e === 'skip')).toHaveLength(7)
    expect(events.filter((e) => e === 'ready')).toHaveLength(20)
  })

  it('时间倒退的样本被忽略', () => {
    const d = ready()
    const last = d.lastSampleTime as number
    expect(d.push(last - 10, -90)).toBeNull()
    expect(d.lastSampleTime).toBe(last)
  })

  it('isStale：超过 1 秒没有数据', () => {
    const d = new GestureDetector()
    expect(d.isStale(0)).toBe(true)
    d.push(100, 0)
    expect(d.isStale(900)).toBe(false)
    expect(d.isStale(1200)).toBe(true)
  })

  it('reset 回到等待回正', () => {
    const d = ready()
    d.reset()
    expect(d.state).toBe('wait_return')
    expect(d.smoothedTilt).toBeNull()
  })
})
