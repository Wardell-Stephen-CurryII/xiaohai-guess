import { describe, expect, it } from 'vitest'
import {
  COUNTDOWN_MS,
  TAP_FEEDBACK_MS,
  countdownNumber,
  gameReducer,
  initialGameState,
  remainingMs,
  shownCards,
  summarize,
  type GameAction,
  type GameState,
} from './gameReducer'
import type { Card } from './types'

const deck: Card[] = ['大熊猫', '火锅', '青花瓷', '秦始皇'].map((text) => ({ themeId: 't', text }))
const MIN = 60_000

function apply(state: GameState, ...actions: GameAction[]): GameState {
  return actions.reduce(gameReducer, state)
}

/** 走到 playing：开局时刻 0 就绪，3 秒后开始，结束时刻 63000 */
function playing(mode: 'sensor' | 'buttons' = 'sensor'): GameState {
  const s = apply(
    initialGameState,
    { type: 'start', deck, durationMs: MIN },
    { type: 'setInputMode', mode },
    { type: 'poseReady', now: 0 },
    { type: 'tick', now: COUNTDOWN_MS },
  )
  expect(s.phase).toBe('playing')
  return s
}

describe('流程', () => {
  it('home → permission → ready → countdown → playing', () => {
    let s = gameReducer(initialGameState, { type: 'start', deck, durationMs: MIN })
    expect(s.phase).toBe('permission')
    s = gameReducer(s, { type: 'setInputMode', mode: 'sensor' })
    expect(s.phase).toBe('ready')
    s = gameReducer(s, { type: 'poseReady', now: 1000 })
    expect(s.phase).toBe('countdown')
    expect(countdownNumber(s, 1000)).toBe(3)
    expect(countdownNumber(s, 2500)).toBe(2)
    expect(countdownNumber(s, 3999)).toBe(1)
    s = gameReducer(s, { type: 'tick', now: 3999 })
    expect(s.phase).toBe('countdown')
    s = gameReducer(s, { type: 'tick', now: 4010 })
    expect(s.phase).toBe('playing')
    // 计时从倒计时结束的时刻算起，不受 tick 延迟影响
    expect(s.deadline).toBe(4000 + MIN)
  })

  it('空牌堆不能开始', () => {
    expect(gameReducer(initialGameState, { type: 'start', deck: [], durationMs: MIN })).toBe(initialGameState)
  })

  it('倒计时期间（ready 之前）的 poseReady 被忽略', () => {
    const s = gameReducer(initialGameState, { type: 'poseReady', now: 0 })
    expect(s.phase).toBe('home')
  })
})

describe('答题', () => {
  it('传感器模式：答对 → 反馈 → 回正后下一题', () => {
    let s = playing()
    s = gameReducer(s, { type: 'answer', outcome: 'correct', now: 5000 })
    expect(s.turn).toBe('feedback')
    expect(s.lastOutcome).toBe('correct')
    expect(s.index).toBe(0)
    s = gameReducer(s, { type: 'neutral' })
    expect(s.turn).toBe('showing')
    expect(s.index).toBe(1)
  })

  it('传感器模式下点屏幕按钮：显示反馈，0.6 秒后自动下一题（不用等回正）', () => {
    let s = playing()
    s = gameReducer(s, { type: 'answer', outcome: 'correct', now: 5000, via: 'tap' })
    expect(s.turn).toBe('feedback')
    expect(s.lastOutcome).toBe('correct')
    s = gameReducer(s, { type: 'tick', now: 5000 + TAP_FEEDBACK_MS - 1 })
    expect(s.turn).toBe('feedback')
    s = gameReducer(s, { type: 'tick', now: 5000 + TAP_FEEDBACK_MS })
    expect(s.turn).toBe('showing')
    expect(s.index).toBe(1)
    expect(s.feedbackUntil).toBeNull()
    expect(s.records).toEqual([{ card: deck[0], outcome: 'correct' }])
  })

  it('翻转手机答题：不会自动下一题，要等回正', () => {
    let s = playing()
    s = gameReducer(s, { type: 'answer', outcome: 'skip', now: 5000 })
    s = gameReducer(s, { type: 'tick', now: 9000 })
    expect(s.turn).toBe('feedback')
    s = gameReducer(s, { type: 'neutral' })
    expect(s.turn).toBe('showing')
  })

  it('点按钮后手机也回正了：只前进一题', () => {
    let s = playing()
    s = apply(s, { type: 'answer', outcome: 'skip', now: 5000, via: 'tap' }, { type: 'neutral' }, { type: 'tick', now: 6000 })
    expect(s.index).toBe(1)
    expect(s.turn).toBe('showing')
  })

  it('反馈期间的动作不重复记录', () => {
    let s = playing()
    s = apply(s, { type: 'answer', outcome: 'correct', now: 5000 }, { type: 'answer', outcome: 'skip', now: 5100 })
    expect(s.records).toHaveLength(1)
  })

  it('按钮模式：点击后直接下一题', () => {
    let s = playing('buttons')
    s = gameReducer(s, { type: 'answer', outcome: 'skip', now: 5000 })
    expect(s.turn).toBe('showing')
    expect(s.index).toBe(1)
    expect(s.records).toEqual([{ card: deck[0], outcome: 'skip' }])
  })

  it('牌堆用完后循环', () => {
    let s = playing('buttons')
    for (let i = 0; i < deck.length; i++) s = gameReducer(s, { type: 'answer', outcome: 'correct', now: 5000 + i })
    expect(s.index).toBe(0)
  })
})

