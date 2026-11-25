import { describe, expect, it } from 'vitest'
import { stageRotation } from './stageRotation'

describe('stageRotation', () => {
  it('视口已是横屏时不旋转', () => {
    expect(stageRotation(false, 1)).toBe(0)
    expect(stageRotation(false, -1)).toBe(0)
  })

  it('视口为竖屏时按横屏方向旋转', () => {
    expect(stageRotation(true, 1)).toBe(90)
    expect(stageRotation(true, -1)).toBe(-90)
  })

  it('方向未知时默认顺时针', () => {
    expect(stageRotation(true, 0)).toBe(90)
  })
})
