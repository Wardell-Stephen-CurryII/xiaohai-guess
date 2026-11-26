// 会员激活码，见设计文档「激活码机制」。
// 激活码是 12 位随机字符；网站上只公开它们的 SHA-256 哈希（public/vip/codes.json）。
// 激活时必须联网下载哈希列表核对；作者从列表删除哈希即作废。

import type { Tier, VipState } from './types'

/** Crockford Base32：去掉了容易混淆的 I、L、O、U */
export const CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
export const CODE_LENGTH = 12
/** 哈希前缀，scripts/vip.mjs 必须保持一致 */
export const HASH_SALT = 'xiaohai:'
/** 超过这么久没有联网核对，会员暂停 */
export const VERIFY_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

/** 规范化用户输入：忽略大小写、空格、横线和 XH 前缀，纠正 O/I/L。不合法返回 null */
export function normalizeCode(input: string): string | null {
  let s = input.toUpperCase().replace(/[\s\-_—–]/g, '')
  if (s.startsWith('XH') && s.length === CODE_LENGTH + 2) s = s.slice(2)
  s = s.replace(/O/g, '0').replace(/[IL]/g, '1')
  if (s.length !== CODE_LENGTH) return null
  for (const ch of s) if (!CODE_ALPHABET.includes(ch)) return null
  return s
}

/** 展示格式：XH-XXXX-XXXX-XXXX */
export function formatCode(raw: string): string {
  return `XH-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`
}

export async function hashCode(raw: string): Promise<string> {
  const data = new TextEncoder().encode(HASH_SALT + raw)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export interface CodeList {
  vip: Set<string>
  svip: Set<string>
}

/** 解析 codes.json；格式不对返回 null */
export function parseCodeList(json: unknown): CodeList | null {
  if (typeof json !== 'object' || json === null) return null
  const o = json as Record<string, unknown>
  const toSet = (v: unknown) =>
    Array.isArray(v) ? new Set(v.filter((x): x is string => typeof x === 'string' && /^[0-9a-f]{64}$/.test(x))) : null
  const vip = toSet(o.vip)
  const svip = toSet(o.svip)
  if (!vip || !svip) return null
  return { vip, svip }
}

export function tierForHash(hash: string, list: CodeList): 'vip' | 'svip' | null {
  if (list.svip.has(hash)) return 'svip'
  if (list.vip.has(hash)) return 'vip'
  return null
}

/** 下载哈希列表。失败（断网、服务器错误、格式不对）抛出异常 */
export type FetchCodeList = () => Promise<CodeList>

export function makeFetchCodeList(url: string): FetchCodeList {
  return async () => {
    const res = await fetch(`${url}?t=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const list = parseCodeList(await res.json())
    if (!list) throw new Error('codes.json 格式不对')
    return list
  }
}

export type ActivateResult =
  | { ok: true; vip: VipState; upgraded: boolean }
  | { ok: false; reason: 'format' | 'offline' | 'invalid' | 'lower' }

export const ACTIVATE_ERROR_TEXT: Record<'format' | 'offline' | 'invalid' | 'lower', string> = {
  format: '激活码格式不对，请检查是否输错',
  offline: '激活需要联网，请连上网络后再试',
  invalid: '激活码无效或已作废，请联系作者',
  lower: '你已经是 SVIP，不需要再激活 VIP',
}

/** 激活：必须联网核对。已是 SVIP 时输入 VIP 码不会降级 */
export async function activate(
  input: string,
  current: VipState | null,
  fetchList: FetchCodeList,
  now: number,
): Promise<ActivateResult> {
  const raw = normalizeCode(input)
  if (!raw) return { ok: false, reason: 'format' }
  let list: CodeList
  try {
    list = await fetchList()
  } catch {
    return { ok: false, reason: 'offline' }
  }
  const tier = tierForHash(await hashCode(raw), list)
  if (!tier) return { ok: false, reason: 'invalid' }
  if (current && current.tier === 'svip' && tier === 'vip' && current.code !== raw) return { ok: false, reason: 'lower' }
  return {
    ok: true,
    vip: { code: raw, tier, activatedAt: current?.activatedAt ?? now, lastVerifiedAt: now },
    upgraded: !!current && current.tier === 'vip' && tier === 'svip',
  }
}

export type VerifyResult =
  | { status: 'ok'; vip: VipState }
  | { status: 'revoked' }
  | { status: 'unreachable' }

/** 定期核对：哈希还在列表里就刷新核对时间；不在了说明已作废；联网失败保持原样 */
export async function verify(vip: VipState, fetchList: FetchCodeList, now: number): Promise<VerifyResult> {
  let list: CodeList
  try {
    list = await fetchList()
  } catch {
    return { status: 'unreachable' }
  }
  const tier = tierForHash(await hashCode(vip.code), list)
  if (!tier) return { status: 'revoked' }
  return { status: 'ok', vip: { ...vip, tier, lastVerifiedAt: now } }
}

/** 当前生效的会员等级：未激活或超过 30 天没核对时按普通用户处理 */
export function effectiveTier(vip: VipState | null, now: number): Tier {
  if (!vip) return 'free'
  if (now - vip.lastVerifiedAt > VERIFY_MAX_AGE_MS) return 'free'
  return vip.tier
}

export function isPaused(vip: VipState | null, now: number): boolean {
  return !!vip && now - vip.lastVerifiedAt > VERIFY_MAX_AGE_MS
}
