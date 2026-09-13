import { describe, expect, it } from 'vitest'
import { calculateAvailableMoney } from './finance.js'
import { parseFixedExpenses, sumFixedExpenses } from './financialSetup.js'

describe('punto de partida financiero', () => {
  it('suma gastos fijos y descuenta cuotas declaradas del salario mensual', () => {
    const fixedExpenses = parseFixedExpenses([
      { id: 'rent', name: 'Arriendo', amount: '1.200.000' },
      { id: 'internet', name: 'Internet', amount: '100.000' },
    ])
    const accounts = [{ id: 'loan', kind: 'liability', archived: false, debt_installments_total: 12, debt_installments_paid: 0, debt_installment_amount_minor: 5000000, debt_payment_frequency: 'monthly' }]
    const available = calculateAvailableMoney({ monthlySalaryMinor: 320000000, fixedExpenses, accounts, transactions: [], month: '2026-09' })
    expect(sumFixedExpenses(fixedExpenses)).toBe(130000000)
    expect(available.debtPaymentsMinor).toBe(5000000)
    expect(available.monthlyFreeMinor).toBe(185000000)
  })

  it('rechaza una fila parcialmente vacía y permite quitar todas las filas', () => {
    expect(parseFixedExpenses([{ name: '', amount: '' }])).toEqual([])
    expect(() => parseFixedExpenses([{ name: 'Arriendo', amount: '' }])).toThrow(/monto mensual/i)
  })
})

