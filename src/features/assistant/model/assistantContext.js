import { calculateRecordedMoney, calculateSummary, goalProgress, monthInTimeZone } from '../../../domain/finance.js'
import { readDebtSchedule } from '../../../domain/debtSchedule.js'
import { readFixedExpenses } from '../../../domain/financialSetup.js'
import { formatMinor, safeAdd } from '../../../domain/money.js'

const MAX_RECENT_TRANSACTIONS = 12
const ANALYSIS_MONTHS = 12
const MAX_CATEGORY_ROWS = 8
const BUDGETED_TYPES = new Set(['income', 'expense', 'refund'])
const TRANSACTION_LABELS = {
  income: 'Ingreso', expense: 'Gasto', refund: 'Reembolso', transfer: 'Transferencia',
  card_payment: 'Pago de tarjeta', opening: 'Saldo inicial', adjustment: 'Ajuste',
}

function formattedAmount(minor, currency = 'COP') {
  return formatMinor(Number(minor) || 0, currency)
}

function sumAmount(rows) {
  return rows.reduce((sum, row) => safeAdd(sum, Number(row.amount_minor)), 0)
}

function monthOffset(month, offset) {
  const [year, number] = month.split('-').map(Number)
  return new Date(Date.UTC(year, number - 1 + offset, 1)).toISOString().slice(0, 7)
}

function categoryBreakdownByAmount(rows, categoryNames, currency) {
  const totals = new Map()
  for (const transaction of rows) {
    if (transaction.type !== 'expense' && transaction.type !== 'refund') continue
    const name = categoryNames.get(transaction.category_id) || 'Sin categoría'
    const current = totals.get(name) || { spent: 0, refunds: 0, movements: 0 }
    const field = transaction.type === 'expense' ? 'spent' : 'refunds'
    current[field] = safeAdd(current[field], Number(transaction.amount_minor))
    current.movements += 1
    totals.set(name, current)
  }
  return [...totals.entries()]
    .map(([name, total]) => ({ name, ...total, net: safeAdd(total.spent, -total.refunds) }))
    .sort((left, right) => right.net - left.net)
    .slice(0, MAX_CATEGORY_ROWS)
    .map(({ name, spent, refunds, net, movements }) => ({
      name,
      purchases_formatted: formattedAmount(spent, currency),
      refunds_formatted: formattedAmount(refunds, currency),
      net_spending_formatted: formattedAmount(net, currency),
      movements,
    }))
}

function periodSummary(rows, month, categoryNames, currency, budget) {
  const monthly = rows.filter((row) => monthInTimeZone(row.occurred_at) === month)
  const incomeRows = monthly.filter((row) => row.type === 'income')
  const expenseRows = monthly.filter((row) => row.type === 'expense')
  const refundRows = monthly.filter((row) => row.type === 'refund')
  const income = sumAmount(incomeRows)
  const purchases = sumAmount(expenseRows)
  const refunds = sumAmount(refundRows)
  const expenses = safeAdd(purchases, -refunds)
  const limit = budget ? Number(budget.limit_minor) : null

  return {
    month,
    income_formatted: formattedAmount(income, currency),
    purchases_formatted: formattedAmount(purchases, currency),
    refunds_formatted: formattedAmount(refunds, currency),
    net_expenses_formatted: formattedAmount(expenses, currency),
    difference_formatted: formattedAmount(safeAdd(income, -expenses), currency),
    income_movements: incomeRows.length,
    expense_movements: expenseRows.length,
    budget: Number.isSafeInteger(limit) && limit > 0 ? {
      limit_formatted: formattedAmount(limit, budget.currency || currency),
      remaining_formatted: formattedAmount(safeAdd(limit, -expenses), budget.currency || currency),
    } : null,
    top_categories: categoryBreakdownByAmount(monthly, categoryNames, currency).slice(0, 3),
  }
}

function safeMonth(row) {
  try { return monthInTimeZone(row.occurred_at) } catch { return null }
}

