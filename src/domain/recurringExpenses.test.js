import { describe, expect, it } from 'vitest'
import { getRecurringExpenseOccurrences, setRecurringExpensePaid, sumExpectedFixedExpenses } from './recurringExpenses.js'

const expenses = [
  { id: 'internet', name: 'Internet', amount_minor: 8000000, frequency: 'monthly', next_due_date: '2026-09-15', payment_history: [] },
  { id: 'market', name: 'Mercado', amount_minor: 25000000, frequency: 'biweekly', next_due_date: '2026-09-15', payment_history: [] },
]

describe('pagos recurrentes', () => {
  it('genera un vencimiento mensual y dos quincenales dentro de septiembre', () => {
    const occurrences = getRecurringExpenseOccurrences(expenses, { from: '2026-09-01', to: '2026-09-30', today: '2026-09-15' })
    expect(occurrences.map((item) => `${item.name}:${item.dueDate}`)).toEqual([
      'Internet:2026-09-15',
      'Mercado:2026-09-15',
      'Mercado:2026-09-30',
    ])
    expect(sumExpectedFixedExpenses(expenses, { month: '2026-09' })).toBe(58000000)
  })

  it('usa las fechas de pago configuradas para los compromisos de cada pago', () => {
    const occurrences = getRecurringExpenseOccurrences([{ ...expenses[0], frequency: 'payday' }], {
      from: '2026-09-01', to: '2026-09-30', today: '2026-09-01', payFrequency: 'semimonthly', nextPayDate: '2026-09-15',
    })
    expect(occurrences.map((item) => item.dueDate)).toEqual(['2026-09-15', '2026-09-30'])
  })

  it('marca y desmarca un vencimiento sin crear un movimiento', () => {
    const occurrence = getRecurringExpenseOccurrences(expenses, { from: '2026-09-15', to: '2026-09-15', today: '2026-09-15' }).find((item) => item.name === 'Internet')
    const paidExpenses = setRecurringExpensePaid(expenses, occurrence, true, '2026-09-15T12:00:00.000Z')
    expect(getRecurringExpenseOccurrences(paidExpenses, { from: '2026-09-15', to: '2026-09-15', today: '2026-09-15' }).find((item) => item.name === 'Internet').status).toBe('paid')
    const pendingExpenses = setRecurringExpensePaid(paidExpenses, occurrence, false)
    expect(pendingExpenses.find((item) => item.id === 'internet').payment_history).toEqual([])
  })
})
