// 小游戏通用选关页：分章节（每章 20 关），一关一关解锁，标出难度和通关情况。

import { useState, type ReactNode } from 'react'
import { DIFFICULTY_LABEL, type Difficulty } from '../../minigames/difficulty'
import { toast } from '../toastBus'

const PER_CHAPTER = 20

export function LevelSelect<L extends { level: number; difficulty: Difficulty }>({
  title,
  intro,
  levels,
  isPassed,
  badge,
  onPick,
  onBack,
}: {
  title: string
  intro: string
  levels: L[]
  isPassed: (level: number) => boolean
  /** 已通关时显示的内容（如星数）；不传则显示 ✓ */
  badge?: (level: number) => ReactNode
  onPick: (l: L) => void
  onBack: () => void
}) {
  const total = levels.filter((l) => isPassed(l.level)).length
  const chapters = Math.ceil(levels.length / PER_CHAPTER)
  // 默认打开下一关所在的章节
  const nextLevel = levels.find((l) => !isPassed(l.level))?.level ?? levels.length
  const [chapter, setChapter] = useState(() => Math.floor((nextLevel - 1) / PER_CHAPTER))
  const shown = levels.slice(chapter * PER_CHAPTER, (chapter + 1) * PER_CHAPTER)

  return (
    <main className="mg-page">
      <header className="mg-top">
        <button className="text-link mg-back" onClick={onBack}>
          ‹ 返回
        </button>
        <h1>{title}</h1>
        <span className="mg-progress">
          {total}/{levels.length}
        </span>
      </header>
      <p className="mg-intro">{intro}</p>
      {chapters > 1 && (
        <div className="mg-chapters" role="tablist" aria-label="章节">
          {Array.from({ length: chapters }, (_, i) => {
            const from = i * PER_CHAPTER + 1
            const to = Math.min((i + 1) * PER_CHAPTER, levels.length)
            const done = levels.slice(from - 1, to).filter((l) => isPassed(l.level)).length
            return (
              <button key={i} role="tab" aria-selected={chapter === i} className="mg-chapter" onClick={() => setChapter(i)}>
                <span>
                  {from}–{to}
                </span>
                <small>
                  {done}/{to - from + 1}
                </small>
              </button>
            )
          })}
        </div>
      )}
      <div className="mg-levels">
        {shown.map((l) => {
          const done = isPassed(l.level)
          // 一关一关解锁：上一关通过后才能玩
          const locked = l.level > 1 && !isPassed(l.level - 1)
          return (
            <button
              key={l.level}
              className={`mg-level diff-${l.difficulty}${done ? ' done' : ''}${locked ? ' locked' : ''}`}
              onClick={() => (locked ? toast(`先通过第 ${l.level - 1} 关`) : onPick(l))}
              aria-label={`第 ${l.level} 关，${DIFFICULTY_LABEL[l.difficulty]}${done ? '，已通过' : locked ? '，未解锁' : ''}`}
            >
              <span className="mg-level-num">{locked ? '🔒' : l.level}</span>
              {done && badge ? badge(l.level) : <span className="mg-level-diff">{DIFFICULTY_LABEL[l.difficulty]}</span>}
              {done && !badge && <span className="mg-level-check">✓</span>}
            </button>
          )
        })}
      </div>
      <p className="mg-more">更多关卡持续更新中～</p>
    </main>
  )
}
