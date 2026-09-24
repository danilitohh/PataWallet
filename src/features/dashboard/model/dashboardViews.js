import { recurringExpenseDates } from '../../../domain/recurringExpenses.js'
import { safeAdd } from '../../../domain/money.js'
import { monthInTimeZone } from '../../../domain/finance.js'

// Mantiene la preferencia del Inicio dentro de las tres vistas disponibles.
export const HOME_VIEWS = [
  { id: 'available', label: 'Saldo claro' },
  { id: 'payday', label: 'Quincena' },
  { id: 'activity', label: 'Actividad' },
]

const HOME_VIEW_IDS = new Set(HOME_VIEWS.map((view) => view.id))

// Reemplaza preferencias desconocidas o antiguas por la vista de dinero disponible.
export function normalizeHomeView(value) {
  return HOME_VIEW_IDS.has(value) ? value : 'available'
}

// Calcula el siguiente pago desde la fecha ancla y la frecuencia declaradas por el usuario.
export function nextIncomeDate({ frequency, nextPayDate, today }) {
  if (!frequency || !nextPayDate) return null
  const end = addDays(today, 370)
  return recurringExpenseDates({ frequency: 'payday', next_due_date: nextPayDate }, {
    from: today,
    to: end,
    payFrequency: frequency,
    nextPayDate,
  })[0] || null
}

// Devuelve días enteros de calendario para un vencimiento sin errores de zona horaria.
export function calendarDaysBetween(from, to) {
  if (!isIsoDate(from) || !isIsoDate(to)) return null
  const start = new Date(`${from}T12:00:00Z`)
  const end = new Date(`${to}T12:00:00Z`)
  return Math.round((end.getTime() - start.getTime()) / 86_400_000)
}

// Resume los gastos del mes por categoría usando únicamente movimientos válidos del libro.
export function expenseBreakdown(transactions, categories, month) {
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]))
  const totals = new Map()
  let total = 0
  for (const transaction of transactions) {
    if (transaction.status === 'void' || transaction.type !== 'expense' || monthInTimeZone(transaction.occurred_at) !== month) continue
    const name = categoryNames.get(transaction.category_id) || 'Sin categoría'
    const amount = Number(transaction.amount_minor)
    totals.set(name, safeAdd(totals.get(name) || 0, amount))
    total = safeAdd(total, amount)
  }
  return [...totals.entries()].map(([name, amount]) => ({ name, amount, percent: total ? Math.round((amount / total) * 100) : 0 }))
    .sort((left, right) => right.amount - left.amount)
}

// Suma días a una fecha ISO con aritmética de calendario UTC.
function addDays(date, count) {
  if (!isIsoDate(date)) return ''
  const result = new Date(`${date}T12:00:00Z`)
  result.setUTCDate(result.getUTCDate() + count)
  return result.toISOString().slice(0, 10)
}

// Valida fechas antes de utilizarlas en cálculos del calendario.
function isIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false
  const date = new Date(`${value}T12:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}
