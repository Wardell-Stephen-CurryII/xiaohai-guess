import { themeStyle } from '../data/themeStyle'

/** 主题配图：一大两小三个 emoji，位置和大小由外层 CSS 的 .theme-art 变体控制 */
export function ThemeArt({ themeId, className }: { themeId: string; className: string }) {
  const [a, b, c] = themeStyle(themeId).art
  return (
    <span className={`theme-art ${className}`} aria-hidden>
      <span className="art-1">{a}</span>
      <span className="art-2">{b}</span>
      <span className="art-3">{c}</span>
    </span>
  )
}
