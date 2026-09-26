import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Eye, EyeOff, Plus } from 'lucide-react'
import { useApp } from '../../app/AppContext.jsx'
import { calculateAvailableMoney, calculateSummary, monthInTimeZone } from '../../domain/finance.js'
import { readFixedExpenses } from '../../domain/financialSetup.js'
import { calendarToday } from '../../domain/recurringExpenses.js'
import { PageHeader } from '../../shared/components/PageHeader.jsx'
import { currentMonth } from '../../shared/lib/date.js'
import { incomeReference } from '../settings/model/incomeSources.js'
import { DashboardViewPicker } from './components/DashboardViewPicker.jsx'
import { normalizeHomeView, expenseBreakdown, nextIncomeDate } from './model/dashboardViews.js'
import { AvailableView } from './views/AvailableView.jsx'
import { PaydayView } from './views/PaydayView.jsx'
import { ActivityView } from './views/ActivityView.jsx'

// Construye las tres vistas de Inicio desde el mismo resumen financiero verificado.
export function DashboardPage() {
  const { accounts, categories, transactions, budgets, goals, allocations, plannedPurchases, settings, setSheet, actions, notify, user, isDemo } = useApp()
  const [month, setMonth] = useState(currentMonth())
  const summary = useMemo(() => calculateSummary(accounts, transactions, month), [accounts, transactions, month])
  const income = useMemo(() => incomeReference(settings, accounts), [settings, accounts])
  const fixedExpenses = useMemo(() => readFixedExpenses(settings.fixedExpenses), [settings.fixedExpenses])
  const available = useMemo(() => calculateAvailableMoney({ monthlySalaryMinor: income.salaryMinor, fixedExpenses, accounts, transactions, month, payFrequency: income.primary?.frequency, nextPayDate: income.primary?.next_pay_date }), [income, fixedExpenses, accounts, transactions, month])
  const budget = budgets.find((item) => item.month === month) || budgets[0]
  const remaining = budget ? budget.limit_minor - summary.expenses : 0
  const used = budget?.limit_minor ? (summary.expenses / budget.limit_minor) * 100 : 0
  const recent = transactions.filter((item) => !['opening', 'adjustment'].includes(item.type)).slice(0, 4)
  const monthTransactions = useMemo(() => transactions.filter((item) => item.status !== 'void' && monthInTimeZone(item.occurred_at) === month), [transactions, month])
  const breakdown = useMemo(() => expenseBreakdown(transactions, categories, month), [transactions, categories, month])
  const activeGoals = goals.slice(0, 3)
  const planned = plannedPurchases.filter((item) => item.status === 'planned').sort((a, b) => a.target_date.localeCompare(b.target_date)).slice(0, 3)
  const plannedCount = plannedPurchases.filter((item) => item.status === 'planned').length
  const activeAccounts = accounts.filter((item) => !item.archived).slice(0, 4)
  const accountCount = accounts.filter((item) => !item.archived).length
  const hasMoneyAccount = accounts.some((item) => item.kind === 'asset' && !item.archived)
  const hidden = Boolean(settings.hiddenAmounts)
  const selectedView = normalizeHomeView(settings.homeView)
  const nextPayDate = nextIncomeDate({ frequency: income.primary?.frequency, nextPayDate: income.primary?.next_pay_date, today: calendarToday() })
  const viewProps = {
    summary, income, available, budget, remaining, used, recent, nextPayDate, hidden,
    monthTransactions, breakdown, fixedExpenses, actions, notify,
    goals: activeGoals, goalCount: goals.length, allocations, planned, plannedCount,
    accounts: activeAccounts, accountCount, hasMoneyAccount, balances: summary.balances,
  }

  return <div className="route-stack dashboard">
    <DashboardViewPicker value={selectedView} actions={actions} />
    <PageHeader title={`Hola, ${user?.user_metadata?.display_name?.split(' ')[0] || user?.user_metadata?.full_name?.split(' ')[0] || 'Danilo'}`} subtitle="Qué bueno tenerte por aquí." action={<button className="icon-button" aria-label={hidden ? 'Mostrar montos' : 'Ocultar montos'} onClick={() => actions.setSetting('hiddenAmounts', !hidden)}>{hidden ? <EyeOff /> : <Eye />}</button>} />
    {isDemo && <DemoBanner />}
    <div className="month-row"><label htmlFor="month-home">Mes</label><input id="month-home" type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></div>
    <AnimatePresence initial={false} mode="wait">
      <motion.div key={selectedView} className="dashboard-view-transition" aria-live="polite" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -3 }} transition={{ duration: .18 }}>
        {selectedView === 'payday' ? <PaydayView {...viewProps} /> : selectedView === 'activity' ? <ActivityView {...viewProps} /> : <AvailableView {...viewProps} />}
      </motion.div>
    </AnimatePresence>
    <button className="button button--primary desktop-hidden" onClick={() => setSheet('new')}><Plus /> Registrar movimiento</button>
  </div>
}

// Informa cuando el Inicio usa información de demostración local.
function DemoBanner() {
  return <div className="demo-banner"><span>Datos de ejemplo</span><p>Guardados solo en este navegador</p></div>
}
