#!/usr/bin/env node
// 作者用的会员激活码工具。
//
//   npm run vip -- new --tier vip --to 张三 [--note 备注] [--dry-run]
//   npm run vip -- revoke <激活码或名字> [--dry-run]
//   npm run vip -- list
//
// 激活码本身只记录在本机台账 private/vip-ledger.csv（不提交到仓库）；
// 网站上只公开哈希 public/vip/codes.json。默认会自动提交并推送，约 1 分钟后生效。
// 提交信息不包含名字（仓库是公开的）。

import { execFileSync } from 'node:child_process'
import { createHash, randomInt } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CODES = resolve(ROOT, 'public/vip/codes.json')
const LEDGER = resolve(ROOT, 'private/vip-ledger.csv')
// 必须与 src/profile/vip.ts 保持一致
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
const SALT = 'xiaohai:'
const LEDGER_HEADER = 'code,tier,to,note,issuedAt,status'

const hash = (raw) => createHash('sha256').update(SALT + raw).digest('hex')
const format = (raw) => `XH-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`
const normalize = (s) => s.toUpperCase().replace(/[\s\-_]/g, '').replace(/^XH(?=.{12}$)/, '').replace(/O/g, '0').replace(/[IL]/g, '1')

function parseArgs(argv) {
  const out = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) {
      const key = a.slice(2)
      const next = argv[i + 1]
      if (next === undefined || next.startsWith('--')) out[key] = true
      else out[key] = argv[++i]
    } else out._.push(a)
  }
  return out
}

function readCodes() {
  if (!existsSync(CODES)) return { version: 1, vip: [], svip: [] }
  const d = JSON.parse(readFileSync(CODES, 'utf8'))
  return { version: 1, vip: d.vip ?? [], svip: d.svip ?? [] }
}

function writeCodes(d) {
  mkdirSync(dirname(CODES), { recursive: true })
  writeFileSync(CODES, JSON.stringify(d, null, 2) + '\n')
}

const csvCell = (s) => (/[",\n]/.test(s) ? `"${String(s).replace(/"/g, '""')}"` : String(s))

function parseCsvLine(line) {
  const cells = []
  let cur = ''
  let q = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (q) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"'
        i++
      } else if (c === '"') q = false
      else cur += c
    } else if (c === '"') q = true
    else if (c === ',') {
      cells.push(cur)
      cur = ''
    } else cur += c
  }
  cells.push(cur)
  return cells
}

function readLedger() {
  if (!existsSync(LEDGER)) return []
  const lines = readFileSync(LEDGER, 'utf8').split('\n').filter(Boolean).slice(1)
  return lines.map((l) => {
    const [code, tier, to, note, issuedAt, status] = parseCsvLine(l)
    return { code, tier, to, note, issuedAt, status }
  })
}

function writeLedger(rows) {
  mkdirSync(dirname(LEDGER), { recursive: true })
  const body = rows.map((r) => [r.code, r.tier, r.to, r.note, r.issuedAt, r.status].map(csvCell).join(',')).join('\n')
  writeFileSync(LEDGER, `${LEDGER_HEADER}\n${body}${rows.length ? '\n' : ''}`)
}

function publish(message, dryRun) {
  if (dryRun) {
    console.log('（--dry-run：未提交、未推送。网站上暂不生效）')
    return
  }
  execFileSync('git', ['add', 'public/vip/codes.json'], { cwd: ROOT, stdio: 'inherit' })
  execFileSync('git', ['commit', '-m', message], { cwd: ROOT, stdio: 'inherit' })
  execFileSync('git', ['push'], { cwd: ROOT, stdio: 'inherit' })
  console.log('已推送，GitHub Actions 发布后约 1~2 分钟生效。')
}

function cmdNew(args) {
  const tier = args.tier
  if (tier !== 'vip' && tier !== 'svip') throw new Error('请指定 --tier vip 或 --tier svip')
  if (typeof args.to !== 'string' || !args.to.trim()) throw new Error('请用 --to 写明发给谁（只记在本机台账里）')
  const codes = readCodes()
  let raw
  do {
    raw = Array.from({ length: 12 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('')
  } while (codes.vip.includes(hash(raw)) || codes.svip.includes(hash(raw)))
  codes[tier].push(hash(raw))
  writeCodes(codes)
  const ledger = readLedger()
  ledger.push({ code: raw, tier, to: args.to.trim(), note: typeof args.note === 'string' ? args.note : '', issuedAt: new Date().toISOString().slice(0, 10), status: 'active' })
  writeLedger(ledger)
  publish(`VIP：新增 1 个${tier.toUpperCase()}激活码`, args['dry-run'])
  console.log(`\n${tier.toUpperCase()} 激活码（发给 ${args.to.trim()}）：\n\n    ${format(raw)}\n`)
}

function cmdRevoke(args) {
  const key = args._[1]
  if (!key) throw new Error('请写明要作废的激活码或名字')
  const ledger = readLedger()
  const norm = normalize(key)
  let hits = ledger.filter((r) => r.status === 'active' && (r.code === norm || r.to === key))
  if (hits.length === 0) {
    // 台账里没有，但仍可按码作废
    if (norm.length !== 12) throw new Error('台账中找不到，且不是有效的激活码格式')
    hits = [{ code: norm, tier: '', to: '（台账外）', note: '', issuedAt: '', status: 'active' }]
  }
  if (hits.length > 1) {
    console.log('匹配到多个激活码，请改用激活码作废：')
    for (const r of hits) console.log(`  ${format(r.code)}  ${r.tier}  ${r.to}  ${r.issuedAt}`)
    process.exitCode = 1
    return
  }
  const target = hits[0]
  const h = hash(target.code)
  const codes = readCodes()
  const before = codes.vip.length + codes.svip.length
  codes.vip = codes.vip.filter((x) => x !== h)
  codes.svip = codes.svip.filter((x) => x !== h)
  if (codes.vip.length + codes.svip.length === before) console.log('提醒：codes.json 里没有这个码（可能已作废）。')
  writeCodes(codes)
  for (const r of ledger) if (r.code === target.code) r.status = `revoked ${new Date().toISOString().slice(0, 10)}`
  writeLedger(ledger)
  publish('VIP：作废 1 个激活码', args['dry-run'])
  console.log(`已作废：${format(target.code)}（${target.to}）`)
}

function cmdList() {
  const ledger = readLedger()
  if (!ledger.length) return console.log('台账为空。')
  for (const r of ledger) console.log(`${format(r.code)}  ${r.tier.padEnd(4)}  ${r.issuedAt}  ${r.status.padEnd(18)}  ${r.to}${r.note ? `（${r.note}）` : ''}`)
}

try {
  const args = parseArgs(process.argv.slice(2))
  const cmd = args._[0]
  if (cmd === 'new') cmdNew(args)
  else if (cmd === 'revoke') cmdRevoke(args)
  else if (cmd === 'list') cmdList()
  else {
    console.log('用法：\n  npm run vip -- new --tier vip|svip --to 名字 [--note 备注] [--dry-run]\n  npm run vip -- revoke <激活码或名字> [--dry-run]\n  npm run vip -- list')
  }
} catch (e) {
  console.error(`出错：${e.message}`)
  process.exitCode = 1
}
