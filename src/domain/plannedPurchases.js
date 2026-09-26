// Calcula cuántos días faltan para el próximo pago sin depender de la zona horaria del dispositivo.
function daysUntilPayday(nextPayDate, referenceDate = new Date(), timeZone = 'America/Bogota') {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(nextPayDate || ''))) return null
  const todayInProfile = new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date(referenceDate))
  const target = Date.parse(`${nextPayDate}T12:00:00Z`)
  const start = Date.parse(`${todayInProfile}T12:00:00Z`)
  if (!Number.isFinite(target) || target < start) return null
  return Math.ceil((target - start) / 86400000)
}

// Evalúa una compra contra presupuesto, fondos, dinero libre y el tiempo restante hasta el próximo pago.
export function assessPlannedPurchase({ amountMinor, budgetLimitMinor, monthlyExpensesMinor = 0, liquidAssetsMinor = null, reservedMinor = 0, nextPayDate = null, referenceDate = new Date(), timeZone = 'America/Bogota' }) {
  const budgetRemaining = budgetLimitMinor ? budgetLimitMinor - monthlyExpensesMinor : null
  const availableAfterReserves = liquidAssetsMinor === null ? null : liquidAssetsMinor - reservedMinor
  const remainingAfterPurchase = availableAfterReserves === null ? null : availableAfterReserves - amountMinor
  const daysUntilPay = daysUntilPayday(nextPayDate, referenceDate, timeZone)
  if (availableAfterReserves === null) return { kind: 'unknown', budgetRemaining, availableAfterReserves, remainingAfterPurchase, daysUntilPay, message: 'Agrega una cuenta con tu saldo actual para evaluar esta compra.' }
  if (amountMinor >= availableAfterReserves) return { kind: 'warning', budgetRemaining, availableAfterReserves, remainingAfterPurchase, daysUntilPay, shortfall: Math.max(0, amountMinor - availableAfterReserves), reason: 'funds' }
  if (budgetRemaining !== null && amountMinor > budgetRemaining) return { kind: 'warning', budgetRemaining, availableAfterReserves, remainingAfterPurchase, daysUntilPay, shortfall: amountMinor - budgetRemaining, reason: 'budget' }
  // Mantiene un colchón conservador cuando falta mucho para el siguiente ingreso; no predice ingresos futuros.
  const reserveThreshold = Math.ceil(availableAfterReserves / 4)
  if (daysUntilPay !== null && daysUntilPay > 14 && remainingAfterPurchase < reserveThreshold) return { kind: 'warning', budgetRemaining, availableAfterReserves, remainingAfterPurchase, daysUntilPay, shortfall: reserveThreshold - remainingAfterPurchase, reason: 'before_payday' }
  return { kind: 'good', budgetRemaining, availableAfterReserves, remainingAfterPurchase, daysUntilPay, shortfall: 0 }
}
