// 真心话 / 大冒险：抽卡模式。手机在朋友之间传，轮到谁就抽一张。
//
// 开发者隐藏模式：「抽一张」上方有一排 10 个小动物，点最右边那只静默开启 / 关闭隐藏劲爆模式
// （每只动物被点都会跳一下，看起来只是装饰；不会改变右上角的公开劲爆开关）。
// - 按钮上的箭头：↻ 顺时针 = 出普通题，↺ 逆时针 = 出劲爆题（公开开关和隐藏模式都会反映在这里）
// - 隐藏模式下劲爆题不显示 🔥 标签，外观与普通题相同；只有卡片角落的小装饰不同：✦ 普通、✧ 劲爆
// - 离开页面自动关闭

import { useState } from 'react'
import dareBank from '../data/truth-or-dare/dare.json'
import truthBank from '../data/truth-or-dare/truth.json'
import { drawPrompt, type Drawn, type PromptBank } from '../minigames/promptDeck'
import type { TodData } from '../platform/storage'
import './truthOrDare.css'

type Kind = 'truth' | 'dare'

const BANKS: Record<Kind, PromptBank> = { truth: truthBank, dare: dareBank }
const LABEL: Record<Kind, string> = { truth: '真心话', dare: '大冒险' }
const HINT: Record<Kind, string> = {
  truth: '轮到谁就点「抽一张」，认真回答，不许说谎～',
  dare: '轮到谁就点「抽一张」，做不到就换一张或接受大家的惩罚～',
}
/** 装饰用的小动物，最右边那只是隐藏开关 */
const ANIMALS = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯']

export default function TruthOrDarePage({
  initialKind,
  tod,
  updateTod,
  onBack,
}: {
  initialKind: Kind
  tod: TodData
  updateTod: (fn: (t: TodData) => TodData) => void
  onBack: () => void
}) {
  const [kind, setKind] = useState<Kind>(initialKind)
  const [card, setCard] = useState<Drawn | null>(null)
  const [count, setCount] = useState(0)
  const [flip, setFlip] = useState(0)
  /** 隐藏劲爆模式：只在本页有效，离开即关闭 */
  const [secret, setSecret] = useState(false)
  /** 被点到的小动物跳一下（所有动物都一样，最右边那只看不出区别） */
  const [hop, setHop] = useState<{ i: number; n: number } | null>(null)
  const spicyNow = tod.spicy || secret

  const draw = (k: Kind = kind) => {
    const r = drawPrompt(BANKS[k], spicyNow, tod.seen[k], Math.random, card?.text ?? null)
    updateTod((t) => ({ ...t, seen: { ...t.seen, [k]: r.seen } }))
    setCard(r.drawn)
    setCount((n) => n + 1)
    setFlip((n) => n + 1)
  }

  const switchKind = (k: Kind) => {
    if (k === kind) return
    setKind(k)
    setCard(null)
  }

  const tapAnimal = (i: number) => {
    setHop((h) => ({ i, n: (h?.n ?? 0) + 1 }))
    if (i === ANIMALS.length - 1) setSecret((s) => !s)
  }

  // 公开的劲爆开关打开时正常显示 🔥；只开隐藏模式时，劲爆题外观与普通题相同
  const showSpicyStyle = !!card?.spicy && tod.spicy

  return (
    <main className={`tod tod-${kind}`}>
      <header className="tod-top">
        <button className="text-link tod-back" onClick={onBack}>
          ‹ 返回
        </button>
        <div className="tod-tabs" role="tablist">
          {(['truth', 'dare'] as Kind[]).map((k) => (
            <button key={k} role="tab" aria-selected={kind === k} className="tod-tab" onClick={() => switchKind(k)}>
              {LABEL[k]}
            </button>
          ))}
        </div>
        <button
          className={`tod-spicy-toggle${tod.spicy ? ' on' : ''}`}
          role="switch"
          aria-checked={tod.spicy}
          onClick={() => updateTod((t) => ({ ...t, spicy: !t.spicy }))}
        >
          {/* 关闭时同一个火焰图标变成灰色 */}
          <span className="tod-spicy-icon" aria-hidden>
            🔥
          </span>
          {tod.spicy ? '劲爆开' : '劲爆关'}
        </button>
      </header>

      <section className="tod-stage">
        <div key={flip} className={`tod-card${showSpicyStyle ? ' spicy' : ''}${card ? ' flipped' : ''}`}>
          <div className="tod-card-head">
            <span className="tod-card-kind">{LABEL[kind]}</span>
            {showSpicyStyle && <span className="tod-card-spicy">🔥 劲爆</span>}
          </div>
          {card ? (
            <p className="tod-card-text">{card.text}</p>
          ) : (
            <p className="tod-card-empty">{HINT[kind]}</p>
          )}
          {/* 角落装饰：✦ 普通、✧ 劲爆（隐藏模式下只有开发者知道含义） */}
          <span className="tod-card-ornament" aria-hidden>
            {card?.spicy ? '✧' : '✦'}
          </span>
        </div>
        <p className="tod-count">{count > 0 ? `已抽 ${count} 张` : '手机传给下一个人，轮流抽'}</p>
      </section>

      <footer className="tod-footer">
        <div className="tod-animals" aria-hidden>
          {ANIMALS.map((a, i) => (
            <button
              key={i}
              tabIndex={-1}
              className={`tod-animal${hop?.i === i ? ' hop' : ''}`}
              onClick={() => tapAnimal(i)}
            >
              {/* key 变化让跳动动画每次点击都重新播放 */}
              <span key={hop?.i === i ? hop.n : 0}>{a}</span>
            </button>
          ))}
        </div>
        <button className="btn btn-primary tod-draw" onClick={() => draw()}>
          <span className="tod-draw-icon" aria-hidden>
            {spicyNow ? '↺' : '↻'}
          </span>
          {card ? '换一张' : '抽一张'}
        </button>
      </footer>
    </main>
  )
}
