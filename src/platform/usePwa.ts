// Service Worker 注册与更新，见设计文档 8.2、8.6。
// 新版本下载好后不会自动刷新，由界面在安全的时机（首页、结算页）提示用户更新；
// 也可以在首页 / 「我的」页面手动「检查更新」。更新只替换程序文件，本地数据不受影响。

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

export type UpdateCheck = 'updating' | 'latest' | 'offline' | 'failed'

/**
 * 首次打开时下载离线数据的进度。
 * loading：正在下载，不允许开始游戏；ready：已可离线使用；
 * failed：下载失败（可以玩，但断网时可能打不开）；unsupported：浏览器不支持或开发模式，不显示。
 */
export interface CacheProgress {
  status: 'loading' | 'ready' | 'failed' | 'unsupported'
  done: number
  total: number | null
}

/** 超过这么久下载进度没有任何变化，视为失败 */
const STALL_MS = 30_000

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
  cache: CacheProgress
  /** 下载失败后重试（重新加载页面） */
  retryCache: () => void
}

/** 从 sw.js 里数出需要预缓存的文件数（vite-plugin-pwa 生成的格式为 precacheAndRoute([{url:"…"}, …])） */
async function precacheTotal(): Promise<number | null> {
  try {
    const text = await (await fetch(`${import.meta.env.BASE_URL}sw.js`, { cache: 'no-store' })).text()
    const n = text.match(/url:"/g)?.length ?? 0
    return n > 0 ? n : null
  } catch {
    return null
  }
}

/** 已经写入预缓存的文件数 */
async function precacheDone(): Promise<number> {
  const names = (await caches.keys()).filter((k) => k.startsWith('workbox-precache'))
  let n = 0
  for (const name of names) n += (await (await caches.open(name)).keys()).length
  return n
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
  const supported = !import.meta.env.DEV && typeof navigator !== 'undefined' && 'serviceWorker' in navigator && 'caches' in window
  const [cache, setCache] = useState<CacheProgress>(() => ({
    status: !supported ? 'unsupported' : navigator.serviceWorker.controller ? 'ready' : 'loading',
    done: 0,
    total: null,
  }))
  const {
    offlineReady: [offlineReady],
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError() {
      setCache((c) => (c.status === 'loading' ? { ...c, status: 'failed' } : c))
    },
    onRegisteredSW(_url, reg) {
      if (!reg) return
      registration.current = reg
      // 首次安装失败（下载中断等）时，安装中的 Service Worker 会变成 redundant
      reg.installing?.addEventListener('statechange', (e) => {
        if ((e.target as ServiceWorker).state === 'redundant') {
          setCache((c) => (c.status === 'loading' ? { ...c, status: 'failed' } : c))
        }
      })
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

  // 下载完成（offlineReady 事件）即可离线使用
  const progress: CacheProgress =
    offlineReady && cache.status === 'loading' ? { ...cache, status: 'ready', done: cache.total ?? cache.done } : cache

  // 首次下载时轮询进度；超过 30 秒没有进展视为失败
  const loading = progress.status === 'loading'
  useEffect(() => {
    if (!loading) return
    let stopped = false
    let last = -1
    let lastChange = Date.now()
    void precacheTotal().then((total) => !stopped && setCache((c) => ({ ...c, total })))
    const id = setInterval(async () => {
      const done = await precacheDone().catch(() => 0)
      if (stopped) return
      if (done !== last) {
        last = done
        lastChange = Date.now()
      }
      const reg = registration.current
      setCache((c) => {
        if (c.status !== 'loading') return c
        // 文件都已写入且 Service Worker 已激活：完成
        if (c.total !== null && done >= c.total && reg?.active) return { ...c, status: 'ready', done: c.total }
        if (Date.now() - lastChange > STALL_MS) return { ...c, done, status: 'failed' }
        return { ...c, done }
      })
    }, 300)
    return () => {
      stopped = true
      clearInterval(id)
    }
  }, [loading])

  const controlled = typeof navigator !== 'undefined' && !!navigator.serviceWorker?.controller
  return {
    cache: progress,
    retryCache: () => window.location.reload(),
    offlineReady: offlineReady || controlled || progress.status === 'ready',
    needRefresh,
    update: () => void updateServiceWorker(true),
    checkForUpdate,
    version: __APP_VERSION__,
  }
}
