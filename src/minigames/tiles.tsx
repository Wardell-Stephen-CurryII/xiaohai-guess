// 小游戏图块：作者的 3 张头像 + 16 个扁平风格的矢量图标（与头像的插画风格统一）。
// 图标都画在 64×64 的画布里，放大缩小都清晰，不占下载体积。

import type { ReactNode } from 'react'

export interface TileDef {
  id: string
  name: string
  /** 图块底色 */
  bg: string
  /** 头像图片（public/minigames/faces/）；没有则用 icon */
  image?: string
  icon?: ReactNode
}

const svg = (children: ReactNode) => (
  <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
    {children}
  </svg>
)

export const FACE_TILES: TileDef[] = [
  { id: 'face-1', name: '小嗨一号', bg: '#FFA48C', image: 'minigames/faces/face-1.png' },
  { id: 'face-2', name: '小嗨二号', bg: '#9FD3FA', image: 'minigames/faces/face-2.png' },
  { id: 'face-3', name: '小嗨三号', bg: '#A8EBC3', image: 'minigames/faces/face-3.png' },
]

export const ICON_TILES: TileDef[] = [
  {
    id: 'strawberry',
    name: '草莓',
    bg: '#FFE1E1',
    icon: svg(
      <g transform="translate(32 32) scale(1.22) translate(-32 -32)">
        <path d="M32 54C20 46 13 36 15 27c2-7 10-9 17-6 7-3 15-1 17 6 2 9-5 19-17 27z" fill="#F0485B" />
        <path d="M22 18c4 1 7 3 10 5 3-2 6-4 10-5-2 4-5 6-10 7-5-1-8-3-10-7z" fill="#3FA34D" />
        {[
          [24, 31],
          [32, 29],
          [40, 31],
          [27, 39],
          [37, 39],
          [32, 46],
        ].map(([x, y]) => (
          <ellipse key={`${x}${y}`} cx={x} cy={y} rx="1.4" ry="2" fill="#FFE08A" />
        ))}
      </g>,
    ),
  },
  {
    id: 'lemon',
    name: '柠檬',
    bg: '#FFF4C2',
    icon: svg(
      <>
        <path d="M10 33c4-14 18-21 31-17 6-3 11-1 13 1-1 3-1 7-3 9 1 14-14 25-29 22-6 1-10-1-12-4 1-3 0-7 0-11z" fill="#FFD43B" />
        <path d="M22 26c5-5 12-6 18-4" stroke="#FFF3A6" strokeWidth="3" strokeLinecap="round" fill="none" />
      </>,
    ),
  },
  {
    id: 'watermelon',
    name: '西瓜',
    bg: '#DFF6E4',
    icon: svg(
      <>
        <path d="M8 26h48c0 15-11 26-24 26S8 41 8 26z" fill="#2F9E44" />
        <path d="M13 26h38c0 12-9 21-19 21s-19-9-19-21z" fill="#FF6B6B" />
        {[
          [24, 32],
          [32, 36],
          [40, 32],
          [28, 41],
          [36, 41],
        ].map(([x, y]) => (
          <ellipse key={`${x}${y}`} cx={x} cy={y} rx="1.6" ry="2.4" fill="#2B2B2B" />
        ))}
      </>,
    ),
  },
  {
    id: 'sakura',
    name: '樱花',
    bg: '#FFE6F0',
    icon: svg(
      <>
        {[0, 72, 144, 216, 288].map((a) => (
          <ellipse key={a} cx="32" cy="19" rx="8" ry="12" fill="#FF8FB8" transform={`rotate(${a} 32 32)`} />
        ))}
        <circle cx="32" cy="32" r="6" fill="#FFD43B" />
      </>,
    ),
  },
  {
    id: 'star',
    name: '星星',
    bg: '#FFF1C9',
    icon: svg(
      <path
        d="M32 9l6.8 14.5 15.9 2-11.6 11 3 15.8L32 44.6 17.9 52.3l3-15.8-11.6-11 15.9-2z"
        fill="#FFC21A"
        stroke="#F59F00"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />,
    ),
  },
  {
    id: 'moon',
    name: '月亮',
    bg: '#E3E7FF',
    icon: svg(
      <>
        <path d="M42 10a22 22 0 1 0 12 32A18 18 0 0 1 42 10z" fill="#FFD43B" />
        <circle cx="26" cy="30" r="2.5" fill="#F5B800" />
        <circle cx="30" cy="42" r="1.8" fill="#F5B800" />
      </>,
    ),
  },
  {
    id: 'cloud',
    name: '云朵',
    bg: '#D6EEFF',
    icon: svg(
      <path d="M18 46h30a10 10 0 0 0 1-20 14 14 0 0 0-27-3 11 11 0 0 0-4 23z" fill="#FFFFFF" stroke="#9CC9F0" strokeWidth="2.5" />,
    ),
  },
  {
    id: 'balloon',
    name: '气球',
    bg: '#FFE3D6',
    icon: svg(
      <>
        <ellipse cx="32" cy="26" rx="14" ry="17" fill="#FF6B3D" />
        <path d="M29 43h6l-3 4z" fill="#E8551F" />
        <path d="M32 47c-3 4 3 7 0 11" stroke="#8A8A8A" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <ellipse cx="26" cy="19" rx="3.5" ry="5" fill="#FFB094" />
      </>,
    ),
  },
  {
    id: 'donut',
    name: '甜甜圈',
    bg: '#FFF0E0',
    icon: svg(
      <>
        <circle cx="32" cy="33" r="20" fill="#E9A15B" />
        <path d="M13 31a19 19 0 0 1 38 0c-2 3-4 1-6 4s-5 0-7 3-5 0-7 2-5-1-6-3-5 1-7-2-3-1-5-4z" fill="#FF8FC8" />
        <circle cx="32" cy="33" r="6.5" fill="#FFF0E0" />
        {[
          [22, 25, 0],
          [40, 23, 50],
          [44, 31, -30],
          [27, 18, 70],
          [21, 33, 20],
        ].map(([x, y, a]) => (
          <rect key={`${x}${y}`} x={x} y={y} width="5" height="1.8" rx="0.9" fill="#FFFFFF" transform={`rotate(${a} ${x} ${y})`} />
        ))}
      </>,
    ),
  },
  {
    id: 'clover',
    name: '四叶草',
    bg: '#DDF5DA',
    icon: svg(
      <>
        {[0, 90, 180, 270].map((a) => (
          <path key={a} d="M32 31c-3-6-12-8-12-15 0-5 6-7 9-3l3 4 3-4c3-4 9-2 9 3 0 7-9 9-12 15z" fill="#40C057" transform={`rotate(${a} 32 32) translate(0 -2)`} />
        ))}
        <path d="M33 35c3 7 6 12 11 16" stroke="#2F9E44" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </>,
    ),
  },
  {
    id: 'umbrella',
    name: '雨伞',
    bg: '#E6E0FF',
    icon: svg(
      <>
        <path d="M8 32a24 24 0 0 1 48 0c-3-3-6-3-8 0-3-3-7-3-8 0-3-3-6-3-8 0-2-3-6-3-8 0-3-3-6-3-8 0-3-3-6-3-8 0z" fill="#7950F2" />
        <path d="M32 32v17a5 5 0 0 1-10 0" stroke="#495057" strokeWidth="3" fill="none" strokeLinecap="round" />
      </>,
    ),
  },
  {
    id: 'note',
    name: '音符',
    bg: '#D9F4F7',
    icon: svg(
      <>
        <path d="M26 14l22-5v30" stroke="#0C8599" strokeWidth="4" fill="none" strokeLinejoin="round" />
        <path d="M26 14v32" stroke="#0C8599" strokeWidth="4" />
        <ellipse cx="20" cy="47" rx="7" ry="5.5" fill="#15AABF" />
        <ellipse cx="42" cy="40" rx="7" ry="5.5" fill="#15AABF" />
      </>,
    ),
  },
  {
    id: 'heart',
    name: '爱心',
    bg: '#FFE0E6',
    icon: svg(
      <>
        <path d="M32 53C18 43 9 35 9 24c0-7 5-12 12-12 5 0 9 3 11 7 2-4 6-7 11-7 7 0 12 5 12 12 0 11-9 19-23 29z" fill="#FA5252" />
        <ellipse cx="20" cy="23" rx="3.5" ry="5" fill="#FF8787" transform="rotate(-25 20 23)" />
      </>,
    ),
  },
  {
    id: 'bolt',
    name: '闪电',
    bg: '#FFF3BF',
    icon: svg(<path d="M36 6L14 36h14l-4 22 24-32H34z" fill="#FAB005" stroke="#E67700" strokeWidth="2.5" strokeLinejoin="round" />),
  },
  {
    id: 'fish',
    name: '小鱼',
    bg: '#FFE8CC',
    icon: svg(
      <g transform="translate(32 32) scale(1.22) translate(-32 -32)">
        <path d="M10 32c8-12 24-14 34-4l10-8v24l-10-8c-10 10-26 8-34-4z" fill="#FD7E14" />
        <circle cx="22" cy="30" r="2.6" fill="#343A40" />
        <path d="M30 26c2 4 2 8 0 12" stroke="#FFC078" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </g>,
    ),
  },
  {
    id: 'mushroom',
    name: '蘑菇',
    bg: '#FFE3E3',
    icon: svg(
      <>
        <path d="M10 32a22 18 0 0 1 44 0z" fill="#E03131" />
        <rect x="24" y="32" width="16" height="18" rx="6" fill="#FFF4E6" />
        <circle cx="22" cy="24" r="3.5" fill="#FFFFFF" />
        <circle cx="38" cy="21" r="4.5" fill="#FFFFFF" />
        <circle cx="45" cy="29" r="2.5" fill="#FFFFFF" />
      </>,
    ),
  },
]

