import { lazy, Suspense, useEffect, useState } from 'react'
import { useGameController } from './game/useGameController'
import { GamePage } from './pages/GamePage'
import { HomePage } from './pages/HomePage'
import { ResultPage } from './pages/ResultPage'
import { UpdateBanner } from './components/UpdateBanner'
import { usePwa } from './platform/usePwa'

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
  const pwa = usePwa()
  const { state, actions } = g
  // 只在首页和结算页提示更新，游戏中不打断
  const banner = pwa.needRefresh ? <UpdateBanner onUpdate={pwa.update} /> : null

  if (state.phase === 'home') {
    return (
      <>
        {banner}
        <HomePage settings={g.settings} onChange={g.updateSettings} onStart={actions.start} offlineReady={pwa.offlineReady} />
      </>
    )
  }
  if (state.phase === 'result') {
    return (
      <>
        {banner}
        <ResultPage state={state} themeId={g.settings.themeId} onPlayAgain={actions.playAgain} onHome={actions.goHome} />
      </>
    )
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
