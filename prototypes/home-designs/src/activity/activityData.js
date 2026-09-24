// Mantiene una muestra financiera ficticia, consistente y sin conexiones a datos de la aplicación.
export const ACTIVITY_DEMO = [
  { id: 'sep-1', month: 'sep', type: 'expense', name: 'Mercado de la esquina', category: 'Mercado', account: 'Cuenta principal', date: 'Hoy · 12:40', day: 'Hoy', daysAgo: 0, amountMinor: 12_350_000, tone: 'market', note: 'Frutas, verduras y despensa' },
  { id: 'sep-2', month: 'sep', type: 'expense', name: 'Café Bruma', category: 'Restaurantes', account: 'Cuenta principal', date: 'Hoy · 09:15', day: 'Hoy', daysAgo: 0, amountMinor: 18_500_000, tone: 'coffee', note: 'Desayuno con Laura' },
  { id: 'sep-3', month: 'sep', type: 'income', name: 'Nómina · Taller Norte', category: 'Salario', account: 'Cuenta principal', date: '15 sep · 08:02', day: '15 de septiembre', daysAgo: 8, amountMinor: 320_000_000, tone: 'salary', note: 'Pago quincenal' },
  { id: 'sep-4', month: 'sep', type: 'expense', name: 'Internet hogar', category: 'Servicios', account: 'Cuenta principal', date: '14 sep · 17:26', day: '14 de septiembre', daysAgo: 9, amountMinor: 8_990_000, tone: 'home', note: 'Plan fibra · septiembre' },
  { id: 'sep-5', month: 'sep', type: 'expense', name: 'Transporte app', category: 'Transporte', account: 'Billetera diaria', date: '13 sep · 18:40', day: '13 de septiembre', daysAgo: 10, amountMinor: 2_460_000, tone: 'transport', note: 'Regreso a casa' },
  { id: 'sep-6', month: 'sep', type: 'expense', name: 'Mercado quincenal', category: 'Mercado', account: 'Cuenta principal', date: '10 sep · 11:08', day: '10 de septiembre', daysAgo: 13, amountMinor: 146_200_000, tone: 'market', note: 'Compra para la casa' },
  { id: 'sep-7', month: 'sep', type: 'transfer', name: 'Ahorro para el viaje', category: 'Transferencia', account: 'Cuenta principal', date: '10 sep · 10:52', day: '10 de septiembre', daysAgo: 13, amountMinor: 100_000_000, tone: 'transfer', note: 'A Cuenta de ahorros' },
  { id: 'sep-8', month: 'sep', type: 'expense', name: 'Veterinaria Los Robles', category: 'Mascotas', account: 'Tarjeta débito', date: '7 sep · 15:32', day: '7 de septiembre', daysAgo: 16, amountMinor: 78_000_000, tone: 'pets', note: 'Control de rutina' },
  { id: 'sep-9', month: 'sep', type: 'expense', name: 'Luz de septiembre', category: 'Servicios', account: 'Cuenta principal', date: '5 sep · 08:14', day: '5 de septiembre', daysAgo: 18, amountMinor: 11_240_000, tone: 'home', note: 'Factura energía' },
  { id: 'sep-10', month: 'sep', type: 'card_payment', name: 'Pago tarjeta Visa', category: 'Pago de deuda', account: 'Cuenta principal', date: '3 sep · 09:05', day: '3 de septiembre', daysAgo: 20, amountMinor: 25_000_000, tone: 'debt', note: 'Abono a tarjeta de crédito; no vuelve a contar como gasto' },
  { id: 'aug-1', month: 'ago', type: 'income', name: 'Nómina · Taller Norte', category: 'Salario', account: 'Cuenta principal', date: '30 ago · 08:01', day: '30 de agosto', daysAgo: 24, amountMinor: 320_000_000, tone: 'salary', note: 'Pago quincenal' },
  { id: 'aug-2', month: 'ago', type: 'expense', name: 'Mercado de la esquina', category: 'Mercado', account: 'Cuenta principal', date: '28 ago · 16:10', day: '28 de agosto', daysAgo: 26, amountMinor: 98_500_000, tone: 'market', note: 'Compra semanal' },
  { id: 'aug-3', month: 'ago', type: 'expense', name: 'Internet hogar', category: 'Servicios', account: 'Cuenta principal', date: '20 ago · 12:03', day: '20 de agosto', daysAgo: 34, amountMinor: 8_990_000, tone: 'home', note: 'Plan fibra · agosto' },
  { id: 'aug-4', month: 'ago', type: 'expense', name: 'Paseo de Nube', category: 'Mascotas', account: 'Billetera diaria', date: '18 ago · 09:42', day: '18 de agosto', daysAgo: 36, amountMinor: 42_000_000, tone: 'pets', note: 'Parque y snack' },
]

// Evita incluir transferencias en gastos y resúmenes de categorías.
export function sumActivity(transactions, type) {
  return transactions.reduce((total, item) => total + (item.type === type ? item.amountMinor : 0), 0)
}

// Aplica periodo, tipo, cuenta, categoría y búsqueda sobre la misma muestra para las tres propuestas.
export function filterActivity(transactions, filters) {
  const query = filters.query.trim().toLocaleLowerCase('es-CO')
  return transactions.filter((item) => {
    const inPeriod = filters.period === 'today' ? item.daysAgo === 0
      : filters.period === 'week' ? item.daysAgo < 7
        : item.month === filters.month
    const matchesQuery = !query || `${item.name} ${item.category} ${item.account} ${item.note}`.toLocaleLowerCase('es-CO').includes(query)
    return inPeriod
      && (filters.type === 'all' || item.type === filters.type)
      && (filters.account === 'all' || item.account === filters.account)
      && (filters.category === 'all' || item.category === filters.category)
      && matchesQuery
  })
}

// Formatea pesos colombianos desde unidades menores enteras, sin operar con decimales monetarios.
export function formatActivityMoney(amountMinor, hidden = false) {
  if (hidden) return '••••••'
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amountMinor / 100)
}