/** 消消乐的 6 种糖果：颜色和形状都不同（色弱也能分清），带一点高光 */
export const CANDY_TILES: TileDef[] = [
  {
    id: 'candy-red',
    name: '红心糖',
    bg: 'transparent',
    icon: svg(
      <>
        <path d="M32 55C17 44 8 36 8 24c0-8 6-13 13-13 5 0 9 3 11 7 2-4 6-7 11-7 7 0 13 5 13 13 0 12-9 20-24 31z" fill="#F03E3E" />
        <ellipse cx="20" cy="22" rx="4" ry="6" fill="#FFA8A8" transform="rotate(-25 20 22)" />
      </>,
    ),
  },
  {
    id: 'candy-orange',
    name: '橙色方糖',
    bg: 'transparent',
    icon: svg(
      <>
        <rect x="10" y="10" width="44" height="44" rx="12" fill="#FF922B" />
        <rect x="16" y="16" width="32" height="32" rx="8" fill="#FFA94D" />
        <rect x="18" y="18" width="10" height="6" rx="3" fill="#FFE8CC" />
      </>,
    ),
  },
  {
    id: 'candy-yellow',
    name: '星星糖',
    bg: 'transparent',
    icon: svg(
      <>
        <path d="M32 6l7.6 16.2 17.8 2.3-13 12.3 3.4 17.6L32 45.8 16.2 54.4l3.4-17.6-13-12.3 17.8-2.3z" fill="#FCC419" stroke="#F59F00" strokeWidth="2.5" strokeLinejoin="round" />
        <ellipse cx="26" cy="24" rx="3" ry="4.5" fill="#FFF3BF" transform="rotate(-30 26 24)" />
      </>,
    ),
  },
  {
    id: 'candy-green',
    name: '水滴糖',
    bg: 'transparent',
    icon: svg(
      <>
        <path d="M32 6C24 18 13 28 13 40a19 19 0 0 0 38 0C51 28 40 18 32 6z" fill="#40C057" />
        <ellipse cx="25" cy="38" rx="3.5" ry="6" fill="#B2F2BB" transform="rotate(15 25 38)" />
      </>,
    ),
  },
  {
    id: 'candy-blue',
    name: '蓝宝石糖',
    bg: 'transparent',
    icon: svg(
      <>
        <circle cx="32" cy="32" r="23" fill="#228BE6" />
        <circle cx="32" cy="32" r="14" fill="#4DABF7" />
        <ellipse cx="24" cy="22" rx="5" ry="3.5" fill="#D0EBFF" transform="rotate(-35 24 22)" />
      </>,
    ),
  },
  {
    id: 'candy-purple',
    name: '紫钻糖',
    bg: 'transparent',
    icon: svg(
      <>
        <path d="M32 6l24 26-24 26L8 32z" fill="#7950F2" />
        <path d="M32 6l10 26-10 26-10-26z" fill="#9775FA" />
        <path d="M20 26l6-7" stroke="#E5DBFF" strokeWidth="3" strokeLinecap="round" />
      </>,
    ),
  },
]

/** 连连看可用的全部图块：头像在前，保证每关都会出现 */
export const LINK_TILES: TileDef[] = [...FACE_TILES, ...ICON_TILES]

/**
 * 某一关使用的图块：3 张头像 + 按关卡轮换的图标，让每关看起来不一样。
 * types 为本关图块种类数。
 */
export function tilesForLevel(level: number, types: number): TileDef[] {
  const iconCount = Math.max(0, types - FACE_TILES.length)
  const start = ((level - 1) * 5) % ICON_TILES.length
  const icons = Array.from({ length: iconCount }, (_, i) => ICON_TILES[(start + i) % ICON_TILES.length])
  return [...FACE_TILES.slice(0, Math.min(types, FACE_TILES.length)), ...icons]
}
