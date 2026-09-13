import { describe, expect, it } from 'vitest'
import { parseIncomeSettings, payFrequencyLabel } from './incomeSettings.js'

describe('preferencias de ingresos', () => {
  it('guarda sueldo mensual y periodicidad', () => {
    expect(parseIncomeSettings({ salary: '3.200.000', frequency: 'semimonthly' })).toEqual({ monthlySalaryMinor: 320000000, payFrequency: 'semimonthly' })
  })

  it('permite quitar la referencia dejando ambos campos vacíos', () => {
    expect(parseIncomeSettings({ salary: '', frequency: '' })).toEqual({ monthlySalaryMinor: null, payFrequency: null })
  })

  it('conserva opcionalmente la fecha del próximo pago', () => {
    expect(parseIncomeSettings({ salary: '3.200.000', frequency: 'monthly', nextPayDate: '2026-10-05' })).toEqual({ monthlySalaryMinor: 320000000, payFrequency: 'monthly', nextPayDate: '2026-10-05' })
    expect(() => parseIncomeSettings({ salary: '3.200.000', frequency: 'monthly', nextPayDate: '05/10/2026' })).toThrow(/fecha/i)
  })

  it('exige los dos datos cuando se configura la referencia', () => {
    expect(() => parseIncomeSettings({ salary: '3.200.000', frequency: '' })).toThrow(/recibes tu pago/)
    expect(() => parseIncomeSettings({ salary: '', frequency: 'monthly' })).toThrow(/sueldo/)
  })

  it('traduce una frecuencia guardada', () => {
    expect(payFrequencyLabel('monthly')).toBe('Cada mes')
    expect(payFrequencyLabel('unknown')).toBe('')
  })
})
