import { useMemo, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useApp } from '../../app/AppContext.jsx'
import { calculateRecordedMoney, calculateSummary } from '../../domain/finance.js'
import { readFixedExpenses } from '../../domain/financialSetup.js'
import { calendarToday } from '../../domain/recurringExpenses.js'
import { currentMonth } from '../../shared/lib/date.js'
import { incomeReference } from '../settings/model/incomeSources.js'
import { nextIncomeDate } from './model/dashboardViews.js'
import { AvailableView } from './views/AvailableView.jsx'

// Mantiene los mismos datos y acciones para los dos diseños disponibles de Inicio.
export function DashboardPage() {
  const { accounts, transactions, budgets, goals, allocations, plannedPurchases, settings, setSheet, actions, isDemo, user } = useApp()
  const [month, setMonth] = useState(currentMonth())
  const summary = useMemo(() => calculateSummary(accounts, transactions, month), [accounts, transactions, month])
  const income = useMemo(() => incomeReference(settings, accounts), [settings, accounts])
  const fixedExpenses = useMemo(() => readFixedExpenses(settings.fixedExpenses), [settings.fixedExpenses])
  const payFrequency = settings.payFrequency || income.primary?.frequency
  const payDate = settings.nextPayDate || income.primary?.next_pay_date
  const cash = useMemo(() => calculateRecordedMoney({ accounts, transactions, fixedExpenses, allocations, payFrequency, nextPayDate: payDate }), [accounts, transactions, fixedExpenses, allocations, payFrequency, payDate])
  const budget = budgets.find((item) => item.month === month) || budgets[0]
  const remaining = budget ? budget.limit_minor - summary.expenses : 0
  const used = budget?.limit_minor ? (summary.expenses / budget.limit_minor) * 100 : 0
  const recent = transactions.filter((item) => !['opening', 'adjustment'].includes(item.type)).slice(0, 4)
  const activeGoals = goals.slice(0, 3)
  const planned = plannedPurchases.filter((item) => item.status === 'planned').sort((a, b) => a.target_date.localeCompare(b.target_date)).slice(0, 3)
  const plannedCount = plannedPurchases.filter((item) => item.status === 'planned').length
  const activeAccounts = accounts.filter((item) => !item.archived).slice(0, 4)
  const accountCount = accounts.filter((item) => !item.archived).length
  const hidden = Boolean(settings.hiddenAmounts)
  const nextPayDate = nextIncomeDate({ frequency: payFrequency, nextPayDate: payDate, today: calendarToday() })
  const greeting = String(user?.user_metadata?.display_name || user?.user_metadata?.full_name || (isDemo ? 'Danilo' : '')).trim()
  const viewProps = {
    summary, cash, budget, remaining, used, recent, nextPayDate, hidden, currency: settings.currency || 'COP',
    homeDesign: settings.theme === 'light' ? 'light' : 'night', greeting,
    legacyIncomeConfigured: income.salaryMinor !== null,
    goals: activeGoals, goalCount: goals.length, allocations, planned, plannedCount,
    accounts: activeAccounts, accountCount, balances: summary.balances,
  }

  return <div className="route-stack dashboard dashboard--minimal">
    <AvailableView {...viewProps} month={month} onMonthChange={setMonth} setSheet={setSheet} isDemo={isDemo} toggleAmounts={() => actions.setSetting('hiddenAmounts', !hidden)} visibilityIcon={hidden ? EyeOff : Eye} />
  </div>
}
