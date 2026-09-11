import { describe, expect, it } from 'vitest'
import { assessPlannedPurchase } from './plannedPurchases.js'

describe('evaluación de próximas compras', () => {
  it('no trata la compra prevista como gasto y la compara con presupuesto y fondos', () => {
    expect(assessPlannedPurchase({ amountMinor: 100, budgetLimitMinor: 500, monthlyExpensesMinor: 200, liquidAssetsMinor: 1000, reservedMinor: 300 })).toMatchObject({ kind: 'good', budgetRemaining: 300, availableAfterReserves: 700 })
  })
  it('prioriza advertir fondos no cubiertos por reservas', () => {
    expect(assessPlannedPurchase({ amountMinor: 800, budgetLimitMinor: 2000, monthlyExpensesMinor: 0, liquidAssetsMinor: 1000, reservedMinor: 400 })).toMatchObject({ kind: 'warning', reason: 'funds', shortfall: 200 })
  })
})
