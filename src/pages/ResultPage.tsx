import type { CSSProperties } from 'react'
import { ThemeArt } from '../components/ThemeArt'
import { BadgeMedal, ProfileStrip } from '../components/profile/ProfileBits'
import { TipLink } from '../components/Tip'
import { badgeById } from '../profile/catalog'
import type { RoundReward } from '../profile/progress'
import type { ProfileView } from '../profile/view'
import { themeStyle } from '../data/themeStyle'
import { summarize, type GameState } from '../game/gameReducer'
import type { Card } from '../game/types'
import './result.css'

function WordList({ title, cards, tone }: { title: string; cards: Card[]; tone: 'ok' | 'skip' | 'left' }) {
  if (cards.length === 0) return null
  return (
    <section className="result-list">
      <h2>
        {title}
        <span className="result-list-n">{cards.length}</span>
      </h2>
      <ul className={`result-words tone-${tone}`}>
        {cards.map((c, i) => (
          <li key={`${c.text}-${i}`}>{c.text}</li>
        ))}
      </ul>
    </section>
  )
}

export function ResultPage({
  state,
  themeId,
  view,
  reward,
  onPlayAgain,
  onHome,
}: {
  state: GameState
  themeId: string
  view: ProfileView
  reward: RoundReward | null
  onPlayAgain: () => void
  onHome: () => void
}) {
  const s = summarize(state)
  const accuracy = s.accuracy === null ? '--' : `${Math.round(s.accuracy * 100)}%`

  return (
    <main className="result">
      <section className="result-hero" style={{ '--theme': themeStyle(themeId).color } as CSSProperties}>
        <ThemeArt themeId={themeId} className="art-result" />
        <p className="result-over">{state.endedEarly ? '这局结束' : '时间到'}</p>
        <div className="result-score">
          <span className="result-score-num">{s.correct.length}</span>
          <span className="result-score-label">答对</span>
        </div>
        <dl className="result-stats">
          <div>
            <dt>跳过</dt>
            <dd>{s.skipped.length}</dd>
          </div>
          <div>
            <dt>正确率</dt>
            <dd>{accuracy}</dd>
          </div>
        </dl>
      </section>

      <div className="result-player">
        <ProfileStrip view={view} size={40} />
        {reward && (reward.xpGained > 0 || reward.levelUp || reward.newBadges.length > 0) && (
          <ul className="result-rewards">
            {reward.xpGained > 0 && <li>经验 +{reward.xpGained}</li>}
            {reward.levelUp && (
              <li className="result-levelup">
                升级到 Lv{reward.levelUp.to}「{reward.levelUp.title}」
              </li>
            )}
            {reward.newBadges.map((id) => (
              <li key={id} className="result-newbadge">
                <BadgeMedal id={id} size={22} /> 获得新徽章：{badgeById(id)?.name}
              </li>
            ))}
          </ul>
        )}
      </div>

      {s.correct.length + s.skipped.length === 0 && <p className="result-empty">这局一个词也没翻，再来一局试试。</p>}
      <WordList title="答对的词" cards={s.correct} tone="ok" />
      <WordList title="跳过的词" cards={s.skipped} tone="skip" />
      <WordList title="没来得及猜" cards={s.unfinished ? [s.unfinished] : []} tone="left" />

      <TipLink />

      <footer className="result-actions">
        <button className="btn btn-primary" onClick={onPlayAgain}>
          再玩一局
        </button>
        <button className="btn" onClick={onHome}>
          换个主题
        </button>
      </footer>
    </main>
  )
}
