import { ArrowUpRight, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatMinor } from '../../../domain/money.js'
import { DashboardBudget, DashboardMoneyDetails, DashboardRecent, formatDashboardDate } from '../components/DashboardSections.jsx'
import { UpcomingPayments } from '../components/UpcomingPayments.jsx'

// Prioriza el saldo registrado y muestra los compromisos pendientes por separado.
export function AvailableView({ summary, cash, budget, remaining, used, recent, nextPayDate, legacyIncomeConfigured, hidden, goals, goalCount, allocations, planned, plannedCount, accounts, accountCount, balances, month, onMonthChange, setSheet, toggleAmounts, visibilityIcon: VisibilityIcon }) {
  return <div className="dashboard-view dashboard-view--available">
    <section className="balance-hero dashboard-available-hero">
      <div className="balance-hero__numbers"><div className="calm-balance-label"><span>Saldo en cuentas</span><button className="icon-button" aria-label={hidden ? 'Mostrar montos' : 'Ocultar montos'} onClick={toggleAmounts}><VisibilityIcon aria-hidden="true" /></button><small>COP</small></div>{cash.hasAccount ? <strong>{formatMinor(cash.balanceMinor, 'COP', hidden)}</strong> : <strong className="dashboard-available-hero__empty">Aún sin cuenta</strong>}<small>Dinero registrado en tus cuentas.<br />No descuenta pagos pendientes.</small>{!cash.hasAccount && <Link className="dashboard-view-link" to="/cuentas?agregar-cuenta=1">Agregar mi cuenta <ArrowUpRight aria-hidden="true" /></Link>}</div>
    </section>
    {!cash.hasAccount && legacyIncomeConfigured && <div className="info-note dashboard-balance-explanation" role="note">Ya escribiste un monto antes. <Link to="/cuentas?confirmar-saldo=1">Revísalo y confirma cuánto tienes hoy</Link>; no lo sumaremos dos veces.</div>}
    {cash.unlinkedExpenseCount > 0 && <p className="helper" role="note">Hay compras antiguas sin cuenta asociada; no alteran este saldo registrado.</p>}
    <button className="button button--primary calm-primary calm-register" onClick={(event) => { event.currentTarget.focus(); setSheet('new') }}><Plus aria-hidden="true" /> Registrar movimiento</button>
    <UpcomingPayments />
    <DashboardRecent items={recent.slice(0, 2)} />
    <section className="calm-month-summary" aria-label="Resumen del mes"><label><span className="sr-only">Mes del resumen</span><input type="month" value={month} onChange={(event) => onMonthChange(event.target.value)} /></label><div><span>Ingresos<strong>{formatMinor(summary.income, 'COP', hidden)}</strong></span><span>Gastos<strong>{formatMinor(summary.expenses, 'COP', hidden)}</strong></span></div></section>
    <details className="calm-details"><summary>Presupuesto y detalle de mi dinero</summary>
      {nextPayDate && <p className="helper">Próximo ingreso previsto · {formatDashboardDate(nextPayDate)}</p>}
      <DashboardBudget summary={summary} budget={budget} remaining={remaining} used={used} hidden={hidden} />
      <DashboardMoneyDetails summary={summary} cash={cash} goals={goals} goalCount={goalCount} allocations={allocations} planned={planned} plannedCount={plannedCount} accounts={accounts} accountCount={accountCount} balances={balances} hidden={hidden} />
    </details>
  </div>
}
