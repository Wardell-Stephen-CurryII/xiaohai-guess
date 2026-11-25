// 姿态数据录制与导出。导出的 JSON 放入 src/sensor/fixtures/ 后可在单元测试中回放。

import type { MotionSample, OrientationSample } from './orientationSource'

export interface Recording {
  format: 'xiaohai-sensor-recording'
  version: 1
  note: string
  userAgent: string
  recordedAt: string
  /** 每行 [t 毫秒（相对录制开始）, alpha, beta, gamma] */
  orientation: [number, number | null, number, number][]
  /** 每行 [t 毫秒, x, y, z]（accelerationIncludingGravity） */
  motion: [number, number, number, number][]
}

const r2 = (v: number) => Math.round(v * 100) / 100

export class SensorRecorder {
  private start = 0
  private orientation: Recording['orientation'] = []
  private motion: Recording['motion'] = []
  private _recording = false

  get recording(): boolean {
    return this._recording
  }

  get sampleCount(): number {
    return this.orientation.length
  }

  begin(now: number): void {
    this.start = now
    this.orientation = []
    this.motion = []
    this._recording = true
  }

  stop(): void {
    this._recording = false
  }

  addOrientation(s: OrientationSample): void {
    if (!this._recording) return
    this.orientation.push([
      r2(s.t - this.start),
      s.alpha === null ? null : r2(s.alpha),
      r2(s.beta),
      r2(s.gamma),
    ])
  }

  addMotion(s: MotionSample): void {
    if (!this._recording) return
    this.motion.push([r2(s.t - this.start), r2(s.x), r2(s.y), r2(s.z)])
  }

  export(note: string, userAgent: string, recordedAt: Date): Recording {
    return {
      format: 'xiaohai-sensor-recording',
      version: 1,
      note,
      userAgent,
      recordedAt: recordedAt.toISOString(),
      orientation: this.orientation,
      motion: this.motion,
    }
  }
}
