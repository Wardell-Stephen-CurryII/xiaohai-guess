import { useState } from 'react'
import { describeEnvironment, readProbe } from './platform/environment'

// 阶段 0：环境检查页。确认手机能通过 HTTPS 打开开发页面。
// 阶段 1 会在此基础上替换为传感器调试页。
export default function App() {
  const [checks] = useState(() => describeEnvironment(readProbe()))
  const [loadedAt] = useState(() => new Date().toLocaleTimeString('zh-CN'))

  return (
    <main className="env">
      <h1>小嗨猜猜猜</h1>
      <p className="env-sub">阶段 0 · 环境检查</p>
      <ul className="env-list">
        {checks.map((c) => (
          <li key={c.label} className={c.ok ? 'ok' : 'bad'}>
            <span>{c.label}</span>
            <span>{c.detail}</span>
          </li>
        ))}
      </ul>
      <p className="env-foot">页面加载时间：{loadedAt}</p>
    </main>
  )
}
