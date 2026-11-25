import { lazy, Suspense, useEffect, useState } from 'react'
import { useGameController } from './game/useGameController'
import { GamePage } from './pages/GamePage'
import { HomePage } from './pages/HomePage'
import { ResultPage } from './pages/ResultPage'

// 调试页按需加载，不影响游戏本身
const DebugPage = lazy(() => import('./pages/DebugPage'))

function useHash(): string {
  const [hash, setHash] = useState(() => window.location.hash)
  useEffect(() => {
    const onChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return hash
}

export default function App() {
  const hash = useHash()
  if (hash === '#debug') {
    return (
      <Suspense fallback={null}>
        <DebugPage />
      </Suspense>
    )
  }
  return <Game />
}

function Game() {
  const g = useGameController()
  const { state, actions } = g

  if (state.phase === 'home') {
    return <HomePage settings={g.settings} onChange={g.updateSettings} onStart={actions.start} />
  }
  if (state.phase === 'result') {
    return <ResultPage state={state} themeId={g.settings.themeId} onPlayAgain={actions.playAgain} onHome={actions.goHome} />
  }
  return (
    <GamePage
      state={state}
      now={g.now}
      sensorProblem={g.sensorProblem}
      landscape={g.landscape}
      inPose={g.inPose}
      sensorStale={g.sensorStale}
      onChooseButtons={actions.chooseButtons}
      onStartButtonsRound={actions.startButtonsRound}
      onAnswer={actions.answer}
      onPause={actions.pause}
      onResume={actions.resume}
      onEnd={actions.endRound}
      onHome={actions.goHome}
    />
  )
}
