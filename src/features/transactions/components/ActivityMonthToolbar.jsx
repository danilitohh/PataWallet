import { CalendarDays, ChevronLeft, ChevronRight, Filter } from 'lucide-react'
import { activityMonthLabel, shiftActivityMonth } from '../model/activityTimeline.js'

// Permite recorrer meses con controles accesibles y limpiar solo los filtros de lista.
export function ActivityMonthToolbar({ month, current, onMonthChange, onClearFilters, hasFilters }) {
  const nextMonth = shiftActivityMonth(month, 1)

  return (
    <div className="activity-month-toolbar">
      <div className="activity-month-picker" role="group" aria-label="Cambiar mes de actividad">
        <button type="button" aria-label="Ver mes anterior" onClick={() => onMonthChange(shiftActivityMonth(month, -1))}>
          <ChevronLeft aria-hidden="true" />
        </button>
        <CalendarDays aria-hidden="true" className="activity-month-picker__calendar" />
        <time dateTime={month}>{activityMonthLabel(month)}</time>
        <button type="button" aria-label="Ver mes siguiente" disabled={nextMonth > current} onClick={() => onMonthChange(nextMonth)}>
          <ChevronRight aria-hidden="true" />
        </button>
      </div>
      {hasFilters && <button type="button" className="activity-clear-filters" onClick={onClearFilters}><Filter aria-hidden="true" />Limpiar filtros</button>}
    </div>
  )
}
