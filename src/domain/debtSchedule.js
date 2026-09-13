import { assertMinor, parseLocalizedAmount, safeAdd } from './money.js'

const MAX_INSTALLMENTS = 600

// Las frecuencias son deliberadamente explícitas para que el plan no se confunda con un movimiento automático.
export const DEBT_PAYMENT_FREQUENCIES = [
  { value: 'weekly', label: 'Cada semana' },
  { value: 'biweekly', label: 'Cada 2 semanas' },
  { value: 'semimonthly', label: 'Dos veces al mes (quincenal)' },
  { value: 'monthly', label: 'Cada mes' },
]

const frequencyLabels = Object.fromEntries(DEBT_PAYMENT_FREQUENCIES.map((option) => [option.value, option.label]))

function parseInstallments(value, label, { required = false } = {}) {
  const raw = String(value ?? '').trim()
  if (!raw) {
    if (required) throw new Error(`Indica ${label.toLowerCase()}.`)
    return null
  }
  if (!/^\d+$/.test(raw)) throw new Error(`${label} debe ser un número entero.`)
  const parsed = Number(raw)
  if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > MAX_INSTALLMENTS) throw new Error(`${label} debe estar entre 0 y ${MAX_INSTALLMENTS}.`)
  return parsed
}

// Valida el bloque opcional del formulario y devuelve las columnas persistibles de una cuenta.
export function parseDebtSchedule({ total, paid, amount, frequency }) {
  const hasAnyValue = [total, paid, amount, frequency].some((value) => String(value ?? '').trim() !== '')
  if (!hasAnyValue) return { debt_installments_total: null, debt_installments_paid: 0, debt_installment_amount_minor: null, debt_payment_frequency: null }

  const totalValue = parseInstallments(total, 'El total de cuotas', { required: true })
  if (totalValue < 1) throw new Error('El total de cuotas debe ser mayor que cero.')
  const paidValue = parseInstallments(paid, 'Las cuotas pagadas') ?? 0
  if (paidValue > totalValue) throw new Error('Las cuotas pagadas no pueden superar el total.')
  if (!String(amount ?? '').trim()) throw new Error('Indica el valor de cada cuota.')
  const amountValue = parseLocalizedAmount(amount)
  if (!frequencyLabels[frequency]) throw new Error('Elige cada cuánto pagas esta deuda.')

  return {
    debt_installments_total: totalValue,
    debt_installments_paid: paidValue,
    debt_installment_amount_minor: amountValue,
    debt_payment_frequency: frequency,
  }
}

// Normaliza registros antiguos y evita mostrar un plan incompleto como si estuviera configurado.
export function readDebtSchedule(account) {
  const total = Number(account?.debt_installments_total)
  const paid = Number(account?.debt_installments_paid || 0)
  const amount = Number(account?.debt_installment_amount_minor)
  const frequency = account?.debt_payment_frequency
  if (!Number.isInteger(total) || total < 1 || !Number.isInteger(paid) || paid < 0 || paid > total || !Number.isInteger(amount) || amount < 1 || !frequencyLabels[frequency]) return null
  // Un respaldo o una sincronización corrupta no debe tumbar la pantalla de Cuentas.
  try {
    assertMinor(amount)
  } catch {
    return null
  }
  return { total, paid, amount, frequency, frequencyLabel: frequencyLabels[frequency] }
}

// Devuelve una descripción corta para filas de cuenta y resúmenes, sin prometer cobros automáticos.
export function debtScheduleLabel(account, formatAmount) {
  const schedule = readDebtSchedule(account)
  if (!schedule) return ''
  return `${schedule.paid} de ${schedule.total} cuotas · ${formatAmount(schedule.amount)} ${schedule.frequencyLabel.toLowerCase()}`
}

export function installmentsLimit() {
  return MAX_INSTALLMENTS
}

// Convierte una cuota según su frecuencia a un compromiso mensual conservador y entero.
export function monthlyDebtPaymentMinor(account) {
  const declaredMonthlyPayment = Number(account?.debt_monthly_payment_minor)
  if (Number.isSafeInteger(declaredMonthlyPayment) && declaredMonthlyPayment > 0) {
    try { return assertMinor(declaredMonthlyPayment) } catch { return 0 }
  }
  const schedule = readDebtSchedule(account)
  if (!schedule) return 0
  if (schedule.frequency === 'monthly') return schedule.amount
  if (schedule.frequency === 'semimonthly') return safeAdd(schedule.amount, schedule.amount)
  if (schedule.frequency === 'biweekly') return Math.ceil((schedule.amount * 26) / 12)
  return Math.ceil((schedule.amount * 52) / 12)
}

// Suma las cuotas mensuales declaradas sin convertir una deuda en pagos automáticos.
export function totalMonthlyDebtPayments(accounts = []) {
  return accounts.filter((account) => account.kind === 'liability' && !account.archived).reduce((total, account) => safeAdd(total, monthlyDebtPaymentMinor(account)), 0)
}
