// 由设备姿态计算「重力方向」，见设计文档 4.2。
//
// W3C Device Orientation 规范定义旋转矩阵 R = Rz(alpha)·Rx(beta)·Ry(gamma)。
// 地球的「上」方向 (0,0,1) 在设备坐标系中的表示是 R 的第三行：
//   up = (-cos β · sin γ,  sin β,  cos β · cos γ)
// 设备坐标系：x 指向手机右侧（竖屏时），y 指向手机顶部，z 垂直屏幕向外。
//
// 这个向量与 alpha 无关，并且在 gamma = ±90° 的欧拉角奇异点处连续，
// 所以比直接使用 beta / gamma 可靠。

const DEG = Math.PI / 180

export interface Gravity {
  /** 屏幕倾角：+90 屏幕朝天，0 屏幕竖直，-90 屏幕朝地 */
  tilt: number
  /** 「上」方向在设备 x 轴上的分量，接近 ±1 表示横屏竖立 */
  upX: number
  /** 「上」方向在设备 y 轴上的分量，接近 +1 表示竖屏竖立 */
  upY: number
  /** 「上」方向在屏幕法线上的分量，即 sin(tilt) */
  upZ: number
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
}

function fromUp(upX: number, upY: number, upZ: number): Gravity {
  return { upX, upY, upZ, tilt: Math.asin(clamp(upZ, -1, 1)) / DEG }
}

export function gravityFromOrientation(beta: number, gamma: number): Gravity {
  const b = beta * DEG
  const g = gamma * DEG
  return fromUp(-Math.cos(b) * Math.sin(g), Math.sin(b), Math.cos(b) * Math.cos(g))
}

/**
 * 备用数据源：由 devicemotion 的 accelerationIncludingGravity 计算。
 * 规范规定静止平放、屏幕朝上时 z ≈ +9.8，即读数指向「上」，此时 sign = 1。
 * 部分 iOS 版本符号相反，需实机确认后传入 sign = -1。
 * 读数过小（自由落体或数据异常）时返回 null。
 */
export function gravityFromAcceleration(
  x: number,
  y: number,
  z: number,
  sign: 1 | -1 = 1,
): Gravity | null {
  const n = Math.hypot(x, y, z)
  if (n < 2) return null
  return fromUp((sign * x) / n, (sign * y) / n, (sign * z) / n)
}

/** 是否横屏竖立：返回 1（设备 +x 朝上）、-1（设备 -x 朝上）或 0（不是横屏） */
export function landscapeSign(upX: number, threshold = 0.7): 1 | -1 | 0 {
  if (upX >= threshold) return 1
  if (upX <= -threshold) return -1
  return 0
}
