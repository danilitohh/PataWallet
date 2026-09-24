import { ArrowDownRight, ArrowUpRight, CalendarDays, Check, ChevronLeft, ChevronRight, CircleHelp, Goal, Sparkles, WalletCards } from 'lucide-react'
import { formatPlanMoney, formatPlanMonth, progressRatio } from '../fixtures.js'

// Señala con claridad que los cambios de esta pantalla de exploración no afectan datos del usuario.
export function PlanDemoBadge() {
  return <span className="plan-demo-badge"><span aria-hidden="true" /> Datos de ejemplo</span>
}

// Permite recorrer periodos con una fecha de ejemplo honesta y accesible.
export function MonthNavigator({ month, onChange }) {
  return <div className="plan-month-nav" aria-label="Mes del presupuesto">
    <button type="button" aria-label="Mes anterior" onClick={() => onChange(-1)}><ChevronLeft aria-hidden="true" /></button>
    <span>{formatPlanMonth(month)}</span>
    <button type="button" aria-label="Mes siguiente" onClick={() => onChange(1)}><ChevronRight aria-hidden="true" /></button>
  </div>
}

// Presenta usado, límite y excedente sin esconder valores mayores al presupuesto.
export function BudgetProgress({ spentMinor, limitMinor, hidden = false, compact = false }) {
  if (!limitMinor) return <div className={`plan-budget-empty ${compact ? 'plan-budget-empty--compact' : ''}`}>
    <span className="plan-budget-empty__icon"><WalletCards aria-hidden="true" /></span>
    <div><strong>Este mes aún no tiene un límite</strong><small>Define un presupuesto para seguirlo aquí.</small></div>
  </div>

  const percentage = (spentMinor / limitMinor) * 100
  const remaining = limitMinor - spentMinor
  const rounded = Math.round(percentage)

  return <div className={`plan-budget-progress ${compact ? 'plan-budget-progress--compact' : ''}`}>
    <div className="plan-budget-progress__labels"><span>Presupuesto usado</span><strong>{rounded}%</strong></div>
    <div className="plan-meter" role="progressbar" aria-label={`${rounded}% del presupuesto usado`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.min(100, rounded)}>
      <span style={{ transform: `scaleX(${progressRatio(spentMinor, limitMinor)})` }} />
    </div>
    <div className="plan-budget-progress__figures"><span><b>{formatPlanMoney(spentMinor, hidden)}</b> gastados</span><span>de {formatPlanMoney(limitMinor, hidden)}</span></div>
    <p className={remaining < 0 ? 'is-over-budget' : ''}>{remaining < 0 ? `Superaste el límite por ${formatPlanMoney(Math.abs(remaining), hidden)}.` : `Te quedan ${formatPlanMoney(remaining, hidden)} de presupuesto.`}</p>
  </div>
}

// Explica la evaluación de una compra con presupuesto y dinero libre calculados aparte.
export function PurchaseAssessment({ amountMinor, budgetRemainingMinor, monthlyFreeMinor, nextPayDate, hidden = false }) {
  const freeAfter = monthlyFreeMinor - amountMinor
  const budgetAfter = budgetRemainingMinor === null ? null : budgetRemainingMinor - amountMinor
  const recommended = freeAfter > 0 && (budgetAfter === null || budgetAfter > 0)
  return <div className={`plan-purchase-assessment ${recommended ? 'plan-purchase-assessment--good' : 'plan-purchase-assessment--careful'}`} role="status">
    <span className="plan-purchase-assessment__icon">{recommended ? <Check aria-hidden="true" /> : <CircleHelp aria-hidden="true" />}</span>
    <div><strong>{recommended ? 'Según estos datos, sí cabe.' : 'Conviene revisar esta compra.'}</strong>
      <p>{freeAfter <= 0 ? `Después te faltarían ${formatPlanMoney(Math.abs(freeAfter), hidden)} de dinero libre.` : `Quedarían ${formatPlanMoney(freeAfter, hidden)} libres${budgetAfter === null ? '.' : ` y ${budgetAfter < 0 ? `excederías el presupuesto en ${formatPlanMoney(Math.abs(budgetAfter), hidden)}.` : `${formatPlanMoney(budgetAfter, hidden)} del presupuesto.`}`}`}</p>
      <small>{nextPayDate ? `Estimación de ejemplo · próximo pago: ${formatPlanDate(nextPayDate)}` : 'Estimación de ejemplo · fecha del próximo pago sin definir'}</small>
    </div>
  </div>
}

