import { useState } from 'react'
import { Check, CircleAlert, ListChecks } from 'lucide-react'
import { addCalendarDays, calendarToday, expenseFrequencyLabel, getRecurringExpenseOccurrences, setRecurringExpensePaid } from '../../../domain/recurringExpenses.js'
import { formatMinor } from '../../../domain/money.js'

// Muestra los vencimientos próximos y permite actualizar su estado sin crear cargos automáticos.
export function RecurringPaymentChecklist({ expenses, settings, actions, notify }) {
  const [savingId, setSavingId] = useState('')
  const [error, setError] = useState('')
  const today = calendarToday()
  const occurrences = getRecurringExpenseOccurrences(expenses, {
    from: addCalendarDays(today, -14),
    to: addCalendarDays(today, 45),
    today,
    payFrequency: settings.payFrequency,
    nextPayDate: settings.nextPayDate,
  })
  const pendingCount = occurrences.filter((occurrence) => occurrence.status !== 'paid').length

  const togglePayment = async (occurrence, paid) => {
    if (savingId) return
    setError('')
    setSavingId(occurrence.id)
    try {
      await actions.setSetting('fixedExpenses', setRecurringExpensePaid(expenses, occurrence, paid))
      notify(paid ? `${occurrence.name} marcado como pagado` : `${occurrence.name} volvió a quedar pendiente`)
    } catch (issue) {
      setError(issue.message || 'No pudimos actualizar este pago. Inténtalo de nuevo.')
    } finally {
      setSavingId('')
    }
  }

  return <section className="recurring-payments" aria-labelledby="recurring-payments-title">
    <div className="recurring-payments__heading">
      <div><h3 id="recurring-payments-title"><ListChecks aria-hidden="true" /> Checklist de pagos</h3><p>Revisa los vencimientos de los próximos 45 días y marca cada uno cuando ya lo hayas pagado.</p></div>
      <strong>{pendingCount ? `${pendingCount} pendiente${pendingCount === 1 ? '' : 's'}` : 'Todo al día'}</strong>
    </div>
    {error && <p className="form-error" role="alert">{error}</p>}
    {!occurrences.length
      ? <p className="empty-inline"><CircleAlert aria-hidden="true" />{expenses.some((expense) => expense.frequency === 'payday') && !settings.nextPayDate ? 'Configura tu próximo pago en Ingresos para generar los vencimientos ligados a cada pago.' : 'Guarda al menos un gasto recurrente para generar aquí sus próximos vencimientos.'}</p>
      : <div className="recurring-payments__list">{occurrences.map((occurrence) => <PaymentChecklistRow key={occurrence.id} occurrence={occurrence} hidden={settings.hiddenAmounts} saving={savingId === occurrence.id} onToggle={togglePayment} />)}</div>}
    <p className="helper">Marcar un pago solo actualiza esta checklist. Para que también afecte el historial y el saldo de una cuenta, registra el movimiento real desde Actividad.</p>
  </section>
}

// Renderiza un vencimiento individual con un control de selección accesible y un estado explícito.
function PaymentChecklistRow({ occurrence, hidden, saving, onToggle }) {
  const isPaid = occurrence.status === 'paid'
  const dateLabel = formatDate(occurrence.dueDate)
  const statusLabel = isPaid ? `Pagado${occurrence.paidAt ? ` el ${formatDate(occurrence.paidAt.slice(0, 10))}` : ''}` : occurrence.status === 'overdue' ? `Atrasado · vencía el ${dateLabel}` : `Vence el ${dateLabel}`
  return <article className={`recurring-payment recurring-payment--${occurrence.status}`}>
    <label className="recurring-payment__check"><input type="checkbox" checked={isPaid} disabled={saving} aria-label={`Marcar ${occurrence.name} como pagado`} onChange={(event) => onToggle(occurrence, event.target.checked)} /><span aria-hidden="true"><Check /></span></label>
    <div className="recurring-payment__details"><strong>{occurrence.name}</strong><p>{statusLabel} · {expenseFrequencyLabel(occurrence.frequency)}</p></div>
    <strong className="recurring-payment__amount">{formatMinor(occurrence.amount_minor, 'COP', hidden)}</strong>
  </article>
}

function formatDate(isoDate) {
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' }).format(new Date(`${isoDate}T12:00:00-05:00`))
}
