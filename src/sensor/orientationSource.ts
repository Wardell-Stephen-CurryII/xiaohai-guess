// 传感器权限申请与事件订阅，见设计文档 4.3。

export type MotionPermission = 'granted' | 'denied' | 'not-required' | 'unsupported' | 'error'

type PermissionCapable = { requestPermission?: () => Promise<'granted' | 'denied'> }

/**
 * 申请方向和运动传感器权限。
 * 必须在点击事件处理函数中同步调用（调用前不能有 await），否则 iOS 不认为是用户手势。
 */
export function requestMotionPermission(): Promise<MotionPermission> {
  const DOE = (globalThis as { DeviceOrientationEvent?: PermissionCapable }).DeviceOrientationEvent
  const DME = (globalThis as { DeviceMotionEvent?: PermissionCapable }).DeviceMotionEvent
  if (!DOE) return Promise.resolve('unsupported')
  if (typeof DOE.requestPermission !== 'function') return Promise.resolve('not-required')

  // 两个请求都在同一个手势内同步发出；结果以方向传感器为准，运动传感器失败不影响它
  const orientation = DOE.requestPermission()
  if (typeof DME?.requestPermission === 'function') DME.requestPermission().catch(() => undefined)
  return orientation
    .then((r): MotionPermission => (r === 'granted' ? 'granted' : 'denied'))
    .catch((): MotionPermission => 'error')
}

export interface OrientationSample {
  t: number
  alpha: number | null
  beta: number
  gamma: number
}

export interface MotionSample {
  t: number
  x: number
  y: number
  z: number
}

/** 订阅 deviceorientation，只转发带有效 beta / gamma 的事件。返回取消订阅函数。 */
export function subscribeOrientation(cb: (s: OrientationSample) => void): () => void {
  const handler = (e: DeviceOrientationEvent) => {
    if (e.beta === null || e.gamma === null) return
    cb({ t: performance.now(), alpha: e.alpha, beta: e.beta, gamma: e.gamma })
  }
  window.addEventListener('deviceorientation', handler)
  return () => window.removeEventListener('deviceorientation', handler)
}

/** 订阅 devicemotion 的 accelerationIncludingGravity。返回取消订阅函数。 */
export function subscribeMotion(cb: (s: MotionSample) => void): () => void {
  const handler = (e: DeviceMotionEvent) => {
    const a = e.accelerationIncludingGravity
    if (!a || a.x === null || a.y === null || a.z === null) return
    cb({ t: performance.now(), x: a.x, y: a.y, z: a.z })
  }
  window.addEventListener('devicemotion', handler)
  return () => window.removeEventListener('devicemotion', handler)
}
