// Service Worker 注册与更新，见设计文档 8.2、8.6。
// 新版本下载好后不会自动刷新，由界面在安全的时机（首页、结算页）提示用户更新；
// 也可以在首页 / 「我的」页面手动「检查更新」。更新只替换程序文件，本地数据不受影响。

import { useCallback, useRef } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

export type UpdateCheck = 'updating' | 'latest' | 'offline' | 'failed'

export interface PwaStatus {
  /** 资源已全部缓存，断网也能打开 */
  offlineReady: boolean
  /** 有新版本等待启用 */
  needRefresh: boolean
  /** 启用新版本并刷新页面 */
  update: () => void
  /** 手动检查更新：有新版本时直接更新 */
  checkForUpdate: () => Promise<UpdateCheck>
  version: string
}

/** 等待新的 Service Worker 安装完成进入 waiting 状态 */
function waitForWaiting(reg: ServiceWorkerRegistration, timeoutMs: number): Promise<boolean> {
  if (reg.waiting) return Promise.resolve(true)
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(!!reg.waiting), timeoutMs)
    const watch = (sw: ServiceWorker | null) => {
      if (!sw) return
      sw.addEventListener('statechange', () => {
        if (sw.state === 'installed') {
          clearTimeout(timer)
          resolve(true)
        } else if (sw.state === 'redundant') {
          clearTimeout(timer)
          resolve(false)
        }
      })
    }
    if (reg.installing) watch(reg.installing)
    else reg.addEventListener('updatefound', () => watch(reg.installing), { once: true })
  })
}

export function usePwa(): PwaStatus {
  const registration = useRef<ServiceWorkerRegistration | null>(null)
  const {
    offlineReady: [offlineReady],
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      if (!reg) return
      registration.current = reg
      // 每次回到前台时检查一次更新
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void reg.update()
      })
    },
  })

  const checkForUpdate = useCallback(async (): Promise<UpdateCheck> => {
    if (!navigator.onLine) return 'offline'
    const reg = registration.current
    if (!reg) return 'failed'
    try {
      if (!reg.waiting) {
        await reg.update()
        const found = !!reg.installing || !!reg.waiting
        if (!found) return 'latest'
        if (!(await waitForWaiting(reg, 10_000))) return 'failed'
      }
      void updateServiceWorker(true)
      return 'updating'
    } catch {
      return navigator.onLine ? 'failed' : 'offline'
    }
  }, [updateServiceWorker])

  // 之前已经安装过的话，offlineReady 事件不会再次触发；页面已受 Service Worker 控制也说明可离线使用
  const controlled = typeof navigator !== 'undefined' && !!navigator.serviceWorker?.controller
  return {
    offlineReady: offlineReady || controlled,
    needRefresh,
    update: () => void updateServiceWorker(true),
    checkForUpdate,
    version: __APP_VERSION__,
  }
}
