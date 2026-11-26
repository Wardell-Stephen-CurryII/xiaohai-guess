// 把纯逻辑（gameReducer）和浏览器能力（传感器、音效、屏幕常亮、计时）接在一起。

import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react'
import { THEMES } from '../data/themes'
import { setAudioSessionType, SoundPlayer } from '../platform/audio'
import { loadData, requestPersistentStorage, saveData, type StoredData, type TodData } from '../platform/storage'
import { levelFor } from '../profile/progress'
import { decodeBackup, encodeBackup } from '../profile/backup'
import { validateName } from '../profile/names'
import { applyRound, type RoundReward } from '../profile/progress'
import type { Look } from '../profile/types'
import { profileView } from '../profile/view'
import { ACTIVATE_ERROR_TEXT, activate, makeFetchCodeList, verify } from '../profile/vip'
import { ScreenWakeLock } from '../platform/wakeLock'
import { MotionInput } from '../sensor/motionInput'
import { requestMotionPermission } from '../sensor/orientationSource'
import { landscapeSign } from '../sensor/tilt'
import { countdownNumber, gameReducer, initialGameState, remainingMs, shownCards, summarize } from './gameReducer'
import type { Outcome, Settings } from './types'
import { createDeck, markSeen } from './wordDeck'

const sound = new SoundPlayer()
const motion = new MotionInput()
const wakeLock = new ScreenWakeLock()

/** 设计文档 4.3：授权后 1 秒内收不到数据，视为传感器不可用 */
const SENSOR_DATA_TIMEOUT_MS = 1000

export type SensorProblem = null | 'denied' | 'unsupported' | 'no-data'

const fetchCodeList = makeFetchCodeList(`${import.meta.env.BASE_URL}vip/codes.json`)

export interface ActionResult {
  ok: boolean
  message: string
}

