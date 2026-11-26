// 连连看：选关页 + 游戏页。点两个相同的图块，能用最多拐两个弯的线连起来就消除；不限时间，消完即通关。
// 提示、重排都免费、不限次数；没有可连的会自动重排。

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { toast } from '../components/toastBus'
import { SoundPlayer } from '../platform/audio'
import { CLEAR_XP, DIFFICULTY_LABEL } from '../minigames/difficulty'
import { findAnyPair, findPath, generateBoard, remaining, removePair, reshuffle, type Board, type Pos } from '../minigames/link/board'
import { LINK_LEVELS, type LinkLevel } from '../minigames/link/levels'
import { TileFace } from '../minigames/TileFace'
import { tilesForLevel } from '../minigames/tiles'
import './link.css'

const sound = new SoundPlayer()

export interface ClearResult {
  first: boolean
  xpGained: number
  levelUp: { to: number; title: string } | null
}

const same = (a: Pos | null, b: Pos | null) => !!a && !!b && a.r === b.r && a.c === b.c

function fmtTime(ms: number) {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** 根据屏幕大小计算图块边长（棋盘外圈留半格给连线） */
function tileSizeFor(rows: number, cols: number) {
  const w = Math.min(window.innerWidth, 544) - 32
  const h = window.innerHeight - 220
  return Math.max(30, Math.min(64, Math.floor(w / (cols + 1)), Math.floor(h / (rows + 1))))
}

function useTileSize(rows: number, cols: number) {
  const [size, setSize] = useState(() => tileSizeFor(rows, cols))
  useEffect(() => {
    const on = () => setSize(tileSizeFor(rows, cols))
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [rows, cols])
  return size
}

export default function LinkPage({
  cleared,
  onClear,
  onBack,
}: {
  cleared: number[]
  onClear: (level: number, xp: number) => ClearResult
  onBack: () => void
}) {
  const [playing, setPlaying] = useState<LinkLevel | null>(null)
  if (playing) {
    return (
      <LinkGame
        key={playing.level}
        level={playing}
        onClear={onClear}
        onLevels={() => setPlaying(null)}
        onNext={() => {
          const next = LINK_LEVELS[playing.level]
          setPlaying(next ?? null)
        }}
      />
    )
  }
  return <LevelSelect cleared={cleared} onPick={setPlaying} onBack={onBack} />
}

function LevelSelect({ cleared, onPick, onBack }: { cleared: number[]; onPick: (l: LinkLevel) => void; onBack: () => void }) {
  // 一关一关解锁：通过第 N 关后解锁第 N+1 关
  const unlockedUpTo = Math.max(0, ...cleared) + 1
  return (
    <main className="mg-page">
      <header className="mg-top">
        <button className="text-link mg-back" onClick={onBack}>
          ‹ 返回
        </button>
        <h1>连连看</h1>
        <span className="mg-progress">
          {cleared.length}/{LINK_LEVELS.length}
        </span>
      </header>
      <p className="mg-intro">点两个相同的图块，能用最多拐两个弯的线连起来就消除。不限时间，消完就过关。</p>
      <div className="mg-levels">
        {LINK_LEVELS.map((l) => {
          const done = cleared.includes(l.level)
          const locked = l.level > unlockedUpTo
          return (
            <button
              key={l.level}
              className={`mg-level diff-${l.difficulty}${done ? ' done' : ''}${locked ? ' locked' : ''}`}
              onClick={() => (locked ? toast(`先通过第 ${l.level - 1} 关`) : onPick(l))}
              aria-label={`第 ${l.level} 关，${DIFFICULTY_LABEL[l.difficulty]}${done ? '，已通过' : locked ? '，未解锁' : ''}`}
            >
              <span className="mg-level-num">{locked ? '🔒' : l.level}</span>
              <span className="mg-level-diff">{DIFFICULTY_LABEL[l.difficulty]}</span>
              {done && <span className="mg-level-check">✓</span>}
            </button>
          )
        })}
      </div>
      <p className="mg-more">更多关卡持续更新中～</p>
    </main>
  )
}

function LinkGame({
  level,
  onClear,
  onLevels,
  onNext,
}: {
  level: LinkLevel
  onClear: (level: number, xp: number) => ClearResult
  onLevels: () => void
  onNext: () => void
}) {
  const tiles = tilesForLevel(level.level, level.types)
  const [board, setBoard] = useState<Board>(() => generateBoard(level, Math.random))
  const [selected, setSelected] = useState<Pos | null>(null)
  const [line, setLine] = useState<Pos[] | null>(null)
  const [vanishing, setVanishing] = useState<Pos[]>([])
  const [hint, setHint] = useState<[Pos, Pos] | null>(null)
  const [steps, setSteps] = useState(0)
  const [startAt, setStartAt] = useState(() => Date.now())
  const [now, setNow] = useState(() => Date.now())
  const [win, setWin] = useState<{ ms: number; result: ClearResult } | null>(null)
  const busy = useRef(false)
  const size = useTileSize(level.rows, level.cols)
  const [total] = useState(() => remaining(board))

  // 计时（只显示，不限时）
  useEffect(() => {
    if (win) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [win])

  const afterRemove = (next: Board) => {
    if (remaining(next) === 0) {
      const ms = Date.now() - startAt
      sound.play('finish')
      setWin({ ms, result: onClear(level.level, CLEAR_XP[level.difficulty]) })
      return next
    }
    if (!findAnyPair(next)) {
      toast('没有可以连的了，已自动重排')
      return reshuffle(next, Math.random)
    }
    return next
  }

  const tap = (p: Pos) => {
    if (busy.current || win) return
    sound.unlock()
    const v = board[p.r][p.c]
    if (v < 0) return
    setHint(null)
    if (!selected || same(selected, p)) {
      setSelected(same(selected, p) ? null : p)
      if (!same(selected, p)) sound.play('tick')
      return
    }
    if (board[selected.r][selected.c] !== v) {
      setSelected(p)
      sound.play('tick')
      return
    }
    const path = findPath(board, selected, p)
    if (!path) {
      setSelected(p)
      sound.play('tick')
      return
    }
    // 画线 → 图块消失 → 更新棋盘
    busy.current = true
    sound.play('correct')
    setLine(path)
    setVanishing([selected, p])
    setSelected(null)
    setSteps((n) => n + 1)
    const a = selected
    // 动画期间 busy 挡住其他点击，棋盘不会变化，可以直接用当前的 board
    const next = afterRemove(removePair(board, a, p))
    setTimeout(() => {
      setBoard(next)
      setLine(null)
      setVanishing([])
      busy.current = false
    }, 260)
  }

  const showHint = () => {
    const pair = findAnyPair(board)
    if (pair) setHint(pair)
  }

  const doShuffle = () => {
    setSelected(null)
    setHint(null)
    setBoard((b) => reshuffle(b, Math.random))
  }

  const restart = () => {
    setBoard(generateBoard(level, Math.random))
    setSelected(null)
    setHint(null)
    setSteps(0)
    setStartAt(Date.now())
    setNow(Date.now())
    setWin(null)
  }

  const left = remaining(board)
  const center = (p: Pos) => `${(p.c + 1) * size},${(p.r + 1) * size}`

  return (
    <main className="mg-page link-game">
      <header className="mg-top">
        <button className="text-link mg-back" onClick={onLevels}>
          ‹ 选关
        </button>
        <h1>
          第 {level.level} 关 <span className={`mg-chip diff-${level.difficulty}`}>{DIFFICULTY_LABEL[level.difficulty]}</span>
        </h1>
        <span className="mg-progress">{fmtTime((win ? startAt + win.ms : now) - startAt)}</span>
      </header>
      <div className="link-stats">
        <span>剩余 {left}/{total}</span>
        <span>步数 {steps}</span>
      </div>

      <div className="link-board-wrap">
        <div className="link-board" style={{ width: (level.cols + 1) * size, height: (level.rows + 1) * size } as CSSProperties}>
          {board.map((row, r) =>
            row.map((v, c) => {
              if (v === -2) return <span key={`${r}-${c}`} className="link-block" style={{ left: (c + 0.5) * size, top: (r + 0.5) * size, width: size, height: size }} />
              if (v < 0) return null
              const p = { r, c }
              const tile = tiles[v]
              const cls = [
                'link-tile',
                same(selected, p) ? 'selected' : '',
                hint && (same(hint[0], p) || same(hint[1], p)) ? 'hint' : '',
                vanishing.some((q) => same(q, p)) ? 'vanish' : '',
                tile.image ? 'photo' : '',
              ].join(' ')
              return (
                <button
                  key={`${r}-${c}`}
                  className={cls}
                  style={{ left: (c + 0.5) * size, top: (r + 0.5) * size, width: size, height: size, '--tile-bg': tile.bg } as CSSProperties}
                  onClick={() => tap(p)}
                  aria-label={tile.name}
                >
                  <span className="link-tile-face">
                    <TileFace tile={tile} />
                  </span>
                </button>
              )
            }),
          )}
          {line && (
            <svg className="link-line" width={(level.cols + 1) * size} height={(level.rows + 1) * size} aria-hidden>
              <polyline points={line.map(center).join(' ')} />
            </svg>
          )}
        </div>
      </div>

      <footer className="link-tools">
        <button className="btn" onClick={showHint}>
          💡 提示
        </button>
        <button className="btn" onClick={doShuffle}>
          🔀 重排
        </button>
        <button className="btn" onClick={restart}>
          ↺ 重新开始
        </button>
      </footer>

      {win && (
        <div className="mg-win-backdrop">
          <div className="mg-win" role="dialog" aria-modal="true" aria-labelledby="link-win-title">
            <div className="mg-win-emoji" aria-hidden>
              🎉
            </div>
            <h2 id="link-win-title">第 {level.level} 关通过！</h2>
            <p>
              用时 {fmtTime(win.ms)}，共 {steps} 步
            </p>
            {win.result.first && <p className="mg-win-xp">首次通关：经验 +{win.result.xpGained}</p>}
            {win.result.levelUp && (
              <p className="mg-win-xp">
                升级到 Lv{win.result.levelUp.to}「{win.result.levelUp.title}」
              </p>
            )}
            <div className="mg-win-actions">
              {level.level < LINK_LEVELS.length ? (
                <button className="btn btn-primary" onClick={onNext}>
                  下一关
                </button>
              ) : (
                <button className="btn btn-primary" onClick={onLevels}>
                  全部通关！
                </button>
              )}
              <button className="btn" onClick={onLevels}>
                选关
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
