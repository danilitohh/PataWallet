import { describe, expect, it } from 'vitest'
import { fixedIncomeSummary, parseIncomeSources, readIncomeSources } from './incomeSources.js'

const accounts = [
  { id: 'bank-1', name: 'Ahorros', kind: 'asset', archived: false },
  { id: 'debt-1', name: 'Tarjeta', kind: 'liability', archived: false },
]

describe('fuentes de ingreso', () => {
  it('asocia un sueldo fijo a una cuenta y conserva su calendario', () => {
    const parsed = parseIncomeSources([{ id: 'salary', name: 'Nómina', type: 'fixed_salary', accountId: 'bank-1', amount: '3.200.000', frequency: 'monthly', nextPayDate: '2026-10-05' }], accounts)
    expect(parsed[0]).toMatchObject({ type: 'fixed_salary', account_id: 'bank-1', amount_minor: 320000000, frequency: 'monthly', next_pay_date: '2026-10-05' })
    expect(fixedIncomeSummary(parsed).salaryMinor).toBe(320000000)
  })

  it('permite un extra esporádico sin sumarlo al dinero libre', () => {
    const parsed = parseIncomeSources([{ id: 'extra', name: 'Venta', type: 'occasional', accountId: 'bank-1', amount: '500.000', frequency: '', nextPayDate: '' }], accounts)
    expect(parsed[0]).toMatchObject({ type: 'occasional', amount_minor: 50000000, frequency: null, next_pay_date: null })
    expect(fixedIncomeSummary(parsed).salaryMinor).toBeNull()
  })

  it('rechaza una fuente que apunta a una deuda o no tiene calendario fijo', () => {
    expect(() => parseIncomeSources([{ name: 'Nómina', type: 'fixed_salary', accountId: 'debt-1', amount: '1.000.000', frequency: 'monthly' }], accounts)).toThrow(/cuenta/i)
    expect(() => parseIncomeSources([{ name: 'Nómina', type: 'fixed_salary', accountId: 'bank-1', amount: '1.000.000', frequency: '' }], accounts)).toThrow(/frecuencia/i)
  })

  it('descarta fuentes guardadas que ya no apuntan a un activo disponible', () => {
    expect(readIncomeSources([{ id: 'old', name: 'Nómina', type: 'fixed_salary', account_id: 'debt-1', amount_minor: 100000000, frequency: 'monthly' }], accounts)).toEqual([])
  })

  it('permite guardar sin completar la fila vacía inicial', () => {
    expect(parseIncomeSources([{ name: '', type: 'fixed_salary', accountId: 'bank-1', amount: '', frequency: '', nextPayDate: '' }], accounts)).toEqual([])
  })
})
