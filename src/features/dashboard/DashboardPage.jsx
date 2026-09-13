import { useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, CalendarClock, CreditCard, Eye, EyeOff, Goal, Landmark, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useApp } from '../../app/AppContext.jsx'
import { PetScene } from '../../components/PetScene.jsx'
import { calculateAvailableMoney, calculateSummary, goalProgress } from '../../domain/finance.js'
import { readFixedExpenses } from '../../domain/financialSetup.js'
import { formatMinor } from '../../domain/money.js'
import { PageHeader } from '../../shared/components/PageHeader.jsx'
import { Progress } from '../../shared/components/Progress.jsx'
import { currentMonth } from '../../shared/lib/date.js'
import { accountTypeLabel } from '../accounts/model/accountTypes.js'
import { payFrequencyLabel } from '../settings/model/incomeSettings.js'
import { TransactionList } from '../transactions/components/TransactionList.jsx'

export function DashboardPage() {
  const { accounts, transactions, budgets, goals, allocations, plannedPurchases, settings, setSheet, actions, user, isDemo } = useApp()
  const [month, setMonth] = useState(currentMonth())
  const summary = calculateSummary(accounts, transactions, month)
  const available = calculateAvailableMoney({ monthlySalaryMinor: settings.monthlySalaryMinor, fixedExpenses: readFixedExpenses(settings.fixedExpenses), accounts, transactions, month })
  const budget = budgets.find((item) => item.month === month) || budgets[0]
  const remaining = budget ? budget.limit_minor - summary.expenses : 0
  const used = budget?.limit_minor ? (summary.expenses / budget.limit_minor) * 100 : 0
  const recent = transactions.filter((item) => !['opening', 'adjustment'].includes(item.type)).slice(0, 4)
  const activeGoals = goals.slice(0, 3)
  const planned = plannedPurchases.filter((item) => item.status === 'planned').sort((a, b) => a.target_date.localeCompare(b.target_date))
  const plannedPreview = planned.slice(0, 3)
  const activeAccounts = accounts.filter((item) => !item.archived).slice(0, 4)
  const hidden = Boolean(settings.hiddenAmounts)

  return (
    <div className="route-stack">
      <PageHeader title={`Hola, ${user?.user_metadata?.display_name?.split(' ')[0] || user?.user_metadata?.full_name?.split(' ')[0] || 'Danilo'}`} subtitle="Qué bueno tenerte por aquí." action={<button className="icon-button" aria-label={hidden ? 'Mostrar montos' : 'Ocultar montos'} onClick={() => actions.setSetting('hiddenAmounts', !hidden)}>{hidden ? <EyeOff /> : <Eye />}</button>} />
      {isDemo && <DemoBanner />}
      <section className="balance-hero">
        <div className="balance-hero__numbers"><span>Saldo en cuentas</span><strong aria-label={hidden ? 'Monto oculto' : undefined}>{formatMinor(summary.assets, 'COP', hidden)}</strong><small>Dinero registrado en activos</small></div>
        <div className="balance-hero__scene" aria-hidden="true"><PetScene name="welcome" /></div>
      </section>
      <div className="month-row"><label htmlFor="month-home">Mes</label><input id="month-home" type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></div>
      <section className="stat-grid" aria-label="Resumen del mes">
        <Stat icon={ArrowDownLeft} label="Ingresos" value={formatMinor(summary.income, 'COP', hidden)} tone="positive" />
        <Stat icon={ArrowUpRight} label="Gastos" value={formatMinor(summary.expenses, 'COP', hidden)} tone="negative" />
        <Stat icon={CreditCard} label="Deuda" value={formatMinor(summary.debt, 'COP', hidden)} />
      </section>
      <section className="feature-panel budget-summary">
        <div className="section-heading"><div><h2>Presupuesto mensual</h2><p>{remaining >= 0 ? `Te quedan ${formatMinor(remaining, 'COP', hidden)}` : `Superaste el presupuesto por ${formatMinor(Math.abs(remaining), 'COP', hidden)}`}</p></div><Link to="/plan">Ver plan</Link></div>
        <Progress value={used} label={`${Math.round(used)}% usado`} />
      </section>
      <IncomeSummary salary={settings.monthlySalaryMinor} frequency={settings.payFrequency} nextPayDate={settings.nextPayDate} hidden={hidden} />
      <AvailableMoneyCard available={available} hidden={hidden} />
      <DashboardPreviewGrid goals={activeGoals} goalCount={goals.length} allocations={allocations} planned={plannedPreview} plannedCount={planned.length} accounts={activeAccounts} accountCount={accounts.filter((item) => !item.archived).length} balances={summary.balances} hidden={hidden} />
      <section>
        <div className="section-heading"><h2>Últimos movimientos</h2><Link to="/actividad">Ver todos</Link></div>
        <TransactionList items={recent} compact />
      </section>
      <button className="button button--primary desktop-hidden" onClick={() => setSheet('new')}><Plus /> Registrar movimiento</button>
    </div>
  )
}

