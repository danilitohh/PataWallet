import { assertMinor, parseLocalizedAmount, safeAdd, toInputAmount } from './money.js'
import { isCalendarDate, normalizeExpenseSchedule, readPaymentHistory } from './recurringExpenses.js'

const MAX_FIXED_EXPENSES = 50

// Convierte gastos fijos guardados en ajustes a una forma segura para mostrar sin romper la pantalla.
export function readFixedExpenses(value) {
  if (!Array.isArray(value)) return []
  return value
    .map((item, index) => {
      const amount = Number(item?.amount_minor)
      const name = String(item?.name || '').trim()
      if (name.length < 2 || !Number.isSafeInteger(amount) || amount <= 0) return null
      try {
        assertMinor(amount)
        const schedule = normalizeExpenseSchedule(item?.frequency, item?.next_due_date)
        return {
          id: String(item.id || `fixed-${index}`),
          name: name.slice(0, 80),
          amount_minor: amount,
          currency: 'COP',
          category_id: item?.category_id ? String(item.category_id) : null,
          frequency: schedule.frequency,
          next_due_date: schedule.nextDueDate,
          payment_history: readPaymentHistory(item?.payment_history),
        }
      } catch {
        return null
      }
    })
    .filter(Boolean)
    .slice(0, MAX_FIXED_EXPENSES)
}

// Valida los campos repetibles del onboarding y devuelve solo datos persistibles.
export function parseFixedExpenses(rows) {
  if (!Array.isArray(rows) || rows.length > MAX_FIXED_EXPENSES) throw new Error(`Puedes registrar hasta ${MAX_FIXED_EXPENSES} gastos fijos.`)
  const parsed = []
  for (const row of rows) {
    const name = String(row?.name || '').trim()
    const amountInput = String(row?.amount ?? '').trim()
    if (!name && !amountInput) continue
    if (name.length < 2 || name.length > 80) throw new Error('Cada gasto fijo necesita un nombre de 2 a 80 caracteres.')
    const frequency = String(row?.frequency || 'monthly')
    if (!['monthly', 'payday', 'biweekly', 'weekly'].includes(frequency)) throw new Error(`Elige cada cuánto se repite ${name}.`)
    if (!amountInput) throw new Error(`Indica el ${frequency === 'monthly' ? 'monto mensual' : 'monto de cada pago'} de ${name}.`)
    const nextDueDate = String(row?.nextDueDate || '').trim()
    if (nextDueDate && !isCalendarDate(nextDueDate)) throw new Error(`La próxima fecha de ${name} no es válida.`)
    if (frequency !== 'monthly' && !nextDueDate) throw new Error(`Indica la próxima fecha de ${name} para generar su checklist.`)
    parsed.push({
      id: String(row.id || `fixed-${parsed.length}`),
      name,
      amount_minor: parseLocalizedAmount(amountInput),
      currency: 'COP',
      category_id: row?.categoryId ? String(row.categoryId) : null,
      frequency,
      next_due_date: nextDueDate || null,
      payment_history: readPaymentHistory(row?.paymentHistory),
    })
  }
  return parsed
}

// Suma compromisos fijos con enteros seguros para evitar errores monetarios de coma flotante.
export function sumFixedExpenses(expenses = []) {
  return expenses.reduce((total, item) => safeAdd(total, Number(item.amount_minor || 0)), 0)
}

// Prepara el valor persistido para editarlo con inputs localizados es-CO.
export function fixedExpensesToInput(value, { defaultDueDate = '' } = {}) {
  return readFixedExpenses(value).map((item) => ({
    id: item.id,
    name: item.name,
    amount: toInputAmount(item.amount_minor),
    frequency: item.frequency,
    categoryId: item.category_id || '',
    nextDueDate: item.next_due_date || defaultDueDate,
    paymentHistory: item.payment_history,
  }))
}
