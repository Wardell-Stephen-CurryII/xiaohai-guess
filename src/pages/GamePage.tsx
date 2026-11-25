import type { CSSProperties } from 'react'
import { Stage, StageWord } from '../components/Stage'
import { ThemeArt } from '../components/ThemeArt'
import { themeStyle } from '../data/themeStyle'
import { stageRotation } from '../components/stageRotation'
import { countdownNumber, currentCard, remainingMs, type GameState } from '../game/gameReducer'
import type { SensorProblem } from '../game/useGameController'
import type { Outcome } from '../game/types'
import { useViewportPortrait } from '../hooks/useViewportPortrait'
import './game.css'

const PROBLEM_TEXT: Record<Exclude<SensorProblem, null>, string> = {
  denied:
    '没有拿到「动作与方向」权限，翻转手机不会有反应。完全关掉这个应用再重新打开，点开始时会重新询问。现在也可以先用屏幕按钮玩。',
  unsupported: '这个浏览器读不到手机的方向，翻转手机不会有反应。可以用屏幕按钮玩。',
  'no-data': '手机方向数据没有传过来，翻转手机不会有反应。可以用屏幕按钮玩，或者回首页重新开始。',
}

function formatTime(ms: number): string {
  const s = Math.ceil(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export interface GamePageProps {
  state: GameState
  now: number
  sensorProblem: SensorProblem
  landscape: 1 | -1
  inPose: boolean
  sensorStale: boolean
  onChooseButtons: () => void
  onStartButtonsRound: () => void
  onAnswer: (o: Outcome) => void
  onPause: () => void
  onResume: () => void
  onEnd: () => void
  onHome: () => void
}

export function GamePage(p: GamePageProps) {
  const portrait = useViewportPortrait()
  const { state } = p

  // ---- 不需要举起手机的画面：按普通页面显示，方便直接阅读 ----
  if (state.phase === 'permission') {
    return (
      <main className="game-page">
        {p.sensorProblem ? (
          <>
            <h1>翻转用不了</h1>
            <p>{PROBLEM_TEXT[p.sensorProblem]}</p>
            <div className="game-page-actions">
              <button className="btn btn-primary" onClick={p.onChooseButtons}>
                用按钮玩
              </button>
              <button className="btn" onClick={p.onHome}>
                回首页
              </button>
            </div>
          </>
        ) : (
          <h1>正在连接传感器…</h1>
        )}
      </main>
    )
  }

  if (state.phase === 'ready') {
    if (state.inputMode === 'buttons') {
      return (
        <main className="game-page">
          <h1>用按钮玩</h1>
          <p>把手机横过来，屏幕朝向朋友。猜中点右下角「答对」，想换词点左下角「跳过」。</p>
          <div className="game-page-actions">
            <button className="btn btn-primary" onClick={p.onStartButtonsRound}>
              开始倒数
            </button>
            <button className="btn" onClick={p.onHome}>
              回首页
            </button>
          </div>
        </main>
      )
    }
    return (
      <main className={`game-page game-ready${p.inPose ? ' in-pose' : ''}`}>
        <h1>把手机横过来举起</h1>
        <p>屏幕朝向朋友，拿稳了就开始倒数。</p>
        <div className="game-ready-flip" aria-hidden>
          <span className="flip-down">屏幕朝下：答对</span>
          <span className="flip-up">屏幕朝上：跳过</span>
        </div>
        <p className="game-ready-status" aria-live="polite">
          {p.inPose ? '拿稳了，马上开始' : '等待手机横过来…'}
        </p>
        <div className="game-page-actions">
          <button className="text-link" onClick={p.onChooseButtons}>
            改用按钮玩
          </button>
          <button className="text-link" onClick={p.onHome}>
            回首页
          </button>
        </div>
      </main>
    )
  }

  if (state.phase === 'paused') {
    return (
      <main className="game-page">
        <h1>暂停了</h1>
        <p>
          还剩 {formatTime(state.remainingMs)}，答对 {state.records.filter((r) => r.outcome === 'correct').length} 个。继续之后会重新倒数。
        </p>
        <div className="game-page-actions">
          <button className="btn btn-primary" onClick={p.onResume}>
            继续
          </button>
          <button className="btn" onClick={p.onEnd}>
            结束这局
          </button>
        </div>
      </main>
    )
  }

  // ---- 举起手机时的画面：横屏舞台 ----
  const rotation = stageRotation(portrait, p.landscape)
  const card = currentCard(state)
  const themeId = card?.themeId ?? ''
  const themeVars = { '--theme': themeStyle(themeId).color } as CSSProperties

  if (state.phase === 'countdown') {
    return (
      <Stage rotation={rotation} className="game-stage game-countdown" style={themeVars}>
        <ThemeArt themeId={themeId} className="art-stage" />
        <div className="game-countdown-num" key={countdownNumber(state, p.now)}>
          {countdownNumber(state, p.now)}
        </div>
      </Stage>
    )
  }

  // playing
  const left = remainingMs(state, p.now)
  const score = state.records.filter((r) => r.outcome === 'correct').length
  const feedback = state.turn === 'feedback' ? state.lastOutcome : null
  const buttonsProminent = state.inputMode === 'buttons' || p.sensorStale

  return (
    <Stage rotation={rotation} className={`game-stage${feedback ? ` game-fb-${feedback}` : ''}`} style={themeVars}>
      {!feedback && <ThemeArt themeId={themeId} className="art-stage" />}
      <div className={`game-timer${left <= 5000 ? ' hurry' : ''}`}>{formatTime(left)}</div>
      <div className="game-score" aria-label={`答对 ${score} 个`}>
        {score}
      </div>

      {feedback ? (
        <div className="game-feedback">{feedback === 'correct' ? '答对' : '跳过'}</div>
      ) : (
        card && <StageWord text={card.text} />
      )}

      {p.sensorStale && <div className="game-stale">翻转没反应？用下面的按钮</div>}

      <div className={`game-controls${buttonsProminent ? ' prominent' : ''}`}>
        <button className="game-btn game-btn-skip" onClick={() => p.onAnswer('skip')} disabled={!!feedback}>
          跳过
        </button>
        <button className="game-btn game-btn-pause" onClick={p.onPause}>
          暂停
        </button>
        <button className="game-btn game-btn-ok" onClick={() => p.onAnswer('correct')} disabled={!!feedback}>
          答对
        </button>
      </div>
    </Stage>
  )
}
