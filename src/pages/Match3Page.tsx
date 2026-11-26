// 消消乐：选关页 + 游戏页。交换相邻两块凑成三连消除，在限定步数内完成目标。
// 支持滑动交换，也支持先点一块、再点相邻的一块。

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { LevelSelect } from '../components/minigames/LevelSelect'
import { toast } from '../components/toastBus'
import { SoundPlayer } from '../platform/audio'
import { CLEAR_XP, DIFFICULTY_LABEL } from '../minigames/difficulty'
import {
  adjacent,
  allGoalsDone,
  applyMove,
  createGame,
  findMove,
  goalProgress,
  reshuffle,
  starsFor,
  type GameState,
  type Goal,
  type Piece,
  type Pos,
} from '../minigames/match3/engine'
import { MATCH3_LEVELS, type Match3Level } from '../minigames/match3/levels'
import { TileFace } from '../minigames/TileFace'
import { CANDY_TILES, FACE_TILES, type TileDef } from '../minigames/tiles'
import type { ClearResult } from './LinkPage'
import './link.css'
import './match3.css'

const sound = new SoundPlayer()
const TILE_BY_ID = new Map<string, TileDef>([...CANDY_TILES, ...FACE_TILES].map((t) => [t.id, t]))
const HINT_DELAY_MS = 6000
const POP_MS = 200
const FALL_MS = 260

export default function Match3Page({
  stars,
  onClear,
  onBack,
}: {
  stars: Record<string, number>
  onClear: (level: number, xp: number, stars: number) => ClearResult
  onBack: () => void
}) {
  const [playing, setPlaying] = useState<Match3Level | null>(null)
  if (playing) {
    return (
      <Match3Game
        key={playing.level}
        level={playing}
        onClear={onClear}
        onLevels={() => setPlaying(null)}
        onNext={() => setPlaying(MATCH3_LEVELS[playing.level] ?? null)}
      />
    )
  }
  return (
    <LevelSelect
      title="消消乐"
      intro="交换相邻的两块，横或竖连成 3 个就消除。在步数用完之前完成目标，剩的步数越多星越多。"
      levels={MATCH3_LEVELS}
      isPassed={(n) => String(n) in stars}
      badge={(n) => <Stars n={stars[String(n)] ?? 0} size="0.72rem" />}
      onPick={setPlaying}
      onBack={onBack}
    />
  )
}

function Stars({ n, size = '0.8rem' }: { n: number; size?: string }) {
  return (
    <span className="m3-stars" style={{ fontSize: size }} aria-label={`${n} 星`}>
      {[1, 2, 3].map((i) => (
        <span key={i} className={i <= n ? 'on' : ''}>
          ★
        </span>
      ))}
    </span>
  )
}

function PieceView({ piece, tiles }: { piece: Piece; tiles: TileDef[] }) {
  if (piece.special === 'rainbow') {
    return (
      <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
        <defs>
          <radialGradient id="m3-rainbow" cx="35%" cy="30%">
            <stop offset="0" stopColor="#fff" />
            <stop offset="0.25" stopColor="#ffd43b" />
            <stop offset="0.5" stopColor="#ff6b6b" />
            <stop offset="0.75" stopColor="#845ef7" />
            <stop offset="1" stopColor="#339af0" />
          </radialGradient>
        </defs>
        <circle cx="32" cy="32" r="24" fill="url(#m3-rainbow)" />
        <circle cx="32" cy="32" r="24" fill="none" stroke="#fff" strokeWidth="3" strokeDasharray="4 5" />
      </svg>
    )
  }
  const tile = tiles[piece.kind]
  return <TileFace tile={tile} />
}

type Ended = { win: true; stars: number; result: ClearResult } | { win: false }

