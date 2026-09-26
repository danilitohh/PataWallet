import { useState } from 'react'
import { CalendarClock, Check, CircleAlert, Clock3, ListChecks } from 'lucide-react'
import { Link } from 'react-router-dom'
import { addCalendarDays, calendarToday, expenseFrequencyLabel, getRecurringExpenseOccurrences, setRecurringExpensePaid } from '../../../domain/recurringExpenses.js'
import { formatMinor, safeAdd } from '../../../domain/money.js'
import { DashboardBudget, DashboardMoneyDetails, DashboardRecent, DashboardStats, formatDashboardDate } from '../components/DashboardSections.jsx'
import { calendarDaysBetween } from '../model/dashboardViews.js'

// Organiza el Inicio por el tiempo al siguiente pago y los gastos fijos del periodo.
export function PaydayView({ summary, income, available, budget, remaining, used, recent, fixedExpenses, nextPayDate, actions, notify, hidden, goals, goalCount, allocations, planned, plannedCount, accounts, accountCount, balances }) {
  const today = calendarToday()
  const daysUntilPay = nextPayDate ? calendarDaysBetween(today, nextPayDate) : null
  const payments = getRecurringExpenseOccurrences(fixedExpenses, {
    from: addCalendarDays(today, -14),
    to: nextPayDate || addCalendarDays(today, 45),
    today,
    includeOverdue: true,
    includePaid: false,
    payFrequency: income.primary?.frequency,
    nextPayDate: income.primary?.next_pay_date,
  })
  return <div className="dashboard-view dashboard-view--payday">
    <section className="dashboard-payday-hero">
      <div className="dashboard-payday-hero__top"><span className="dashboard-payday-icon"><CalendarClock aria-hidden="true" /></span>{daysUntilPay !== null && <span className="dashboard-payday-count"><Clock3 aria-hidden="true" />{daysUntilPay === 0 ? 'Llega hoy' : `${daysUntilPay} ${daysUntilPay === 1 ? 'día' : 'días'}`}</span>}</div>
      <span className="dashboard-eyebrow">TU DINERO, A TU RITMO</span>
      <h2>{nextPayDate ? 'Tu próximo ingreso' : 'Tu fecha de pago'}</h2>
      <strong>{nextPayDate ? formatDashboardDate(nextPayDate) : 'Aún no configurada'}</strong>
      <p>{nextPayDate ? 'Mira qué pagos recurrentes llegan antes y márcalos al completarlos.' : 'Agrega la frecuencia y próxima fecha de pago desde Cuentas para organizar tu quincena.'}</p>
      {!nextPayDate && <Link className="dashboard-view-link" to="/cuentas#ingresos">Configurar ingreso <span aria-hidden="true">↗</span></Link>}
    </section>
    <PaydayPayments payments={payments} fixedExpenses={fixedExpenses} nextPayDate={nextPayDate} actions={actions} notify={notify} hidden={hidden} />
    <DashboardStats income={income} available={available} summary={summary} hidden={hidden} />
    <DashboardRecent items={recent} />
    <DashboardBudget summary={summary} budget={budget} remaining={remaining} used={used} hidden={hidden} />
    <DashboardMoneyDetails income={income} available={available} goals={goals} goalCount={goalCount} allocations={allocations} planned={planned} plannedCount={plannedCount} accounts={accounts} accountCount={accountCount} balances={balances} hidden={hidden} />
  </div>
}

