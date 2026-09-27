import { ArrowDown, ArrowUp, ArrowUpRight, ChartPie, ChevronDown, Plus, ReceiptText, ShoppingCart } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatMinor } from '../../../domain/money.js'
import { DashboardBudget, DashboardMoneyDetails, DashboardRecent, formatDashboardDate } from '../components/DashboardSections.jsx'
import { UpcomingPayments } from '../components/UpcomingPayments.jsx'
import { GlassHero, OrbAction } from '../../../shared/components/GlassHero.jsx'
import { NightIcon } from '../../../shared/components/NightIcon.jsx'

// Prioriza el saldo registrado y muestra los compromisos pendientes por separado.
export function AvailableView({ summary, cash, budget, remaining, used, recent, nextPayDate, legacyIncomeConfigured, hidden, goals, goalCount, allocations, planned, plannedCount, accounts, accountCount, balances, month, onMonthChange, setSheet, toggleAmounts, visibilityIcon: VisibilityIcon }) {
  return <div className="dashboard-view dashboard-view--available">
    <GlassHero className="balance-hero dashboard-available-hero">
      <div className="balance-hero__numbers"><div className="calm-balance-label"><span>Saldo en cuentas</span><button className="icon-button" aria-label={hidden ? 'Mostrar montos' : 'Ocultar montos'} onClick={toggleAmounts}><VisibilityIcon aria-hidden="true" /></button><small>COP</small></div>{cash.hasAccount ? <strong>{formatMinor(cash.balanceMinor, 'COP', hidden)}</strong> : <strong className="dashboard-available-hero__empty">Aún sin cuenta</strong>}<small>Dinero registrado en tus cuentas.<br />No descuenta pagos pendientes.</small>{!cash.hasAccount && <Link className="dashboard-view-link" to="/cuentas?agregar-cuenta=1">Agregar mi cuenta <ArrowUpRight aria-hidden="true" /></Link>}</div>
    </GlassHero>
    <div className="glass-actions glass-actions--trio">
      <OrbAction className="calm-register" icon={ShoppingCart} aria-label="Registrar movimiento" onClick={() => setSheet('new')}>Compra</OrbAction>
      <OrbAction icon={Plus} aria-label="Registrar ingreso" onClick={() => setSheet('income')}>Ingreso</OrbAction>
      <OrbAction icon={ReceiptText} aria-label="Registrar pago de deuda" onClick={() => setSheet('debt')}>Pago de deuda</OrbAction>
    </div>
    {!cash.hasAccount && legacyIncomeConfigured && <div className="info-note dashboard-balance-explanation" role="note">Ya escribiste un monto antes. <Link to="/cuentas?confirmar-saldo=1">Revísalo y confirma cuánto tienes hoy</Link>; no lo sumaremos dos veces.</div>}
    {cash.unlinkedExpenseCount > 0 && <p className="helper" role="note">Hay compras antiguas sin cuenta asociada; no alteran este saldo registrado.</p>}
    <section className="calm-month-summary" aria-label="Resumen del mes"><label><span className="sr-only">Mes del resumen</span><input type="month" value={month} onChange={(event) => onMonthChange(event.target.value)} /></label><div><span><NightIcon icon={ArrowUp} /><span>Ingresos<strong>{formatMinor(summary.income, 'COP', hidden)}</strong></span></span><span><NightIcon icon={ArrowDown} /><span>Gastos<strong>{formatMinor(summary.expenses, 'COP', hidden)}</strong></span></span></div></section>
    <UpcomingPayments />
    <DashboardRecent items={recent.slice(0, 2)} />
    {/* El desplegable nativo conserva teclado y estado abierto sin lógica adicional. */}
    <details className="calm-details dashboard-money-details">
      <summary><NightIcon icon={ChartPie} /><span>Presupuesto y detalle de mi dinero</span><ChevronDown className="dashboard-money-details__chevron" aria-hidden="true" /></summary>
      <div className="dashboard-money-details__body">
        {nextPayDate && <p className="helper">Próximo ingreso previsto · {formatDashboardDate(nextPayDate)}</p>}
        <DashboardBudget summary={summary} budget={budget} remaining={remaining} used={used} hidden={hidden} />
        <DashboardMoneyDetails summary={summary} cash={cash} goals={goals} goalCount={goalCount} allocations={allocations} planned={planned} plannedCount={plannedCount} accounts={accounts} accountCount={accountCount} balances={balances} hidden={hidden} />
      </div>
    </details>
  </div>
}
