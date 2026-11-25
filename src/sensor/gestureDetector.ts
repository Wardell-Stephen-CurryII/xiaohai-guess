// 翻转识别器，见设计文档 4.5。纯逻辑，不依赖 React 和浏览器 API。
// 输入：带时间戳的 tilt 序列；输出：correct / skip / ready 事件。

export interface DetectorParams {
  /** 触发角度：tilt ≤ -触发角度 为答对，≥ +触发角度 为跳过 */
  triggerDeg: number
  /** 超过触发角度需要持续的时间 */
  holdMs: number
  /** 回正角度：|tilt| 小于该值视为回到竖直姿态 */
  returnDeg: number
  /** 回正需要持续的时间 */
  returnHoldMs: number
  /** 指数平滑的时间常数，0 表示不平滑 */
  smoothingMs: number
}

export const DEFAULT_PARAMS: DetectorParams = {
  triggerDeg: 55,
  holdMs: 150,
  returnDeg: 25,
  returnHoldMs: 200,
  smoothingMs: 80,
}

export const SENSITIVITY_TRIGGER_DEG = { low: 65, medium: 55, high: 45 } as const

export type GestureEvent = 'correct' | 'skip' | 'ready'
export type DetectorState = 'neutral' | 'wait_return'

export class GestureDetector {
  private params: DetectorParams
  private _state: DetectorState = 'wait_return'
  private smoothed: number | null = null
  private lastT: number | null = null
  private pending: { kind: GestureEvent; since: number } | null = null

  constructor(params: DetectorParams = DEFAULT_PARAMS) {
    this.params = { ...params }
  }

  get state(): DetectorState {
    return this._state
  }

  /** 平滑后的 tilt；尚未收到数据时为 null */
  get smoothedTilt(): number | null {
    return this.smoothed
  }

  get lastSampleTime(): number | null {
    return this.lastT
  }

  setParams(params: DetectorParams): void {
    this.params = { ...params }
    this.pending = null
  }

  /** 回到初始状态。初始状态是「等待回正」，所以开局时手机必须先处于竖直姿态。 */
  reset(): void {
    this._state = 'wait_return'
    this.smoothed = null
    this.lastT = null
    this.pending = null
  }

  /** 送入一个样本，满足条件时返回事件。时间倒退的样本被忽略。 */
  push(t: number, tilt: number): GestureEvent | null {
    if (this.lastT !== null && t < this.lastT) return null
    this.smooth(t, tilt)
    this.lastT = t
    const s = this.smoothed as number
    const p = this.params

    let candidate: GestureEvent | null = null
    if (this._state === 'neutral') {
      if (s <= -p.triggerDeg) candidate = 'correct'
      else if (s >= p.triggerDeg) candidate = 'skip'
    } else if (Math.abs(s) < p.returnDeg) {
      candidate = 'ready'
    }

    if (candidate === null) {
      this.pending = null
      return null
    }
    if (this.pending?.kind !== candidate) {
      this.pending = { kind: candidate, since: t }
    }
    const hold = candidate === 'ready' ? p.returnHoldMs : p.holdMs
    if (t - this.pending.since < hold) return null

    this.pending = null
    this._state = candidate === 'ready' ? 'neutral' : 'wait_return'
    return candidate
  }

  /** 距离上一个样本超过 timeoutMs 视为数据中断 */
  isStale(now: number, timeoutMs = 1000): boolean {
    return this.lastT === null || now - this.lastT > timeoutMs
  }

  private smooth(t: number, tilt: number): void {
    if (this.smoothed === null || this.lastT === null || this.params.smoothingMs <= 0) {
      this.smoothed = tilt
      return
    }
    const dt = t - this.lastT
    const a = 1 - Math.exp(-dt / this.params.smoothingMs)
    this.smoothed += a * (tilt - this.smoothed)
  }
}