export function useGameController() {
  const [stored, setStored] = useState<StoredData>(() => loadData(localStorage))
  const [state, dispatch] = useReducer(gameReducer, initialGameState)
  const [now, setNow] = useState(() => performance.now())
  const [sensorProblem, setSensorProblem] = useState<SensorProblem>(null)
  /** 开局时锁定的横屏方向，决定舞台旋转方向（设计文档 5.4） */
  const [landscape, setLandscape] = useState<1 | -1>(1)
  const [inPose, setInPose] = useState(false)
  // 传感器回调在 React 之外触发，通过 ref 读取最新状态
  const stateRef = useRef(state)
  useLayoutEffect(() => {
    stateRef.current = state
  }, [state])

  // 异步回调（联网核对等）里也要拿到最新数据，所以用 ref 保存一份
  const storedRef = useRef(stored)
  const update = useCallback((fn: (d: StoredData) => StoredData) => {
    const next = fn(storedRef.current)
    storedRef.current = next
    setStored(next)
    saveData(localStorage, next)
  }, [])

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => update((d) => ({ ...d, settings: { ...d.settings, ...patch } })),
    [update],
  )

  // ---- 个人资料与会员 ----
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [reward, setReward] = useState<RoundReward | null>(null)
  /** 会员被作废等需要告知用户的消息 */
  const [notice, setNotice] = useState<string | null>(null)
  const view = profileView(stored.profile, stored.vip, nowMs)

  const updateLook = useCallback(
    (patch: Partial<Look>) => update((d) => ({ ...d, profile: { ...d.profile, look: { ...d.profile.look, ...patch } } })),
    [update],
  )

  const rename = useCallback(
    (input: string): ActionResult => {
      if (view.tier === 'free') return { ok: false, message: '开通 VIP 后可以改名字' }
      const r = validateName(input)
      if (!r.ok) return { ok: false, message: r.reason }
      update((d) => ({ ...d, profile: { ...d.profile, name: r.name } }))
      return { ok: true, message: '名字已修改' }
    },
    [update, view.tier],
  )

  const activateVip = useCallback(
    async (input: string): Promise<ActionResult> => {
      const now = Date.now()
      const r = await activate(input, storedRef.current.vip, fetchCodeList, now)
      if (!r.ok) return { ok: false, message: ACTIVATE_ERROR_TEXT[r.reason] }
      update((d) => ({ ...d, vip: r.vip }))
      setNowMs(now)
      const name = r.vip.tier === 'svip' ? 'SVIP' : 'VIP'
      return { ok: true, message: r.upgraded ? `已升级为 ${name}，谢谢支持！` : `${name} 已开通，谢谢支持！` }
    },
    [update],
  )

  const exportBackup = useCallback(() => encodeBackup(storedRef.current.profile), [])

  // 小游戏通关：记录进度（消消乐保留最高星数）；首次通关奖励经验，返回是否首次和是否升级
  const clearMiniGameLevel = useCallback(
    (game: 'link' | 'match3', level: number, xp: number, stars = 0): { first: boolean; xpGained: number; levelUp: { to: number; title: string } | null } => {
      const d = storedRef.current
      const first = game === 'link' ? !d.minigames.link.cleared.includes(level) : !(String(level) in d.minigames.match3.stars)
      const gain = first ? xp : 0
      const before = levelFor(d.profile.xp)
      const after = levelFor(d.profile.xp + gain)
      update((s) => {
        const mg = s.minigames
        const next =
          game === 'link'
            ? { ...mg, link: { cleared: first ? [...mg.link.cleared, level].sort((a, b) => a - b) : mg.link.cleared } }
            : { ...mg, match3: { set: mg.match3.set, stars: { ...mg.match3.stars, [level]: Math.max(stars, mg.match3.stars[String(level)] ?? 0) } } }
        return { ...s, profile: { ...s.profile, xp: s.profile.xp + gain }, minigames: next }
      })
      return { first, xpGained: gain, levelUp: after.level > before.level ? { to: after.level, title: after.title } : null }
    },
    [update],
  )

  // 真心话 / 大冒险：劲爆开关和已抽记录
  const updateTod = useCallback((fn: (t: TodData) => TodData) => update((d) => ({ ...d, tod: fn(d.tod) })), [update])

  const restoreBackup = useCallback(
    (input: string): ActionResult => {
      const r = decodeBackup(input)
      if (!r.ok) return { ok: false, message: r.reason }
      update((d) => ({ ...d, profile: r.profile }))
      return { ok: true, message: '存档已恢复' }
    },
    [update],
  )

  // 启动时：申请持久存储；联网时后台核对会员（作废则取消，联网失败保持原样）
  useEffect(() => {
    requestPersistentStorage()
    const vip = storedRef.current.vip
    if (!vip) return
    let cancelled = false
    void verify(vip, fetchCodeList, Date.now()).then((r) => {
      if (cancelled) return
      if (r.status === 'ok') update((d) => ({ ...d, vip: r.vip }))
      else if (r.status === 'revoked') {
        update((d) => ({ ...d, vip: null }))
        setNotice('你的激活码已失效，会员已取消。如有疑问请联系作者。')
      }
      setNowMs(Date.now())
    })
    return () => {
      cancelled = true
    }
  }, [update])

  // 会员状态（30 天规则）按分钟刷新
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])

  const newDeck = useCallback(
    () => createDeck(THEMES, stored.settings.themeId, stored.seen, Math.random),
    [stored],
  )

  // ---- 开始：必须在点击处理函数中同步调用权限申请和音频解锁 ----
  const start = useCallback(() => {
    const permission = requestMotionPermission()
    setAudioSessionType('playback')
    sound.unlock()
    sound.enabled = stored.settings.soundOn
    motion.setSensitivity(stored.settings.sensitivity)
    motion.start()
    setSensorProblem(null)
    dispatch({ type: 'start', deck: newDeck(), durationMs: stored.settings.durationSec * 1000 })

    void permission.then(async (result) => {
      if (result === 'denied' || result === 'error') return setSensorProblem('denied')
      if (result === 'unsupported') return setSensorProblem('unsupported')
      const ok = await motion.waitForData(SENSOR_DATA_TIMEOUT_MS)
      if (ok) dispatch({ type: 'setInputMode', mode: 'sensor' })
      else setSensorProblem('no-data')
    })
  }, [stored, newDeck])

  const chooseButtons = useCallback(() => {
    setSensorProblem(null)
    dispatch({ type: 'setInputMode', mode: 'buttons' })
  }, [])

  const answer = useCallback((outcome: Outcome) => {
    // 屏幕按钮：传感器模式下显示反馈后自动下一题，不等回正
    dispatch({ type: 'answer', outcome, now: performance.now(), via: 'tap' })
  }, [])

  const startButtonsRound = useCallback(() => dispatch({ type: 'poseReady', now: performance.now() }), [])
  const pause = useCallback(() => dispatch({ type: 'pause', now: performance.now() }), [])
  const resume = useCallback(() => dispatch({ type: 'resume' }), [])
  const goHome = useCallback(() => dispatch({ type: 'goHome' }), [])
  const playAgain = useCallback(() => {
    sound.unlock()
    dispatch({ type: 'playAgain', deck: newDeck() })
  }, [newDeck])
  const endRound = useCallback(() => dispatch({ type: 'end' }), [])

  // ---- 传感器事件 → 动作 ----
  useEffect(
    () =>
      motion.on((e, g) => {
        const s = stateRef.current
        if (e === 'poseReady') {
          if (s.phase !== 'ready' || s.inputMode !== 'sensor') return
          setLandscape(landscapeSign(g.upX) === -1 ? -1 : 1)
          dispatch({ type: 'poseReady', now: performance.now() })
        } else if (e === 'ready') {
          dispatch({ type: 'neutral' })
        } else if (s.inputMode === 'sensor') {
          dispatch({ type: 'answer', outcome: e, now: performance.now() })
        }
      }),
    [],
  )

  // ---- 各阶段的传感器模式和屏幕常亮 ----
  useEffect(() => {
    const sensorMode = state.inputMode === 'sensor'
    if (state.phase === 'ready' && sensorMode) motion.setMode('readiness')
    else if (state.phase === 'playing' && sensorMode) motion.setMode('gesture')
    else motion.setMode('idle')

    const active = ['ready', 'countdown', 'playing', 'paused'].includes(state.phase)
    if (active) void wakeLock.acquire()
    else wakeLock.release()
    if (state.phase === 'home') motion.stop()
  }, [state.phase, state.inputMode])

  // ---- 计时：倒计时和游戏中每 100ms 推进一次 ----
  useEffect(() => {
    if (state.phase !== 'countdown' && state.phase !== 'playing' && state.phase !== 'ready') return
    const id = setInterval(() => {
      const t = performance.now()
      setNow(t)
      dispatch({ type: 'tick', now: t })
      if (stateRef.current.phase === 'ready') setInPose(motion.inReadyPose())
    }, 100)
    return () => clearInterval(id)
  }, [state.phase])

  // ---- 音效 ----
  const lastCount = useRef<number | null>(null)
  const lastSecond = useRef<number | null>(null)
  useEffect(() => {
    const n = countdownNumber(state, now)
    if (n !== null && n !== lastCount.current) sound.play('count')
    lastCount.current = n
    if (state.phase === 'playing') {
      const sec = Math.ceil(remainingMs(state, now) / 1000)
      if (sec !== lastSecond.current && sec <= 5 && sec >= 1) sound.play('tick')
      lastSecond.current = sec
    } else {
      lastSecond.current = null
    }
  }, [state, now])

  const prevPhase = useRef(state.phase)
  const prevRecords = useRef(0)
  useEffect(() => {
    const from = prevPhase.current
    prevPhase.current = state.phase
    if (from === 'countdown' && state.phase === 'playing') sound.play('go')
    if (from !== 'result' && state.phase === 'result') sound.play('finish')
    if (state.records.length > prevRecords.current) sound.play(state.records[state.records.length - 1].outcome)
    prevRecords.current = state.records.length

    // 一局结束：记录出过的词（跨局去重），计入经验、统计和成就
    if (from !== 'result' && state.phase === 'result') {
      const s = summarize(state)
      const r = applyRound(storedRef.current.profile, {
        correct: s.correct,
        skipped: s.skipped,
        durationSec: state.durationMs / 1000,
        endedEarly: state.endedEarly,
        playedMs: state.playedMs,
        hour: new Date().getHours(),
        allThemeIds: THEMES.map((t) => t.id),
      })
      setReward(r)
      update((d) => ({ ...d, seen: markSeen(THEMES, d.seen, shownCards(state)), profile: r.profile }))
    }
  }, [state, update])

  // ---- 切到后台自动暂停 ----
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') dispatch({ type: 'pause', now: performance.now() })
    }
    document.addEventListener('visibilitychange', onHide)
    return () => document.removeEventListener('visibilitychange', onHide)
  }, [])

  useEffect(() => {
    sound.enabled = stored.settings.soundOn
  }, [stored.settings.soundOn])

  return {
    state,
    now,
    settings: stored.settings,
    updateSettings,
    sensorProblem,
    landscape,
    inPose,
    sensorStale: state.phase === 'playing' && state.inputMode === 'sensor' && motion.isStale(now),
    actions: { start, chooseButtons, answer, startButtonsRound, pause, resume, goHome, playAgain, endRound },
    profile: stored.profile,
    vip: stored.vip,
    tod: stored.tod,
    updateTod,
    minigames: stored.minigames,
    clearMiniGameLevel,
    view,
    nowMs,
    reward,
    notice,
    profileActions: {
      updateLook,
      rename,
      activateVip,
      exportBackup,
      restoreBackup,
      dismissNotice: () => setNotice(null),
    },
  }
}
