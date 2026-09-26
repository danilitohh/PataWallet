import { assertMinor, safeAdd } from './money.js'
import { sumFixedExpenses } from './financialSetup.js'
import { monthlyDebtPaymentMinor, totalMonthlyDebtPayments } from './debtSchedule.js'
import { readPaymentHistory, sumExpectedFixedExpenses } from './recurringExpenses.js'

export const NON_BUDGET_TYPES = new Set(['opening', 'transfer', 'card_payment', 'adjustment'])

export function transactionDeltas(transaction, accountsById) {
  const amount = assertMinor(transaction.amount_minor)
  const from = transaction.from_account_id ? accountsById[transaction.from_account_id] : null
  const to = transaction.to_account_id ? accountsById[transaction.to_account_id] : null
  switch (transaction.type) {
    case 'opening':
      return [{ accountId: to.id, delta: amount }]
    case 'income':
      return [{ accountId: to.id, delta: amount }]
    case 'expense':
      // Un gasto del dinero libre afecta el presupuesto sin inventar un saldo bancario.
      return from ? [{ accountId: from.id, delta: from.kind === 'liability' ? amount : -amount }] : []
    case 'transfer':
      return [{ accountId: from.id, delta: -amount }, { accountId: to.id, delta: amount }]
    case 'card_payment':
      return [{ accountId: from.id, delta: -amount }, { accountId: to.id, delta: -amount }]
    case 'refund':
      return [{ accountId: (to || from).id, delta: (to || from).kind === 'liability' ? -amount : amount }]
    case 'adjustment':
      return [{ accountId: (to || from).id, delta: transaction.direction === 'decrease' ? -amount : amount }]
    default:
      return []
  }
}

export function calculateBalances(accounts, transactions) {
  const byId = Object.fromEntries(accounts.map((account) => [account.id, account]))
  const balances = Object.fromEntries(accounts.map((account) => [account.id, 0]))
  for (const transaction of transactions.filter((item) => item.status !== 'void')) {
    for (const entry of transactionDeltas(transaction, byId)) {
      balances[entry.accountId] = safeAdd(balances[entry.accountId], entry.delta)
    }
  }
  return balances
}

export function monthInTimeZone(isoDate, timeZone = 'America/Bogota') {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit' }).formatToParts(new Date(isoDate))
  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  if (!year || !month) throw new Error('No pudimos calcular el mes del movimiento.')
  return `${year}-${month}`
}

export function calculateSummary(accounts, transactions, month, timeZone = 'America/Bogota') {
  const balances = calculateBalances(accounts, transactions)
  const active = accounts.filter((account) => !account.archived)
  const assets = active.filter((account) => account.kind === 'asset').reduce((sum, account) => safeAdd(sum, balances[account.id] || 0), 0)
  const debt = active.filter((account) => account.kind === 'liability').reduce((sum, account) => safeAdd(sum, balances[account.id] || 0), 0)
  const inMonth = transactions.filter((item) => item.status !== 'void' && monthInTimeZone(item.occurred_at, timeZone) === month)
  const income = inMonth.filter((item) => item.type === 'income').reduce((sum, item) => safeAdd(sum, Number(item.amount_minor)), 0)
  const expenses = inMonth.reduce((sum, item) => {
    if (item.type === 'expense') return safeAdd(sum, Number(item.amount_minor))
    if (item.type === 'refund') return safeAdd(sum, -Number(item.amount_minor))
    return sum
  }, 0)
  return { balances, assets, debt, net: safeAdd(assets, -debt), income, expenses }
}

// Calcula el dinero libre mensual desde ingresos, gastos fijos, cuotas declaradas y gastos ya registrados.
export function calculateAvailableMoney({ monthlySalaryMinor, fixedExpenses = [], accounts = [], transactions = [], month, payFrequency, nextPayDate, timeZone = 'America/Bogota' }) {
  const salary = Number.isSafeInteger(Number(monthlySalaryMinor)) && Number(monthlySalaryMinor) > 0 ? Number(monthlySalaryMinor) : null
  const fixedExpensesMinor = month ? sumExpectedFixedExpenses(fixedExpenses, { month, payFrequency, nextPayDate }) : sumFixedExpenses(fixedExpenses)
  const debtPaymentsMinor = totalMonthlyDebtPayments(accounts)
  const committedMinor = safeAdd(fixedExpensesMinor, debtPaymentsMinor)
  const trackedExpensesMinor = month ? calculateSummary(accounts, transactions, month, timeZone).expenses : 0
  const monthlyFreeMinor = salary === null ? null : safeAdd(salary, -committedMinor)
  // Los abonos reales reemplazan primero la cuota prevista de cada deuda; solo el excedente reduce otra vez el margen.
  const paidByDebt = new Map()
  if (month) for (const payment of transactions) {
    if (payment.type !== 'card_payment' || payment.status === 'void' || monthInTimeZone(payment.occurred_at, timeZone) !== month) continue
    paidByDebt.set(payment.to_account_id, safeAdd(paidByDebt.get(payment.to_account_id) || 0, assertMinor(payment.amount_minor)))
  }
  const trackedDebtPaymentsMinor = [...paidByDebt.values()].reduce((total, paid) => safeAdd(total, paid), 0)
  const additionalDebtPaymentsMinor = accounts.filter((account) => account.kind === 'liability').reduce((total, account) =>
    safeAdd(total, Math.max(0, (paidByDebt.get(account.id) || 0) - (account.archived ? 0 : monthlyDebtPaymentMinor(account)))), 0)
  // El movimiento real sustituye al compromiso previsto de ese vencimiento, sin descontarlo dos veces.
  const activeExpenses = new Set(transactions.filter((item) => item.type === 'expense' && item.status !== 'void').map((item) => item.id))
  const settledScheduledMinor = month ? fixedExpenses.reduce((total, expense) => readPaymentHistory(expense.payment_history).reduce((sum, payment) =>
    payment.due_date.startsWith(month) && payment.transaction_id && activeExpenses.has(payment.transaction_id)
      ? safeAdd(sum, Number(expense.amount_minor)) : sum, total), 0) : 0
  const availableNowMinor = monthlyFreeMinor === null ? null : safeAdd(safeAdd(safeAdd(monthlyFreeMinor, settledScheduledMinor), -trackedExpensesMinor), -additionalDebtPaymentsMinor)
  return { salaryMinor: salary, fixedExpensesMinor, debtPaymentsMinor, committedMinor, trackedExpensesMinor, trackedDebtPaymentsMinor, additionalDebtPaymentsMinor, monthlyFreeMinor, availableNowMinor }
}

export function goalProgress(goal, allocations) {
  const reserved = allocations.filter((item) => item.goal_id === goal.id).reduce((sum, item) => safeAdd(sum, Number(item.amount_minor)), 0)
  return { reserved, percent: goal.target_minor > 0 ? (reserved / Number(goal.target_minor)) * 100 : 0 }
}
