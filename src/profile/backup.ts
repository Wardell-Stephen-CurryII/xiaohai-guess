// 存档码：把资料（不含会员）编码成一段文字，方便保存到微信或备忘录，删除应用或换手机后恢复。
// 格式：XHSAVE1-<base64url(JSON)>-<校验和>。会员靠重新输入激活码恢复，不放进存档。

import { parseProfile } from './profileData'
import type { Profile } from './types'

const PREFIX = 'XHSAVE1-'

/** FNV-1a 32 位校验和（防止误改、复制不完整，不是加密） */
function checksum(s: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(36).padStart(7, '0')
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)
  const bin = atob(b64)
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
}

export function encodeBackup(p: Profile): string {
  const body = toBase64Url(JSON.stringify({ v: 1, p }))
  return `${PREFIX}${body}-${checksum(body)}`
}

export type RestoreResult = { ok: true; profile: Profile } | { ok: false; reason: string }

export function decodeBackup(input: string): RestoreResult {
  const s = input.replace(/\s+/g, '')
  if (!s.startsWith(PREFIX)) return { ok: false, reason: '这不是小嗨猜猜猜的存档码' }
  const rest = s.slice(PREFIX.length)
  const dash = rest.lastIndexOf('-')
  if (dash <= 0) return { ok: false, reason: '存档码不完整，请复制完整的一段' }
  const body = rest.slice(0, dash)
  if (checksum(body) !== rest.slice(dash + 1)) return { ok: false, reason: '存档码校验失败，可能复制不完整或被改动过' }
  try {
    const data: unknown = JSON.parse(fromBase64Url(body))
    if (typeof data !== 'object' || data === null || (data as { v?: unknown }).v !== 1) {
      return { ok: false, reason: '存档码版本不支持' }
    }
    return { ok: true, profile: parseProfile((data as { p: unknown }).p) }
  } catch {
    return { ok: false, reason: '存档码损坏，无法读取' }
  }
}
