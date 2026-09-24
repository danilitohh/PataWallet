// Contiene datos ficticios e independientes para probar la jerarquía de Cuentas.
export const INITIAL_ACCOUNTS = [
  { id: 'cash', name: 'Efectivo', type: 'asset', amount: 438000, note: 'Disponible hoy', icon: 'cash' },
  { id: 'main', name: 'Cuenta principal', type: 'asset', amount: 3725000, note: 'Cuenta de uso diario', icon: 'bank' },
  { id: 'card', name: 'Tarjeta de ejemplo', type: 'liability', amount: 185000, note: 'Deuda pendiente', icon: 'card' },
]

// Representa solo el registro visual; marcar un pago no modifica saldos ni crea movimientos.
export const INITIAL_INCOME = [
  { id: 'salary', name: 'Salario', amount: 1600000, frequency: 'Cada 15 días', next: '15 oct', icon: 'salary' },
  { id: 'extra', name: 'Ingreso extra', amount: 180000, frequency: 'Ocasional', next: 'Sin fecha', icon: 'extra' },
]

// Los intervalos dejan ver pagos mensuales y quincenales sin automatizar cargos.
export const INITIAL_PAYMENTS = [
  { id: 'rent', name: 'Arriendo', amount: 950000, frequency: 'Mensual · día 1', next: '1 oct', icon: 'home', paid: false },
  { id: 'internet', name: 'Internet', amount: 89000, frequency: 'Mensual · día 15', next: '15 oct', icon: 'wifi', paid: false },
  { id: 'market', name: 'Mercado', amount: 320000, frequency: 'Cada 15 días', next: '30 sep', icon: 'market', paid: true },
]

// Convierte pesos enteros a la presentación local de COP sin cálculos decimales.
export function formatCOP(amount) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount)
}

// Deriva activos, deudas y patrimonio neto a partir de las cuentas visibles.
export function summarizeAccounts(accounts) {
  const assets = accounts.reduce((sum, account) => sum + (account.type === 'asset' ? account.amount : 0), 0)
  const debts = accounts.reduce((sum, account) => sum + (account.type === 'liability' ? account.amount : 0), 0)
  return { assets, debts, net: assets - debts }
}
