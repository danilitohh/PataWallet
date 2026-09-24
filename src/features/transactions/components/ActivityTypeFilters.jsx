const TYPE_OPTIONS = [
  ['all', 'Todos'],
  ['expense', 'Gastos'],
  ['income', 'Ingresos'],
  ['transfer', 'Transferencias'],
  ['card_payment', 'Pagos de deuda'],
]

// Mantiene los filtros de tipo en una fila desplazable con conteos del período real.
export function ActivityTypeFilters({ value, counts, reviewCount, showReview, onChange }) {
  const options = showReview ? [...TYPE_OPTIONS, ['review', 'Por revisar']] : TYPE_OPTIONS

  return (
    <div className="activity-type-chips" role="group" aria-label="Filtrar por tipo de movimiento">
      {options.map(([type, label]) => (
        <button key={type} type="button" aria-pressed={value === type} onClick={() => onChange(type)}>
          {label}<span>{type === 'review' ? reviewCount : counts[type]}</span>
        </button>
      ))}
    </div>
  )
}
