import { describe, expect, it } from 'vitest'
import { debtProgress } from './debtProgress.js'

describe('avance de deuda registrada', () => {
  const debt = (paid, balance) => debtProgress({ kind: 'liability', debt_paid_minor: paid, balance_minor: balance })
  it('calcula abonos frente a deuda pendiente y cambia con nuevas compras', () => {
    expect(debt(25000, 75000)).toEqual({ paid: 25000, remaining: 75000, percent: 25 })
    expect(debt(25000, 100000).percent).toBe(20)
    expect(debt(0, 100000).percent).toBe(0)
    expect(debt(100000, 0).percent).toBe(100)
    expect(debt(120000, -20000).percent).toBe(100)
    expect(debt(999999, 1).percent).toBe(99.9)
  })
  it('no inventa avance sin datos, en activos o con importes inválidos', () => {
    expect(debtProgress({ kind: 'asset', debt_paid_minor: 50, balance_minor: 50 })).toBeNull()
    for (const [paid, balance] of [[undefined, 100], [0, 0], [-1, 100], [2.5, 100], [100, null], [Number.MAX_SAFE_INTEGER, 1]]) expect(debt(paid, balance)).toBeNull()
  })
})