// Invita a completar los ingresos y, cuando existen, los resume sin crear movimientos por su cuenta.
function IncomeSummary({ salary, frequency, nextPayDate, hidden }) {
  const configured = Number(salary) > 0 && Boolean(payFrequencyLabel(frequency))
  return <section className="feature-panel income-summary">
    <div className="section-heading"><div><h2>Mis ingresos</h2><p>{configured ? 'Referencia para organizar tu presupuesto.' : 'Completa esta información para tenerla a mano.'}</p></div><Link to="/ajustes#ingresos">{configured ? 'Editar' : 'Configurar'}</Link></div>
    {configured ? <div className="income-summary__value"><strong>{formatMinor(salary, 'COP', hidden)}</strong><span>{payFrequencyLabel(frequency)}</span>{nextPayDate && <small>Próximo pago: {formatDashboardDate(nextPayDate)}</small>}</div> : <p className="dashboard-empty__text">Indica tu sueldo mensual y cada cuánto te pagan desde Ajustes.</p>}
  </section>
}

// Explica el dinero libre y separa el compromiso mensual del gasto ya registrado.
function AvailableMoneyCard({ available, hidden }) {
  if (available.monthlyFreeMinor === null) return <section className="feature-panel available-money-card"><div className="section-heading"><div><h2>Dinero libre</h2><p>El resultado aparece al completar tu punto de partida.</p></div><Link to="/ajustes#ingresos">Configurar</Link></div><p className="dashboard-empty__text">Necesitamos tu salario mensual, gastos fijos y pagos de deuda para decirte cuánto puedes usar con tranquilidad.</p></section>
  const negative = available.monthlyFreeMinor < 0
  return <section className={`feature-panel available-money-card ${negative ? 'available-money-card--warning' : ''}`}><div className="section-heading"><div><h2>Dinero libre este mes</h2><p>{negative ? 'Tus compromisos superan el ingreso declarado.' : 'Después de compromisos mensuales.'}</p></div><Link to="/ajustes#gastos-fijos">Editar</Link></div><strong className="available-money-card__value">{formatMinor(available.monthlyFreeMinor, 'COP', hidden)}</strong><div className="available-money-card__breakdown"><span>Salario <b>{formatMinor(available.salaryMinor, 'COP', hidden)}</b></span><span>Gastos fijos <b>− {formatMinor(available.fixedExpensesMinor, 'COP', hidden)}</b></span><span>Pagos de deuda <b>− {formatMinor(available.debtPaymentsMinor, 'COP', hidden)}</b></span></div>{available.trackedExpensesMinor > 0 && <p className="available-money-card__after">Tras gastos registrados: <strong>{formatMinor(available.availableNowMinor, 'COP', hidden)}</strong></p>}</section>
}

// Reúne las piezas del plan y las cuentas en paneles breves para una lectura rápida del Inicio.
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
      {planned.length ? <div className="dashboard-preview__list">{planned.map((item) => <article className="dashboard-list-row" key={item.id}><span className="goal-icon"><CalendarClock /></span><div><strong>{item.name}</strong><small>{formatDashboardDate(item.target_date)}</small></div><strong>{formatMinor(item.amount_minor, 'COP', hidden)}</strong></article>)}</div> : <DashboardEmpty icon={CalendarClock} text="Anota una compra futura desde Plan." />}
    </section>
    <section className="feature-panel dashboard-preview dashboard-preview--accounts">
      <div className="section-heading"><div><h2>Cuentas</h2><p>{accountCount ? `${accountCount} ${accountCount === 1 ? 'cuenta activa' : 'cuentas activas'}` : 'Aún no tienes cuentas'}</p></div><Link to="/cuentas">Ver cuentas</Link></div>
      {accounts.length ? <div className="dashboard-preview__list dashboard-account-list">{accounts.map((account) => <article className="dashboard-list-row" key={account.id}><span className="account-row__icon">{account.kind === 'asset' ? <Landmark /> : <CreditCard />}</span><div><strong>{account.name}</strong><small>{accountTypeLabel(account)}</small></div><strong>{formatMinor(balances[account.id] || 0, 'COP', hidden)}</strong></article>)}</div> : <DashboardEmpty icon={Landmark} text="Agrega una cuenta para ver tu saldo aquí." />}
    </section>
  </div>
}

// Formatea fechas de compras sin depender de la zona horaria del dispositivo.
function formatDashboardDate(value) {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`))
}

// Mantiene un estado vacío pequeño y accionable dentro de cada panel del dashboard.
function DashboardEmpty({ icon: Icon, text }) {
  return <div className="dashboard-empty"><Icon aria-hidden="true" /><p>{text}</p></div>
}

function DemoBanner() {
  return <div className="demo-banner"><span>Datos de ejemplo</span><p>Guardados solo en este navegador</p></div>
}

function Stat({ icon: Icon, label, value, tone = '' }) {
  return <div className={`stat ${tone}`}><Icon /><span>{label}</span><strong>{value}</strong></div>
}
