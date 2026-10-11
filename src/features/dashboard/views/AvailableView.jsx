import { ArrowDown, ArrowUp, ArrowUpRight, ChartPie, ChevronDown, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatMinor } from '../../../domain/money.js'
import { DashboardBudget, DashboardMoneyDetails, DashboardRecent, formatDashboardDate } from '../components/DashboardSections.jsx'
import { UpcomingPayments } from '../components/UpcomingPayments.jsx'
import { NightIcon } from '../../../shared/components/NightIcon.jsx'

// Los temas comparten composición y acciones; el shell aporta la paleta seleccionada.
export function AvailableView({ summary, cash, budget, remaining, used, recent, nextPayDate, legacyIncomeConfigured, hidden, currency = 'COP', goals, goalCount, allocations, planned, plannedCount, accounts, accountCount, balances, month, onMonthChange, setSheet, isDemo, toggleAmounts, visibilityIcon: VisibilityIcon }) {
  const balanceContent = <>
    <div className="dashboard-home-balance__label">
      <span>Saldo en tus cuentas</span>
      <button className="icon-button" aria-label={hidden ? 'Mostrar montos' : 'Ocultar montos'} onClick={toggleAmounts}><VisibilityIcon aria-hidden="true" /></button>
    </div>
    {cash.hasAccount ? <strong>{formatMinor(cash.balanceMinor, currency, hidden)}</strong> : <strong className="dashboard-available-hero__empty">Aún sin cuenta</strong>}
    <small>Dinero registrado en tus cuentas · {currency}<br />No descuenta pagos pendientes.</small>
    {!cash.hasAccount && <Link className="dashboard-view-link" to="/cuentas?agregar-cuenta=1">Agregar mi cuenta <ArrowUpRight aria-hidden="true" /></Link>}
  </>
  return <div className="dashboard-view dashboard-view--available">
    <header className="dashboard-home-heading">
      <h1>Balance</h1>
      {isDemo && <span className="calm-demo" aria-label="Datos de ejemplo, guardados solo en este navegador" title="Guardados solo en este navegador">Datos de ejemplo · solo en este navegador</span>}
    </header>
    <section className="dashboard-home-balance" aria-label="Saldo registrado en tus cuentas">{balanceContent}</section>
    {!cash.hasAccount && legacyIncomeConfigured && <div className="info-note dashboard-balance-explanation" role="note">Ya escribiste un monto antes. <Link to="/cuentas?confirmar-saldo=1">Revísalo y confirma cuánto tienes hoy</Link>; no lo sumaremos dos veces.</div>}
    {cash.unlinkedExpenseCount > 0 && <p className="helper" role="note">Hay compras antiguas sin cuenta asociada; no alteran este saldo registrado.</p>}
    <section className="dashboard-home-month-summary" aria-label="Resumen del mes">
      <div className="dashboard-home-month-summary__heading"><span>Movimientos de</span><label><span className="sr-only">Mes del resumen</span><input type="month" value={month} onChange={(event) => onMonthChange(event.target.value)} /></label></div>
      <div className="dashboard-home-totals">
        <article><ArrowUp aria-hidden="true" /><span>Ingresos<strong>{formatMinor(summary.income, currency, hidden)}</strong></span></article>
        <article><ArrowDown aria-hidden="true" /><span>Gastos<strong>{formatMinor(summary.expenses, currency, hidden)}</strong></span></article>
      </div>
    </section>
    <button className="dashboard-home-add" type="button" onClick={() => setSheet('new')}><span className="dashboard-home-add__icon"><Plus aria-hidden="true" /></span>Agregar</button>
    {recent.length ? <DashboardRecent items={recent.slice(0, 2)} /> : <section className="dashboard-home-empty" role="status"><p>Aún no tienes movimientos. Toca <strong>Agregar</strong> para registrar uno.</p></section>}
    <UpcomingPayments />
    {/* El desplegable nativo conserva teclado y estado abierto sin lógica adicional. */}
    <details className="calm-details dashboard-money-details">
      <summary><NightIcon icon={ChartPie} /><span>Presupuesto y detalle de mi dinero</span><ChevronDown className="dashboard-money-details__chevron" aria-hidden="true" /></summary>
      <div className="dashboard-money-details__body">
        {nextPayDate && <p className="helper">Próximo ingreso previsto · {formatDashboardDate(nextPayDate)}</p>}
        <DashboardBudget summary={summary} budget={budget} remaining={remaining} used={used} hidden={hidden} currency={currency} />
        <DashboardMoneyDetails summary={summary} cash={cash} goals={goals} goalCount={goalCount} allocations={allocations} planned={planned} plannedCount={plannedCount} accounts={accounts} accountCount={accountCount} balances={balances} hidden={hidden} currency={currency} />
      </div>
    </details>
    <button className="dashboard-home-fab" type="button" aria-label="Agregar movimiento" title="Agregar movimiento" onClick={() => setSheet('new')}><Plus aria-hidden="true" /></button>
  </div>
}
