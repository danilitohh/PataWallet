import { currentMonth } from '../../../shared/lib/date.js'

const MONTH_PATTERN = /^(\d{4})-(\d{2})$/

// Valida el mes antes de usarlo para navegar o formatear el período de Actividad.
function parseActivityMonth(month) {
  const match = MONTH_PATTERN.exec(month)
  if (!match || Number(match[2]) < 1 || Number(match[2]) > 12) {
    throw new RangeError('El mes de actividad no es válido.')
  }
  return { year: Number(match[1]), monthIndex: Number(match[2]) - 1 }
}

// Empieza la cronología en el mes actual de Bogotá, coherente con el resto de la app.
export function initialActivityMonth() {
  return currentMonth()
}

// Navega entre meses con aritmética UTC para evitar cambios de fecha por horario local.
export function shiftActivityMonth(month, offset) {
  const { year, monthIndex } = parseActivityMonth(month)
  if (!Number.isSafeInteger(offset)) throw new RangeError('El desplazamiento del mes no es válido.')
  const next = new Date(Date.UTC(year, monthIndex + offset, 1))
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}`
}

// Presenta el período en español sin depender de la zona horaria del dispositivo.
export function activityMonthLabel(month) {
  const { year, monthIndex } = parseActivityMonth(month)
  const date = new Date(Date.UTC(year, monthIndex, 15, 12))
  const label = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date)
  return label.charAt(0).toLocaleUpperCase('es-CO') + label.slice(1)
}
