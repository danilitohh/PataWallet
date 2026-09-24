// Conserva una misma situación ficticia en las tres composiciones para que la comparación sea justa.
export const PLAN_DEMO = {
  name: 'Danilo',
  seededMonth: '2026-09',
  initialBudgetMinor: 120_000_000,
  monthlyIncomeMinor: 320_000_000,
  fixedExpensesMinor: 117_500_000,
  debtPaymentsMinor: 18_500_000,
  categories: [
    { id: 'market', label: 'Mercado', amountMinor: 12_000_000, weightBps: 3000, tone: 'peach' },
    { id: 'home', label: 'Hogar', amountMinor: 8_900_000, weightBps: 2600, tone: 'sky' },
    { id: 'pets', label: 'Mascotas', amountMinor: 4_300_000, weightBps: 1500, tone: 'violet' },
    { id: 'transport', label: 'Transporte', amountMinor: 2_000_000, weightBps: 1700, tone: 'mint' },
    { id: 'other', label: 'Otros', amountMinor: 0, weightBps: 1200, tone: 'rose' },
  ],
  goals: [
    { id: 'japan-trip', name: 'Viaje a Japón', targetMinor: 200_000_000, reservedMinor: 30_000_000, dueDate: '2027-04-01' },
  ],
  plannedPurchase: { name: 'Silla para el escritorio', amountMinor: 28_000_000, targetDate: '2026-10-05' },
  nextPayDate: '2026-09-30',
}

// Formatea unidades menores de COP sin convertir importes a decimales durante los cálculos.
export function formatPlanMoney(minor, hidden = false) {
  if (hidden) return '••••••'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(minor / 100)
}

// Devuelve una etiqueta estable para el selector de mes usando la zona horaria local.
export function formatPlanMonth(month) {
  const [year, monthNumber] = month.split('-').map(Number)
  return new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, monthNumber - 1, 15)))
}

// Avanza un periodo calendario sin alterar el día por conversiones de zona horaria.
export function shiftPlanMonth(month, delta) {
  const [year, monthNumber] = month.split('-').map(Number)
  const shifted = new Date(Date.UTC(year, monthNumber - 1 + delta, 15))
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}`
}

// Convierte un formulario de pesos enteros a unidades menores y rechaza valores fuera de rango.
export function parsePlanPesos(value) {
  const pesos = Number(value)
  const minor = pesos * 100
  return Number.isSafeInteger(minor) && minor > 0 && pesos <= 1_000_000_000 ? minor : null
}

// Limita solamente el indicador gráfico; el texto conserva el porcentaje y el exceso reales.
export function progressRatio(part, total) {
  if (!total || total <= 0) return 0
  return Math.min(1, Math.max(0, part / total))
}