// Precalcula cifras históricas en el dispositivo para que el modelo explique datos, no haga contabilidad a ojo.
export function buildAssistantContext({ accounts = [], categories = [], transactions = [], budgets = [], goals = [], allocations = [], plannedPurchases = [], month, settings = {} }) {
  const currency = settings.currency || 'COP'
  const currentPeriod = month || new Date().toISOString().slice(0, 7)
  const summary = calculateSummary(accounts, transactions, currentPeriod)
  const balances = summary.balances
  const recordedMoney = calculateRecordedMoney({ accounts, transactions, allocations, fixedExpenses: readFixedExpenses(settings.fixedExpenses), payFrequency: settings.payFrequency, nextPayDate: settings.nextPayDate })
  const categoryNames = new Map(categories.map((category) => [category.id, String(category.name || '').slice(0, 80)]))
  const validTransactions = transactions.filter((transaction) => transaction.status !== 'void')
  const budgetByMonth = new Map(budgets.map((budget) => [budget.month, budget]))
  const analysisMonths = Array.from({ length: ANALYSIS_MONTHS }, (_, index) => monthOffset(currentPeriod, index - ANALYSIS_MONTHS + 1))
  const monthsInRange = new Set(analysisMonths)
  const historicalTransactions = validTransactions.filter((row) => monthsInRange.has(safeMonth(row)))
  const datedMonths = validTransactions.map(safeMonth).filter(Boolean).sort()
  const oldestMonth = datedMonths[0] || null
  const latestMonth = datedMonths.at(-1) || null
  const incomeRows = validTransactions.filter((row) => row.type === 'income')
  const expenseRows = validTransactions.filter((row) => row.type === 'expense')
  const refundRows = validTransactions.filter((row) => row.type === 'refund')
  const lifetimeIncome = sumAmount(incomeRows)
  const lifetimePurchases = sumAmount(expenseRows)
  const lifetimeRefunds = sumAmount(refundRows)
  const lifetimeExpenses = safeAdd(lifetimePurchases, -lifetimeRefunds)
  const historicalPurchases = sumAmount(historicalTransactions.filter((row) => row.type === 'expense'))
  const historicalRefunds = sumAmount(historicalTransactions.filter((row) => row.type === 'refund'))
  const historicalExpenses = safeAdd(historicalPurchases, -historicalRefunds)
  const selectedBudget = budgetByMonth.get(currentPeriod)
  const selectedBudgetLimit = Number(selectedBudget?.limit_minor)
  const selectedPeriodRows = validTransactions.filter((row) => safeMonth(row) === currentPeriod && BUDGETED_TYPES.has(row.type))
  const currentExpenseMovements = selectedPeriodRows.filter((row) => row.type === 'expense')
  const currentRefundMovements = selectedPeriodRows.filter((row) => row.type === 'refund')
  const currentExpenses = safeAdd(sumAmount(currentExpenseMovements), -sumAmount(currentRefundMovements))
  const monthlyHistory = analysisMonths.map((analysisMonth) => periodSummary(
    validTransactions,
    analysisMonth,
    categoryNames,
    currency,
    budgetByMonth.get(analysisMonth),
  ))
  const selectedBudgetContext = Number.isSafeInteger(selectedBudgetLimit) && selectedBudgetLimit > 0 ? {
    month: currentPeriod,
    limit_formatted: formattedAmount(selectedBudgetLimit, selectedBudget.currency || currency),
    spent_formatted: formattedAmount(currentExpenses, selectedBudget.currency || currency),
    remaining_formatted: formattedAmount(safeAdd(selectedBudgetLimit, -currentExpenses), selectedBudget.currency || currency),
  } : null
  const recentTransactions = validTransactions
    .filter((item) => !['opening', 'adjustment'].includes(item.type))
    .sort((left, right) => String(right.occurred_at).localeCompare(String(left.occurred_at)))
    .slice(0, MAX_RECENT_TRANSACTIONS)
    .map((item) => ({
      type: TRANSACTION_LABELS[item.type] || 'Movimiento',
      currency: item.currency || currency,
      amount_formatted: formattedAmount(item.amount_minor, item.currency || currency),
      occurred_at: item.occurred_at,
      category: categoryNames.get(item.category_id) || (item.category_id ? 'Categoría no disponible' : 'Sin categoría'),
      merchant_name: String(item.merchant_name || '').slice(0, 120),
      note: String(item.note || '').slice(0, 160),
    }))

  return {
    currency,
    current_month: currentPeriod,
    summary: {
      assets_formatted: formattedAmount(summary.assets, currency),
      debt_formatted: formattedAmount(summary.debt, currency),
      net_formatted: formattedAmount(summary.net, currency),
      income_formatted: formattedAmount(summary.income, currency),
      expenses_formatted: formattedAmount(summary.expenses, currency),
    },
    accounts: accounts.filter((account) => !account.archived).map((account) => {
      const schedule = account.kind === 'liability' ? readDebtSchedule(account) : null
      return {
        name: String(account.name || 'Cuenta').slice(0, 100),
        kind: account.kind,
        subtype: account.subtype,
        currency: account.currency || currency,
        balance_formatted: formattedAmount(balances[account.id] || 0, account.currency || currency),
        debt_schedule: schedule ? {
          total_installments: schedule.total,
          paid_installments: schedule.paid,
          installment_formatted: formattedAmount(schedule.amount, account.currency || currency),
          frequency: schedule.frequencyLabel,
        } : null,
      }
    }),
    budget: selectedBudgetContext,
    history: {
      coverage_from_month: oldestMonth,
      coverage_through_month: latestMonth,
      transactions_available: validTransactions.length,
      months_analyzed: ANALYSIS_MONTHS,
      monthly: monthlyHistory,
      recorded_totals: {
        income_formatted: formattedAmount(lifetimeIncome, currency),
        purchases_formatted: formattedAmount(lifetimePurchases, currency),
        refunds_formatted: formattedAmount(lifetimeRefunds, currency),
        net_expenses_formatted: formattedAmount(lifetimeExpenses, currency),
      },
      top_categories_last_12_months: categoryBreakdownByAmount(historicalTransactions, categoryNames, currency),
      average_net_expenses_per_month_12m_formatted: formattedAmount(Math.round(historicalExpenses / ANALYSIS_MONTHS), currency),
    },
    available_money: {
      pending_fixed_formatted: formattedAmount(recordedMoney.pendingFixedMinor, currency),
      pending_debt_formatted: formattedAmount(recordedMoney.pendingDebtMinor, currency),
      spendable_formatted: recordedMoney.spendableMinor === null ? null : formattedAmount(recordedMoney.spendableMinor, currency),
    },
    goals: goals.slice(0, 20).map((goal) => {
      const progress = goalProgress(goal, allocations)
      return { name: String(goal.name || 'Meta').slice(0, 100), currency: goal.currency || currency, target_formatted: formattedAmount(goal.target_minor, goal.currency || currency), reserved_formatted: formattedAmount(progress.reserved, goal.currency || currency), percent: Math.round(progress.percent) }
    }),
    planned_purchases: plannedPurchases.filter((item) => item.status === 'planned').slice(0, 20).map((item) => ({ name: String(item.name || 'Compra prevista').slice(0, 100), currency: item.currency || currency, amount_formatted: formattedAmount(item.amount_minor, item.currency || currency), target_date: item.target_date })),
    recent_transactions: recentTransactions,
    calculation_notes: [
      'Los totales mensuales cuentan ingresos, gastos y reembolsos según la fecha del movimiento.',
      'Transferencias, saldos iniciales, ajustes, reservas de metas y pagos de tarjeta no son gastos del mes.',
      'Los gastos por categoría son compras menos reembolsos; el historial mensual cubre los 12 meses terminados en el mes actual indicado.',
    ],
  }
}
