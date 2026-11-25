// Service Worker 注册与更新提示，见设计文档 8.2、8.6。
// 新版本下载好后不会自动刷新，由界面在安全的时机（首页、结算页）提示用户更新。

import { useRegisterSW } from 'virtual:pwa-register/react'

export interface PwaStatus {
  /** 资源已全部缓存，断网也能打开 */
  offlineReady: boolean
  /** 有新版本等待启用 */
  needRefresh: boolean
  /** 启用新版本并刷新页面 */
  update: () => void
}

export function usePwa(): PwaStatus {
  const {
    offlineReady: [offlineReady],
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // 每次回到前台时检查一次更新
      if (!registration) return
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void registration.update()
      })
    },
  })

  // 之前已经安装过的话，offlineReady 事件不会再次触发；页面已受 Service Worker 控制也说明可离线使用
  const controlled = typeof navigator !== 'undefined' && !!navigator.serviceWorker?.controller
  return { offlineReady: offlineReady || controlled, needRefresh, update: () => void updateServiceWorker(true) }
}
