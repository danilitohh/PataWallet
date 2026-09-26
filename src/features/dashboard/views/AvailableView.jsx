import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { NightScene } from '../../../components/NightScene.jsx'
import { formatMinor } from '../../../domain/money.js'
import { DashboardBudget, DashboardMoneyDetails, DashboardRecent, DashboardStats, formatDashboardDate } from '../components/DashboardSections.jsx'

// Prioriza el dinero libre calculado desde salario, compromisos y gastos anotados.
export function AvailableView({ summary, income, available, budget, remaining, used, recent, nextPayDate, hidden, goals, goalCount, allocations, planned, plannedCount, accounts, accountCount, hasMoneyAccount, balances }) {
  return <div className="dashboard-view dashboard-view--available">
    <section className="balance-hero dashboard-available-hero">
      <div className="balance-hero__numbers"><span>Dinero libre estimado este mes</span>{available.availableNowMinor === null ? <strong className="dashboard-available-hero__empty">Aún por calcular</strong> : <strong>{formatMinor(available.availableNowMinor, 'COP', hidden)}</strong>}<small>Proyección tras compromisos y gastos; no es tu saldo bancario.</small>{available.availableNowMinor === null ? <Link className="dashboard-view-link" to="/cuentas#ingresos">Completar mi información <ArrowUpRight aria-hidden="true" /></Link> : nextPayDate && <span className="dashboard-payday-chip"><ArrowUpRight aria-hidden="true" /> Próximo pago · {formatDashboardDate(nextPayDate)}</span>}</div>
      <div className="balance-hero__scene"><NightScene hero /></div>
      <p className="balance-hero__caption">Pequeños pasos.<br />Grandes sueños.</p>
    </section>
    {!hasMoneyAccount && available.availableNowMinor !== null && <div className="info-note dashboard-balance-explanation" role="note"><span>Para pagar una deuda, registra primero la cuenta donde está tu dinero real.</span><Link to="/cuentas">Agregar cuenta <ArrowUpRight aria-hidden="true" /></Link></div>}
    <DashboardStats income={income} available={available} summary={summary} hidden={hidden} />
    <DashboardBudget summary={summary} budget={budget} remaining={remaining} used={used} hidden={hidden} />
    <DashboardRecent items={recent} />
    <DashboardMoneyDetails income={income} available={available} goals={goals} goalCount={goalCount} allocations={allocations} planned={planned} plannedCount={plannedCount} accounts={accounts} accountCount={accountCount} balances={balances} hidden={hidden} />
  </div>
}
