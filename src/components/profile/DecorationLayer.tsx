// 背景装饰层：铺在首页、「我的」页面后面，不接收点击。出题画面不使用。

import type { CSSProperties } from 'react'
import { decorationById } from '../../profile/catalog'
import './decoration.css'

const COUNT = 14

/** 固定的伪随机数，保证每次渲染位置一致 */
function rand(i: number, salt: number): number {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453
  return x - Math.floor(x)
}

export function DecorationLayer({ id }: { id: string }) {
  const d = decorationById(id)
  if (d.items.length === 0) return null
  return (
    <div className={`deco-layer deco-${d.motion}`} aria-hidden>
      {Array.from({ length: COUNT }, (_, i) => (
        <span
          key={i}
          className="deco-item"
          style={
            {
              left: `${rand(i, 1) * 96}%`,
              top: `${rand(i, 2) * 96}%`,
              fontSize: `${1 + rand(i, 3) * 1.1}rem`,
              '--delay': `${-rand(i, 4) * 12}s`,
              '--dur': `${8 + rand(i, 5) * 8}s`,
              '--rot': `${(rand(i, 6) - 0.5) * 50}deg`,
            } as CSSProperties
          }
        >
          {d.items[i % d.items.length]}
        </span>
      ))}
    </div>
  )
}
