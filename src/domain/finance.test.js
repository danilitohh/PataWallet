import { describe, expect, it } from 'vitest'
import fixtures from '../../examples/demo-fixtures.json'
import { calculateAvailableMoney, calculateSummary, goalProgress } from './finance.js'
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

  it('revierte todos los efectos al anular y recalcula una edición sin duplicar', () => {
    const original = transactions.find((item) => item.type === 'transfer')
    const withoutTransfer = calculateSummary(accounts, transactions.map((item) => item.id === original.id ? { ...item, status: 'void' } : item), '2026-09')
    expect(withoutTransfer.assets).toBe(Number(fixtures.expected.total_assets_minor))
    expect(withoutTransfer.expenses).toBe(Number(fixtures.expected.month_expense_minor))
    const edited = calculateSummary(accounts, transactions.map((item) => item.id === original.id ? { ...item, amount_minor: 10000000 } : item), '2026-09')
    expect(edited.assets).toBe(Number(fixtures.expected.total_assets_minor))
  })

  it('trata un reembolso como reducción del gasto, no como ingreso', () => {
    const refund = { id: 'refund', type: 'refund', amount_minor: 500000, currency: 'COP', occurred_at: '2026-09-09T12:00:00-05:00', from_account_id: null, to_account_id: accounts[0].id, status: 'recorded' }
    const summary = calculateSummary(accounts, [...transactions, refund], '2026-09')
    expect(summary.expenses).toBe(Number(fixtures.expected.month_expense_minor) - 500000)
    expect(summary.income).toBe(Number(fixtures.expected.month_income_minor))
  })

  it('calcula el mes según America/Bogota cerca de medianoche UTC', () => {
    const late = { id: 'late', type: 'expense', amount_minor: 100, currency: 'COP', occurred_at: '2026-10-01T02:00:00Z', from_account_id: accounts[0].id, to_account_id: null, status: 'recorded' }
    expect(calculateSummary(accounts, [late], '2026-09').expenses).toBe(100)
    expect(calculateSummary(accounts, [late], '2026-10').expenses).toBe(0)
  })

  it('descuenta un gasto sin cuenta del dinero libre sin alterar los saldos', () => {
    const expense = { id: 'budget-expense', type: 'expense', amount_minor: 2500000, currency: 'COP', occurred_at: '2026-09-10T12:00:00-05:00', from_account_id: null, to_account_id: null, status: 'recorded' }
    const before = calculateSummary(accounts, transactions, '2026-09')
    const after = calculateSummary(accounts, [...transactions, expense], '2026-09')
    expect(after.balances).toEqual(before.balances)
    expect(after.expenses).toBe(before.expenses + expense.amount_minor)
    const options = { monthlySalaryMinor: 320000000, accounts, month: '2026-09' }
    const baseline = calculateAvailableMoney({ ...options, transactions })
    const available = calculateAvailableMoney({ ...options, transactions: [...transactions, expense] })
    expect(available.availableNowMinor).toBe(baseline.availableNowMinor - expense.amount_minor)
  })

  it('sustituye el compromiso fijo previsto por el pago real y no lo descuenta dos veces', () => {
    const paid = { id: 'fixed-payment:internet:2026-09-15', type: 'expense', amount_minor: 9000000, currency: 'COP', occurred_at: '2026-09-15T12:00:00-05:00', from_account_id: null, to_account_id: null, status: 'recorded' }
    const fixedExpenses = [{ id: 'internet', name: 'Internet', amount_minor: 10000000, frequency: 'monthly', next_due_date: '2026-09-15', payment_history: [{ due_date: '2026-09-15', status: 'paid', paid_at: '2026-09-15T12:00:00Z', transaction_id: paid.id }] }]
    const options = { monthlySalaryMinor: 100000000, fixedExpenses, accounts: [], transactions: [paid], month: '2026-09' }
    expect(calculateAvailableMoney(options).availableNowMinor).toBe(91000000)
    expect(calculateAvailableMoney({ ...options, transactions: [{ ...paid, amount_minor: 11000000 }] }).availableNowMinor).toBe(89000000)
    expect(calculateAvailableMoney({ ...options, transactions: [{ ...paid, status: 'void' }] }).availableNowMinor).toBe(90000000)
  })

  it('descuenta abonos sin cuota prevista y solo el exceso de una cuota ya reservada', () => {
    const debt = { id: 'debt-a', kind: 'liability', archived: false, debt_monthly_payment_minor: 10000000 }
    const otherDebt = { id: 'debt-b', kind: 'liability', archived: false }
    const payment = (id, debtId, amount) => ({ id, type: 'card_payment', amount_minor: amount, from_account_id: 'bank', to_account_id: debtId, occurred_at: '2026-09-26T12:00:00-05:00', status: 'recorded' })
    const asset = { id: 'bank', kind: 'asset', archived: false }
    const options = { monthlySalaryMinor: 185980000, accounts: [asset, debt, otherDebt], month: '2026-09' }
    const planned = calculateAvailableMoney({ ...options, transactions: [payment('first', debt.id, 7000000)] })
    expect(planned.availableNowMinor).toBe(175980000)
    const twoDebts = calculateAvailableMoney({ ...options, transactions: [payment('first', debt.id, 12000000), payment('second', otherDebt.id, 5000000)] })
    expect(twoDebts.trackedDebtPaymentsMinor).toBe(17000000)
    expect(twoDebts.additionalDebtPaymentsMinor).toBe(7000000)
    expect(twoDebts.availableNowMinor).toBe(168980000)
    expect(calculateAvailableMoney({ ...options, transactions: [payment('first', debt.id, 12000000), { ...payment('second', otherDebt.id, 5000000), status: 'void' }] }).availableNowMinor).toBe(173980000)
  })
})
