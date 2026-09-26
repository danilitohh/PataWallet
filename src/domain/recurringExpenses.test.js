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

  it('mantiene atrasos hasta pagarlos y oculta pagos completados sin quitar el siguiente', () => {
    const internet = {
      ...expenses[0],
      next_due_date: '2026-07-25',
      payment_history: [
        { due_date: '2026-07-25', status: 'paid', paid_at: '2026-07-25T12:00:00.000Z' },
        { due_date: '2026-09-25', status: 'paid', paid_at: '2026-09-25T12:00:00.000Z' },
      ],
    }
    const options = { from: '2026-09-12', to: '2026-11-10', today: '2026-09-26', includeOverdue: true, includePaid: false }
    const occurrences = getRecurringExpenseOccurrences([internet], options)

    expect(occurrences.map(({ dueDate, status }) => [dueDate, status])).toEqual([
      ['2026-08-25', 'overdue'],
      ['2026-10-25', 'pending'],
    ])

    const paidExpenses = setRecurringExpensePaid([internet], occurrences[0], true, '2026-09-26T12:00:00.000Z')
    expect(getRecurringExpenseOccurrences(paidExpenses, options).map((item) => item.dueDate)).toEqual([
      '2026-10-25',
    ])
  })

  it('muestra como máximo el vencimiento actual y el siguiente por gasto', () => {
    const options = {
      from: '2026-09-12', to: '2026-11-10', today: '2026-09-26',
      includeOverdue: true, includePaid: false, maxOccurrencesPerExpense: 2,
    }
    const occurrences = getRecurringExpenseOccurrences(expenses, options)

    expect(occurrences.map(({ name, dueDate }) => `${name}:${dueDate}`)).toEqual([
      'Internet:2026-09-15',
      'Mercado:2026-09-15',
      'Mercado:2026-09-30',
      'Internet:2026-10-15',
    ])

    const paidExpenses = setRecurringExpensePaid(expenses, occurrences[1], true, '2026-09-26T12:00:00.000Z')
    expect(getRecurringExpenseOccurrences(paidExpenses, options).map(({ name, dueDate }) => `${name}:${dueDate}`)).toEqual([
      'Internet:2026-09-15',
      'Mercado:2026-09-30',
      'Internet:2026-10-15',
      'Mercado:2026-10-15',
    ])
  })

  it('marca y desmarca un vencimiento sin crear un movimiento', () => {
    const occurrence = getRecurringExpenseOccurrences(expenses, { from: '2026-09-15', to: '2026-09-15', today: '2026-09-15' }).find((item) => item.name === 'Internet')
    const paidExpenses = setRecurringExpensePaid(expenses, occurrence, true, '2026-09-15T12:00:00.000Z')
    expect(getRecurringExpenseOccurrences(paidExpenses, { from: '2026-09-15', to: '2026-09-15', today: '2026-09-15' }).find((item) => item.name === 'Internet').status).toBe('paid')
    const pendingExpenses = setRecurringExpensePaid(paidExpenses, occurrence, false)
    expect(pendingExpenses.find((item) => item.id === 'internet').payment_history).toEqual([])
  })
})
