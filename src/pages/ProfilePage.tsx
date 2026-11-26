// 「我的」页面：资料卡、等级、统计、会员激活、装扮选择、存档备份、检查更新。

import { useState, type CSSProperties, type ReactNode } from 'react'
import { DecorationLayer } from '../components/profile/DecorationLayer'
import { Avatar, BadgeMedal, PlayerName, TierMark, TitleTag } from '../components/profile/ProfileBits'
import { toast } from '../components/toastBus'
import { TipDialog } from '../components/Tip'
import type { ActionResult } from '../game/useGameController'
import type { UpdateCheck } from '../platform/usePwa'
import {
  AVATARS,
  BADGES,
  badgeUnlocked,
  DECORATIONS,
  FRAMES,
  LEVELS,
  NAME_STYLES,
  PALETTES,
  RARITY_LABEL,
  tierAllows,
  TITLES,
  titleUnlocked,
  WORN_LIMIT,
} from '../profile/catalog'
import { NAME_MAX } from '../profile/names'
import type { Look, Profile, Tier, VipState } from '../profile/types'
import type { ProfileView } from '../profile/view'
import { formatCode, VERIFY_MAX_AGE_MS } from '../profile/vip'
import './profile.css'

type Tab = 'avatar' | 'frame' | 'title' | 'badge' | 'decoration' | 'palette' | 'nameStyle'

const TABS: [Tab, string][] = [
  ['avatar', '头像'],
  ['frame', '头像框'],
  ['title', '称号'],
  ['badge', '徽章'],
  ['decoration', '装饰'],
  ['palette', '配色'],
  ['nameStyle', '名字'],
]

const TIER_NAME: Record<Tier, string> = { free: '普通用户', vip: 'VIP', svip: 'SVIP' }
const UPDATE_TEXT: Record<UpdateCheck, string> = {
  updating: '发现新版本，正在更新…',
  latest: '已是最新版本',
  offline: '需要联网才能检查更新',
  failed: '检查失败，请稍后再试',
}

function fmtDuration(ms: number) {
  const min = Math.round(ms / 60000)
  return min < 60 ? `${min} 分钟` : `${(min / 60).toFixed(1)} 小时`
}

