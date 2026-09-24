import { ArrowDownRight, ArrowUpRight, CalendarCheck2, ChevronRight, Goal, Plus, Sparkles } from 'lucide-react'
import { formatPlanMoney } from '../fixtures.js'
import { BudgetProgress, GoalProgress, GoalRow, MonthNavigator, PlanDemoBadge, PlanGentleNote, PurchaseAssessment, formatPlanDate } from '../components/PlanChrome.jsx'
import './metas-primero.css'

// Pone los objetivos de ahorro al frente y mantiene compromisos y presupuesto siempre a la vista.
export function MetasPrimero({ model, hidden, actions }) {
  const { month, budgetMinor, spentMinor, monthlyFreeMinor, goals, purchase, analysisVisible } = model
  const goal = goals[0]
  const remainingMinor = budgetMinor === null ? null : budgetMinor - spentMinor
  const goalPercent = goal ? Math.min(100, Math.round(goal.reservedMinor / goal.targetMinor * 100)) : 0
  return <div className="plan-variant plan-metas">
    <header className="plan-page-heading"><div><span className="plan-eyebrow">LO QUE ESTÁS CONSTRUYENDO</span><h1>Metas y plan</h1><p>Cuida el hoy mientras avanzas hacia lo que quieres.</p></div><PlanDemoBadge /></header>
    <div className="plan-metas__month"><MonthNavigator month={month} onChange={actions.shiftMonth} /></div>

    <section className="plan-metas__hero">
      <div className="plan-metas__hero-copy"><span className="plan-metas__goal-kicker"><Goal aria-hidden="true" /> META PRINCIPAL</span>
        {goal ? <><h2>{goal.name}</h2><p>Tu objetivo crece con pasos que puedes sostener.</p><div className="plan-metas__saved"><strong>{formatPlanMoney(goal.reservedMinor, hidden)}</strong><span>de {formatPlanMoney(goal.targetMinor, hidden)}</span><small>{goalPercent}% del objetivo</small></div><GoalProgress goal={goal} hidden={hidden} /><button type="button" className="plan-primary-action" onClick={() => actions.reserve(goal)}><Plus aria-hidden="true" />Apartar a esta meta</button></> : <><h2>Tu próxima historia empieza aquí.</h2><p>Elige un objetivo y dale su propio espacio.</p><button type="button" className="plan-primary-action" onClick={actions.newGoal}><Plus aria-hidden="true" />Crear una meta</button></>}
      </div>
      <div className="plan-metas__image-wrap"><img src="/assets/illustrations/night-companions-480.webp" alt="" width="480" height="320" /></div>
      <div className="plan-metas__milestone"><span><Sparkles aria-hidden="true" /></span><div><strong>Un avance a tu ritmo</strong><small>{goal?.dueDate ? `Fecha objetivo · ${formatPlanDate(goal.dueDate, true)}` : 'La fecha es opcional'}</small></div><span className="plan-metas__milestone-pct">{goalPercent}%</span></div>
    </section>

    <section className="plan-metas__budget-row">
      <section className="plan-panel plan-metas__budget">
        <div className="plan-section-heading"><div><span className="plan-eyebrow">ESTE MES · {model.monthLabel}</span><h2>Tu presupuesto</h2></div><button type="button" className="plan-icon-action" aria-label={budgetMinor === null ? 'Definir presupuesto' : 'Editar presupuesto'} onClick={actions.editBudget}><ArrowUpRight aria-hidden="true" /></button></div>
        <BudgetProgress spentMinor={spentMinor} limitMinor={budgetMinor} hidden={hidden} compact />
        <button type="button" className="plan-text-action" onClick={actions.editBudget}>{budgetMinor === null ? 'Definir límite' : 'Ajustar límite'}<ChevronRight aria-hidden="true" /></button>
      </section>
      <section className="plan-panel plan-metas__free">
        <span className="plan-eyebrow">DINERO LIBRE ESTIMADO</span><strong>{formatPlanMoney(monthlyFreeMinor, hidden)}</strong>
        <p><ArrowDownRight aria-hidden="true" />Ingreso mensual</p><p><ArrowUpRight aria-hidden="true" />Gastos fijos, deuda y gastos anotados</p>
      </section>
    </section>

    <section className="plan-metas__purchase plan-panel">
      <div className="plan-metas__purchase-icon"><CalendarCheck2 aria-hidden="true" /></div>
      <div className="plan-metas__purchase-copy"><span className="plan-eyebrow">PRÓXIMA COMPRA</span><h2>{purchase.name}</h2><p>{formatPlanMoney(purchase.amountMinor, hidden)} · para el {formatPlanDate(purchase.targetDate)}</p></div>
      <button type="button" className="plan-text-action" aria-expanded={analysisVisible} onClick={actions.evaluatePurchase}>{analysisVisible ? 'Cerrar' : 'Evaluar'}<ChevronRight aria-hidden="true" /></button>
      {analysisVisible && <PurchaseAssessment amountMinor={purchase.amountMinor} budgetRemainingMinor={remainingMinor} monthlyFreeMinor={monthlyFreeMinor} nextPayDate={model.nextPayDate} hidden={hidden} />}
    </section>

    {goals.length > 1 && <section className="plan-metas__other-goals"><div className="plan-section-heading"><div><span className="plan-eyebrow">TAMBIÉN IMPORTA</span><h2>Otras metas</h2></div><span className="plan-metas__other-count">{goals.length - 1}</span></div>{goals.slice(1).map((item) => <GoalRow key={item.id} goal={item} hidden={hidden} onReserve={actions.reserve} />)}</section>}

    <div className="plan-metas__footer"><PlanGentleNote>Una reserva organiza tu meta, pero no mueve dinero entre cuentas.</PlanGentleNote><button type="button" className="plan-secondary-action" onClick={actions.newGoal}><Plus aria-hidden="true" />{goal ? 'Otra meta' : 'Crear meta'}</button></div>
  </div>
}
