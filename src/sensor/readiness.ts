// 开局就绪检测，见设计文档 4.4：
// 手机横屏、大致竖直（|tilt| < 25° 且 |upX| > 0.7），并持续 0.5 秒。
// 传感器无法判断屏幕朝向谁，「屏幕朝向朋友」只靠提示文案。

import type { Gravity } from './tilt'

export interface ReadinessParams {
  maxTiltDeg: number
  minAbsUpX: number
  holdMs: number
}

export const DEFAULT_READINESS: ReadinessParams = { maxTiltDeg: 25, minAbsUpX: 0.7, holdMs: 500 }

export class ReadinessDetector {
  private since: number | null = null
  private params: ReadinessParams

  constructor(params: ReadinessParams = DEFAULT_READINESS) {
    this.params = params
  }

  reset(): void {
    this.since = null
  }

  /** 当前是否处于就绪姿态（不考虑持续时间），用于界面提示 */
  inPose(g: Gravity): boolean {
    return Math.abs(g.tilt) < this.params.maxTiltDeg && Math.abs(g.upX) > this.params.minAbsUpX
  }

  /** 姿态保持足够久时返回 true；之后每个仍满足条件的样本都返回 true */
  push(t: number, g: Gravity): boolean {
    if (!this.inPose(g)) {
      this.since = null
      return false
    }
    this.since ??= t
    return t - this.since >= this.params.holdMs
  }
}
