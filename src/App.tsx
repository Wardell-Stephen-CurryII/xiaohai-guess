import { lazy, Suspense, useEffect, useState } from 'react'
import { ToastHost } from './components/Toast'
import { UpdateBanner } from './components/UpdateBanner'
import { useGameController } from './game/useGameController'
import { GamePage } from './pages/GamePage'
import { HomePage } from './pages/HomePage'
import { ProfilePage } from './pages/ProfilePage'
import { ResultPage } from './pages/ResultPage'
import { usePwa } from './platform/usePwa'
import { applyPalette } from './profile/applyPalette'

// 调试页、小游戏按需加载，不影响猜词游戏本身
const DebugPage = lazy(() => import('./pages/DebugPage'))
const TruthOrDarePage = lazy(() => import('./pages/TruthOrDarePage'))
const LinkPage = lazy(() => import('./pages/LinkPage'))
const Match3Page = lazy(() => import('./pages/Match3Page'))

function useHash(): string {
  const [hash, setHash] = useState(() => window.location.hash)
  useEffect(() => {
    const onChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return hash
}

const go = (hash: string) => {
  if (hash) window.location.hash = hash
  // 清掉 # 回到首页，不留下空的 #
  else history.pushState(null, '', window.location.pathname + window.location.search)
  window.dispatchEvent(new HashChangeEvent('hashchange'))
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
  return (
    <>
      <Game hash={hash} />
      <ToastHost />
    </>
  )
}

function Game({ hash }: { hash: string }) {
  const g = useGameController()
  const pwa = usePwa()
  const { state, actions, view } = g
  // 只在首页和结算页提示更新，游戏中不打断
  const banner = pwa.needRefresh ? <UpdateBanner onUpdate={pwa.update} /> : null

  useEffect(() => applyPalette(view.look.palette), [view.look.palette])

  // 小游戏：真心话 / 大冒险（连连看、消消乐上线后在这里加路由，见 src/minigames/registry.ts）
  if (state.phase === 'home' && (hash === '#truth' || hash === '#dare')) {
    return (
      <Suspense fallback={null}>
        <TruthOrDarePage initialKind={hash === '#truth' ? 'truth' : 'dare'} tod={g.tod} updateTod={g.updateTod} onBack={() => go('')} />
      </Suspense>
    )
  }

  if (state.phase === 'home' && hash === '#link') {
    return (
      <Suspense fallback={null}>
        <LinkPage
          cleared={g.minigames.link.cleared}
          onClear={(level, xp) => g.clearMiniGameLevel('link', level, xp)}
          onBack={() => go('')}
        />
      </Suspense>
    )
  }

  if (state.phase === 'home' && hash === '#match3') {
    return (
      <Suspense fallback={null}>
        <Match3Page
          stars={g.minigames.match3.stars}
          onClear={(level, xp, stars) => g.clearMiniGameLevel('match3', level, xp, stars)}
          onBack={() => go('')}
        />
      </Suspense>
    )
  }

  if (state.phase === 'home' && hash === '#me') {
    return (
      <ProfilePage
        profile={g.profile}
        vip={g.vip}
        view={view}
        now={g.nowMs}
        onBack={() => go('')}
        {...g.profileActions}
        version={pwa.version}
        checkForUpdate={pwa.checkForUpdate}
      />
    )
  }

  if (state.phase === 'home') {
    return (
      <>
        {banner}
        {g.notice && <UpdateBanner text={g.notice} actionText="知道了" onUpdate={g.profileActions.dismissNotice} />}
        <HomePage
          settings={g.settings}
          onChange={g.updateSettings}
          onStart={actions.start}
          offlineReady={pwa.offlineReady}
          view={view}
          onOpenProfile={() => go('#me')}
          version={pwa.version}
          checkForUpdate={pwa.checkForUpdate}
          cache={pwa.cache}
          onRetryCache={pwa.retryCache}
          onOpenGame={go}
        />
      </>
    )
  }
  if (state.phase === 'result') {
    return (
      <>
        {banner}
        <ResultPage
          state={state}
          themeId={g.settings.themeId}
          view={view}
          reward={g.reward}
          onPlayAgain={actions.playAgain}
          onHome={actions.goHome}
        />
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
