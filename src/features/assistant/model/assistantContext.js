import { calculateSummary, goalProgress } from '../../../domain/finance.js'
import { readDebtSchedule } from '../../../domain/debtSchedule.js'

const MAX_RECENT_TRANSACTIONS = 20

// Conserva únicamente los campos del presupuesto que necesita una explicación mensual.
function compactBudget(budgets, month) {
  const budget = budgets.find((item) => item.month === month)
  return budget ? { month: budget.month, limit_minor: budget.limit_minor } : null
}

// Incluye el ingreso de referencia sin enviar filas internas de configuración.
function compactIncome(settings = {}) {
  const salary = Number.isSafeInteger(settings.monthlySalaryMinor) && settings.monthlySalaryMinor > 0 ? settings.monthlySalaryMinor : null
  return salary || settings.payFrequency ? { monthly_salary_minor: salary, pay_frequency: settings.payFrequency || null } : null
}

// Reduce el espacio financiero a un contexto acotado para consultas de análisis, sin enviar secretos ni credenciales.
export function buildAssistantContext({ accounts, transactions, budgets, goals, allocations, plannedPurchases, month, settings }) {
  const summary = calculateSummary(accounts, transactions, month)
  const balances = summary.balances
  return {
    currency: 'COP',
    month,
    summary: {
      assets_minor: summary.assets,
      debt_minor: summary.debt,
      net_minor: summary.net,
      income_minor: summary.income,
      expenses_minor: summary.expenses,
    },
    accounts: accounts.filter((account) => !account.archived).map((account) => {
      const schedule = account.kind === 'liability' ? readDebtSchedule(account) : null
      return {
        name: account.name,
        kind: account.kind,
        subtype: account.subtype,
        balance_minor: balances[account.id] || 0,
        debt_schedule: schedule ? { total: schedule.total, paid: schedule.paid, installment_minor: schedule.amount, frequency: schedule.frequency } : null,
      }
    }),
    budget: compactBudget(budgets, month),
    income_reference: compactIncome(settings),
    goals: goals.slice(0, 20).map((goal) => {
      const progress = goalProgress(goal, allocations)
      return { name: goal.name, target_minor: goal.target_minor, reserved_minor: progress.reserved, percent: Math.round(progress.percent) }
    }),
    planned_purchases: plannedPurchases.filter((item) => item.status === 'planned').slice(0, 20).map((item) => ({ name: item.name, amount_minor: item.amount_minor, target_date: item.target_date })),
    recent_transactions: transactions.filter((item) => !['opening', 'adjustment'].includes(item.type)).slice(0, MAX_RECENT_TRANSACTIONS).map((item) => ({ type: item.type, amount_minor: item.amount_minor, occurred_at: item.occurred_at, merchant_name: String(item.merchant_name || '').slice(0, 120), note: String(item.note || '').slice(0, 160) })),
  }
}
