// Plantillas que se pueden iniciar desde el registro; los identificadores coinciden con categorías remotas estables.
export const STARTER_CATEGORIES = [
  { id: 'income-salary', name: 'Salario', type: 'income', icon: 'briefcase', group: 'income' },
  { id: 'expense-groceries', name: 'Mercado', type: 'expense', icon: 'basket', group: 'needs' },
  { id: 'expense-transport', name: 'Transporte', type: 'expense', icon: 'car', group: 'needs' },
  { id: 'expense-pets', name: 'Mascotas', type: 'expense', icon: 'paw', group: 'needs' },
  { id: 'expense-restaurants', name: 'Restaurantes', type: 'expense', icon: 'utensils', group: 'wants' },
  { id: 'expense-housing', name: 'Vivienda', type: 'expense', icon: 'house', group: 'needs' },
  { id: 'expense-health', name: 'Salud', type: 'expense', icon: 'heart', group: 'needs' },
  { id: 'expense-services', name: 'Servicios', type: 'expense', icon: 'bolt', group: 'needs' },
  { id: 'expense-entertainment', name: 'Entretenimiento', type: 'expense', icon: 'sparkles', group: 'wants' },
  { id: 'expense-other', name: 'Otros gastos', type: 'expense', icon: 'circle', group: 'wants' },
]

export const DEFAULT_STARTER_CATEGORY_IDS = [
  'income-salary',
  'expense-groceries',
  'expense-transport',
  'expense-pets',
  'expense-restaurants',
]

const allowedCategories = new Set(STARTER_CATEGORIES.map(({ id }) => id))
const allowedCardStyles = new Set(['macaws', 'cats', 'dogs', 'rabbits', 'otters'])

// Solo guarda las conexiones que la persona eligió configurar; la activación sucede después del acceso.
export function normalizeIntegrationSetup(value) {
  if (!value || typeof value !== 'object') return null
  const setup = {
    shortcut: value.shortcut === true,
    bankEmail: value.bankEmail === true,
    notifications: value.notifications === true,
  }
  return Object.values(setup).some(Boolean) ? setup : null
}

// El metadata de Auth solo sirve como preferencia inicial: se valida de nuevo antes de tocar datos remotos.
export function normalizeSignupSetup(value) {
  if (!value || typeof value !== 'object' || value.version !== 1) return null

  const cardStyle = allowedCardStyles.has(value.cardStyle) ? value.cardStyle : null
  const categories = Array.isArray(value.categories)
    ? [...new Set(value.categories.filter((id) => allowedCategories.has(id)))].slice(0, STARTER_CATEGORIES.length)
    : DEFAULT_STARTER_CATEGORY_IDS

  const month = typeof value.budgetMonth === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value.budgetMonth)
    ? value.budgetMonth
    : null
  const budget = Number(value.monthlyBudgetMinor)
  const monthlyBudgetMinor = Number.isSafeInteger(budget) && budget > 0 && budget <= 999_999_999_999 && month
    ? budget
    : null

  return {
    version: 1,
    cardStyle,
    currency: 'COP',
    categories: categories.length ? categories : DEFAULT_STARTER_CATEGORY_IDS,
    monthlyBudgetMinor,
    budgetMonth: monthlyBudgetMinor ? month : null,
  }
}
