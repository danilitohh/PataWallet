import { describe, expect, it } from 'vitest'
import { activityMonthLabel, shiftActivityMonth } from './activityTimeline.js'

describe('activity timeline periods', () => {
  it('moves across year boundaries without skipping a month', () => {
    expect(shiftActivityMonth('2026-01', -1)).toBe('2025-12')
    expect(shiftActivityMonth('2025-12', 1)).toBe('2026-01')
  })

  it('formats the selected month in Spanish', () => {
    expect(activityMonthLabel('2026-09')).toBe('Septiembre de 2026')
  })

  it('rejects malformed periods and offsets', () => {
    expect(() => shiftActivityMonth('2026-13', 1)).toThrow(RangeError)
    expect(() => activityMonthLabel('septiembre')).toThrow(RangeError)
    expect(() => shiftActivityMonth('2026-09', 0.5)).toThrow(RangeError)
  })
})
