import { useState, type CSSProperties } from 'react'
import { DecorationLayer } from '../components/profile/DecorationLayer'
import { ProfileStrip } from '../components/profile/ProfileBits'
import { toast } from '../components/toastBus'
import { ThemeArt } from '../components/ThemeArt'
import { MoreGames } from '../components/MoreGames'
import { TipCard } from '../components/Tip'
import { THEMES } from '../data/themes'
import { themeStyle } from '../data/themeStyle'
import { DURATIONS_SEC, MIXED_THEME_ID, type Sensitivity, type Settings } from '../game/types'
import { wordCount } from '../game/wordDeck'
import type { CacheProgress, UpdateCheck } from '../platform/usePwa'
import type { ProfileView } from '../profile/view'
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
  view,
  onOpenProfile,
  version,
  checkForUpdate,
  cache,
  onRetryCache,
  onOpenGame,
}: {
  settings: Settings
  onChange: (patch: Partial<Settings>) => void
  onStart: () => void
  offlineReady: boolean
  view: ProfileView
  onOpenProfile: () => void
  version: string
  checkForUpdate: () => Promise<UpdateCheck>
  cache: CacheProgress
  onRetryCache: () => void
  onOpenGame: (hash: string) => void
}) {
  const [checking, setChecking] = useState(false)
  const doCheck = async () => {
    setChecking(true)
    const r = await checkForUpdate()
    setChecking(false)
    toast({ updating: '发现新版本，正在更新…', latest: '已是最新版本', offline: '需要联网才能检查更新', failed: '检查失败，请稍后再试' }[r])
  }
  const themeOptions = [{ id: MIXED_THEME_ID, name: '混合' }, ...THEMES]
  const themeId = themeOptions.some((t) => t.id === settings.themeId) ? settings.themeId : MIXED_THEME_ID
  const enoughWords = wordCount(THEMES, themeId) >= 2
  // 首次打开时离线数据还在下载，不允许开始游戏
  const loading = cache.status === 'loading'
  const canStart = enoughWords && !loading
  const percent = cache.total ? Math.min(100, Math.round((cache.done / cache.total) * 100)) : null

  return (
    <main className="home">
      <DecorationLayer id={view.look.decoration} />
      <ProfileStrip view={view} onClick={onOpenProfile} />
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

      <MoreGames onOpen={onOpenGame} />

      <TipCard />

      <footer className="home-footer">
        {!enoughWords && <p className="home-warn">这个主题的词太少，换一个主题吧。</p>}
        {loading && (
          <div className="home-loading" role="progressbar" aria-label="数据正在加载中" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent ?? undefined}>
            <div className="home-loading-text">
              <span>数据正在加载中…</span>
              <span>{cache.total ? `${Math.min(cache.done, cache.total)}/${cache.total}` : ''}</span>
            </div>
            <div className={`home-loading-bar${percent === null ? ' indeterminate' : ''}`}>
              <span style={{ width: percent === null ? undefined : `${Math.max(4, percent)}%` }} />
            </div>
          </div>
        )}
        {cache.status === 'failed' && (
          <p className="home-warn home-cache-failed">
            离线数据没有下载完，现在可以玩，但断网时可能打不开。
            <button className="text-link" onClick={onRetryCache}>
              重试
            </button>
          </p>
        )}
        <button className="btn btn-primary home-start" onClick={onStart} disabled={!canStart}>
          {loading ? '数据加载中…' : '开始'}
        </button>
        <div className="home-meta">
          {offlineReady && <span className="home-offline">已可离线使用</span>}
          <button className="text-link" onClick={() => void doCheck()} disabled={checking}>
            {checking ? '检查中…' : '检查更新'}
          </button>
          {/* 正式版不显示调试入口；需要排查问题时可以直接访问 #debug */}
          {import.meta.env.DEV && (
            <a className="text-link" href="#debug">
              传感器调试
            </a>
          )}
        </div>
        <p className="home-version">版本 {version}</p>
      </footer>
    </main>
  )
}
