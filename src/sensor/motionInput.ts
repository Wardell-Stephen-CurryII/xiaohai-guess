// 游戏用的传感器输入：订阅方向事件，按当前模式驱动就绪检测或翻转识别。
// 60Hz 的样本在 React 之外处理，只把离散事件交给界面（设计文档 4.5 性能约束）。

import { DEFAULT_PARAMS, GestureDetector, SENSITIVITY_TRIGGER_DEG, type GestureEvent } from './gestureDetector'
import { subscribeOrientation } from './orientationSource'
import { ReadinessDetector } from './readiness'
import { gravityFromOrientation, type Gravity } from './tilt'
import type { Sensitivity } from '../game/types'

export type MotionMode = 'idle' | 'readiness' | 'gesture'

export type MotionInputEvent = GestureEvent | 'poseReady'

export class MotionInput {
  private gesture = new GestureDetector()
  private readiness = new ReadinessDetector()
  private unsubscribe: (() => void) | null = null
  private listeners = new Set<(e: MotionInputEvent, g: Gravity) => void>()
  private _mode: MotionMode = 'idle'
  private _gravity: Gravity | null = null
  private firstSampleWaiters: (() => void)[] = []

  get gravity(): Gravity | null {
    return this._gravity
  }

  get mode(): MotionMode {
    return this._mode
  }

  start(): void {
    if (this.unsubscribe) return
    this.unsubscribe = subscribeOrientation((s) => {
      const g = gravityFromOrientation(s.beta, s.gamma)
      this._gravity = g
      if (this.firstSampleWaiters.length) {
        for (const w of this.firstSampleWaiters) w()
        this.firstSampleWaiters = []
      }
      if (this._mode === 'readiness') {
        if (this.readiness.push(s.t, g)) {
          this._mode = 'idle'
          this.emit('poseReady', g)
        }
      } else if (this._mode === 'gesture') {
        const e = this.gesture.push(s.t, g.tilt)
        if (e) this.emit(e, g)
      }
    })
  }

  stop(): void {
    this.unsubscribe?.()
    this.unsubscribe = null
    this._mode = 'idle'
  }

  /** 在 timeoutMs 内收到第一个有效样本则为 true（用于判断传感器是否真的可用） */
  waitForData(timeoutMs: number): Promise<boolean> {
    if (this._gravity) return Promise.resolve(true)
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(false), timeoutMs)
      this.firstSampleWaiters.push(() => {
        clearTimeout(timer)
        resolve(true)
      })
    })
  }

  setSensitivity(s: Sensitivity): void {
    this.gesture.setParams({ ...DEFAULT_PARAMS, triggerDeg: SENSITIVITY_TRIGGER_DEG[s] })
  }

  setMode(mode: MotionMode): void {
    if (mode === this._mode) return
    this._mode = mode
    if (mode === 'readiness') this.readiness.reset()
    if (mode === 'gesture') this.gesture.reset()
  }

  /** 当前是否处于就绪姿态（用于提示文案） */
  inReadyPose(): boolean {
    return this._gravity !== null && this.readiness.inPose(this._gravity)
  }

  isStale(now: number): boolean {
    return this.gesture.isStale(now)
  }

  on(cb: (e: MotionInputEvent, g: Gravity) => void): () => void {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  private emit(e: MotionInputEvent, g: Gravity) {
    for (const cb of this.listeners) cb(e, g)
  }
}
