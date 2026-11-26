// 真心话 / 大冒险题库检查。修改题库后运行 npm test。

import { describe, expect, it } from 'vitest'
import dare from './dare.json'
import truth from './truth.json'

const MAX_CHARS = 40
const banks = { 真心话: truth, 大冒险: dare }

describe('真心话 / 大冒险题库', () => {
  for (const [name, bank] of Object.entries(banks)) {
    describe(name, () => {
      it('普通 450 条、劲爆 50 条', () => {
        expect(bank.normal).toHaveLength(450)
        expect(bank.spicy).toHaveLength(50)
      })

      it('没有重复（包括普通和劲爆之间）', () => {
        const all = [...bank.normal, ...bank.spicy]
        expect(all.filter((x, i) => all.indexOf(x) !== i)).toEqual([])
      })

      it(`每条不超过 ${MAX_CHARS} 个字、无首尾空格`, () => {
        const bad = [...bank.normal, ...bank.spicy].filter((x) => x !== x.trim() || [...x].length > MAX_CHARS || !x)
        expect(bad).toEqual([])
      })

      it('不涉及真实金钱（转账、红包、打钱）', () => {
        // 「过年收过最多的红包」只是回忆，不要求现场发钱
        const bad = [...bank.normal, ...bank.spicy].filter((x) => /转账|打钱|发红包|发个红包/.test(x))
        expect(bad).toEqual([])
      })
    })
  }

  it('大冒险不出现任何亲吻', () => {
    const bad = [...dare.normal, ...dare.spicy].filter((x) => /亲|吻|嘴对嘴|舌吻|啵/.test(x))
    expect(bad).toEqual([])
  })

  it('真心话和大冒险之间不重复', () => {
    const t = new Set([...truth.normal, ...truth.spicy])
    expect([...dare.normal, ...dare.spicy].filter((x) => t.has(x))).toEqual([])
  })
})
