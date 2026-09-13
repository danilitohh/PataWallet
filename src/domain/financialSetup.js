import { assertMinor, parseLocalizedAmount, safeAdd, toInputAmount } from './money.js'

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
        return { id: String(item.id || `fixed-${index}`), name: name.slice(0, 80), amount_minor: amount, currency: 'COP' }
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
    if (!amountInput) throw new Error(`Indica el monto mensual de ${name}.`)
    parsed.push({ id: String(row.id || `fixed-${parsed.length}`), name, amount_minor: parseLocalizedAmount(amountInput), currency: 'COP' })
  }
  return parsed
}

// Suma compromisos fijos con enteros seguros para evitar errores monetarios de coma flotante.
export function sumFixedExpenses(expenses = []) {
  return expenses.reduce((total, item) => safeAdd(total, Number(item.amount_minor || 0)), 0)
}

// Prepara el valor persistido para editarlo con inputs localizados es-CO.
export function fixedExpensesToInput(value) {
  return readFixedExpenses(value).map((item) => ({ id: item.id, name: item.name, amount: toInputAmount(item.amount_minor) }))
}
