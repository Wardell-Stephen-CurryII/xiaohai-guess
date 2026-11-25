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
  onPlayAgain,
  onHome,
}: {
  state: GameState
  onPlayAgain: () => void
  onHome: () => void
}) {
  const s = summarize(state)
  const accuracy = s.accuracy === null ? '--' : `${Math.round(s.accuracy * 100)}%`

  return (
    <main className="result">
      <p className={`result-over${state.endedEarly ? ' early' : ''}`}>{state.endedEarly ? '这局结束' : '时间到'}</p>
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

      {s.correct.length + s.skipped.length === 0 && <p className="result-empty">这局一个词也没翻，再来一局试试。</p>}
      <WordList title="答对的词" cards={s.correct} tone="ok" />
      <WordList title="跳过的词" cards={s.skipped} tone="skip" />
      <WordList title="没来得及猜" cards={s.unfinished ? [s.unfinished] : []} tone="left" />

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
