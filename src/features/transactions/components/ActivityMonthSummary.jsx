import { formatMinor } from '../../../domain/money.js'

// Resume el mes seleccionado con totales reales y respeta la preferencia de ocultar montos.
export function ActivityMonthSummary({ expenses, income, count, currency, hidden }) {
  return (
    <section className="activity-month-summary" aria-label={`Resumen del mes · ${count} movimientos`}>
      <div><span>Ingresos</span><strong>{formatMinor(income, currency, hidden)}</strong></div>
      <div><span>Gastos</span><strong>{formatMinor(expenses, currency, hidden)}</strong></div>
    </section>
  )
}
