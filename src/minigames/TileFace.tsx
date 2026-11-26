import type { TileDef } from './tiles'

/** 图块的显示内容：头像图片或矢量图标 */
export function TileFace({ tile }: { tile: TileDef }) {
  if (tile.image) return <img src={`${import.meta.env.BASE_URL}${tile.image}`} alt={tile.name} draggable={false} />
  return <>{tile.icon}</>
}
