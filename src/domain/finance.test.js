import { describe, expect, it } from 'vitest'
import fixtures from '../../examples/demo-fixtures.json'
import { calculateSummary, goalProgress } from './finance.js'
import { parseLocalizedAmount } from './money.js'

const accounts = fixtures.accounts
const transactions = fixtures.transactions.map((item) => ({ ...item, amount_minor: Number(item.amount_minor) }))

describe('reglas financieras de PataWallet', () => {
  it('reproduce exactamente los resultados del fixture', () => {
    const summary = calculateSummary(accounts, transactions, '2026-09')
    expect(summary.balances).toEqual(Object.fromEntries(Object.entries(fixtures.expected.account_balances_minor).map(([key, value]) => [key, Number(value)])))
    expect(summary.assets).toBe(Number(fixtures.expected.total_assets_minor))
    expect(summary.debt).toBe(Number(fixtures.expected.total_debt_minor))
    expect(summary.net).toBe(Number(fixtures.expected.net_position_minor))
    expect(summary.income).toBe(Number(fixtures.expected.month_income_minor))
    expect(summary.expenses).toBe(Number(fixtures.expected.month_expense_minor))
  })

  it('no cuenta apertura, transferencia ni pago de tarjeta como ingreso o gasto', () => {
    const summary = calculateSummary(accounts, transactions, '2026-09')
    expect(summary.income).toBe(320000000)
    expect(summary.expenses).toBe(27200000)
  })

  it('reserva metas sin modificar los activos', () => {
    const progress = goalProgress(fixtures.goals[0], fixtures.goal_allocations)
    expect(progress.reserved).toBe(30000000)
    expect(progress.percent).toBe(15)
  })

  it('convierte montos es-CO a unidades menores enteras', () => {
    expect(parseLocalizedAmount('85.000,50')).toBe(8500050)
    expect(() => parseLocalizedAmount('85.00.0')).toThrow()
  })
})