function fmtDate(t: number) {
  const d = new Date(t)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 选择器中的一格：已解锁可选，未解锁显示需要的会员等级或获得条件 */
function Cell({
  selected,
  locked,
  lockText,
  label,
  onClick,
  children,
  wide = false,
}: {
  selected: boolean
  locked: boolean
  lockText?: string
  label: string
  onClick: () => void
  children: ReactNode
  wide?: boolean
}) {
  return (
    <button
      className={`pick-cell${selected ? ' selected' : ''}${locked ? ' locked' : ''}${wide ? ' wide' : ''}`}
      onClick={onClick}
      aria-pressed={selected}
      aria-label={locked ? `${label}（${lockText}）` : label}
    >
      <span className="pick-preview">{children}</span>
      <span className="pick-label">{label}</span>
      {locked && <span className="pick-lock">🔒 {lockText}</span>}
    </button>
  )
}

export function ProfilePage(props: {
  profile: Profile
  vip: VipState | null
  view: ProfileView
  now: number
  onBack: () => void
  updateLook: (patch: Partial<Look>) => void
  rename: (name: string) => ActionResult
  activateVip: (code: string) => Promise<ActionResult>
  exportBackup: () => string
  restoreBackup: (code: string) => ActionResult
  version: string
  checkForUpdate: () => Promise<UpdateCheck>
}) {
  const { profile, vip, view } = props
  const { tier, ctx, look } = view
  const [tab, setTab] = useState<Tab>('avatar')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [tipOpen, setTipOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [nameInput, setNameInput] = useState(profile.name)
  const [backup, setBackup] = useState<string | null>(null)
  const [restoreInput, setRestoreInput] = useState('')
  const [checking, setChecking] = useState(false)

  const needTier = (t: Tier) => (t === 'svip' ? 'SVIP' : 'VIP')
  const lockedTap = (t: Tier) => toast(`开通 ${needTier(t)} 后可以使用`)

  const doActivate = async () => {
    setBusy(true)
    const r = await props.activateVip(code)
    setBusy(false)
    toast(r.message)
    if (r.ok) setCode('')
  }

  const doRename = () => {
    const r = props.rename(nameInput)
    toast(r.message)
    if (r.ok) setEditing(false)
  }

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast('已复制，请粘贴到微信或备忘录里保存')
    } catch {
      toast('复制失败，请长按文字手动复制')
    }
  }

  const doRestore = () => {
    const r = props.restoreBackup(restoreInput)
    toast(r.message)
    if (r.ok) setRestoreInput('')
  }

  const doCheck = async () => {
    setChecking(true)
    const r = await props.checkForUpdate()
    setChecking(false)
    toast(UPDATE_TEXT[r])
  }

  const nextLevel = LEVELS.find((l) => l.level === view.level.level + 1)
  const s = profile.stats
  const wornLimit = WORN_LIMIT[tier]

  const toggleBadge = (id: string) => {
    if (look.worn.includes(id)) return props.updateLook({ worn: look.worn.filter((x) => x !== id) })
    if (look.worn.length >= wornLimit) {
      toast(tier === 'svip' ? `最多佩戴 ${wornLimit} 个徽章` : `最多佩戴 ${wornLimit} 个徽章，升级会员可以多戴`)
      return
    }
    props.updateLook({ worn: [...look.worn, id] })
  }

  return (
    <main className="me">
      <DecorationLayer id={look.decoration} />
      <div className="me-inner">
        <header className="me-top">
          <button className="text-link me-back" onClick={props.onBack}>
            ‹ 返回
          </button>
          <h1>我的</h1>
        </header>

        {/* 资料卡 */}
        <section className="me-card">
          <Avatar avatar={look.avatar} frame={look.frame} size={84} />
          <div className="me-card-text">
            {editing ? (
              <div className="me-rename">
                <input
                  value={nameInput}
                  maxLength={NAME_MAX * 2}
                  onChange={(e) => setNameInput(e.target.value)}
                  aria-label="新名字"
                  autoFocus
                />
                <button className="btn btn-primary" onClick={doRename}>
                  保存
                </button>
              </div>
            ) : (
              <div className="me-name-line">
                <PlayerName name={profile.name} nameStyle={look.nameStyle} />
                <TierMark tier={tier} />
                <button
                  className="me-edit"
                  onClick={() => (tier === 'free' ? lockedTap('vip') : (setNameInput(profile.name), setEditing(true)))}
                  aria-label="修改名字"
                >
                  ✎
                </button>
              </div>
            )}
            <div className="me-title-line">
              <TitleTag title={look.title} showRarity />
            </div>
            <div className="me-badges">
              {look.worn.length ? (
                look.worn.map((id) => <BadgeMedal key={id} id={id} size={30} />)
              ) : (
                <span className="me-muted">还没有佩戴徽章</span>
              )}
            </div>
          </div>
        </section>

        {/* 等级 */}
        <section className="me-block">
          <div className="me-level-head">
            <strong>
              Lv{view.level.level} {view.level.title}
            </strong>
            <span className="me-muted">{profile.xp} 经验</span>
          </div>
          <div className="me-bar">
            <span style={{ width: `${Math.round(view.level.progress * 100)}%` }} />
          </div>
          <p className="me-muted me-small">
            {nextLevel ? `再 ${nextLevel.xp - profile.xp} 经验升到 Lv${nextLevel.level}「${nextLevel.title}」。每局 +20，每答对一个 +10。` : '已经满级，你就是猜神本神！'}
          </p>
          <dl className="me-stats">
            <div>
              <dt>局数</dt>
              <dd>{s.games}</dd>
            </div>
            <div>
              <dt>答对</dt>
              <dd>{s.correct}</dd>
            </div>
            <div>
              <dt>单局最高</dt>
              <dd>{s.bestScore}</dd>
            </div>
            <div>
              <dt>总时长</dt>
              <dd>{fmtDuration(s.playMs)}</dd>
            </div>
          </dl>
        </section>

        {/* 会员 */}
        <section className={`me-block me-vip tier-bg-${tier}`} id="me-vip">
          <div className="me-vip-head">
            <strong>{TIER_NAME[tier]}</strong>
            {vip && !view.paused && <span className="me-muted me-small">上次核对 {fmtDate(vip.lastVerifiedAt)}</span>}
          </div>
          {view.paused && (
            <p className="me-warn">会员已超过 30 天没有联网核对，暂时按普通用户显示。连上网络重新打开应用即可恢复。</p>
          )}
          {tier !== 'svip' && (
            <>
              <p className="me-small">
                {tier === 'free'
                  ? 'VIP：改名字，解锁更多头像、头像框、称号、装饰和配色，佩戴 2 个徽章。SVIP：全部装扮、传说称号、名字特效，佩戴 3 个徽章。'
                  : '升级 SVIP：全部装扮、传说称号、名字特效，佩戴 3 个徽章。'}
              </p>
              <p className="me-small me-muted">打赏后把截图发给作者，领取激活码。激活时需要联网。</p>
              <div className="me-activate">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="XH-XXXX-XXXX-XXXX"
                  autoCapitalize="characters"
                  autoComplete="off"
                  spellCheck={false}
                  aria-label="激活码"
                />
                <button className="btn btn-primary" onClick={() => void doActivate()} disabled={busy || !code.trim()}>
                  {busy ? '核对中…' : '激活'}
                </button>
              </div>
              <button className="tip-link me-tip" onClick={() => setTipOpen(true)}>
                🧋 打赏作者，领取激活码
              </button>
            </>
          )}
          {vip && (
            <p className="me-small me-muted">
              激活码 {formatCode(vip.code)} · 激活于 {fmtDate(vip.activatedAt)}。换手机或清除数据后，重新输入这个码即可恢复。
            </p>
          )}
        </section>

        {/* 装扮 */}
        <section className="me-block">
          <div className="me-tabs" role="tablist">
            {TABS.map(([id, label]) => (
              <button key={id} role="tab" aria-selected={tab === id} className="me-tab" onClick={() => setTab(id)}>
                {label}
              </button>
            ))}
          </div>

          {tab === 'avatar' && (
            <div className="pick-grid">
              {AVATARS.map((a) => {
                const locked = !tierAllows(tier, a.tier)
                return (
                  <Cell
                    key={a.id}
                    label=""
                    selected={look.avatar === a.id}
                    locked={locked}
                    lockText={needTier(a.tier)}
                    onClick={() => (locked ? lockedTap(a.tier) : props.updateLook({ avatar: a.id }))}
                  >
                    <Avatar avatar={a.id} frame="plain" size={48} />
                  </Cell>
                )
              })}
            </div>
          )}

          {tab === 'frame' && (
            <div className="pick-grid">
              {FRAMES.map((f) => {
                const locked = !tierAllows(tier, f.tier)
                return (
                  <Cell
                    key={f.id}
                    label={f.name}
                    selected={look.frame === f.id}
                    locked={locked}
                    lockText={needTier(f.tier)}
                    onClick={() => (locked ? lockedTap(f.tier) : props.updateLook({ frame: f.id }))}
                  >
                    <Avatar avatar={look.avatar} frame={f.id} size={48} />
                  </Cell>
                )
              })}
            </div>
          )}

          {tab === 'title' && (
            <div className="pick-list">
              {TITLES.map((t) => {
                const locked = !titleUnlocked(t, ctx)
                const lockText = t.rarity === 'level' ? `Lv${t.minLevel} 解锁` : needTier(t.tier)
                return (
                  <Cell
                    key={t.id}
                    wide
                    label={t.rarity === 'level' ? `Lv${t.minLevel}` : RARITY_LABEL[t.rarity]}
                    selected={look.title === t.id}
                    locked={locked}
                    lockText={lockText}
                    onClick={() => (locked ? toast(t.rarity === 'level' ? `达到 Lv${t.minLevel} 解锁` : `开通 ${needTier(t.tier)} 后可以使用`) : props.updateLook({ title: t.id }))}
                  >
                    <TitleTag title={t.id} />
                  </Cell>
                )
              })}
            </div>
          )}

          {tab === 'badge' && (
            <>
              <p className="me-small me-muted">
                点击佩戴或取下，最多佩戴 {wornLimit} 个（普通 1 个、VIP 2 个、SVIP 3 个）。
              </p>
              <div className="pick-grid">
                {BADGES.map((b) => {
                  const unlocked = badgeUnlocked(b, ctx)
                  return (
                    <Cell
                      key={b.id}
                      label={b.name}
                      selected={look.worn.includes(b.id)}
                      locked={!unlocked}
                      lockText={b.kind === 'member' ? needTier(b.tier ?? 'vip') : '未获得'}
                      onClick={() => (unlocked ? toggleBadge(b.id) : toast(`${b.name}：${b.desc}`))}
                    >
                      <BadgeMedal id={b.id} size={44} dim={!unlocked} />
                    </Cell>
                  )
                })}
              </div>
            </>
          )}

          {tab === 'decoration' && (
            <div className="pick-grid">
              {DECORATIONS.map((d) => {
                const locked = !tierAllows(tier, d.tier)
                return (
                  <Cell
                    key={d.id}
                    label={d.name}
                    selected={look.decoration === d.id}
                    locked={locked}
                    lockText={needTier(d.tier)}
                    onClick={() => (locked ? lockedTap(d.tier) : props.updateLook({ decoration: d.id }))}
                  >
                    <span className="deco-preview">{d.items.length ? d.items.join('') : '—'}</span>
                  </Cell>
                )
              })}
            </div>
          )}

          {tab === 'palette' && (
            <div className="pick-grid">
              {PALETTES.map((p) => {
                const locked = !tierAllows(tier, p.tier)
                return (
                  <Cell
                    key={p.id}
                    label={p.name}
                    selected={look.palette === p.id}
                    locked={locked}
                    lockText={needTier(p.tier)}
                    onClick={() => (locked ? lockedTap(p.tier) : props.updateLook({ palette: p.id }))}
                  >
                    <span
                      className="palette-swatch"
                      style={{ '--sw-bg': p.bg, '--sw-surface': p.surface, '--sw-brand': p.brand } as CSSProperties}
                    />
                  </Cell>
                )
              })}
            </div>
          )}

          {tab === 'nameStyle' && (
            <div className="pick-grid">
              {NAME_STYLES.map((n) => {
                const locked = !tierAllows(tier, n.tier)
                return (
                  <Cell
                    key={n.id}
                    label={n.name}
                    selected={look.nameStyle === n.id}
                    locked={locked}
                    lockText={needTier(n.tier)}
                    onClick={() => (locked ? lockedTap(n.tier) : props.updateLook({ nameStyle: n.id }))}
                  >
                    <PlayerName name="小嗨" nameStyle={n.id} />
                  </Cell>
                )
              })}
            </div>
          )}
        </section>

        {/* 存档与更新 */}
        <section className="me-block">
          <h2>存档与更新</h2>
          <p className="me-small me-muted">
            更新版本不会丢失数据，请不要删除桌面图标（删除会清空数据）。换手机前请备份存档；会员靠激活码恢复，不在存档里。
          </p>
          <div className="me-row">
            <button className="btn" onClick={() => setBackup(props.exportBackup())}>
              备份存档
            </button>
            <button className="btn" onClick={() => void doCheck()} disabled={checking}>
              {checking ? '检查中…' : '检查更新'}
            </button>
          </div>
          {backup && (
            <div className="me-backup">
              <textarea readOnly value={backup} rows={3} onFocus={(e) => e.target.select()} aria-label="存档码" />
              <button className="btn btn-primary" onClick={() => void copy(backup)}>
                复制存档码
              </button>
            </div>
          )}
          <div className="me-backup">
            <textarea
              value={restoreInput}
              onChange={(e) => setRestoreInput(e.target.value)}
              rows={2}
              placeholder="粘贴存档码（XHSAVE1-…）恢复存档"
              aria-label="恢复存档"
            />
            <button className="btn" onClick={doRestore} disabled={!restoreInput.trim()}>
              恢复存档
            </button>
          </div>
          <p className="me-small me-muted me-version">版本 {props.version}</p>
          {vip && props.now - vip.lastVerifiedAt > VERIFY_MAX_AGE_MS / 2 && !view.paused && (
            <p className="me-small me-muted">提示：联网打开应用会自动核对会员。</p>
          )}
        </section>
      </div>
      {tipOpen && <TipDialog onClose={() => setTipOpen(false)} />}
    </main>
  )
}
