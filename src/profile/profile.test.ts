import { describe, expect, it } from 'vitest'
import type { Card } from '../game/types'
import { decodeBackup, encodeBackup } from './backup'
import {
  AVATARS,
  BADGES,
  DECORATIONS,
  effectiveLook,
  FRAMES,
  LEVELS,
  NAME_STYLES,
  PALETTES,
  TITLES,
  type UnlockContext,
} from './catalog'
import { generateName, validateName } from './names'
import { newProfile, parseProfile, parseVip } from './profileData'
import { applyRound, levelFor, type RoundInput } from './progress'
import { DEFAULT_LOOK, type Tier } from './types'

const seq = (...xs: number[]) => {
  let i = 0
  return () => xs[i++ % xs.length]
}
const cards = (n: number, themeId = 'animals'): Card[] => Array.from({ length: n }, (_, i) => ({ themeId, text: `词${i}` }))
const round = (over: Partial<RoundInput> = {}): RoundInput => ({
  correct: cards(3),
  skipped: cards(1),
  durationSec: 60,
  endedEarly: false,
  playedMs: 60_000,
  hour: 20,
  allThemeIds: ['animals', 'songs'],
  ...over,
})

describe('catalog', () => {
  it('每类 id 唯一', () => {
    for (const list of [AVATARS, FRAMES, TITLES, BADGES, DECORATIONS, PALETTES, NAME_STYLES]) {
      const ids = list.map((x) => x.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it('普通用户每类只有 1~3 个基础装扮', () => {
    for (const list of [AVATARS, FRAMES, DECORATIONS, PALETTES]) {
      const n = list.filter((x) => x.tier === 'free').length
      expect(n).toBeGreaterThanOrEqual(1)
      expect(n).toBeLessThanOrEqual(3)
    }
  })

  it('SVIP 可用的比 VIP 多，VIP 比普通多', () => {
    const count = (t: Tier) =>
      [AVATARS, FRAMES, DECORATIONS, PALETTES].map((l) => l.filter((x) => (t === 'svip' ? true : t === 'vip' ? x.tier !== 'svip' : x.tier === 'free')).length)
    const [f, v, s] = [count('free'), count('vip'), count('svip')]
    f.forEach((n, i) => {
      expect(v[i]).toBeGreaterThan(n)
      expect(s[i]).toBeGreaterThan(v[i])
    })
  })

  const ctx = (tier: Tier, level = 1, badges: string[] = []): UnlockContext => ({ tier, level, badges, vipActivatedAt: tier === 'free' ? null : Date.UTC(2026, 10, 26) })

  it('effectiveLook：超出会员等级的装扮退回默认', () => {
    const look = { ...DEFAULT_LOOK, avatar: 'gold-dragon', frame: 'neon', title: 'legend1', decoration: 'sakura', palette: 'blackgold', nameStyle: 'gold', worn: ['crown', 'diamond', 'milktea'] }
    expect(effectiveLook(look, ctx('svip'))).toEqual(look)
    const free = effectiveLook(look, ctx('free', 3))
    expect(free).toEqual({ ...DEFAULT_LOOK, title: 'lv3', worn: [] })
    const vip = effectiveLook({ ...look, avatar: 'panda', worn: ['milktea', 'pioneer', 'crown'] }, ctx('vip'))
    expect(vip.avatar).toBe('panda')
    expect(vip.frame).toBe('plain')
    expect(vip.worn).toEqual(['milktea', 'pioneer'])
  })

  it('effectiveLook：佩戴数量按等级限制，成就徽章必须已获得', () => {
    const look = { ...DEFAULT_LOOK, worn: ['first', 'ten', 'clean'] }
    expect(effectiveLook(look, ctx('free', 1, ['first', 'ten', 'clean'])).worn).toEqual(['first'])
    expect(effectiveLook(look, ctx('svip', 1, ['first', 'clean'])).worn).toEqual(['first', 'clean'])
  })

  it('等级称号需要达到等级', () => {
    expect(effectiveLook({ ...DEFAULT_LOOK, title: 'lv5' }, ctx('free', 4)).title).toBe('lv4')
    expect(effectiveLook({ ...DEFAULT_LOOK, title: 'lv5' }, ctx('free', 6)).title).toBe('lv5')
  })

  it('夜间配色对普通用户免费', () => {
    expect(effectiveLook({ ...DEFAULT_LOOK, palette: 'night' }, ctx('free')).palette).toBe('night')
  })
})

describe('progress', () => {
  it('等级阈值', () => {
    expect(levelFor(0).level).toBe(1)
    expect(levelFor(99).level).toBe(1)
    expect(levelFor(100).level).toBe(2)
    expect(levelFor(9000)).toMatchObject({ level: 10, next: null, progress: 1 })
    expect(levelFor(200).progress).toBeCloseTo(0.5)
    expect(LEVELS).toHaveLength(10)
  })

  it('一局的经验：每局 20 + 每答对 10；提前结束不给局数经验', () => {
    expect(applyRound(newProfile(seq(0)), round()).xpGained).toBe(50)
    expect(applyRound(newProfile(seq(0)), round({ endedEarly: true })).xpGained).toBe(30)
  })

  it('没翻过任何词的局不计局数和经验', () => {
    const r = applyRound(newProfile(seq(0)), round({ correct: [], skipped: [] }))
    expect(r.xpGained).toBe(0)
    expect(r.profile.stats.games).toBe(0)
    expect(r.newBadges).toEqual([])
  })

  it('统计累计并记录升级', () => {
    let p = newProfile(seq(0))
    p = { ...p, xp: 90 }
    const r = applyRound(p, round({ correct: cards(5, 'songs'), skipped: [] }))
    expect(r.profile.stats).toMatchObject({ games: 1, correct: 5, skipped: 0, bestScore: 5 })
    expect(r.profile.stats.correctByTheme.songs).toBe(5)
    expect(r.profile.stats.themesPlayed).toEqual(['songs'])
    expect(r.levelUp).toEqual({ from: 1, to: 2, title: '初来乍嗨' })
  })

  it('成就：首局、零跳过、十连对、手速王、夜猫子', () => {
    const r = applyRound(newProfile(seq(0)), round({ correct: cards(15), skipped: [], hour: 23 }))
    expect(r.newBadges).toEqual(expect.arrayContaining(['first', 'clean', 'ten', 'speed', 'night']))
    // 已获得的不重复给
    expect(applyRound(r.profile, round({ correct: cards(15), skipped: [], hour: 23 })).newBadges).toEqual([])
  })

  it('成就：马拉松需要玩完 5 分钟局；全主题制霸', () => {
    const p = newProfile(seq(0))
    expect(applyRound(p, round({ durationSec: 300 })).newBadges).toContain('marathon')
    expect(applyRound(p, round({ durationSec: 300, endedEarly: true })).newBadges).not.toContain('marathon')
    const both = applyRound(p, round({ correct: [...cards(1, 'animals'), ...cards(1, 'songs')] }))
    expect(both.newBadges).toContain('all-themes')
  })
})

describe('names', () => {
  it('默认名字是「形容词 + 动物」', () => {
    expect(generateName(seq(0, 0))).toBe('机智的柯基')
    expect(generateName(seq(0.999, 0.999))).toBe('幸运的小狗')
  })

  it('改名校验', () => {
    expect(validateName('  小嗨 本嗨  ')).toEqual({ ok: true, name: '小嗨 本嗨' })
    expect(validateName('a​b\u0007c')).toEqual({ ok: true, name: 'abc' })
    expect(validateName('   ').ok).toBe(false)
    expect(validateName('一二三四五六七八九十').ok).toBe(true)
    expect(validateName('一二三四五六七八九十一').ok).toBe(false)
  })
})

describe('profileData', () => {
  it('坏数据逐字段回退', () => {
    const p = parseProfile({ name: '', xp: -5, stats: { games: 3, correct: 'x' }, badges: ['first', 2], look: { avatar: 'panda', worn: ['a', 'b', 'c', 'd'] } }, seq(0))
    expect(p.name).toBe('机智的柯基')
    expect(p.xp).toBe(0)
    expect(p.stats.games).toBe(3)
    expect(p.stats.correct).toBe(0)
    expect(p.badges).toEqual(['first'])
    expect(p.look.avatar).toBe('panda')
    expect(p.look.worn).toHaveLength(3)
  })

  it('会员数据不合法时为 null', () => {
    expect(parseVip({ code: 'ABC', tier: 'gold' })).toBeNull()
    expect(parseVip({ code: 'ABC', tier: 'svip', activatedAt: 1, lastVerifiedAt: 2 })).toEqual({ code: 'ABC', tier: 'svip', activatedAt: 1, lastVerifiedAt: 2 })
  })
})

describe('backup', () => {
  const p = applyRound({ ...newProfile(seq(0.3, 0.6)), name: '小嗨测试' }, round({ correct: cards(12), skipped: [] })).profile

  it('存档码往返一致', () => {
    const code = encodeBackup(p)
    expect(code.startsWith('XHSAVE1-')).toBe(true)
    expect(decodeBackup(code)).toEqual({ ok: true, profile: p })
    // 复制时混入的换行和空格不影响
    expect(decodeBackup(` ${code.slice(0, 20)}\n${code.slice(20)} `)).toEqual({ ok: true, profile: p })
  })

  it('被改动或不完整时拒绝', () => {
    const code = encodeBackup(p)
    const tampered = code.slice(0, 15) + (code[15] === 'A' ? 'B' : 'A') + code.slice(16)
    expect(decodeBackup(tampered).ok).toBe(false)
    expect(decodeBackup(code.slice(0, -3)).ok).toBe(false)
    expect(decodeBackup('hello').ok).toBe(false)
  })
})
