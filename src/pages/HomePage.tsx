import type { CSSProperties } from 'react'
import { ThemeArt } from '../components/ThemeArt'
import { THEMES } from '../data/themes'
import { themeStyle } from '../data/themeStyle'
import { DURATIONS_SEC, MIXED_THEME_ID, type Sensitivity, type Settings } from '../game/types'
import { wordCount } from '../game/wordDeck'
import './home.css'

const SENSITIVITY: [Sensitivity, string][] = [
  ['low', '低'],
  ['medium', '中'],
  ['high', '高'],
]

/** 一组单选按钮 */
function Choice<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: readonly (readonly [T, string])[]
  onChange: (v: T) => void
}) {
  return (
    <div className="home-choice" role="radiogroup" aria-label={label}>
      <span className="home-choice-label">{label}</span>
      <div className="home-segments">
        {options.map(([v, text]) => (
          <button key={String(v)} role="radio" aria-checked={v === value} className="home-segment" onClick={() => onChange(v)}>
            {text}
          </button>
        ))}
      </div>
    </div>
  )
}

export function HomePage({
  settings,
  onChange,
  onStart,
  offlineReady,
}: {
  settings: Settings
  onChange: (patch: Partial<Settings>) => void
  onStart: () => void
  offlineReady: boolean
}) {
  const themeOptions = [{ id: MIXED_THEME_ID, name: '混合' }, ...THEMES]
  const themeId = themeOptions.some((t) => t.id === settings.themeId) ? settings.themeId : MIXED_THEME_ID
  const canStart = wordCount(THEMES, themeId) >= 2

  return (
    <main className="home">
      <header className="home-brand">
        <h1 className="home-title">
          <span className="home-title-main">小嗨</span>
          <span className="home-title-sub">猜猜猜</span>
        </h1>
        <p className="home-lede">手机横着举起来给朋友看，朋友比划，你来猜。猜中把屏幕朝下翻，想跳过就朝上翻。</p>
      </header>

      <section className="home-block" aria-labelledby="theme-heading">
        <h2 id="theme-heading">选个主题</h2>
        <div className="home-themes" role="radiogroup" aria-labelledby="theme-heading">
          {themeOptions.map((t) => (
            <button
              key={t.id}
              role="radio"
              aria-checked={t.id === themeId}
              className={`home-theme${t.id === MIXED_THEME_ID ? ' home-theme-mixed' : ''}`}
              style={{ '--theme': themeStyle(t.id).color } as CSSProperties}
              onClick={() => onChange({ themeId: t.id })}
            >
              <ThemeArt themeId={t.id} className="art-card" />
              <span className="home-theme-name">{t.name}</span>
              <span className="home-theme-count">
                {t.id === MIXED_THEME_ID ? '所有主题一起出' : `${wordCount(THEMES, t.id)} 个词`}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="home-block home-settings">
        <Choice
          label="每局时长"
          value={settings.durationSec}
          options={DURATIONS_SEC.map((d) => [d, `${d / 60} 分`] as const)}
          onChange={(d) => onChange({ durationSec: d })}
        />
        <Choice label="翻转灵敏度" value={settings.sensitivity} options={SENSITIVITY} onChange={(s) => onChange({ sensitivity: s })} />
        <Choice
          label="音效"
          value={settings.soundOn ? 'on' : 'off'}
          options={[
            ['on', '开'],
            ['off', '关'],
          ]}
          onChange={(v) => onChange({ soundOn: v === 'on' })}
        />
        <p className="home-note">
          {settings.soundOn
            ? '猜的人看不到屏幕，靠音效知道有没有翻成功。音量调大一些，静音开关打开也能听到。'
            : '音效关闭后，猜的人只能靠朋友告诉自己有没有翻成功。'}
        </p>
      </section>

      <footer className="home-footer">
        {!canStart && <p className="home-warn">这个主题的词太少，换一个主题吧。</p>}
        <button className="btn btn-primary home-start" onClick={onStart} disabled={!canStart}>
          开始
        </button>
        <div className="home-meta">
          {offlineReady && <span className="home-offline">已可离线使用</span>}
          <a className="text-link" href="#debug">
            传感器调试
          </a>
        </div>
      </footer>
    </main>
  )
}
