import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { NightScene } from '../../../components/NightScene.jsx'
import { formatMinor } from '../../../domain/money.js'
import { DashboardBudget, DashboardMoneyDetails, DashboardRecent, DashboardStats, formatDashboardDate } from '../components/DashboardSections.jsx'

// Prioriza el dinero libre calculado desde salario, compromisos y gastos anotados.
export function AvailableView({ summary, income, available, budget, remaining, used, recent, nextPayDate, hidden, goals, goalCount, allocations, planned, plannedCount, accounts, accountCount, balances }) {
  return <div className="dashboard-view dashboard-view--available">
    <section className="balance-hero dashboard-available-hero">
      <div className="balance-hero__numbers"><span>Dinero libre este mes</span>{available.availableNowMinor === null ? <strong className="dashboard-available-hero__empty">Aún por calcular</strong> : <strong>{formatMinor(available.availableNowMinor, 'COP', hidden)}</strong>}<small>Después de compromisos y gastos registrados</small>{available.availableNowMinor === null ? <Link className="dashboard-view-link" to="/cuentas#ingresos">Completar mi información <ArrowUpRight aria-hidden="true" /></Link> : nextPayDate && <span className="dashboard-payday-chip"><ArrowUpRight aria-hidden="true" /> Próximo pago · {formatDashboardDate(nextPayDate)}</span>}</div>
      <div className="balance-hero__scene"><NightScene hero /></div>
      <p className="balance-hero__caption">Pequeños pasos.<br />Grandes sueños.</p>
    </section>
    <DashboardStats income={income} available={available} summary={summary} hidden={hidden} />
    <DashboardBudget summary={summary} budget={budget} remaining={remaining} used={used} hidden={hidden} />
    <DashboardRecent items={recent} />
    <DashboardMoneyDetails income={income} available={available} goals={goals} goalCount={goalCount} allocations={allocations} planned={planned} plannedCount={plannedCount} accounts={accounts} accountCount={accountCount} balances={balances} hidden={hidden} />
  </div>
}
