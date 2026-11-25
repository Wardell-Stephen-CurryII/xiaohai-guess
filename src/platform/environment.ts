// 阶段 0 用于确认手机访问环境：是否 HTTPS、是否支持所需的浏览器能力。

export interface EnvironmentCheck {
  label: string
  ok: boolean
  detail: string
}

type Probe = {
  isSecureContext: boolean
  hasDeviceOrientation: boolean
  needsOrientationPermission: boolean
  hasWakeLock: boolean
  hasAudioContext: boolean
  isStandalone: boolean
}

export function readProbe(): Probe {
  const orientation = (globalThis as { DeviceOrientationEvent?: { requestPermission?: unknown } })
    .DeviceOrientationEvent
  return {
    isSecureContext: window.isSecureContext,
    hasDeviceOrientation: orientation !== undefined,
    needsOrientationPermission: typeof orientation?.requestPermission === 'function',
    hasWakeLock: 'wakeLock' in navigator,
    hasAudioContext: 'AudioContext' in window,
    isStandalone:
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as { standalone?: boolean }).standalone === true,
  }
}

export function describeEnvironment(p: Probe): EnvironmentCheck[] {
  return [
    {
      label: 'HTTPS 安全上下文',
      ok: p.isSecureContext,
      detail: p.isSecureContext ? '是' : '否，传感器将不可用',
    },
    {
      label: '设备方向事件',
      ok: p.hasDeviceOrientation,
      detail: p.hasDeviceOrientation
        ? p.needsOrientationPermission
          ? '支持，需要点击授权'
          : '支持，无需授权'
        : '不支持',
    },
    { label: '屏幕常亮 Wake Lock', ok: p.hasWakeLock, detail: p.hasWakeLock ? '支持' : '不支持' },
    { label: 'Web Audio', ok: p.hasAudioContext, detail: p.hasAudioContext ? '支持' : '不支持' },
    {
      label: '主屏幕 Web App 模式',
      ok: true,
      detail: p.isStandalone ? '是' : '否（Safari 内打开）',
    },
  ]
}
