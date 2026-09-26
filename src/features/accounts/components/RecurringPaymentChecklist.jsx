import { useState } from 'react'
import { Check, CircleAlert, ListChecks } from 'lucide-react'
import { useApp } from '../../../app/AppContext.jsx'
import { addCalendarDays, calendarToday, expenseFrequencyLabel, getRecurringExpenseOccurrences } from '../../../domain/recurringExpenses.js'
import { formatMinor } from '../../../domain/money.js'
import { RecurringPaymentConfirmation } from '../../../shared/components/RecurringPaymentConfirmation.jsx'

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
  const overdueOccurrences = occurrences.filter((occurrence) => occurrence.status === 'overdue')
  const upcomingOccurrences = occurrences.filter((occurrence) => occurrence.status !== 'overdue')

  return <>
    {confirmingPayment && <RecurringPaymentConfirmation key={confirmingPayment.id} payment={confirmingPayment} onCancel={() => setConfirmingPayment(null)} onDone={() => setConfirmingPayment(null)} />}
    <section className="recurring-payments" aria-labelledby="recurring-payments-title">
    <div className="recurring-payments__heading">
      <div><h3 id="recurring-payments-title"><ListChecks aria-hidden="true" /> Checklist de pagos</h3><p>Revisa cada gasto fijo: verás el vencimiento actual y el siguiente.</p></div>
      <strong>{pendingCount ? `${pendingCount} pendiente${pendingCount === 1 ? '' : 's'}` : 'Todo al día'}</strong>
    </div>
    {!occurrences.length
      ? <p className="empty-inline"><CircleAlert aria-hidden="true" />{expenses.some((expense) => expense.frequency === 'payday') && !settings.nextPayDate ? 'Configura tu próximo pago en Ingresos para generar los vencimientos ligados a cada pago.' : 'Guarda al menos un gasto recurrente para generar aquí sus próximos vencimientos.'}</p>
      : <div className="recurring-payments__groups">
        <OccurrenceGroup title="Atrasados" occurrences={overdueOccurrences} hidden={settings.hiddenAmounts} onToggle={setConfirmingPayment} />
        <OccurrenceGroup title="Actuales y siguientes" occurrences={upcomingOccurrences} hidden={settings.hiddenAmounts} onToggle={setConfirmingPayment} />
      </div>}
    <p className="helper">Al confirmar, el pago se registra en Actividad y actualiza el saldo solo si eliges una cuenta.</p>
    </section>
  </>
}

// Distingue pagos atrasados de fechas actuales o futuras sin duplicar la presentación de cada fila.
function OccurrenceGroup({ title, occurrences, hidden, onToggle }) {
  if (!occurrences.length) return null
  return <section className="recurring-payments__group" aria-label={title}>
    <h4>{title}</h4>
    <div className="recurring-payments__list">{occurrences.map((occurrence) => <PaymentChecklistRow key={occurrence.id} occurrence={occurrence} hidden={hidden} onToggle={onToggle} />)}</div>
  </section>
}

// Renderiza un vencimiento individual con un control de selección accesible y un estado explícito.
function PaymentChecklistRow({ occurrence, hidden, onToggle }) {
  const isPaid = occurrence.status === 'paid'
  const dateLabel = formatDate(occurrence.dueDate)
  const statusLabel = isPaid ? `Pagado${occurrence.paidAt ? ` el ${formatDate(occurrence.paidAt.slice(0, 10))}` : ''}` : occurrence.status === 'overdue' ? `Atrasado · vencía el ${dateLabel}` : `Vence el ${dateLabel}`
  return <article className={`recurring-payment recurring-payment--${occurrence.status}`}>
    <label className="recurring-payment__check"><input type="checkbox" checked={isPaid} aria-label={`Marcar ${occurrence.name} del ${dateLabel} como pagado`} onChange={() => onToggle(occurrence)} /><span aria-hidden="true"><Check /></span></label>
    <div className="recurring-payment__details"><strong>{occurrence.name}</strong><p>{statusLabel} · {expenseFrequencyLabel(occurrence.frequency)}</p></div>
    <strong className="recurring-payment__amount">{formatMinor(occurrence.amount_minor, 'COP', hidden)}</strong>
  </article>
}

function formatDate(isoDate) {
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' }).format(new Date(`${isoDate}T12:00:00-05:00`))
}
