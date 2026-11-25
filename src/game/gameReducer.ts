// 游戏流程状态，见设计文档 3.4 与 4.6（第一层：应用阶段；第二层：出题状态）。
// 纯函数：时间由动作传入（performance.now()），不读取时钟。

import type { Card, Outcome, RoundRecord } from './types'
import { nextIndex } from './wordDeck'

export type Phase = 'home' | 'permission' | 'ready' | 'countdown' | 'playing' | 'paused' | 'result'
export type InputMode = 'sensor' | 'buttons'
/** playing 内部：显示词语中，或者显示答对 / 跳过反馈、等待手机回正 */
export type Turn = 'showing' | 'feedback'

export const COUNTDOWN_MS = 3000

export interface GameState {
  phase: Phase
  inputMode: InputMode
  deck: Card[]
  index: number
  turn: Turn
  lastOutcome: Outcome | null
  records: RoundRecord[]
  /** 时间到时仍在屏幕上的词，不计入答对或跳过 */
  unfinished: Card | null
  durationMs: number
  /** 尚未开始或暂停时的剩余时长 */
  remainingMs: number
  /** playing 阶段的结束时刻 */
  deadline: number | null
  /** countdown 阶段的结束时刻 */
  countdownEndsAt: number | null
}

export type GameAction =
  | { type: 'start'; deck: Card[]; durationMs: number }
  | { type: 'setInputMode'; mode: InputMode }
  | { type: 'poseReady'; now: number }
  | { type: 'tick'; now: number }
  | { type: 'answer'; outcome: Outcome; now: number }
  | { type: 'neutral' }
  | { type: 'pause'; now: number }
  | { type: 'resume' }
  | { type: 'playAgain'; deck: Card[] }
  | { type: 'goHome' }

export const initialGameState: GameState = {
  phase: 'home',
  inputMode: 'sensor',
  deck: [],
  index: 0,
  turn: 'showing',
  lastOutcome: null,
  records: [],
  unfinished: null,
  durationMs: 60_000,
  remainingMs: 60_000,
  deadline: null,
  countdownEndsAt: null,
}

function newRound(state: GameState, deck: Card[], durationMs: number): GameState {
  return {
    ...state,
    deck,
    index: 0,
    turn: 'showing',
    lastOutcome: null,
    records: [],
    unfinished: null,
    durationMs,
    remainingMs: durationMs,
    deadline: null,
    countdownEndsAt: null,
  }
}

function finish(state: GameState): GameState {
  return {
    ...state,
    phase: 'result',
    unfinished: state.turn === 'showing' ? (state.deck[state.index] ?? null) : null,
    remainingMs: 0,
    deadline: null,
  }
}

function advance(state: GameState): GameState {
  return { ...state, index: nextIndex(state.deck, state.index), turn: 'showing', lastOutcome: null }
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'start':
      if (action.deck.length === 0) return state
      return { ...newRound(state, action.deck, action.durationMs), phase: 'permission' }

    case 'setInputMode':
      if (state.phase !== 'permission') return { ...state, inputMode: action.mode }
      return { ...state, inputMode: action.mode, phase: 'ready' }

    case 'poseReady':
      if (state.phase !== 'ready') return state
      return { ...state, phase: 'countdown', countdownEndsAt: action.now + COUNTDOWN_MS }

    case 'tick':
      if (state.phase === 'countdown' && state.countdownEndsAt !== null && action.now >= state.countdownEndsAt) {
        return {
          ...state,
          phase: 'playing',
          deadline: state.countdownEndsAt + state.remainingMs,
          countdownEndsAt: null,
        }
      }
      if (state.phase === 'playing' && state.deadline !== null && action.now >= state.deadline) {
        return finish(state)
      }
      return state

    case 'answer': {
      if (state.phase !== 'playing' || state.turn !== 'showing') return state
      if (state.deadline !== null && action.now >= state.deadline) return finish(state)
      const card = state.deck[state.index]
      const next = { ...state, records: [...state.records, { card, outcome: action.outcome }] }
      // 按钮模式不需要等待回正，直接下一题（设计文档 4.9）
      if (state.inputMode === 'buttons') return advance(next)
      return { ...next, turn: 'feedback', lastOutcome: action.outcome }
    }

    case 'neutral':
      if (state.phase !== 'playing' || state.turn !== 'feedback') return state
      return advance(state)

    case 'pause':
      if (state.phase === 'playing' && state.deadline !== null) {
        return { ...state, phase: 'paused', remainingMs: Math.max(0, state.deadline - action.now), deadline: null }
      }
      if (state.phase === 'countdown') return { ...state, phase: 'paused', countdownEndsAt: null }
      return state

    case 'resume': {
      if (state.phase !== 'paused') return state
      // 暂停后重新走「就绪检测 → 3-2-1」；停在反馈画面上的话直接换下一题
      const s = state.turn === 'feedback' ? advance(state) : state
      return { ...s, phase: 'ready' }
    }

    case 'playAgain':
      if (state.phase !== 'result' || action.deck.length === 0) return state
      return { ...newRound(state, action.deck, state.durationMs), phase: 'ready' }

    case 'goHome':
      return { ...newRound(state, [], state.durationMs), phase: 'home' }
  }
}

// ---- 派生数据 ----

export function currentCard(state: GameState): Card | null {
  return state.deck[state.index] ?? null
}

export function remainingMs(state: GameState, now: number): number {
  if (state.phase === 'playing' && state.deadline !== null) return Math.max(0, state.deadline - now)
  return state.remainingMs
}

/** 3-2-1 倒计时显示的数字；不在倒计时阶段时为 null */
export function countdownNumber(state: GameState, now: number): number | null {
  if (state.phase !== 'countdown' || state.countdownEndsAt === null) return null
  return Math.max(1, Math.ceil((state.countdownEndsAt - now) / 1000))
}

/** 本局出现过的所有词（含未完成的那个），用于跨局去重 */
export function shownCards(state: GameState): Card[] {
  const cards = state.records.map((r) => r.card)
  if (state.unfinished) cards.push(state.unfinished)
  return cards
}

export interface RoundSummary {
  correct: Card[]
  skipped: Card[]
  unfinished: Card | null
  /** 正确率 0~1；没有完成任何题目时为 null，显示为「--」 */
  accuracy: number | null
}

export function summarize(state: GameState): RoundSummary {
  const correct = state.records.filter((r) => r.outcome === 'correct').map((r) => r.card)
  const skipped = state.records.filter((r) => r.outcome === 'skip').map((r) => r.card)
  const total = correct.length + skipped.length
  return { correct, skipped, unfinished: state.unfinished, accuracy: total === 0 ? null : correct.length / total }
}
