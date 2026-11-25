import { describe, expect, it } from 'vitest'
import { ReadinessDetector } from './readiness'
import type { Gravity } from './tilt'

const g = (tilt: number, upX: number): Gravity => ({ tilt, upX, upY: 0, upZ: Math.sin((tilt * Math.PI) / 180) })

describe('ReadinessDetector', () => {
  it('横屏竖直保持 0.5 秒后就绪', () => {
    const d = new ReadinessDetector()
    expect(d.push(0, g(5, 0.98))).toBe(false)
    expect(d.push(300, g(-10, -0.97))).toBe(false)
    expect(d.push(500, g(0, 0.99))).toBe(true)
  })

  it('竖屏拿着不算就绪', () => {
    const d = new ReadinessDetector()
    expect(d.push(0, g(0, 0.1))).toBe(false)
    expect(d.push(1000, g(0, 0.1))).toBe(false)
  })

  it('中途离开姿态重新计时', () => {
    const d = new ReadinessDetector()
    d.push(0, g(0, 1))
    d.push(400, g(60, 0.5))
    expect(d.push(600, g(0, 1))).toBe(false)
    expect(d.push(1100, g(0, 1))).toBe(true)
  })

  it('屏幕明显朝天或朝地不算就绪', () => {
    const d = new ReadinessDetector()
    expect(d.inPose(g(40, 0.76))).toBe(false)
    expect(d.inPose(g(-40, 0.76))).toBe(false)
  })
})
