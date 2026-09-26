import { assertMinor, safeAdd } from './money.js'

// Define las frecuencias disponibles para compromisos que se repiten en el tiempo.
export const FIXED_EXPENSE_FREQUENCY_OPTIONS = [
  { value: 'monthly', label: 'Cada mes' },
  { value: 'payday', label: 'Cada vez que recibo mi pago' },
  { value: 'biweekly', label: 'Cada 15 días' },
  { value: 'weekly', label: 'Cada semana' },
]

const FREQUENCY_VALUES = new Set(FIXED_EXPENSE_FREQUENCY_OPTIONS.map((option) => option.value))
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const MAX_PAYMENT_HISTORY = 240

// Normaliza una frecuencia y una fecha sin permitir que una configuración dañada rompa el calendario.
export function normalizeExpenseSchedule(frequency, nextDueDate) {
  const normalizedFrequency = FREQUENCY_VALUES.has(String(frequency || '')) ? String(frequency) : 'monthly'
  const normalizedDate = isCalendarDate(nextDueDate) ? String(nextDueDate) : null
  return { frequency: normalizedFrequency, nextDueDate: normalizedDate }
}

// Valida una fecha de calendario sin convertirla a la zona horaria del navegador.
export function isCalendarDate(value) {
  if (!DATE_PATTERN.test(String(value || ''))) return false
  const [year, month, day] = String(value).split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day, 12))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

// Lee el historial de pagos y conserva solo estados pagados con fechas válidas.
export function readPaymentHistory(value) {
  if (!Array.isArray(value)) return []
  return value.map((payment) => {
    const dueDate = String(payment?.due_date || '')
    const paidAt = String(payment?.paid_at || '')
    const paidAmount = payment?.paid_amount_minor === undefined || payment?.paid_amount_minor === null ? null : Number(payment.paid_amount_minor)
    if (!isCalendarDate(dueDate) || (paidAt && Number.isNaN(Date.parse(paidAt)))) return null
    if (paidAmount !== null) {
      try { assertMinor(paidAmount) } catch { return null }
    }
    return { due_date: dueDate, status: 'paid', paid_at: paidAt || null, paid_amount_minor: paidAmount }
  }).filter(Boolean).slice(-MAX_PAYMENT_HISTORY)
}

// Obtiene la fecha actual en Colombia para generar vencimientos consistentes en todos los dispositivos.
export function calendarToday(timeZone = 'America/Bogota') {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date())
}

// Suma días de calendario usando UTC para evitar cambios accidentales por horario de verano.
export function addCalendarDays(isoDate, days) {
  if (!isCalendarDate(isoDate)) throw new Error('La fecha del pago no es válida.')
  const date = toUtcDate(isoDate)
  date.setUTCDate(date.getUTCDate() + Number(days))
  return toIsoDate(date)
}

// Genera los pagos de un compromiso dentro de un intervalo inclusivo.
export function recurringExpenseDates(expense, { from, to, payFrequency, nextPayDate, today } = {}) {
  if (!isCalendarDate(from) || !isCalendarDate(to) || from > to) return []
  const schedule = normalizeExpenseSchedule(expense.frequency, expense.next_due_date)
  const anchor = schedule.nextDueDate || (schedule.frequency === 'payday' ? nextPayDate : today || from)
  if (!anchor || !isCalendarDate(anchor)) return []
  if (schedule.frequency === 'monthly') return monthlyDates(anchor, from, to)
  if (schedule.frequency === 'payday') return paydayDates(anchor, from, to, payFrequency)
  return intervalDates(anchor, from, to, schedule.frequency === 'weekly' ? 7 : 15)
}

// Devuelve el rango visible, conserva atrasos pendientes desde su ancla y limita pagos hechos al periodo reciente.
export function getRecurringExpenseOccurrences(expenses = [], options = {}) {
  const from = options.from || calendarToday()
  const to = options.to || addCalendarDays(from, 45)
  const today = options.today || calendarToday()
  const includeOverdue = options.includeOverdue === true
  return expenses.flatMap((expense) => {
    const schedule = normalizeExpenseSchedule(expense.frequency, expense.next_due_date)
    const anchor = schedule.nextDueDate || (schedule.frequency === 'payday' ? options.nextPayDate : today)
    const occurrenceFrom = includeOverdue && isCalendarDate(anchor) && anchor < from ? anchor : from
    const paymentByDate = new Map(readPaymentHistory(expense.payment_history).map((payment) => [payment.due_date, payment]))
    return recurringExpenseDates(expense, { ...options, from: occurrenceFrom, to }).map((dueDate) => {
      const payment = paymentByDate.get(dueDate)
      return {
        id: `${expense.id}:${dueDate}`,
        expenseId: expense.id,
        name: expense.name,
        amount_minor: Number(expense.amount_minor),
        dueDate,
        status: payment ? 'paid' : dueDate < today ? 'overdue' : 'pending',
        paidAt: payment?.paid_at || null,
        paidAmountMinor: payment?.paid_amount_minor ?? null,
        frequency: schedule.frequency,
      }
    }).filter((occurrence) => !(includeOverdue && occurrence.status === 'paid' && occurrence.dueDate < from))
  }).sort((left, right) => left.dueDate.localeCompare(right.dueDate) || left.name.localeCompare(right.name))
}

