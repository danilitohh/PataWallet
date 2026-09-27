// Mide abonos registrados frente a abonos más deuda pendiente; no supone un principal original.
export function debtProgress(account) {
  if (account.kind !== 'liability' || account.debt_paid_minor == null || account.balance_minor == null) return null
  const paid = Number(account.debt_paid_minor)
  const balance = Number(account.balance_minor)
  if (!Number.isSafeInteger(paid) || paid < 0 || !Number.isSafeInteger(balance)) return null
  const remaining = Math.max(0, balance)
  const total = paid + remaining
  if (!Number.isSafeInteger(total) || total <= 0) return null
  // Redondea hacia abajo para no anunciar 100 % si aún queda deuda.
  const percent = remaining === 0 ? 100 : Math.min(99.9, Math.floor((paid / total) * 1000) / 10)
  return { paid, remaining, percent }
}
