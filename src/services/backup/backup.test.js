import { describe, expect, it } from 'vitest'
import { createBackup, parseBackup, planBackupMerge, transactionsCsv } from './backup.js'

const owner = '11111111-1111-4111-8111-111111111111'
const data = {
  accounts: [{ id: 'account-1', name: 'Cuenta', kind: 'asset', subtype: 'bank', currency: 'COP', archived: false }],
  categories: [{ id: 'category-1', name: 'Mercado', type: 'expense' }],
  transactions: [{ id: 'transaction-1', type: 'expense', amount_minor: 8500050, currency: 'COP', occurred_at: '2026-09-10T12:00:00-05:00', from_account_id: 'account-1', to_account_id: null, category_id: 'category-1', merchant_name: '=2+2', note: '@riesgo', source: 'manual', status: 'recorded' }],
  budgets: [{ month: '2026-09', limit_minor: 100000000 }],
  goals: [{ id: 'goal-1', name: 'Viaje', target_minor: 200000000, currency: 'COP', completed_seen: false }],
  allocations: [{ id: 'allocation-1', goal_id: 'goal-1', account_id: 'account-1', amount_minor: 100000, allocated_on: '2026-09-10' }],
  settingsRows: [{ key: 'theme', value: 'light' }],
}

describe('respaldo versionado', () => {
  it('se valida y restaura en una colección aislada sin sobrescribir', () => {
    const backup = parseBackup(JSON.stringify(createBackup(data, owner)), owner)
    const empty = Object.fromEntries(Object.keys(data).map((key) => [key, []]))
    const plan = planBackupMerge(empty, backup)
    expect(plan.conflicts).toEqual([])
    expect(plan.addedCount).toBe(7)
    expect(plan.additions.transactions[0].amount_minor).toBe(8500050)
  })

  it('rechaza otra cuenta y detecta contenido diferente antes de escribir', () => {
    const serialized = JSON.stringify(createBackup(data, owner))
    expect(() => parseBackup(serialized, '22222222-2222-4222-8222-222222222222')).toThrow(/otra cuenta/i)
    const backup = parseBackup(serialized, owner)
    const changed = { ...data, accounts: [{ ...data.accounts[0], name: 'Otro nombre' }] }
    expect(planBackupMerge(changed, backup).conflicts).toEqual([{ collection: 'accounts', id: 'account-1' }])
  })

  it('acepta préstamos como subtipos de deuda en un respaldo', () => {
    const withLoans = {
      ...data,
      accounts: [
        ...data.accounts,
        { id: 'loan-investment', name: 'Libre inversión', kind: 'liability', subtype: 'investment_loan', currency: 'COP', archived: false },
        { id: 'loan-private', name: 'Préstamo personal', kind: 'liability', subtype: 'private_loan', currency: 'COP', archived: false },
      ],
    }
    expect(() => parseBackup(JSON.stringify(createBackup(withLoans, owner)), owner)).not.toThrow()
  })

  it('conserva planes de cuotas e ingresos de referencia en el respaldo', () => {
    const withSchedule = {
      ...data,
      accounts: [{ ...data.accounts[0], id: 'loan-1', name: 'Préstamo', kind: 'liability', subtype: 'investment_loan', debt_installments_total: 12, debt_installments_paid: 3, debt_installment_amount_minor: 10000000, debt_payment_frequency: 'monthly' }],
      settingsRows: [{ key: 'monthlySalaryMinor', value: 320000000 }, { key: 'payFrequency', value: 'monthly' }],
    }
    const backup = parseBackup(JSON.stringify(createBackup(withSchedule, owner)), owner)
    expect(backup.data.accounts[0].debt_installments_total).toBe(12)
    expect(backup.data.settingsRows).toHaveLength(2)
  })

  it('rechaza un plan de cuotas incompleto', () => {
    const incomplete = { ...data, accounts: [{ ...data.accounts[0], kind: 'liability', subtype: 'private_loan', debt_installments_total: 12, debt_installments_paid: 2 }] }
    expect(() => parseBackup(JSON.stringify(createBackup(incomplete, owner)), owner)).toThrow(/plan de cuotas/i)
  })

  it('neutraliza fórmulas en CSV', () => {
    const csv = transactionsCsv(data)
    expect(csv).toContain("'=2+2")
    expect(csv).toContain("'@riesgo")
    expect(csv).not.toContain('",=2+2"')
  })

  it('rechaza referencias rotas, duplicados y movimientos de demostración antes de escribir', () => {
    const empty = Object.fromEntries(Object.keys(data).map((key) => [key, []]))
    const broken = createBackup({ ...data, accounts: [] }, owner)
    expect(() => planBackupMerge(empty, broken)).toThrow(/cuenta de origen inexistente/i)
    const duplicated = createBackup({ ...data, accounts: [data.accounts[0], data.accounts[0]] }, owner)
    expect(() => planBackupMerge(empty, duplicated)).toThrow(/repite el identificador/i)
    const demo = createBackup({ ...data, transactions: [{ ...data.transactions[0], source: 'demo' }] }, owner)
    expect(() => planBackupMerge(empty, demo)).toThrow(/demostración/i)
  })

  it('no exporta ni restaura credenciales o eventos entrantes de Atajos', () => {
    const serialized = JSON.stringify(createBackup({ ...data, deviceLinks: [{ token: 'secreto' }], incomingEvents: [{ event_id: 'evento' }] }, owner))
    expect(serialized).not.toContain('secreto')
    expect(serialized).not.toContain('incomingEvents')
    expect(parseBackup(serialized, owner).data.transactions).toHaveLength(1)
  })
})
