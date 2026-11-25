import type { CSSProperties, ReactNode } from 'react'
import type { StageRotation } from './stageRotation'
import './stage.css'

/** 横屏舞台：铺满屏幕，内容始终按横屏排版。rotation 由 stageRotation() 计算。 */
export function Stage({
  rotation,
  className = '',
  style,
  children,
}: {
  rotation: StageRotation
  className?: string
  style?: CSSProperties
  children: ReactNode
}) {
  return (
    <div className={`stage stage-r${rotation === 0 ? '0' : rotation > 0 ? 'cw' : 'ccw'} ${className}`} style={style}>
      {children}
    </div>
  )
}

/** 大字词语：字号随字数缩小，保证一行放得下 */
export function StageWord({ text }: { text: string }) {
  const chars = Math.max(2, [...text].length)
  return (
    <div className="stage-word" style={{ '--chars': chars } as CSSProperties}>
      {text}
    </div>
  )
}
