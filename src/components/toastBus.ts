// 轻量提示的消息通道：toast('文字') 由 <ToastHost /> 显示。

type Listener = (msg: string) => void
const listeners = new Set<Listener>()

export function toast(message: string): void {
  for (const l of listeners) l(message)
}

export function onToast(l: Listener): () => void {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}
