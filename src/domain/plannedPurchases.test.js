import { describe, expect, it } from 'vitest'
import { assessPlannedPurchase } from './plannedPurchases.js'

describe('evaluación de próximas compras', () => {
  it('no trata la compra prevista como gasto y la compara con presupuesto y fondos', () => {
    expect(assessPlannedPurchase({ amountMinor: 100, budgetLimitMinor: 500, monthlyExpensesMinor: 200, liquidAssetsMinor: 1000, reservedMinor: 300 })).toMatchObject({ kind: 'good', budgetRemaining: 300, availableAfterReserves: 700 })
  })
  it('prioriza advertir fondos no cubiertos por reservas', () => {
    expect(assessPlannedPurchase({ amountMinor: 800, budgetLimitMinor: 2000, monthlyExpensesMinor: 0, liquidAssetsMinor: 1000, reservedMinor: 400 })).toMatchObject({ kind: 'warning', reason: 'funds', shortfall: 200 })
  })

  it('rechaza una compra que dejaría el dinero libre en cero', () => {
    expect(assessPlannedPurchase({ amountMinor: 900, budgetLimitMinor: null, monthlyExpensesMinor: 100, liquidAssetsMinor: null, monthlyFreeMinor: 1000 })).toMatchObject({ kind: 'warning', reason: 'free_money', remainingAfterPurchase: 0 })
  })

  it('advierte conservar margen cuando falta mucho para el próximo pago', () => {
    expect(assessPlannedPurchase({ amountMinor: 700, budgetLimitMinor: null, monthlyExpensesMinor: 100, liquidAssetsMinor: null, monthlyFreeMinor: 1000, nextPayDate: '2026-10-05', referenceDate: '2026-09-13T12:00:00-05:00' })).toMatchObject({ kind: 'warning', reason: 'before_payday', daysUntilPay: 22 })
  })
})
