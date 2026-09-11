export function assessPlannedPurchase({ amountMinor, budgetLimitMinor, monthlyExpensesMinor, liquidAssetsMinor, reservedMinor }) {
  const budgetRemaining = budgetLimitMinor ? budgetLimitMinor - monthlyExpensesMinor : null
  const availableAfterReserves = liquidAssetsMinor - reservedMinor
  if (budgetRemaining === null) return { kind: 'unknown', budgetRemaining, availableAfterReserves, message: 'Define un presupuesto para evaluarla.' }
  if (amountMinor > availableAfterReserves) return { kind: 'warning', budgetRemaining, availableAfterReserves, shortfall: amountMinor - availableAfterReserves, reason: 'funds' }
  if (amountMinor > budgetRemaining) return { kind: 'warning', budgetRemaining, availableAfterReserves, shortfall: amountMinor - budgetRemaining, reason: 'budget' }
  return { kind: 'good', budgetRemaining, availableAfterReserves, shortfall: 0 }
}
