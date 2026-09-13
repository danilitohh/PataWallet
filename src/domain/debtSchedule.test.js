import { describe, expect, it } from 'vitest'
import { debtScheduleLabel, monthlyDebtPaymentMinor, parseDebtSchedule, readDebtSchedule } from './debtSchedule.js'

describe('plan de cuotas de deuda', () => {
  it('convierte un plan completo a columnas persistibles', () => {
    expect(parseDebtSchedule({ total: '12', paid: '3', amount: '250.000', frequency: 'monthly' })).toEqual({
      debt_installments_total: 12,
      debt_installments_paid: 3,
      debt_installment_amount_minor: 25000000,
      debt_payment_frequency: 'monthly',
    })
  })

  it('permite dejar el plan completamente vacío', () => {
    expect(parseDebtSchedule({ total: '', paid: '', amount: '', frequency: '' })).toEqual({
      debt_installments_total: null,
      debt_installments_paid: 0,
      debt_installment_amount_minor: null,
      debt_payment_frequency: null,
    })
  })

  it('rechaza cuotas pagadas por encima del total o campos incompletos', () => {
    expect(() => parseDebtSchedule({ total: '4', paid: '5', amount: '100.000', frequency: 'monthly' })).toThrow(/superar/)
    expect(() => parseDebtSchedule({ total: '4', paid: '0', amount: '', frequency: 'monthly' })).toThrow(/valor de cada cuota/)
  })

  it('lee planes existentes y devuelve una etiqueta breve', () => {
    const account = { kind: 'liability', debt_installments_total: 10, debt_installments_paid: 2, debt_installment_amount_minor: 15000000, debt_payment_frequency: 'biweekly' }
    expect(readDebtSchedule(account)?.frequencyLabel).toBe('Cada 2 semanas')
    expect(debtScheduleLabel(account, (value) => `$${value}`)).toBe('2 de 10 cuotas · $15000000 cada 2 semanas')
  })

  it('usa el pago mensual declarado sin inventar un total de cuotas', () => {
    const account = { kind: 'liability', debt_monthly_payment_minor: 10000000 }
    expect(monthlyDebtPaymentMinor(account)).toBe(10000000)
  })
})