// Presenta pagos recurrentes antes del próximo ingreso y conserva sus marcas por fecha.
function PaydayPayments({ payments, fixedExpenses, nextPayDate, actions, notify, hidden }) {
  const [savingId, setSavingId] = useState('')
  const [error, setError] = useState('')
  const pending = payments.filter((payment) => payment.status !== 'paid')
  const overdue = payments.filter((payment) => payment.status === 'overdue')
  const upcoming = payments.filter((payment) => payment.status !== 'overdue')
  const pendingMinor = pending.reduce((total, payment) => safeAdd(total, payment.amount_minor), 0)

  // Persiste la marca de pago en la misma checklist usada desde Cuentas.
  const togglePayment = async (payment, paid) => {
    if (savingId) return
    setError('')
    setSavingId(payment.id)
    try {
      await actions.setSetting('fixedExpenses', setRecurringExpensePaid(fixedExpenses, payment, paid))
      notify(paid ? `${payment.name} marcado como pagado` : `${payment.name} volvió a quedar pendiente`)
    } catch (issue) {
      setError(issue.message || 'No pudimos actualizar este pago. Inténtalo de nuevo.')
    } finally {
      setSavingId('')
    }
  }

  const emptyMessage = fixedExpenses.some((expense) => expense.frequency === 'payday') && !nextPayDate
    ? 'Configura tu fecha de pago en Ingresos para calcular vencimientos ligados a cada pago.'
    : 'Agrega gastos recurrentes en Cuentas para ver sus vencimientos en esta lista.'
  const renderPayment = (payment) => <PaydayPaymentRow key={payment.id} payment={payment} hidden={hidden} saving={Boolean(savingId)} onToggle={togglePayment} />

  return <section className="feature-panel dashboard-payments" aria-labelledby="dashboard-payments-title">
    <div className="section-heading"><div><span className="dashboard-eyebrow">PAGOS PROGRAMADOS</span><h2 id="dashboard-payments-title">{nextPayDate ? 'Antes del próximo pago' : 'Próximos pagos'}</h2></div><strong className="dashboard-payments__count">{pending.length} pendiente{pending.length === 1 ? '' : 's'}</strong></div>
    {error && <p className="form-error" role="alert">{error}</p>}
    {payments.length ? <div className="dashboard-payments__groups">
      {overdue.length > 0 && <section className="dashboard-payments__group" aria-label="Pagos atrasados"><h3>Atrasados</h3><div className="dashboard-payments__list">{overdue.map(renderPayment)}</div></section>}
      {upcoming.length > 0 && <section className="dashboard-payments__group" aria-label="Pagos actuales y próximos"><h3>{nextPayDate ? 'Antes del próximo pago' : 'Próximos 45 días'}</h3><div className="dashboard-payments__list">{upcoming.map(renderPayment)}</div></section>}
    </div> : <p className="dashboard-empty__text"><CircleAlert aria-hidden="true" /> {emptyMessage}</p>}
    {payments.length > 0 && <div className="dashboard-payments__total"><span><ListChecks aria-hidden="true" /> Falta pagar</span><strong>{formatMinor(pendingMinor, 'COP', hidden)}</strong></div>}
    <p className="helper">Marcar un pago no crea un movimiento; regístralo desde Actividad para actualizar el saldo.</p>
  </section>
}

// Renderiza una ocurrencia accesible y permite devolver su estado a pendiente mientras sigue visible.
function PaydayPaymentRow({ payment, hidden, saving, onToggle }) {
  const paid = payment.status === 'paid'
  return <label className={`dashboard-payment ${paid ? 'dashboard-payment--paid' : ''}`}>
    <input type="checkbox" checked={paid} disabled={saving} aria-label={`Marcar ${payment.name} del ${formatDashboardDate(payment.dueDate)} como pagado`} onChange={(event) => onToggle(payment, event.target.checked)} />
    <span className="dashboard-payment__check" aria-hidden="true"><Check /></span>
    <span className="dashboard-payment__copy"><strong>{payment.name}</strong><small>{payment.status === 'overdue' ? 'Atrasado' : 'Vence'} · {formatDashboardDate(payment.dueDate)} · {expenseFrequencyLabel(payment.frequency)}</small></span>
    <strong className="dashboard-payment__amount">{formatMinor(payment.amount_minor, 'COP', hidden)}</strong>
  </label>
}
