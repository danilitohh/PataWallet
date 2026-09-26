import { ArrowDownLeft, ArrowUpRight, CalendarClock, CreditCard, Goal, Landmark } from 'lucide-react'
import { Link } from 'react-router-dom'
import { goalProgress } from '../../../domain/finance.js'
import { formatMinor } from '../../../domain/money.js'
import { BudgetRing } from '../../planning/components/BudgetRing.jsx'
import { Progress } from '../../../shared/components/Progress.jsx'
import { NightIcon } from '../../../shared/components/NightIcon.jsx'
import { accountTypeLabel } from '../../accounts/model/accountTypes.js'
import { TransactionList } from '../../transactions/components/TransactionList.jsx'

// Resume ingresos, gastos y deuda con los datos ya calculados para el mes activo.
export function DashboardStats({ cash, summary, hidden }) {
  return <section className="stat-grid dashboard-stats" aria-label="Resumen del mes">
    <Stat icon={ArrowDownLeft} label="Ingresos recibidos" value={formatMinor(summary.income, 'COP', hidden)} tone="positive" />
    <Stat icon={ArrowUpRight} label="Pagos programados" value={formatMinor(cash.pendingFixedMinor + cash.pendingDebtMinor, 'COP', hidden)} tone="negative" />
    <Stat icon={CreditCard} label="Deuda" value={formatMinor(summary.debt, 'COP', hidden)} />
  </section>
}

// Expone la comparación entre gasto registrado y el límite mensual configurado.
export function DashboardBudget({ summary, budget, remaining, used, hidden }) {
  return <section className="feature-panel budget-summary">
    <div className="section-heading"><div><span className="dashboard-eyebrow">ORDEN PARA TU MES</span><h2>Tu presupuesto</h2></div><Link to="/plan">Ver plan</Link></div>
    <div className="dashboard-budget__body"><BudgetRing value={used} /><div><p>Has usado <strong>{formatMinor(summary.expenses, 'COP', hidden)}</strong><br />de {formatMinor(budget?.limit_minor || 0, 'COP', hidden)}</p><Progress value={used} label={`${Math.round(used)}% usado`} /><small>{remaining >= 0 ? `Te quedan ${formatMinor(remaining, 'COP', hidden)}` : `Superaste el presupuesto por ${formatMinor(Math.abs(remaining), 'COP', hidden)}`}</small></div></div>
  </section>
}

// Resume el historial y permite abrir un movimiento desde Inicio.
export function DashboardRecent({ items }) {
  return <section className="dashboard-recent">
    <div className="section-heading"><h2>Últimos movimientos</h2><Link to="/actividad">Ver todos</Link></div>
    <TransactionList items={items} compact />
    {!items.length && <p className="helper">Tu primer movimiento aparecerá aquí.</p>}
  </section>
}

// Reúne ingresos recibidos, margen y vistas rápidas del plan y las cuentas.
export function DashboardMoneyDetails({ summary, cash, goals, goalCount, allocations, planned, plannedCount, accounts, accountCount, balances, hidden }) {
  return <>
    <div className="dashboard-money-grid">
      <IncomeSummary incomeMinor={summary.income} hidden={hidden} />
      <AvailableMoneyCard cash={cash} hidden={hidden} />
    </div>
    <DashboardPreviewGrid goals={goals} goalCount={goalCount} allocations={allocations} planned={planned} plannedCount={plannedCount} accounts={accounts} accountCount={accountCount} balances={balances} hidden={hidden} />
  </>
}

// Resume únicamente ingresos que ya llegaron a una cuenta, no montos declarados como referencia.
function IncomeSummary({ incomeMinor, hidden }) {
  return <section className="feature-panel income-summary">
    <div className="section-heading"><div><h2>Ingresos recibidos</h2><p>Solo movimientos registrados este mes.</p></div><Link to="/cuentas#ingresos">Ver</Link></div>
    <div className="income-summary__value"><strong>{formatMinor(incomeMinor, 'COP', hidden)}</strong></div>
  </section>
}

