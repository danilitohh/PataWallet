import { calculateRecordedMoney, calculateSummary, goalProgress } from '../../../domain/finance.js'
import { readDebtSchedule } from '../../../domain/debtSchedule.js'
import { readFixedExpenses } from '../../../domain/financialSetup.js'
import { formatMinor } from '../../../domain/money.js'

const MAX_RECENT_TRANSACTIONS = 20

// Conserva únicamente los campos del presupuesto que necesita una explicación mensual.
function compactBudget(budgets, month) {
  const budget = budgets.find((item) => item.month === month)
  return budget ? { month: budget.month, limit_minor: budget.limit_minor } : null
}

// Añade una representación legible para que el modelo no tenga que convertir centavos a pesos.
function formattedAmount(minor) {
  return formatMinor(Number(minor) || 0, 'COP')
}

// Reduce el espacio financiero a un contexto acotado para consultas de análisis, sin enviar secretos ni credenciales.
export function buildAssistantContext({ accounts, transactions, budgets, goals, allocations, plannedPurchases, month, settings }) {
  const summary = calculateSummary(accounts, transactions, month)
  const balances = summary.balances
  const recordedMoney = calculateRecordedMoney({ accounts, transactions, allocations, fixedExpenses: readFixedExpenses(settings?.fixedExpenses), payFrequency: settings?.payFrequency, nextPayDate: settings?.nextPayDate })
  return {
    currency: 'COP',
    month,
    summary: {
      assets_minor: summary.assets,
      assets_formatted: formattedAmount(summary.assets),
      debt_minor: summary.debt,
      debt_formatted: formattedAmount(summary.debt),
      net_minor: summary.net,
      net_formatted: formattedAmount(summary.net),
      income_minor: summary.income,
      income_formatted: formattedAmount(summary.income),
      expenses_minor: summary.expenses,
      expenses_formatted: formattedAmount(summary.expenses),
    },
    accounts: accounts.filter((account) => !account.archived).map((account) => {
      const schedule = account.kind === 'liability' ? readDebtSchedule(account) : null
      return {
        name: account.name,
        kind: account.kind,
        subtype: account.subtype,
        balance_minor: balances[account.id] || 0,
        balance_formatted: formattedAmount(balances[account.id] || 0),
        debt_schedule: schedule ? { total: schedule.total, paid: schedule.paid, installment_minor: schedule.amount, installment_formatted: formattedAmount(schedule.amount), frequency: schedule.frequency } : null,
      }
    }),
    budget: (() => {
      const budget = compactBudget(budgets, month)
      return budget ? { ...budget, limit_formatted: formattedAmount(budget.limit_minor) } : null
    })(),
    available_money: {
      balance_minor: recordedMoney.balanceMinor,
      balance_formatted: formattedAmount(recordedMoney.balanceMinor),
      pending_fixed_minor: recordedMoney.pendingFixedMinor,
      pending_debt_minor: recordedMoney.pendingDebtMinor,
      spendable_minor: recordedMoney.spendableMinor,
      spendable_formatted: recordedMoney.spendableMinor === null ? null : formattedAmount(recordedMoney.spendableMinor),
    },
    goals: goals.slice(0, 20).map((goal) => {
      const progress = goalProgress(goal, allocations)
      return { name: goal.name, target_minor: goal.target_minor, target_formatted: formattedAmount(goal.target_minor), reserved_minor: progress.reserved, reserved_formatted: formattedAmount(progress.reserved), percent: Math.round(progress.percent) }
    }),
    planned_purchases: plannedPurchases.filter((item) => item.status === 'planned').slice(0, 20).map((item) => ({ name: item.name, amount_minor: item.amount_minor, amount_formatted: formattedAmount(item.amount_minor), target_date: item.target_date })),
    recent_transactions: transactions.filter((item) => !['opening', 'adjustment'].includes(item.type)).slice(0, MAX_RECENT_TRANSACTIONS).map((item) => ({ type: item.type, amount_minor: item.amount_minor, amount_formatted: formattedAmount(item.amount_minor), occurred_at: item.occurred_at, merchant_name: String(item.merchant_name || '').slice(0, 120), note: String(item.note || '').slice(0, 160) })),
  }
}
