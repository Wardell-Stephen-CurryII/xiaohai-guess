import { describe, expect, it } from 'vitest'
import { describeEnvironment } from './environment'

const allSupported = {
  isSecureContext: true,
  hasDeviceOrientation: true,
  needsOrientationPermission: true,
  hasWakeLock: true,
  hasAudioContext: true,
  isStandalone: false,
}

describe('describeEnvironment', () => {
  it('全部支持时每一项都通过', () => {
    const checks = describeEnvironment(allSupported)
    expect(checks.every((c) => c.ok)).toBe(true)
    expect(checks[1].detail).toBe('支持，需要点击授权')
  })

  it('非 HTTPS 时提示传感器不可用', () => {
    const [https] = describeEnvironment({ ...allSupported, isSecureContext: false })
    expect(https.ok).toBe(false)
    expect(https.detail).toContain('传感器将不可用')
  })
})
