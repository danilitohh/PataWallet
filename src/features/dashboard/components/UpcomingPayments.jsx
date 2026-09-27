import { CalendarDays } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useApp } from '../../../app/AppContext.jsx'
import { readFixedExpenses } from '../../../domain/financialSetup.js'
import { addCalendarDays, calendarToday, getRecurringExpenseOccurrences } from '../../../domain/recurringExpenses.js'
import { formatMinor } from '../../../domain/money.js'
import { NightIcon } from '../../../shared/components/NightIcon.jsx'

// Vista de lectura: reutiliza los vencimientos de la checklist sin confirmar ni generar pagos.
export function UpcomingPayments() {
  const { settings, transactions } = useApp()
  const today = calendarToday()
  const upcoming = getRecurringExpenseOccurrences(readFixedExpenses(settings.fixedExpenses), {
    from: addCalendarDays(today, -14), to: addCalendarDays(today, 45), today,
    includeOverdue: true, includePaid: false, maxOccurrencesPerExpense: 2,
    transactions, payFrequency: settings.payFrequency, nextPayDate: settings.nextPayDate,
  }).slice(0, 2)
  return <section className="calm-upcoming"><div className="section-heading"><h2>Próximos pagos</h2><Link to="/cuentas/pagos">Ver todos</Link></div>
    {upcoming.length ? upcoming.map((item) => <Link className="calm-payment-row" to="/cuentas/pagos" key={item.id}><NightIcon icon={CalendarDays} /><span><strong>{item.name}</strong><small>{new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${item.dueDate}T12:00:00Z`))} · {item.status === 'overdue' ? 'Atrasado' : 'Pendiente'}</small></span><strong>{formatMinor(item.amount_minor, 'COP', settings.hiddenAmounts)}</strong></Link>) : <p className="helper">No tienes pagos pendientes. <Link to="/cuentas/gastos-fijos">Organizar gastos fijos</Link></p>}
  </section>
}
