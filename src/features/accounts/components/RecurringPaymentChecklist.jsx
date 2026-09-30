import { useState } from 'react'
import { Check, ChevronDown, CircleAlert, ListChecks } from 'lucide-react'
import { useApp } from '../../../app/AppContext.jsx'
import { addCalendarDays, calendarToday, expenseFrequencyLabel, getRecurringExpenseOccurrences } from '../../../domain/recurringExpenses.js'
import { formatMinor, safeAdd } from '../../../domain/money.js'
import { RecurringPaymentConfirmation } from '../../../shared/components/RecurringPaymentConfirmation.jsx'
import { ExpensePagination } from './ExpensePagination.jsx'
import { GlassHero } from '../../../shared/components/GlassHero.jsx'

const PAGE_SIZE = 6

// Muestra los vencimientos próximos y permite actualizar su estado sin crear cargos automáticos.
export function RecurringPaymentChecklist({ expenses, settings }) {
  const { transactions } = useApp()
  const [confirmingPayment, setConfirmingPayment] = useState(null)
  const today = calendarToday()
  const occurrences = getRecurringExpenseOccurrences(expenses, {
    from: addCalendarDays(today, -14),
    to: addCalendarDays(today, 45),
    today,
    includeOverdue: true,
    includePaid: false,
    maxOccurrencesPerExpense: 2,
    transactions,
    payFrequency: settings.payFrequency,
    nextPayDate: settings.nextPayDate,
  })
  const pendingCount = occurrences.filter((occurrence) => occurrence.status !== 'paid').length
  const periodGroups = groupOccurrencesByPeriod(occurrences, today)

  return <>
    {confirmingPayment && <RecurringPaymentConfirmation key={confirmingPayment.id} payment={confirmingPayment} onCancel={() => setConfirmingPayment(null)} onDone={() => setConfirmingPayment(null)} />}
    <section className="recurring-payments" aria-labelledby="recurring-payments-title">
    <div className="recurring-payments__heading">
      <div><h3 id="recurring-payments-title"><ListChecks aria-hidden="true" /> Checklist de pagos</h3><p>Revisa cada gasto fijo: verás el vencimiento actual y el siguiente.</p></div>
    </div>
    <GlassHero className="payments-hero"><strong className="glass-amount">{pendingCount ? `${pendingCount} pendiente${pendingCount === 1 ? '' : 's'}` : 'Todo al día'}</strong><p>Ordenados por fecha de vencimiento</p></GlassHero>
    {!occurrences.length
      ? <p className="empty-inline"><CircleAlert aria-hidden="true" />{expenses.some((expense) => expense.frequency === 'payday') && !settings.nextPayDate ? 'Configura tu próximo pago en Ingresos para generar los vencimientos ligados a cada pago.' : 'Guarda al menos un gasto recurrente para generar aquí sus próximos vencimientos.'}</p>
      : <div className="recurring-payments__groups">
        {periodGroups.map((group) => <OccurrenceGroup key={group.key} group={group} hidden={settings.hiddenAmounts} onToggle={setConfirmingPayment} />)}
      </div>}
    <p className="helper">Al confirmar, el pago se registra en Actividad y actualiza el saldo solo si eliges una cuenta.</p>
    </section>
  </>
}

// Separa vencimientos atrasados y agrupa los demás por mes, abriendo lo urgente primero.
function groupOccurrencesByPeriod(occurrences, today) {
  const overdue = occurrences.filter((item) => item.status === 'overdue')
  const upcomingByMonth = new Map()
  for (const occurrence of occurrences) {
    if (occurrence.status === 'overdue') continue
    const month = occurrence.dueDate.slice(0, 7)
    const monthItems = upcomingByMonth.get(month)
    if (monthItems) monthItems.push(occurrence)
    else upcomingByMonth.set(month, [occurrence])
  }
  const upcomingMonths = [...upcomingByMonth.entries()].sort(([left], [right]) => left.localeCompare(right))
  const firstUpcomingMonth = upcomingMonths[0]?.[0]
  const currentMonth = today.slice(0, 7)
  return [
    ...(overdue.length ? [{ key: 'overdue', title: 'Atrasados', occurrences: overdue, initiallyOpen: true }] : []),
    ...upcomingMonths.map(([month, items]) => ({
      key: month,
      title: formatMonthLabel(month),
      occurrences: items,
      initiallyOpen: month === currentMonth || month === firstUpcomingMonth,
    })),
  ]
}