function Match3Game({
  level,
  onClear,
  onLevels,
  onNext,
}: {
  level: Match3Level
  onClear: (level: number, xp: number, stars: number) => ClearResult
  onLevels: () => void
  onNext: () => void
}) {
  const tiles = level.pieces.map((id) => TILE_BY_ID.get(id) as TileDef)
  const [state, setState] = useState<GameState>(() => createGame(level, Math.random))
  /** 正在显示的棋盘（动画过程中逐帧更新） */
  const [grid, setGrid] = useState(state.grid)
  const [popping, setPopping] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<Pos | null>(null)
  const [hint, setHint] = useState<[Pos, Pos] | null>(null)
  const [shake, setShake] = useState<Pos[]>([])
  const [ended, setEnded] = useState<Ended | null>(null)
  const busy = useRef(false)
  const drag = useRef<{ p: Pos; x: number; y: number; moved: boolean } | null>(null)
  const size = Math.max(32, Math.floor((Math.min(window.innerWidth, 544) - 32) / level.cols))

  // 一段时间没操作就提示一步
  useEffect(() => {
    if (ended) return
    const id = setTimeout(() => setHint(findMove(state)), HINT_DELAY_MS)
    return () => clearTimeout(id)
  }, [state, ended])

  const play = async (a: Pos, b: Pos) => {
    if (busy.current || ended) return
    sound.unlock()
    setSelected(null)
    setHint(null)
    const r = applyMove(state, a, b, Math.random)
    if (!r.ok) {
      sound.play('skip')
      setShake([a, b])
      setTimeout(() => setShake([]), 300)
      return
    }
    busy.current = true
    sound.play('correct')
    const wait = (ms: number) => new Promise((res) => setTimeout(res, ms))
    for (const step of r.steps) {
      setPopping(new Set(step.cleared.map((p) => `${p.r},${p.c}`)))
      await wait(POP_MS)
      setPopping(new Set())
      setGrid(step.grid)
      await wait(FALL_MS)
    }
    let next = r.state
    if (allGoalsDone(next, level.goals)) {
      const s = starsFor(next.movesLeft, level.moves)
      sound.play('finish')
      setEnded({ win: true, stars: s, result: onClear(level.level, CLEAR_XP[level.difficulty], s) })
    } else if (next.movesLeft === 0) {
      setEnded({ win: false })
    } else if (!findMove(next)) {
      toast('没有可以消的了，已重新洗牌')
      next = reshuffle(next, Math.random)
      setGrid(next.grid)
    }
    setState(next)
    busy.current = false
  }

  const restart = () => {
    const s = createGame(level, Math.random)
    setState(s)
    setGrid(s.grid)
    setEnded(null)
    setSelected(null)
    setHint(null)
  }

  // ---- 触摸：滑动交换，或点选两块 ----
  const onDown = (p: Pos, e: ReactPointerEvent) => {
    drag.current = { p, x: e.clientX, y: e.clientY, moved: false }
  }
  const onMove = (e: ReactPointerEvent) => {
    const d = drag.current
    if (!d || d.moved) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    if (Math.max(Math.abs(dx), Math.abs(dy)) < size * 0.35) return
    d.moved = true
    const to = Math.abs(dx) > Math.abs(dy) ? { r: d.p.r, c: d.p.c + Math.sign(dx) } : { r: d.p.r + Math.sign(dy), c: d.p.c }
    void play(d.p, to)
  }
  const onUp = (p: Pos) => {
    const d = drag.current
    drag.current = null
    if (!d || d.moved) return
    if (selected && adjacent(selected, p)) void play(selected, p)
    else setSelected(selected && selected.r === p.r && selected.c === p.c ? null : p)
  }

  const goalIcon = (g: Goal) =>
    g.type === 'collect' ? (
      <span className={`m3-goal-icon${tiles[g.kind].image ? ' photo' : ''}`}>
        <TileFace tile={tiles[g.kind]} />
      </span>
    ) : g.type === 'ice' ? (
      <span className="m3-goal-icon ice">❄️</span>
    ) : (
      <span className="m3-goal-icon">🏆</span>
    )

  const is = (list: Pos[] | null, r: number, c: number) => !!list && list.some((p) => p.r === r && p.c === c)

  return (
    <main className="mg-page m3-game">
      <header className="mg-top">
        <button className="text-link mg-back" onClick={onLevels}>
          ‹ 选关
        </button>
        <h1>
          第 {level.level} 关 <span className={`mg-chip diff-${level.difficulty}`}>{DIFFICULTY_LABEL[level.difficulty]}</span>
        </h1>
        <span className="mg-progress">得分 {state.score}</span>
      </header>

      <section className="m3-hud">
        <div className="m3-moves">
          <span className="m3-moves-num">{state.movesLeft}</span>
          <span className="m3-moves-label">步</span>
        </div>
        <div className="m3-goals-wrap">
        <span className="m3-goals-title">目标</span>
        <ul className="m3-goals" aria-label="目标">
          {level.goals.map((g, i) => {
            const { done, left } = goalProgress(state, g)
            if (g.type === 'score') {
              // 分数目标：直接用文字写出当前分数和目标分数，再加一条进度条
              return (
                <li key={i} className={`m3-goal-score${done ? ' done' : ''}`}>
                  <span className="m3-goal-text">
                    分数 <b className="m3-goal-left">{state.score}</b> / {g.target}
                    {done && ' ✓'}
                  </span>
                  <span className="m3-goal-bar" aria-hidden>
                    <span style={{ width: `${Math.min(100, (state.score / g.target) * 100)}%` }} />
                  </span>
                </li>
              )
            }
            return (
              <li key={i} className={done ? 'done' : ''}>
                {goalIcon(g)}
                <span className="m3-goal-text">
                  {g.type === 'ice' ? '冰块还剩 ' : '还差 '}
                  <b className="m3-goal-left">{done ? '✓' : left}</b>
                </span>
              </li>
            )
          })}
        </ul>
        </div>
      </section>

      <div className="m3-board-wrap">
        <div className="m3-board" style={{ width: level.cols * size, height: level.rows * size }} onPointerMove={onMove} onPointerLeave={() => (drag.current = null)}>
          {state.holes.map((row, r) =>
            row.map((hole, c) =>
              hole ? null : (
                <span
                  key={`cell-${r}-${c}`}
                  className={`m3-cell${(r + c) % 2 ? ' alt' : ''}${state.ice[r][c] > 0 ? ' ice' : ''}`}
                  style={{ left: c * size, top: r * size, width: size, height: size }}
                />
              ),
            ),
          )}
          {grid.map((row, r) =>
            row.map((piece, c) => {
              if (!piece) return null
              const cls = [
                'm3-piece',
                `sp-${piece.special}`,
                piece.kind >= 0 && tiles[piece.kind].image ? 'photo' : '',
                popping.has(`${r},${c}`) ? 'pop' : '',
                is(selected ? [selected] : null, r, c) ? 'selected' : '',
                is(hint, r, c) ? 'hint' : '',
                is(shake, r, c) ? 'shake' : '',
              ].join(' ')
              return (
                <button
                  key={piece.id}
                  className={cls}
                  style={{ left: c * size, top: r * size, width: size, height: size } as CSSProperties}
                  onPointerDown={(e) => onDown({ r, c }, e)}
                  onPointerUp={() => onUp({ r, c })}
                  aria-label={piece.special === 'rainbow' ? '彩虹块' : tiles[piece.kind]?.name}
                >
                  <span className="m3-piece-face">
                    <PieceView piece={piece} tiles={tiles} />
                  </span>
                </button>
              )
            }),
          )}
        </div>
      </div>

      <footer className="m3-footer">
        <p className="m3-tip">4 连得直线块，L/T 形得炸弹，5 连得彩虹块</p>
        <button className="btn" onClick={restart}>
          ↺ 重新开始
        </button>
      </footer>

      {ended && (
        <div className="mg-win-backdrop">
          <div className="mg-win" role="dialog" aria-modal="true" aria-labelledby="m3-end-title">
            {ended.win ? (
              <>
                <Stars n={ended.stars} size="2.4rem" />
                <h2 id="m3-end-title">第 {level.level} 关通过！</h2>
                <p>
                  得分 {state.score}，剩余 {state.movesLeft} 步
                </p>
                {ended.result.first && <p className="mg-win-xp">首次通关：经验 +{ended.result.xpGained}</p>}
                {ended.result.levelUp && (
                  <p className="mg-win-xp">
                    升级到 Lv{ended.result.levelUp.to}「{ended.result.levelUp.title}」
                  </p>
                )}
                <div className="mg-win-actions">
                  {level.level < MATCH3_LEVELS.length ? (
                    <button className="btn btn-primary" onClick={onNext}>
                      下一关
                    </button>
                  ) : (
                    <button className="btn btn-primary" onClick={onLevels}>
                      全部通关！
                    </button>
                  )}
                  <button className="btn" onClick={restart}>
                    再玩一次
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mg-win-emoji" aria-hidden>
                  😅
                </div>
                <h2 id="m3-end-title">步数用完了</h2>
                <p>差一点点，再试一次吧！</p>
                <div className="mg-win-actions">
                  <button className="btn btn-primary" onClick={restart}>
                    再试一次
                  </button>
                  <button className="btn" onClick={onLevels}>
                    选关
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
