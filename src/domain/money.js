const MAX_MINOR = 999_999_999_999

export function assertMinor(value) {
  const amount = typeof value === 'string' ? Number(value) : value
  if (!Number.isSafeInteger(amount) || amount < 0 || amount > MAX_MINOR) {
    throw new RangeError('El importe está fuera del rango permitido.')
  }
  return amount
}

export function parseLocalizedAmount(input) {
  const raw = String(input).trim().replace(/\s/g, '')
  if (!raw || !/^\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?$|^\d+(?:,\d{1,2})?$/.test(raw)) {
    throw new Error('Usa un monto como 85.000 o 85.000,50.')
  }
  const [whole, decimals = ''] = raw.split(',')
  const normalizedWhole = whole.replace(/\./g, '')
  const minor = Number(normalizedWhole) * 100 + Number(decimals.padEnd(2, '0'))
  assertMinor(minor)
  if (minor <= 0) throw new Error('El monto debe ser mayor que cero.')
  return minor
}

export function formatMinor(value, currency = 'COP', hidden = false) {
  if (hidden) return '••••••'
  const minor = Number(value)
  const hasCents = minor % 100 !== 0
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  }).format(minor / 100)
}

export function toInputAmount(minor) {
  const amount = Number(minor) / 100
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(amount)
}

export function safeAdd(a, b) {
  const result = Number(a) + Number(b)
  if (!Number.isSafeInteger(result)) throw new RangeError('La suma supera el rango seguro.')
  return result
}
