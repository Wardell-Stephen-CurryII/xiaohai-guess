// 屏幕常亮，见设计文档 4.8。
// 页面进入后台时系统会释放锁；回到前台后，如果仍需要常亮，自动重新申请。

export type WakeLockStatus = 'unsupported' | 'idle' | 'requesting' | 'active' | 'released' | 'error'

export class ScreenWakeLock {
  private sentinel: WakeLockSentinel | null = null
  private wanted = false
  private _status: WakeLockStatus = 'wakeLock' in navigator ? 'idle' : 'unsupported'
  private listeners = new Set<(s: WakeLockStatus, detail?: string) => void>()

  constructor() {
    document.addEventListener('visibilitychange', this.onVisibility)
  }

  get status(): WakeLockStatus {
    return this._status
  }

  onChange(cb: (s: WakeLockStatus, detail?: string) => void): () => void {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  async acquire(): Promise<void> {
    this.wanted = true
    if (!('wakeLock' in navigator) || this.sentinel) return
    this.set('requesting')
    try {
      const s = await navigator.wakeLock.request('screen')
      this.sentinel = s
      s.addEventListener('release', () => {
        this.sentinel = null
        this.set('released', this.wanted ? '被系统释放' : '已主动释放')
      })
      this.set('active')
    } catch (e) {
      this.set('error', e instanceof Error ? `${e.name}: ${e.message}` : String(e))
    }
  }

  release(): void {
    this.wanted = false
    void this.sentinel?.release()
  }

  dispose(): void {
    this.release()
    document.removeEventListener('visibilitychange', this.onVisibility)
  }

  private onVisibility = () => {
    if (document.visibilityState === 'visible' && this.wanted && !this.sentinel) void this.acquire()
  }

  private set(s: WakeLockStatus, detail?: string) {
    this._status = s
    for (const cb of this.listeners) cb(s, detail)
  }
}
