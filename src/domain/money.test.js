import { describe, expect, it } from 'vitest'
import { formatInputAmount } from './money.js'

describe('formatInputAmount', () => {
  it('agrupa miles mientras se escribe', () => {
    expect(formatInputAmount('1750000')).toBe('1.750.000')
    expect(formatInputAmount('1.750.000')).toBe('1.750.000')
  })

  it('conserva la coma decimal y limita los centavos', () => {
    expect(formatInputAmount('1750000,5')).toBe('1.750.000,5')
    expect(formatInputAmount('1750000,567')).toBe('1.750.000,56')
    expect(formatInputAmount('1,')).toBe('1,')
  })
})
