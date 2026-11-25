// 未捕获异常和调试日志，显示在调试页上（翻转测试时不方便看 Mac 的网页检查器）。

export interface LogEntry {
  time: string
  level: 'info' | 'error'
  message: string
}

const MAX = 50
const entries: LogEntry[] = []
const listeners = new Set<() => void>()

export function log(message: string, level: LogEntry['level'] = 'info'): void {
  entries.unshift({ time: new Date().toLocaleTimeString('zh-CN'), level, message })
  if (entries.length > MAX) entries.length = MAX
  for (const cb of listeners) cb()
}

export function getLog(): readonly LogEntry[] {
  return entries
}

export function onLog(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

let installed = false

export function installGlobalErrorHandlers(): void {
  if (installed) return
  installed = true
  window.addEventListener('error', (e) => log(`${e.message} @ ${e.filename}:${e.lineno}`, 'error'))
  window.addEventListener('unhandledrejection', (e) => log(`未处理的 Promise 拒绝：${String(e.reason)}`, 'error'))
}