// Resume los compromisos que se usan para estimar dinero libre, sin confundirlos con el presupuesto.
export function CommitmentSummary({ salaryMinor, fixedMinor, debtMinor, hidden = false, compact = false }) {
  return <div className={`plan-commitments ${compact ? 'plan-commitments--compact' : ''}`}>
    <div><span className="plan-commitments__icon plan-commitments__icon--mint"><ArrowDownRight aria-hidden="true" /></span><span><small>Ingreso mensual</small><strong>{formatPlanMoney(salaryMinor, hidden)}</strong></span></div>
    <div><span className="plan-commitments__icon plan-commitments__icon--peach"><ArrowUpRight aria-hidden="true" /></span><span><small>Gastos fijos</small><strong>{formatPlanMoney(fixedMinor, hidden)}</strong></span></div>
    <div><span className="plan-commitments__icon plan-commitments__icon--violet"><CalendarDays aria-hidden="true" /></span><span><small>Pagos de deuda</small><strong>{formatPlanMoney(debtMinor, hidden)}</strong></span></div>
  </div>
}

// Muestra una señal amable de organización sin sugerir juicios sobre las decisiones de gasto.
export function PlanGentleNote({ children = 'Tu plan se adapta a tu vida, paso a paso.' }) {
  return <p className="plan-gentle-note"><Sparkles aria-hidden="true" />{children}</p>
}

// Presenta gastos de forma compacta dentro de la lectura editorial.
export function SpendCategoryRow({ category, spentMinor, limitMinor, hidden = false }) {
  const percent = limitMinor ? Math.round((spentMinor / limitMinor) * 100) : 0
  return <div className="plan-spend-row">
    <span className={`plan-spend-dot plan-spend-dot--${category.tone}`} aria-hidden="true" />
    <span className="plan-spend-row__name">{category.label}</span>
    <span className="plan-spend-row__amount">{formatPlanMoney(spentMinor, hidden)}</span>
    <small>{percent}%</small>
  </div>
}

// Calcula progreso de meta con un máximo visual de 100 %, dejando el importe real visible.
export function GoalProgress({ goal, hidden = false, compact = false }) {
  const percent = goal.targetMinor > 0 ? Math.round((goal.reservedMinor / goal.targetMinor) * 100) : 0
  return <div className={`plan-goal-progress ${compact ? 'plan-goal-progress--compact' : ''}`}>
    <div className="plan-goal-progress__bar" role="progressbar" aria-label={`${percent}% de la meta ${goal.name}`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.min(100, percent)}><span style={{ transform: `scaleX(${progressRatio(goal.reservedMinor, goal.targetMinor)})` }} /></div>
    <p><strong>{formatPlanMoney(goal.reservedMinor, hidden)}</strong><span>de {formatPlanMoney(goal.targetMinor, hidden)}</span></p>
  </div>
}

// Mantiene cada meta visible y ofrece su propia acción de reserva en todas las composiciones.
export function GoalRow({ goal, hidden = false, onReserve }) {
  const isComplete = goal.reservedMinor >= goal.targetMinor
  return <article className={`plan-goal-row ${isComplete ? 'plan-goal-row--complete' : ''}`}>
    <span className="plan-goal-row__icon"><Goal aria-hidden="true" /></span>
    <div className="plan-goal-row__body">
      <div className="plan-goal-row__heading"><strong>{goal.name}</strong><small>{goal.dueDate ? formatPlanDate(goal.dueDate, true) : 'Sin fecha objetivo'}</small></div>
      <GoalProgress goal={goal} hidden={hidden} compact />
    </div>
    <button type="button" className="plan-goal-row__action" disabled={isComplete} aria-label={isComplete ? `${goal.name}: meta cumplida` : `Apartar dinero para ${goal.name}`} onClick={() => onReserve(goal)}>{isComplete ? 'Lista' : 'Apartar'}</button>
  </article>
}

// Da formato a una fecha de compra de ejemplo sin desplazar el día por zona horaria.
export function formatPlanDate(date, includeYear = false) {
  const [year, month, day] = date.split('-').map(Number)
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', ...(includeYear ? { year: 'numeric' } : {}), timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, month - 1, day, 12)))
}
