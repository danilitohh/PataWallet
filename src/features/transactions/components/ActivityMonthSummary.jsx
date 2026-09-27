import { formatMinor } from '../../../domain/money.js'
import { ArrowUpRight } from 'lucide-react'
import { GlassHero } from '../../../shared/components/GlassHero.jsx'

// Resume el mes seleccionado con totales reales y respeta la preferencia de ocultar montos.
export function ActivityMonthSummary({ expenses, income, count, currency, hidden }) {
  return (
    <GlassHero className="activity-month-summary" aria-label={`Resumen del mes · ${count} movimientos`}>
      <span>Gastos del mes</span><strong className="glass-amount">{formatMinor(expenses, currency, hidden)}</strong>
      <p><ArrowUpRight aria-hidden="true" /> Ingresos <strong>{formatMinor(income, currency, hidden)}</strong></p>
    </GlassHero>
  )
}