// Mantiene acotado cada mes y junta bajo el mismo nombre las recurrencias repetidas.
function OccurrenceGroup({ group, hidden, onToggle }) {
  const [isOpen, setIsOpen] = useState(group.initiallyOpen)
  const [page, setPage] = useState(0)
  const expenseGroups = groupOccurrencesByExpense(group.occurrences)
  const currentPage = Math.min(page, Math.max(0, Math.ceil(expenseGroups.length / PAGE_SIZE) - 1))
  const visible = expenseGroups.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)
  const total = sumOccurrenceAmounts(group.occurrences)
  return <details className="recurring-payments__group" open={isOpen} onToggle={(event) => setIsOpen(event.currentTarget.open)}>
    <summary className="recurring-payments__group-heading">
      <span><strong>{group.title}</strong><small>{group.occurrences.length} vencimiento{group.occurrences.length === 1 ? '' : 's'}</small></span>
      <span className="recurring-payments__group-total"><strong>{formatMinor(total, 'COP', hidden)}</strong><ChevronDown aria-hidden="true" /></span>
    </summary>
    <div className="recurring-payments__content">
      <div className="recurring-payments__list">{visible.map((items) => <PaymentExpenseGroup key={items[0].expenseId} occurrences={items} hidden={hidden} onToggle={onToggle} />)}</div>
      <ExpensePagination page={currentPage} count={expenseGroups.length} pageSize={PAGE_SIZE} onChange={setPage} label={`Gastos de ${group.title}`} />
    </div>
  </details>
}

// Conserva cada fecha como acción independiente cuando un gasto se repite dentro del mes.
function PaymentExpenseGroup({ occurrences, hidden, onToggle }) {
  if (occurrences.length === 1) return <PaymentChecklistRow occurrence={occurrences[0]} hidden={hidden} onToggle={onToggle} />
  const total = sumOccurrenceAmounts(occurrences)
  return <details className="recurring-payment-series">
    <summary>
      <span><strong>{occurrences[0].name}</strong><small>{occurrences.length} vencimientos</small></span>
      <strong>{formatMinor(total, 'COP', hidden)}</strong>
      <ChevronDown aria-hidden="true" />
    </summary>
    <div className="recurring-payment-series__rows">{occurrences.map((occurrence) => <PaymentChecklistRow key={occurrence.id} occurrence={occurrence} hidden={hidden} onToggle={onToggle} compact />)}</div>
  </details>
}

// Evita juntar compromisos distintos que por casualidad tienen el mismo nombre.
function groupOccurrencesByExpense(occurrences) {
  const groups = new Map()
  for (const occurrence of occurrences) {
    const key = String(occurrence.expenseId)
    const expenseItems = groups.get(key)
    if (expenseItems) expenseItems.push(occurrence)
    else groups.set(key, [occurrence])
  }
  return [...groups.values()]
}

// Conserva la aritmética monetaria en unidades menores enteras.
function sumOccurrenceAmounts(occurrences) {
  return occurrences.reduce((total, occurrence) => safeAdd(total, occurrence.amount_minor), 0)
}

// Renderiza un vencimiento individual con un control de selección accesible y un estado explícito.
function PaymentChecklistRow({ occurrence, hidden, onToggle, compact = false }) {
  const isPaid = occurrence.status === 'paid'
  const dateLabel = formatDate(occurrence.dueDate)
  const statusLabel = isPaid ? `Pagado${occurrence.paidAt ? ` el ${formatDate(occurrence.paidAt.slice(0, 10))}` : ''}` : occurrence.status === 'overdue' ? `Atrasado · vencía el ${dateLabel}` : `Vence el ${dateLabel}`
  return <article className={`recurring-payment recurring-payment--${occurrence.status}${compact ? ' recurring-payment--nested' : ''}`}>
    <label className="recurring-payment__check"><input type="checkbox" checked={isPaid} aria-label={`Marcar ${occurrence.name} del ${dateLabel} como pagado`} onChange={() => onToggle(occurrence)} /><span aria-hidden="true"><Check /></span></label>
    <div className="recurring-payment__details"><strong>{compact ? statusLabel : occurrence.name}</strong><p>{compact ? expenseFrequencyLabel(occurrence.frequency) : `${statusLabel} · ${expenseFrequencyLabel(occurrence.frequency)}`}</p></div>
    <strong className="recurring-payment__amount">{formatMinor(occurrence.amount_minor, 'COP', hidden)}</strong>
  </article>
}

// Presenta el periodo en español y fija el mediodía para evitar cambios de fecha por zona horaria.
function formatMonthLabel(month) {
  const label = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(new Date(`${month}-01T12:00:00-05:00`))
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function formatDate(isoDate) {
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' }).format(new Date(`${isoDate}T12:00:00-05:00`))
}