// Muestra cuánto quedaría tras apartar pagos pendientes; nunca lo presenta como saldo bancario.
function AvailableMoneyCard({ cash, hidden }) {
  if (!cash.hasAccount) return <section className="feature-panel available-money-card"><div className="section-heading"><div><h2>Margen tras pendientes</h2><p>Necesitamos una cuenta con tu saldo actual.</p></div><Link to="/cuentas">Agregar</Link></div></section>
  const negative = cash.spendableMinor < 0
  return <section className={`feature-panel available-money-card ${negative ? 'available-money-card--warning' : ''}`}><div className="section-heading"><div><h2>Margen tras pendientes</h2><p>No es otro saldo: aparta pagos aún no hechos.</p></div><Link to="/cuentas#gastos-fijos">Ver pagos</Link></div><strong className="available-money-card__value">{formatMinor(cash.spendableMinor, 'COP', hidden)}</strong><div className="available-money-card__breakdown"><span>En cuentas <b>{formatMinor(cash.balanceMinor, 'COP', hidden)}</b></span><span>Gastos fijos pendientes <b>− {formatMinor(cash.pendingFixedMinor, 'COP', hidden)}</b></span><span>Deudas pendientes <b>− {formatMinor(cash.pendingDebtMinor, 'COP', hidden)}</b></span><span>Reservas para metas <b>− {formatMinor(cash.reservedMinor, 'COP', hidden)}</b></span></div></section>
}

// Presenta metas, compras y cuentas sin duplicar datos financieros entre las tres vistas.
function DashboardPreviewGrid({ goals, goalCount, allocations, planned, plannedCount, accounts, accountCount, balances, hidden }) {
  return <div className="dashboard-preview-grid" aria-label="Vista rápida del plan y las cuentas">
    <section className="feature-panel dashboard-preview">
      <div className="section-heading"><div><h2>Metas</h2><p>{goalCount ? `${goalCount} ${goalCount === 1 ? 'meta activa' : 'metas activas'}` : 'Aún no tienes metas'}</p></div><Link to="/plan">Ver metas</Link></div>
      {goals.length ? <div className="dashboard-preview__list">{goals.map((goal) => {
        const progress = goalProgress(goal, allocations)
        return <article className="dashboard-goal" key={goal.id}><div className="dashboard-preview__row"><strong>{goal.name}</strong><span>{formatMinor(progress.reserved, 'COP', hidden)} de {formatMinor(goal.target_minor, 'COP', hidden)}</span></div><Progress value={progress.percent} label={`${Math.round(progress.percent)}% completado`} /></article>
      })}</div> : <DashboardEmpty icon={Goal} text="Crea una meta desde Plan." />}
    </section>
    <section className="feature-panel dashboard-preview">
      <div className="section-heading"><div><h2>Próximas compras</h2><p>{plannedCount ? `${plannedCount} por evaluar` : 'Sin compras anotadas'}</p></div><Link to="/plan">Ver compras</Link></div>
      {planned.length ? <div className="dashboard-preview__list">{planned.map((item) => <article className="dashboard-list-row" key={item.id}><NightIcon icon={CalendarClock} className="goal-icon" tone="peach" /><div><strong>{item.name}</strong><small>{formatDashboardDate(item.target_date)}</small></div><strong>{formatMinor(item.amount_minor, 'COP', hidden)}</strong></article>)}</div> : <DashboardEmpty icon={CalendarClock} text="Anota una compra futura desde Plan." />}
    </section>
    <section className="feature-panel dashboard-preview dashboard-preview--accounts">
      <div className="section-heading"><div><h2>Cuentas</h2><p>{accountCount ? `${accountCount} ${accountCount === 1 ? 'cuenta activa' : 'cuentas activas'}` : 'Aún no tienes cuentas'}</p></div><Link to="/cuentas">Ver cuentas</Link></div>
      {accounts.length ? <div className="dashboard-preview__list dashboard-account-list">{accounts.map((account) => <article className="dashboard-list-row" key={account.id}><NightIcon icon={account.kind === 'asset' ? Landmark : CreditCard} className="account-row__icon" tone={account.kind === 'asset' ? 'sky' : 'violet'} /><div><strong>{account.name}</strong><small>{accountTypeLabel(account)}</small></div><strong>{formatMinor(balances[account.id] || 0, 'COP', hidden)}</strong></article>)}</div> : <DashboardEmpty icon={Landmark} text="Agrega una cuenta para ver tu saldo aquí." />}
    </section>
  </div>
}

// Formatea fechas de calendario sin depender de la zona horaria del dispositivo.
export function formatDashboardDate(value) {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`))
}

// Mantiene vacíos compactos y orientados a la siguiente acción.
export function DashboardEmpty({ icon: Icon, text }) {
  return <div className="dashboard-empty"><NightIcon icon={Icon} variant="minimal" tone="violet" /><p>{text}</p></div>
}

// Aplica iconos nocturnos consistentes a cada dato compacto del resumen.
function Stat({ icon: Icon, label, value, tone = '' }) {
  const iconTone = tone === 'positive' ? 'mint' : tone === 'negative' ? 'rose' : 'violet'
  return <div className={`stat ${tone}`}><NightIcon icon={Icon} className="stat__icon" tone={iconTone} /><span>{label}</span><strong>{value}</strong></div>
}
