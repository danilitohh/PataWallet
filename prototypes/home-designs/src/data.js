// Datos ficticios compartidos: cada dirección compara la misma situación financiera y marca la demo con honestidad.
export const DEMO = {
  name: 'Danilo',
  month: 'septiembre de 2026',
  salaryMinor: 320_000_000,
  // Saldo hipotético disponible al comenzar la quincena, antes de apartar sus pagos pendientes.
  payPeriodAvailableBeforeBillsMinor: 118_000_000,
  fixedMinor: 117_500_000,
  debtMinor: 18_500_000,
  budgetMinor: 120_000_000,
  liquidMinor: 416_300_000,
  paycheckDate: '30 sep',
  transactions: [
    { id: 't1', name: 'Restaurante de ejemplo', category: 'Restaurante', amountMinor: 8_500_000, date: 'Hoy · 12:40', tone: 'market' },
    { id: 't2', name: 'Mercado de barrio', category: 'Mercado', amountMinor: 8_500_000, date: 'Ayer · 18:12', tone: 'food' },
    { id: 't3', name: 'Tienda de mascotas', category: 'Mascotas', amountMinor: 9_000_000, date: '21 sep · 16:08', tone: 'pets' },
    { id: 't4', name: 'Transporte', category: 'Transporte', amountMinor: 1_200_000, date: '20 sep · 08:15', tone: 'transport' },
  ],
  payments: [
    { id: 'internet', name: 'Internet hogar', date: '28 sep', amountMinor: 8_900_000, tone: 'sky' },
    { id: 'market', name: 'Mercado quincenal', date: '25 sep', amountMinor: 18_000_000, tone: 'peach' },
    { id: 'energy', name: 'Energía', date: '29 sep', amountMinor: 12_000_000, tone: 'gold' },
  ],
}

// Formatea unidades menores enteras a pesos colombianos, sin usar decimales binarios para dinero.
export function formatMoney(minor, hidden = false, compact = false) {
  if (hidden) return '••••••'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: compact ? 1 : 0,
    ...(compact ? { notation: 'compact', compactDisplay: 'short' } : {}),
  }).format(minor / 100)
}

// Suma únicamente movimientos de gasto para respetar el cálculo de disponibilidad.
export function sumExpenses(transactions) {
  return transactions.reduce((total, transaction) => total + transaction.amountMinor, 0)
}
