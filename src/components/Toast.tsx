// 轻量提示：任何地方调用 toast('文字')（见 toastBus.ts），由 App 中的 <ToastHost /> 显示 2.5 秒。

import { useEffect, useState } from 'react'
import { onToast } from './toastBus'
import './toast.css'

export function ToastHost() {
  const [msg, setMsg] = useState<{ text: string; key: number } | null>(null)
  useEffect(() => {
    return onToast((text) => setMsg({ text, key: Date.now() }))
  }, [])
  useEffect(() => {
    if (!msg) return
    const id = setTimeout(() => setMsg(null), 2500)
    return () => clearTimeout(id)
  }, [msg])
  if (!msg) return null
  return (
    <div className="toast" role="status" key={msg.key}>
      {msg.text}
    </div>
  )
}
