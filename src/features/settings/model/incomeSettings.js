import { assertMinor, parseLocalizedAmount } from '../../../domain/money.js'

// Opciones de periodicidad de pago que la persona puede declarar sin crear ingresos automáticos.
export const PAY_FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Cada semana' },
  { value: 'biweekly', label: 'Cada 2 semanas' },
  { value: 'semimonthly', label: 'Dos veces al mes (quincenal)' },
  { value: 'monthly', label: 'Cada mes' },
]

const frequencyValues = new Set(PAY_FREQUENCY_OPTIONS.map((option) => option.value))

// Convierte el formulario de ingresos a valores seguros para user_settings.
export function parseIncomeSettings({ salary, frequency, nextPayDate: nextPayDateInput } = {}) {
  const hasNextPayDate = nextPayDateInput !== undefined
  const salaryInput = String(salary ?? '').trim()
  const frequencyInput = String(frequency ?? '').trim()
  const nextPayDate = String(nextPayDateInput ?? '').trim()
  if (!salaryInput && !frequencyInput && !nextPayDate) return hasNextPayDate ? { monthlySalaryMinor: null, payFrequency: null, nextPayDate: null } : { monthlySalaryMinor: null, payFrequency: null }
  if (!salaryInput) throw new Error('Indica tu sueldo mensual equivalente.')
  if (!frequencyValues.has(frequencyInput)) throw new Error('Elige cada cuánto recibes tu pago.')
  if (nextPayDate && !/^\d{4}-\d{2}-\d{2}$/.test(nextPayDate)) throw new Error('La fecha del próximo pago no es válida.')
  const monthlySalaryMinor = assertMinor(parseLocalizedAmount(salaryInput))
  if (monthlySalaryMinor <= 0) throw new Error('El sueldo mensual debe ser mayor que cero.')
  return hasNextPayDate ? { monthlySalaryMinor, payFrequency: frequencyInput, nextPayDate: nextPayDate || null } : { monthlySalaryMinor, payFrequency: frequencyInput }
}

// Traduce el valor persistido a un texto seguro para mostrarlo en la interfaz.
export function payFrequencyLabel(value) {
  return PAY_FREQUENCY_OPTIONS.find((option) => option.value === value)?.label || ''
}
