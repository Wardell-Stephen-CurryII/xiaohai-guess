// 资料展示用的小组件：头像（含头像框）、称号、徽章、会员角标、名字、资料条。

import type { CSSProperties } from 'react'
import { avatarById, badgeById, frameById, RARITY_LABEL, titleById } from '../../profile/catalog'
import type { Tier } from '../../profile/types'
import type { ProfileView } from '../../profile/view'
import './profileBits.css'

export function Avatar({ avatar, frame, size = 48 }: { avatar: string; frame: string; size?: number }) {
  const a = avatarById(avatar)
  const f = frameById(frame)
  return (
    <span className={`avatar frame-${f.id}`} style={{ '--size': `${size}px`, '--avatar-bg': a.bg } as CSSProperties} aria-hidden>
      <span className="avatar-face">{a.emoji}</span>
      {f.ornament && <span className={`avatar-ornament at-${f.ornament.at}`}>{f.ornament.emoji}</span>}
    </span>
  )
}

export function TitleTag({ title, showRarity = false }: { title: string; showRarity?: boolean }) {
  const t = titleById(title)
  return (
    <span className={`title-tag rarity-${t.rarity}`}>
      {showRarity && t.rarity !== 'level' && <span className="title-rarity">{RARITY_LABEL[t.rarity]}</span>}
      {t.name}
    </span>
  )
}

export function BadgeMedal({ id, size = 28, dim = false }: { id: string; size?: number; dim?: boolean }) {
  const b = badgeById(id)
  if (!b) return null
  return (
    <span
      className={`badge-medal${b.shiny ? ' shiny' : ''}${dim ? ' dim' : ''}`}
      style={{ '--size': `${size}px`, '--c1': b.colors[0], '--c2': b.colors[1] } as CSSProperties}
      title={`${b.name}：${b.desc}`}
      role="img"
      aria-label={b.name}
    >
      <span className="badge-emoji">{b.emoji}</span>
    </span>
  )
}

export function TierMark({ tier }: { tier: Tier }) {
  if (tier === 'free') return null
  return <span className={`tier-mark tier-${tier}`}>{tier === 'svip' ? 'SVIP' : 'VIP'}</span>
}

export function PlayerName({ name, nameStyle }: { name: string; nameStyle: string }) {
  return <span className={`player-name name-${nameStyle}`}>{name}</span>
}

/** 首页 / 结算页上的资料条 */
export function ProfileStrip({ view, onClick, size = 44 }: { view: ProfileView; onClick?: () => void; size?: number }) {
  const { look } = view
  const body = (
    <>
      <Avatar avatar={look.avatar} frame={look.frame} size={size} />
      <span className="strip-text">
        <span className="strip-line">
          <PlayerName name={view.name} nameStyle={look.nameStyle} />
          <TierMark tier={view.tier} />
        </span>
        <span className="strip-line">
          <TitleTag title={look.title} />
          {look.worn.map((id) => (
            <BadgeMedal key={id} id={id} size={20} />
          ))}
        </span>
      </span>
    </>
  )
  if (!onClick) return <div className="profile-strip">{body}</div>
  return (
    <button className="profile-strip clickable" onClick={onClick} aria-label="打开我的资料">
      {body}
      <span className="strip-more" aria-hidden>
        我的 ›
      </span>
    </button>
  )
}
