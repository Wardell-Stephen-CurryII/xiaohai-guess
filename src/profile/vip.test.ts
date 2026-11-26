import { describe, expect, it } from 'vitest'
import {
  activate,
  effectiveTier,
  formatCode,
  hashCode,
  isPaused,
  normalizeCode,
  parseCodeList,
  verify,
  VERIFY_MAX_AGE_MS,
  type CodeList,
} from './vip'

const RAW_VIP = 'ABCD1234EFGH'
const RAW_SVIP = 'ZZZZ9999YYYY'
const NOW = Date.UTC(2026, 10, 26)

async function listWith(vip: string[], svip: string[]): Promise<CodeList> {
  return {
    vip: new Set(await Promise.all(vip.map(hashCode))),
    svip: new Set(await Promise.all(svip.map(hashCode))),
  }
}
const offline = async (): Promise<CodeList> => {
  throw new Error('offline')
}

describe('hashCode', () => {
  it('与作者工具 scripts/vip.mjs 的算法一致（sha256("xiaohai:" + 码)）', async () => {
    // 期望值由 Node 的 crypto.createHash 计算（scripts/vip.mjs 使用同一算法）
    expect(await hashCode(RAW_VIP)).toBe('6a5a24af4da27878bfd74313530134c0fcfc98ca2cf7b2700f13d3f74906a68f')
  })
})

describe('normalizeCode', () => {
  it('忽略大小写、空格、横线和 XH 前缀', () => {
    expect(normalizeCode('xh-abcd-1234-efgh')).toBe(RAW_VIP)
    expect(normalizeCode(' ABCD 1234 EFGH ')).toBe(RAW_VIP)
    expect(normalizeCode(formatCode(RAW_VIP))).toBe(RAW_VIP)
  })

  it('纠正 O→0、I/L→1', () => {
    expect(normalizeCode('ABCDO234EFGH')).toBe('ABCD0234EFGH')
    expect(normalizeCode('ABCDI234EFGL')).toBe('ABCD1234EFG1')
  })

  it('长度或字符不对返回 null', () => {
    expect(normalizeCode('ABCD1234')).toBeNull()
    expect(normalizeCode('ABCD1234EFGU')).toBeNull()
    expect(normalizeCode('')).toBeNull()
  })
})

describe('parseCodeList', () => {
  it('只接受 64 位十六进制哈希', () => {
    const h = 'a'.repeat(64)
    const list = parseCodeList({ version: 1, vip: [h, 'bad', 3], svip: [] })
    expect(list?.vip).toEqual(new Set([h]))
    expect(parseCodeList({ vip: [] })).toBeNull()
    expect(parseCodeList(null)).toBeNull()
  })
})

describe('activate', () => {
  it('VIP 码和 SVIP 码', async () => {
    const fetchList = () => listWith([RAW_VIP], [RAW_SVIP])
    const v = await activate('xh-abcd-1234-efgh', null, fetchList, NOW)
    expect(v).toEqual({ ok: true, upgraded: false, vip: { code: RAW_VIP, tier: 'vip', activatedAt: NOW, lastVerifiedAt: NOW } })
    const s = await activate(RAW_SVIP, v.ok ? v.vip : null, fetchList, NOW + 1000)
    expect(s.ok && s.vip.tier).toBe('svip')
    expect(s.ok && s.upgraded).toBe(true)
    // 升级后保留最初的激活时间（「首批支持者」）
    expect(s.ok && s.vip.activatedAt).toBe(NOW)
  })

  it('SVIP 输入 VIP 码不会降级', async () => {
    const fetchList = () => listWith([RAW_VIP], [RAW_SVIP])
    const svip = { code: RAW_SVIP, tier: 'svip' as const, activatedAt: NOW, lastVerifiedAt: NOW }
    expect(await activate(RAW_VIP, svip, fetchList, NOW)).toEqual({ ok: false, reason: 'lower' })
  })

  it('格式错误、断网、无效码', async () => {
    const fetchList = () => listWith([RAW_VIP], [])
    expect(await activate('123', null, fetchList, NOW)).toEqual({ ok: false, reason: 'format' })
    expect(await activate(RAW_VIP, null, offline, NOW)).toEqual({ ok: false, reason: 'offline' })
    expect(await activate(RAW_SVIP, null, fetchList, NOW)).toEqual({ ok: false, reason: 'invalid' })
  })
})

describe('verify 与 30 天规则', () => {
  const vip = { code: RAW_VIP, tier: 'vip' as const, activatedAt: NOW, lastVerifiedAt: NOW }

  it('还在列表里：刷新核对时间', async () => {
    const r = await verify(vip, () => listWith([RAW_VIP], []), NOW + 5)
    expect(r).toEqual({ status: 'ok', vip: { ...vip, lastVerifiedAt: NOW + 5 } })
  })

  it('从列表删除：已作废', async () => {
    expect(await verify(vip, () => listWith([], []), NOW)).toEqual({ status: 'revoked' })
  })

  it('断网：保持原样', async () => {
    expect(await verify(vip, offline, NOW)).toEqual({ status: 'unreachable' })
  })

  it('超过 30 天没核对：暂停为普通用户', () => {
    expect(effectiveTier(vip, NOW + VERIFY_MAX_AGE_MS)).toBe('vip')
    expect(effectiveTier(vip, NOW + VERIFY_MAX_AGE_MS + 1)).toBe('free')
    expect(isPaused(vip, NOW + VERIFY_MAX_AGE_MS + 1)).toBe(true)
    expect(effectiveTier(null, NOW)).toBe('free')
  })
})
