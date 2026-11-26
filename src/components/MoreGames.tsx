// 首页「更多游戏」大框：真心话、大冒险可玩；连连看、消消乐敬请期待。

import type { CSSProperties } from 'react'
import { MINI_GAMES } from '../minigames/registry'
import { toast } from './toastBus'
import './moreGames.css'

export function MoreGames({ onOpen }: { onOpen: (hash: string) => void }) {
  return (
    <section className="more-games" aria-labelledby="more-games-title">
      <h2 id="more-games-title">更多游戏</h2>
      <div className="more-games-grid">
        {MINI_GAMES.map((g) => (
          <button
            key={g.id}
            className={`more-game${g.status === 'soon' ? ' soon' : ''}`}
            style={{ '--game': g.color } as CSSProperties}
            onClick={() => (g.status === 'ready' ? onOpen(g.hash) : toast(`${g.name}正在开发中，敬请期待`))}
          >
            <span className="theme-art more-game-art" aria-hidden>
              <span className="art-1">{g.art[0]}</span>
              <span className="art-2">{g.art[1]}</span>
              <span className="art-3">{g.art[2]}</span>
            </span>
            <span className="more-game-name">{g.name}</span>
            <span className="more-game-desc">{g.desc}</span>
            {g.status === 'soon' && <span className="more-game-soon">敬请期待</span>}
          </button>
        ))}
      </div>
    </section>
  )
}