// Marca o desmarca un vencimiento sin crear un movimiento financiero automático.
export function setRecurringExpensePaid(expenses = [], occurrence, paid, paidAt = new Date().toISOString()) {
  return expenses.map((expense) => {
    if (String(expense.id) !== String(occurrence.expenseId)) return expense
    const history = readPaymentHistory(expense.payment_history).filter((item) => item.due_date !== occurrence.dueDate)
    if (paid) history.push({ due_date: occurrence.dueDate, status: 'paid', paid_at: paidAt, paid_amount_minor: occurrence.amount_minor })
    return { ...expense, payment_history: history.slice(-MAX_PAYMENT_HISTORY) }
  })
}

// Calcula el compromiso esperado de un mes según las ocurrencias, sin usar decimales binarios.
export function sumExpectedFixedExpenses(expenses = [], { month, payFrequency, nextPayDate } = {}) {
  if (!/^\d{4}-\d{2}$/.test(String(month || ''))) return sumExpenseAmounts(expenses)
  const from = `${month}-01`
  const to = addCalendarDays(nextMonthStart(month), -1)
  return expenses.reduce((total, expense) => {
    const dates = recurringExpenseDates(expense, { from, to, payFrequency, nextPayDate })
    const amount = Number(expense.amount_minor || 0)
    // Los registros antiguos no tienen fecha; se mantienen como compromisos mensuales para no perder su cálculo.
    const fallback = expense.frequency === 'payday' && !payFrequency ? amount : hasScheduleDate(expense) ? 0 : amount
    return safeAdd(total, dates.length ? dates.reduce((sum) => safeAdd(sum, amount), 0) : fallback)
  }, 0)
}

// Devuelve una etiqueta legible para la frecuencia guardada.
export function expenseFrequencyLabel(value) {
  return FIXED_EXPENSE_FREQUENCY_OPTIONS.find((option) => option.value === value)?.label || 'Cada mes'
}

function hasScheduleDate(expense) {
  return isCalendarDate(expense?.next_due_date) || (expense?.frequency === 'payday' && isCalendarDate(expense?.next_pay_date))
}

function sumExpenseAmounts(expenses) {
  return expenses.reduce((total, expense) => safeAdd(total, Number(expense.amount_minor || 0)), 0)
}

function monthlyDates(anchor, from, to) {
  const anchorDate = toUtcDate(anchor)
  const firstMonth = toUtcDate(`${from.slice(0, 7)}-01`)
  const lastMonth = toUtcDate(`${to.slice(0, 7)}-01`)
  const dates = []
  for (const cursor = new Date(firstMonth); cursor <= lastMonth; cursor.setUTCMonth(cursor.getUTCMonth() + 1)) {
    const day = Math.min(anchorDate.getUTCDate(), daysInMonth(cursor.getUTCFullYear(), cursor.getUTCMonth()))
    const candidate = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), day, 12))
    const iso = toIsoDate(candidate)
    if (iso >= anchor && iso >= from && iso <= to) dates.push(iso)
  }
  return dates
}

function paydayDates(anchor, from, to, payFrequency) {
  if (!payFrequency) return []
  if (payFrequency === 'monthly') return monthlyDates(anchor, from, to)
  if (payFrequency === 'weekly') return intervalDates(anchor, from, to, 7)
  if (payFrequency === 'biweekly') return intervalDates(anchor, from, to, 14)
  if (payFrequency === 'semimonthly') return semimonthlyDates(anchor, from, to)
  return []
}

function semimonthlyDates(anchor, from, to) {
  const anchorDay = toUtcDate(anchor).getUTCDate()
  const firstDay = anchorDay > 15 ? anchorDay - 15 : anchorDay
  const firstMonth = toUtcDate(`${from.slice(0, 7)}-01`)
  const lastMonth = toUtcDate(`${to.slice(0, 7)}-01`)
  const dates = []
  for (const cursor = new Date(firstMonth); cursor <= lastMonth; cursor.setUTCMonth(cursor.getUTCMonth() + 1)) {
    const year = cursor.getUTCFullYear()
    const month = cursor.getUTCMonth()
    for (const day of [firstDay, firstDay + 15]) {
      const candidate = new Date(Date.UTC(year, month, Math.min(day, daysInMonth(year, month)), 12))
      const iso = toIsoDate(candidate)
      if (iso >= anchor && iso >= from && iso <= to) dates.push(iso)
    }
  }
  return dates
}

function intervalDates(anchor, from, to, interval) {
  if (anchor > to) return []
  let cursor = anchor
  let guard = 0
  while (cursor < from && guard < 2000) { cursor = addCalendarDays(cursor, interval); guard += 1 }
  const dates = []
  while (cursor <= to && guard < 3000) {
    if (cursor >= from) dates.push(cursor)
    cursor = addCalendarDays(cursor, interval)
    guard += 1
  }
  return dates
}

function nextMonthStart(month) {
  const date = toUtcDate(`${month}-01`)
  date.setUTCMonth(date.getUTCMonth() + 1)
  return toIsoDate(date)
}

function daysInMonth(year, monthIndex) {
  return new Date(Date.UTC(year, monthIndex + 1, 0, 12)).getUTCDate()
}

function toUtcDate(isoDate) {
  const [year, month, day] = String(isoDate).split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day, 12))
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10)
}
