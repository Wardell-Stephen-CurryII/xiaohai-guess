// 把存储的资料和会员状态，换算成界面上实际显示的样子。

import { effectiveLook, type UnlockContext } from './catalog'
import { levelFor, type LevelInfo } from './progress'
import type { Look, Profile, Tier, VipState } from './types'
import { effectiveTier, isPaused } from './vip'

export interface ProfileView {
  name: string
  tier: Tier
  /** 会员超过 30 天没联网核对，暂时按普通用户显示 */
  paused: boolean
  level: LevelInfo
  /** 实际生效的装扮（超出会员等级的退回默认） */
  look: Look
  ctx: UnlockContext
}

export function profileView(profile: Profile, vip: VipState | null, now: number): ProfileView {
  const tier = effectiveTier(vip, now)
  const level = levelFor(profile.xp)
  const ctx: UnlockContext = { tier, level: level.level, badges: profile.badges, vipActivatedAt: vip?.activatedAt ?? null }
  return { name: profile.name, tier, paused: isPaused(vip, now), level, look: effectiveLook(profile.look, ctx), ctx }
}
