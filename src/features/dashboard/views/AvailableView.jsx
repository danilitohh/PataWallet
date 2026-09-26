import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { NightScene } from '../../../components/NightScene.jsx'
import { formatMinor } from '../../../domain/money.js'
import { DashboardBudget, DashboardMoneyDetails, DashboardRecent, DashboardStats, formatDashboardDate } from '../components/DashboardSections.jsx'

// Prioriza el saldo registrado y muestra los compromisos pendientes por separado.
export function AvailableView({ summary, cash, budget, remaining, used, recent, nextPayDate, legacyIncomeConfigured, hidden, goals, goalCount, allocations, planned, plannedCount, accounts, accountCount, balances }) {
  return <div className="dashboard-view dashboard-view--available">
    <section className="balance-hero dashboard-available-hero">
      <div className="balance-hero__numbers"><span>Dinero registrado en cuentas</span>{cash.hasAccount ? <strong>{formatMinor(cash.balanceMinor, 'COP', hidden)}</strong> : <strong className="dashboard-available-hero__empty">Aún sin cuenta</strong>}<small>Saldo según tus movimientos; compáralo con tu banco.</small>{!cash.hasAccount ? <Link className="dashboard-view-link" to="/cuentas?agregar-cuenta=1">Agregar mi cuenta <ArrowUpRight aria-hidden="true" /></Link> : nextPayDate && <span className="dashboard-payday-chip"><ArrowUpRight aria-hidden="true" /> Próximo pago · {formatDashboardDate(nextPayDate)}</span>}</div>
      <div className="balance-hero__scene"><NightScene hero /></div>
      <p className="balance-hero__caption">Pequeños pasos.<br />Grandes sueños.</p>
    </section>
    {!cash.hasAccount && legacyIncomeConfigured && <div className="info-note dashboard-balance-explanation" role="note">Ya escribiste un monto antes. <Link to="/cuentas?confirmar-saldo=1">Revísalo y confirma cuánto tienes hoy</Link>; no lo sumaremos dos veces.</div>}
    {cash.unlinkedExpenseCount > 0 && <p className="helper" role="note">Hay compras antiguas sin cuenta asociada; no alteran este saldo registrado.</p>}
    <DashboardStats cash={cash} summary={summary} hidden={hidden} />
    <DashboardBudget summary={summary} budget={budget} remaining={remaining} used={used} hidden={hidden} />
    <DashboardRecent items={recent} />
    <DashboardMoneyDetails summary={summary} cash={cash} goals={goals} goalCount={goalCount} allocations={allocations} planned={planned} plannedCount={plannedCount} accounts={accounts} accountCount={accountCount} balances={balances} hidden={hidden} />
  </div>
}
