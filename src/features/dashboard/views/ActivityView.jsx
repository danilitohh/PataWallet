import { ArrowDown, ChartNoAxesColumnIncreasing, PieChart } from 'lucide-react'
import { formatMinor } from '../../../domain/money.js'
import { DashboardBudget, DashboardEmpty, DashboardMoneyDetails, DashboardRecent } from '../components/DashboardSections.jsx'

// Prioriza los gastos categorizados y movimientos del periodo que la persona consulta.
export function ActivityView({ summary, breakdown, monthTransactions, budget, remaining, used, hidden, cash, goals, goalCount, allocations, planned, plannedCount, accounts, accountCount, balances }) {
  return <div className="dashboard-view dashboard-view--activity">
    <section className="dashboard-activity-summary" aria-label="Saldo y gastos del mes">
      <article className="dashboard-activity-balance"><span>Saldo en tus cuentas</span><strong>{formatMinor(summary.assets, 'COP', hidden)}</strong><small>Actualizado con tus movimientos registrados</small></article>
      <article className="dashboard-activity-spent"><span className="dashboard-activity-icon"><ArrowDown aria-hidden="true" /></span><span>Gastos del mes</span><strong>{formatMinor(summary.expenses, 'COP', hidden)}</strong><small>{monthTransactions.length} movimientos anotados</small></article>
    </section>
    <section className="feature-panel dashboard-category-panel">
      <div className="section-heading"><div><span className="dashboard-eyebrow">DÓNDE SE FUE</span><h2>Gastos por categoría</h2></div><span className="dashboard-panel-icon"><PieChart aria-hidden="true" /></span></div>
      {breakdown.length ? <div className="dashboard-category-list">{breakdown.slice(0, 6).map((item, index) => <div className="dashboard-category-row" key={item.name}><div className="dashboard-category-row__label"><span className={`dashboard-category-dot dashboard-category-dot--${index % 4}`} /><span>{item.name}</span><small>{item.percent}%</small><strong>{formatMinor(item.amount, 'COP', hidden)}</strong></div><div className="dashboard-category-track"><span className={`dashboard-category-fill dashboard-category-fill--${index % 4}`} style={{ transform: `scaleX(${item.percent / 100})` }} /></div></div>)}</div> : <DashboardEmpty icon={ChartNoAxesColumnIncreasing} text="Tus gastos del mes aparecerán aquí cuando registres movimientos." />}
    </section>
    <DashboardRecent items={monthTransactions.filter((item) => !['opening', 'adjustment'].includes(item.type)).slice(0, 5)} />
    <DashboardBudget summary={summary} budget={budget} remaining={remaining} used={used} hidden={hidden} />
    <DashboardMoneyDetails summary={summary} cash={cash} goals={goals} goalCount={goalCount} allocations={allocations} planned={planned} plannedCount={plannedCount} accounts={accounts} accountCount={accountCount} balances={balances} hidden={hidden} />
  </div>
}
