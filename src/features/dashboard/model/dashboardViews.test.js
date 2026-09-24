import { describe, expect, it } from 'vitest'
import { calendarDaysBetween, expenseBreakdown, nextIncomeDate, normalizeHomeView } from './dashboardViews.js'

describe('dashboard view helpers', () => {
  it('normalizes invalid view preferences to the default view', () => {
    expect(normalizeHomeView('activity')).toBe('activity')
    expect(normalizeHomeView('unknown')).toBe('available')
  })

  it('finds the next configured payday, including biweekly schedules', () => {
    expect(nextIncomeDate({ frequency: 'biweekly', nextPayDate: '2026-09-15', today: '2026-09-23' })).toBe('2026-09-29')
    expect(nextIncomeDate({ frequency: 'monthly', nextPayDate: null, today: '2026-09-23' })).toBeNull()
  })

  it('counts calendar days without local timezone drift', () => {
    expect(calendarDaysBetween('2026-09-23', '2026-09-30')).toBe(7)
    expect(calendarDaysBetween('invalid', '2026-09-30')).toBeNull()
  })

  it('groups only real, non-void expenses from the selected month', () => {
    const transactions = [
      { type: 'expense', category_id: 'food', amount_minor: 12000, occurred_at: '2026-09-10T12:00:00Z', status: 'posted' },
      { type: 'expense', category_id: 'food', amount_minor: 8000, occurred_at: '2026-09-11T12:00:00Z', status: 'posted' },
      { type: 'expense', category_id: 'food', amount_minor: 7000, occurred_at: '2026-09-12T12:00:00Z', status: 'void' },
      { type: 'income', category_id: 'food', amount_minor: 5000, occurred_at: '2026-09-12T12:00:00Z', status: 'posted' },
      { type: 'expense', category_id: 'food', amount_minor: 6000, occurred_at: '2026-08-31T12:00:00Z', status: 'posted' },
    ]
    expect(expenseBreakdown(transactions, [{ id: 'food', name: 'Mercado' }], '2026-09')).toEqual([
      { name: 'Mercado', amount: 20000, percent: 100 },
    ])
  })
})
