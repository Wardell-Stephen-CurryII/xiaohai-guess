// 调试页的传感器中枢：统一订阅两个数据源，驱动识别器和录制器。
// 60Hz 的样本只在这里处理，界面每 100ms 读取一次快照。

import { DEFAULT_PARAMS, GestureDetector, type DetectorParams, type GestureEvent } from '../../sensor/gestureDetector'
import {
  subscribeMotion,
  subscribeOrientation,
  type MotionSample,
  type OrientationSample,
} from '../../sensor/orientationSource'
import { SensorRecorder } from '../../sensor/recorder'
import { gravityFromAcceleration, gravityFromOrientation, type Gravity } from '../../sensor/tilt'

export type TiltSource = 'orientation' | 'motion'

export interface GestureRecord {
  time: string
  event: GestureEvent
  tilt: number
}

export interface HubSnapshot {
  orientation: OrientationSample | null
  gravity: Gravity | null
  motion: MotionSample | null
  motionGravity: Gravity | null
  orientationHz: number
  motionHz: number
  detectorState: GestureDetector['state']
  smoothedTilt: number | null
  stale: boolean
  counts: Record<GestureEvent, number>
  history: readonly GestureRecord[]
}

const PARAMS_KEY = 'xh.debug.params'

function loadParams(): DetectorParams {
  try {
    const raw = localStorage.getItem(PARAMS_KEY)
    if (raw) {
      const { triggerDeg: _old, ...saved } = JSON.parse(raw) as Partial<DetectorParams> & { triggerDeg?: number }
      void _old
      return { ...DEFAULT_PARAMS, ...saved }
    }
  } catch {
    // 数据损坏时使用默认值
  }
  return { ...DEFAULT_PARAMS }
}

class RateMeter {
  private count = 0
  private since = 0
  hz = 0
  hit() {
    this.count++
  }
  update(now: number) {
    if (this.since === 0) this.since = now
    const dt = now - this.since
    if (dt >= 1000) {
      this.hz = (this.count * 1000) / dt
      this.count = 0
      this.since = now
    }
  }
}

export class SensorHub {
  readonly detector: GestureDetector
  readonly recorder = new SensorRecorder()
  params: DetectorParams
  source: TiltSource = 'orientation'
  motionSign: 1 | -1 = 1

  private unsubs: (() => void)[] = []
  private orientation: OrientationSample | null = null
  private gravity: Gravity | null = null
  private motion: MotionSample | null = null
  private motionGravity: Gravity | null = null
  private oRate = new RateMeter()
  private mRate = new RateMeter()
  private counts: Record<GestureEvent, number> = { correct: 0, skip: 0, ready: 0 }
  private history: GestureRecord[] = []
  private listeners = new Set<(e: GestureEvent) => void>()

  constructor() {
    this.params = loadParams()
    this.detector = new GestureDetector(this.params)
  }

  get started(): boolean {
    return this.unsubs.length > 0
  }

  start(): void {
    if (this.started) return
    this.unsubs.push(subscribeOrientation(this.onOrientation), subscribeMotion(this.onMotion))
  }

  stop(): void {
    for (const u of this.unsubs) u()
    this.unsubs = []
  }

  setParams(p: DetectorParams): void {
    this.params = p
    this.detector.setParams(p)
    try {
      localStorage.setItem(PARAMS_KEY, JSON.stringify(p))
    } catch {
      // 隐私模式下可能无法写入，忽略
    }
  }

  setSource(s: TiltSource): void {
    this.source = s
    this.detector.reset()
  }

  resetCounts(): void {
    this.counts = { correct: 0, skip: 0, ready: 0 }
    this.history = []
  }

  onGesture(cb: (e: GestureEvent) => void): () => void {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  /** 当前横屏方向所用的 upX，按所选数据源取值 */
  currentUpX(): number {
    const g = this.source === 'orientation' ? this.gravity : this.motionGravity
    return g?.upX ?? 0
  }

  snapshot(now: number): HubSnapshot {
    this.oRate.update(now)
    this.mRate.update(now)
    return {
      orientation: this.orientation,
      gravity: this.gravity,
      motion: this.motion,
      motionGravity: this.motionGravity,
      orientationHz: this.oRate.hz,
      motionHz: this.mRate.hz,
      detectorState: this.detector.state,
      smoothedTilt: this.detector.smoothedTilt,
      stale: this.detector.isStale(now),
      counts: { ...this.counts },
      history: this.history,
    }
  }

  private onOrientation = (s: OrientationSample) => {
    this.oRate.hit()
    this.orientation = s
    this.gravity = gravityFromOrientation(s.beta, s.gamma)
    this.recorder.addOrientation(s)
    if (this.source === 'orientation') this.feed(s.t, this.gravity.tilt)
  }

  private onMotion = (s: MotionSample) => {
    this.mRate.hit()
    this.motion = s
    this.motionGravity = gravityFromAcceleration(s.x, s.y, s.z, this.motionSign)
    this.recorder.addMotion(s)
    if (this.source === 'motion' && this.motionGravity) this.feed(s.t, this.motionGravity.tilt)
  }

  private feed(t: number, tilt: number) {
    const e = this.detector.push(t, tilt)
    if (!e) return
    this.counts[e]++
    this.history = [
      { time: new Date().toLocaleTimeString('zh-CN'), event: e, tilt: this.detector.smoothedTilt ?? tilt },
      ...this.history,
    ].slice(0, 10)
    for (const cb of this.listeners) cb(e)
  }
}
