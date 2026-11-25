import { describe, expect, it } from 'vitest'
import { gravityFromAcceleration, gravityFromOrientation, landscapeSign } from './tilt'

const DEG = Math.PI / 180

/**
 * 把设备坐标系中的「上」向量换算成规范约定的 (beta, gamma)：
 * beta ∈ [-180, 180)，gamma ∈ [-90, 90)。这是浏览器实际上报的表示方式。
 */
function eulerFromUp(ux: number, uy: number, uz: number): { beta: number; gamma: number } {
  let gamma = Math.atan2(-ux, uz) / DEG
  let beta = Math.atan2(uy, Math.hypot(ux, uz)) / DEG
  if (gamma >= 90 || gamma < -90) {
    gamma += gamma >= 90 ? -180 : 180
    beta = 180 - beta
  }
  if (beta >= 180) beta -= 360
  if (beta < -180) beta += 360
  return { beta, gamma }
}

describe('gravityFromOrientation', () => {
  it('屏幕朝天平放：tilt = +90', () => {
    expect(gravityFromOrientation(0, 0).tilt).toBeCloseTo(90)
  })

  it('屏幕朝地平放：tilt = -90', () => {
    expect(gravityFromOrientation(180, 0).tilt).toBeCloseTo(-90)
    expect(gravityFromOrientation(-180, 0).tilt).toBeCloseTo(-90)
  })

  it('竖屏竖立：tilt = 0，upY = 1', () => {
    const g = gravityFromOrientation(90, 0)
    expect(g.tilt).toBeCloseTo(0)
    expect(g.upY).toBeCloseTo(1)
  })

  it('两种横屏竖立：tilt = 0，upX 符号相反', () => {
    const a = gravityFromOrientation(0, -90)
    const b = gravityFromOrientation(0, 89.999)
    expect(a.tilt).toBeCloseTo(0)
    expect(b.tilt).toBeCloseTo(0, 2)
    expect(a.upX).toBeCloseTo(1)
    expect(b.upX).toBeCloseTo(-1)
  })

  it('换算结果与 alpha 无关、与 eulerFromUp 互逆', () => {
    for (const [ux, uy, uz] of [
      [0.6, 0, -0.8],
      [-0.6, 0.48, 0.64],
      [0, -1, 0],
    ]) {
      const { beta, gamma } = eulerFromUp(ux, uy, uz)
      const g = gravityFromOrientation(beta, gamma)
      expect(g.upX).toBeCloseTo(ux)
      expect(g.upY).toBeCloseTo(uy)
      expect(g.upZ).toBeCloseTo(uz)
    }
  })

  // 设计文档 4.2 的核心论点：横屏竖立处是欧拉角奇异点，beta 会跳变，tilt 不会。
  for (const side of [1, -1]) {
    it(`横屏（upX=${side}）翻转经过奇异点时 beta 跳变，tilt 连续`, () => {
      let prev: { beta: number; tilt: number } | null = null
      let maxBetaJump = 0
      let maxTiltStep = 0
      // 从屏幕朝天 80° 翻到屏幕朝地 80°，绕设备 y 轴（横屏时的水平长轴）旋转
      for (let deg = 80; deg >= -80; deg -= 1) {
        const ux = side * Math.cos(deg * DEG)
        const uz = Math.sin(deg * DEG)
        const { beta, gamma } = eulerFromUp(ux, 0, uz)
        const tilt = gravityFromOrientation(beta, gamma).tilt
        expect(tilt).toBeCloseTo(deg, 6)
        if (prev) {
          maxBetaJump = Math.max(maxBetaJump, Math.abs(beta - prev.beta))
          maxTiltStep = Math.max(maxTiltStep, Math.abs(tilt - prev.tilt))
        }
        prev = { beta, tilt }
      }
      expect(maxBetaJump).toBeGreaterThan(170)
      expect(maxTiltStep).toBeLessThan(1.001)
    })
  }
})

describe('gravityFromAcceleration', () => {
  it('规范符号：屏幕朝上平放 z = +9.8 时 tilt = +90', () => {
    expect(gravityFromAcceleration(0, 0, 9.8)?.tilt).toBeCloseTo(90)
  })

  it('反转符号：z = -9.8 且 sign = -1 时 tilt = +90', () => {
    expect(gravityFromAcceleration(0, 0, -9.8, -1)?.tilt).toBeCloseTo(90)
  })

  it('读数过小时返回 null', () => {
    expect(gravityFromAcceleration(0.1, 0.2, 0.3)).toBeNull()
  })
})

describe('landscapeSign', () => {
  it('按阈值区分两种横屏和非横屏', () => {
    expect(landscapeSign(0.95)).toBe(1)
    expect(landscapeSign(-0.95)).toBe(-1)
    expect(landscapeSign(0.5)).toBe(0)
  })
})
