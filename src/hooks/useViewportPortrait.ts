import { useEffect, useState } from 'react'

const QUERY = '(orientation: portrait)'

/** 视口当前是否为竖屏。开启竖排方向锁定时，手机横过来视口仍是竖屏。 */
export function useViewportPortrait(): boolean {
  const [portrait, setPortrait] = useState(() => window.matchMedia(QUERY).matches)
  useEffect(() => {
    const mq = window.matchMedia(QUERY)
    const onChange = () => setPortrait(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return portrait
}
