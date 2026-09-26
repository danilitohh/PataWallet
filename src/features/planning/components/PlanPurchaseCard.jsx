import { CalendarClock, ChevronRight, Pencil, Trash2 } from 'lucide-react'
import { formatMinor } from '../../../domain/money.js'
import { NightIcon } from '../../../shared/components/NightIcon.jsx'

// Muestra una compra prevista con controles de edición y un análisis que el usuario puede desplegar.
export function PlanPurchaseCard({ purchase, featured, hidden, assessment, expanded, onToggle, onEdit, onDelete }) {
  const className = `plan-purchase-card ${featured ? 'plan-purchase-card--featured' : 'plan-purchase-card--compact'}`
  const advice = plannedPurchaseMessage(assessment, hidden)
  const targetDate = formatPlannedPurchaseDate(purchase.target_date)

  return <article className={className}>
    <span className="plan-purchase-card__icon"><NightIcon icon={CalendarClock} className="goal-icon" tone="peach" /></span>
    <div className="plan-purchase-card__copy">
      <span className="plan-eyebrow">{featured ? 'Próxima compra' : 'También prevista'}</span>
      <h3>{purchase.name}</h3>
      <p>{formatMinor(purchase.amount_minor, 'COP', hidden)} · para el {targetDate}</p>
    </div>
    <div className="plan-purchase-card__actions">
      <button className="icon-button icon-button--small" type="button" aria-label={`Editar ${purchase.name}`} onClick={onEdit}><Pencil aria-hidden="true" /></button>
      <button className="icon-button icon-button--small" type="button" aria-label={`Eliminar ${purchase.name}`} onClick={onDelete}><Trash2 aria-hidden="true" /></button>
    </div>
    <button className="plan-purchase-card__evaluate" type="button" aria-expanded={expanded} onClick={onToggle}>
      {expanded ? 'Cerrar evaluación' : 'Evaluar compra'} <ChevronRight aria-hidden="true" />
    </button>
    {expanded && <div className={`plan-purchase-card__assessment ${assessment.kind === 'good' ? 'plan-purchase-card__assessment--good' : ''}`} role="status">
      <strong>{assessment.kind === 'good' ? 'La compra cabe en tu plan' : assessment.kind === 'unknown' ? 'Falta información' : 'Conviene revisar esta compra'}</strong>
      <p>{advice}</p>
    </div>}
  </article>
}

// Formatea la fecha de calendario sin convertirla a otro día por la zona horaria local.
function formatPlannedPurchaseDate(value) {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`))
}

// Explica el motivo concreto de una recomendación sin ocultar casos de saldo insuficiente o pago lejano.
function plannedPurchaseMessage(assessment, hidden) {
  if (assessment.kind === 'unknown') return assessment.message
  if (assessment.kind === 'good') {
    const margin = assessment.remainingAfterPurchase ?? assessment.availableAfterReserves
    return margin === null ? 'Puedes hacerla según los datos configurados.' : `Puedes hacerla: conservarías ${formatMinor(margin, 'COP', hidden)} de margen.`
  }
  if (assessment.reason === 'before_payday') return `Espera o revisa el monto: faltan ${assessment.daysUntilPay} días para tu próximo pago y te quedarían ${formatMinor(assessment.remainingAfterPurchase, 'COP', hidden)}.`
  if (assessment.reason === 'funds') return assessment.shortfall === 0 ? 'No es recomendable: te dejaría sin margen para los pagos pendientes.' : `No es recomendable: faltarían ${formatMinor(assessment.shortfall, 'COP', hidden)} después de apartar pagos pendientes.`
  return `No es recomendable: supera el presupuesto restante por ${formatMinor(assessment.shortfall, 'COP', hidden)}.`
}
