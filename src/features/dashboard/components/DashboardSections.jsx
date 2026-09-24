import { ArrowDownLeft, ArrowUpRight, CalendarClock, CreditCard, Goal, Landmark } from 'lucide-react'
import { Link } from 'react-router-dom'
import { goalProgress } from '../../../domain/finance.js'
import { formatMinor } from '../../../domain/money.js'
import { BudgetRing } from '../../planning/components/BudgetRing.jsx'
import { Progress } from '../../../shared/components/Progress.jsx'
import { NightIcon } from '../../../shared/components/NightIcon.jsx'
import { accountTypeLabel } from '../../accounts/model/accountTypes.js'
import { payFrequencyLabel } from '../../settings/model/incomeSettings.js'
import { TransactionList } from '../../transactions/components/TransactionList.jsx'

// Resume ingresos, gastos y deuda con los datos ya calculados para el mes activo.
export function DashboardStats({ income, available, summary, hidden }) {
  return <section className="stat-grid dashboard-stats" aria-label="Resumen del mes">
    <Stat icon={ArrowDownLeft} label="Ingresos" value={formatMinor(income.salaryMinor || summary.income, 'COP', hidden)} tone="positive" />
    <Stat icon={ArrowUpRight} label="Gastos fijos" value={formatMinor(available.fixedExpensesMinor, 'COP', hidden)} tone="negative" />
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

// Reúne la referencia de ingresos, dinero libre y vistas rápidas del plan y las cuentas.
export function DashboardMoneyDetails({ income, available, goals, goalCount, allocations, planned, plannedCount, accounts, accountCount, balances, hidden }) {
  return <>
    <div className="dashboard-money-grid">
      <IncomeSummary income={income} hidden={hidden} />
      <AvailableMoneyCard available={available} hidden={hidden} />
    </div>
    <DashboardPreviewGrid goals={goals} goalCount={goalCount} allocations={allocations} planned={planned} plannedCount={plannedCount} accounts={accounts} accountCount={accountCount} balances={balances} hidden={hidden} />
  </>
}

// Muestra ingresos de referencia sin crear movimientos y ofrece su edición en Cuentas.
function IncomeSummary({ income, hidden }) {
  const configured = income.sources.length > 0 || Number(income.salaryMinor) > 0
  const fixed = income.primary && income.primary.type === 'fixed_salary' ? income.primary : null
  const frequency = fixed?.frequency || income.primary?.frequency
  const nextPayDate = fixed?.next_pay_date || income.primary?.next_pay_date
  const extras = income.sources.filter((source) => source.type === 'occasional')
  return <section className="feature-panel income-summary">
    <div className="section-heading"><div><h2>Mis ingresos</h2><p>{configured ? 'Referencia para organizar tu presupuesto.' : 'Completa esta información para tenerla a mano.'}</p></div><Link to="/cuentas#ingresos">{configured ? 'Editar' : 'Configurar'}</Link></div>
    {configured ? <div className="income-summary__value">{income.salaryMinor !== null && <><strong>{formatMinor(income.salaryMinor, 'COP', hidden)}</strong><span>{payFrequencyLabel(frequency) || 'Sueldo fijo'}</span>{nextPayDate && <small>Próximo pago: {formatDashboardDate(nextPayDate)}</small>}</>}{income.salaryMinor === null && <span>Sin sueldo fijo declarado</span>}{extras.length > 0 && <small>{formatOccasionalCount(extras.length)}</small>}</div> : <p className="dashboard-empty__text">Agrega una fuente de ingreso y la cuenta donde la recibes desde Cuentas.</p>}
  </section>
}

// Explica el cálculo de dinero libre y separa compromisos y movimientos ya registrados.
function AvailableMoneyCard({ available, hidden }) {
  if (available.monthlyFreeMinor === null) return <section className="feature-panel available-money-card"><div className="section-heading"><div><h2>Dinero libre este mes</h2><p>El resultado aparece al completar tu punto de partida.</p></div><Link to="/cuentas#ingresos">Configurar</Link></div><p className="dashboard-empty__text">Necesitamos tu salario mensual, gastos fijos y pagos de deuda para decirte cuánto puedes usar con tranquilidad.</p></section>
  const negative = available.monthlyFreeMinor < 0
  return <section className={`feature-panel available-money-card ${negative ? 'available-money-card--warning' : ''}`}><div className="section-heading"><div><h2>Dinero libre este mes</h2><p>{negative ? 'Tus compromisos superan el ingreso declarado.' : 'Después de compromisos mensuales.'}</p></div><Link to="/cuentas#gastos-fijos">Editar</Link></div><strong className="available-money-card__value">{formatMinor(available.monthlyFreeMinor, 'COP', hidden)}</strong><div className="available-money-card__breakdown"><span>Salario <b>{formatMinor(available.salaryMinor, 'COP', hidden)}</b></span><span>Gastos fijos <b>− {formatMinor(available.fixedExpensesMinor, 'COP', hidden)}</b></span><span>Pagos de deuda <b>− {formatMinor(available.debtPaymentsMinor, 'COP', hidden)}</b></span></div>{available.trackedExpensesMinor > 0 && <p className="available-money-card__after">Tras gastos registrados: <strong>{formatMinor(available.availableNowMinor, 'COP', hidden)}</strong></p>}</section>
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

// Conserva singular y plural naturales para fuentes de ingreso esporádicas.
function formatOccasionalCount(count) {
  return count === 1 ? '1 ingreso extra esporádico' : `${count} ingresos extra esporádicos`
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
