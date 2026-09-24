import { ArrowDownLeft, ReceiptText } from 'lucide-react'
import { formatMinor } from '../../../domain/money.js'
import { activityMonthLabel } from '../model/activityTimeline.js'

// Resume el mes seleccionado con totales reales y respeta la preferencia de ocultar montos.
export function ActivityMonthSummary({ month, expenses, income, count, currency, hidden }) {
  return (
    <section className="activity-month-summary" aria-labelledby="activity-summary-title">
      <div className="activity-month-summary__heading">
        <span className="activity-month-summary__eyebrow" id="activity-summary-title">Gasto neto del mes</span>
        <span className="activity-month-summary__period">{activityMonthLabel(month)}</span>
      </div>
      <strong className="activity-month-summary__amount">{formatMinor(expenses, currency, hidden)}</strong>
      <p className="activity-month-summary__explanation">Compras registradas menos reembolsos</p>
      <div className="activity-month-summary__footer">
        <span className="activity-month-summary__income"><ArrowDownLeft aria-hidden="true" /><span>Ingresos</span><b>{formatMinor(income, currency, hidden)}</b></span>
        <span className="activity-month-summary__count"><ReceiptText aria-hidden="true" />{count} {count === 1 ? 'movimiento' : 'movimientos'}</span>
      </div>
    </section>
  )
}