describe('时间到', () => {
  it('屏幕上的词记为未完成', () => {
    let s = playing()
    s = apply(s, { type: 'answer', outcome: 'correct', now: 5000 }, { type: 'neutral' })
    s = gameReducer(s, { type: 'tick', now: 3000 + MIN })
    expect(s.phase).toBe('result')
    expect(s.unfinished).toEqual(deck[1])
    expect(s.playedMs).toBe(MIN)
    expect(summarize(s)).toEqual({ correct: [deck[0]], skipped: [], unfinished: deck[1], accuracy: 1 })
    expect(shownCards(s)).toEqual([deck[0], deck[1]])
  })

  it('时间到时正处于反馈画面：没有未完成的词', () => {
    let s = playing()
    s = gameReducer(s, { type: 'answer', outcome: 'skip', now: 5000 })
    s = gameReducer(s, { type: 'tick', now: 3000 + MIN })
    expect(s.unfinished).toBeNull()
  })

  it('超时后到达的动作不计分', () => {
    let s = playing()
    s = gameReducer(s, { type: 'answer', outcome: 'correct', now: 3000 + MIN + 5 })
    expect(s.phase).toBe('result')
    expect(s.records).toEqual([])
  })

  it('等待回正期间计时继续', () => {
    let s = playing()
    s = gameReducer(s, { type: 'answer', outcome: 'correct', now: 5000 })
    expect(remainingMs(s, 10_000)).toBe(3000 + MIN - 10_000)
  })

  it('没有完成任何题目时正确率为 null', () => {
    const s = gameReducer(playing(), { type: 'tick', now: 3000 + MIN })
    expect(summarize(s).accuracy).toBeNull()
  })
})

describe('暂停', () => {
  it('暂停期间不扣时间，恢复后重新就绪和倒计时', () => {
    let s = playing()
    s = gameReducer(s, { type: 'pause', now: 13_000 })
    expect(s.phase).toBe('paused')
    expect(s.remainingMs).toBe(MIN - 10_000)
    expect(remainingMs(s, 99_999)).toBe(MIN - 10_000)
    s = gameReducer(s, { type: 'resume' })
    expect(s.phase).toBe('ready')
    s = apply(s, { type: 'poseReady', now: 100_000 }, { type: 'tick', now: 103_000 })
    expect(s.phase).toBe('playing')
    expect(s.deadline).toBe(103_000 + MIN - 10_000)
  })

  it('停在反馈画面时暂停，恢复后换下一题', () => {
    let s = playing()
    s = apply(s, { type: 'answer', outcome: 'correct', now: 5000 }, { type: 'pause', now: 6000 }, { type: 'resume' })
    expect(s.turn).toBe('showing')
    expect(s.index).toBe(1)
  })

  it('倒计时中暂停：剩余时长不变', () => {
    let s = apply(
      initialGameState,
      { type: 'start', deck, durationMs: MIN },
      { type: 'setInputMode', mode: 'sensor' },
      { type: 'poseReady', now: 0 },
      { type: 'pause', now: 1000 },
    )
    expect(s.phase).toBe('paused')
    expect(s.remainingMs).toBe(MIN)
    s = gameReducer(s, { type: 'tick', now: 5000 })
    expect(s.phase).toBe('paused')
  })
})

describe('提前结束', () => {
  it('暂停中结束本局：进入结算，屏幕上的词记为未完成', () => {
    let s = playing()
    s = apply(s, { type: 'answer', outcome: 'correct', now: 5000 }, { type: 'neutral' }, { type: 'pause', now: 6000 }, { type: 'end' })
    expect(s.phase).toBe('result')
    expect(s.records).toHaveLength(1)
    expect(s.unfinished).toEqual(deck[1])
    expect(s.endedEarly).toBe(true)
    // 3 秒时开始计时、6 秒时暂停：实际玩了 3 秒
    expect(s.playedMs).toBe(3000)
  })

  it('首页时 end 无效', () => {
    expect(gameReducer(initialGameState, { type: 'end' })).toBe(initialGameState)
  })
})

describe('结算之后', () => {
  it('再玩一局：新牌堆、清空记录、沿用输入方式，直接进入就绪', () => {
    let s = gameReducer(playing('buttons'), { type: 'tick', now: 3000 + MIN })
    const deck2 = [{ themeId: 't', text: '长城' }]
    s = gameReducer(s, { type: 'playAgain', deck: deck2 })
    expect(s.phase).toBe('ready')
    expect(s.inputMode).toBe('buttons')
    expect(s.records).toEqual([])
    expect(s.deck).toEqual(deck2)
    expect(s.remainingMs).toBe(MIN)
  })

  it('返回首页', () => {
    const s = gameReducer(playing(), { type: 'goHome' })
    expect(s.phase).toBe('home')
    expect(s.deck).toEqual([])
  })
})
