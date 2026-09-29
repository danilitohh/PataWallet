import { describe, expect, it } from 'vitest'
import { buildAssistantContext } from './assistantContext.js'

describe('contexto del asistente', () => {
  it('resume datos financieros sin incluir cuentas archivadas', () => {
    const context = buildAssistantContext({
      accounts: [
        { id: 'account-1', name: 'Banco', kind: 'asset', subtype: 'bank', archived: false },
        { id: 'account-2', name: 'Archivada', kind: 'asset', subtype: 'cash', archived: true },
      ],
      transactions: [],
      budgets: [{ month: '2026-09', limit_minor: 10000000 }],
      goals: [],
      allocations: [],
      plannedPurchases: [],
      month: '2026-09',
      settings: { monthlySalaryMinor: 320000000, payFrequency: 'monthly', internal_id: 'no-enviar' },
    })
    expect(context.accounts).toEqual([{ name: 'Banco', kind: 'asset', subtype: 'bank', balance_formatted: '$ 0', debt_schedule: null }])
    expect(context.budget).toEqual({ month: '2026-09', limit_formatted: '$ 100.000' })
    expect(context.income_reference).toBeUndefined()
    expect(context.summary).toEqual({ assets_formatted: '$ 0', debt_formatted: '$ 0', net_formatted: '$ 0', income_formatted: '$ 0', expenses_formatted: '$ 0' })
    expect(context.available_money).toMatchObject({ pending_fixed_formatted: '$ 0', pending_debt_formatted: '$ 0', spendable_formatted: '$ 0' })
    expect(JSON.stringify(context)).not.toMatch(/_minor/)
  })

  it('limita el texto libre de movimientos', () => {
    const context = buildAssistantContext({ accounts: [{ id: 'account-1', name: 'Banco', kind: 'asset', subtype: 'bank', archived: false }], transactions: [{ id: 't', from_account_id: 'account-1', to_account_id: null, type: 'expense', amount_minor: 100, occurred_at: '2026-09-01T12:00:00-05:00', merchant_name: 'x'.repeat(300), note: 'y'.repeat(400), status: 'recorded' }], budgets: [], goals: [], allocations: [], plannedPurchases: [], month: '2026-09' })
    expect(context.recent_transactions[0].merchant_name).toHaveLength(120)
    expect(context.recent_transactions[0].note).toHaveLength(160)
    expect(context.recent_transactions[0].amount_formatted).toBe('$ 1')
  })
})
