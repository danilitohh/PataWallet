import { useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { CalendarClock, Goal, Pencil, Plus, Trash2 } from 'lucide-react'
import { useApp } from '../../app/AppContext.jsx'
import { PetScene } from '../../components/PetScene.jsx'
import { calculateSummary, goalProgress } from '../../domain/finance.js'
import { formatMinor } from '../../domain/money.js'
import { assessPlannedPurchase } from '../../domain/plannedPurchases.js'
import { PageHeader } from '../../shared/components/PageHeader.jsx'
import { Progress } from '../../shared/components/Progress.jsx'
import { SimpleDialog } from '../../shared/components/Modal.jsx'
import { currentMonth } from '../../shared/lib/date.js'
import { AllocationDialog, BudgetDialog, GoalDialog } from './components/PlanningDialogs.jsx'
import { BudgetRing } from './components/BudgetRing.jsx'
import { PlannedPurchaseDialog } from './components/PlannedPurchaseDialog.jsx'

export function PlanPage() {
  const { accounts, transactions, budgets, goals, allocations, plannedPurchases, settings, notify, actions } = useApp()
  const month = currentMonth()
  const summary = calculateSummary(accounts, transactions, month)
  const budget = budgets.find((item) => item.month === month) || budgets[0]
  const [budgetOpen, setBudgetOpen] = useState(false)
  const [goalOpen, setGoalOpen] = useState(false)
  const [allocationGoal, setAllocationGoal] = useState(null)
  const [celebration, setCelebration] = useState(false)
  const [plannedOpen, setPlannedOpen] = useState(null)
  const used = budget?.limit_minor ? (summary.expenses / budget.limit_minor) * 100 : 0

  return (
    <div className="route-stack">
      <PageHeader title="Tu plan" subtitle="Presupuesto y metas, sin mover dinero del banco." />
      <section className="feature-panel plan-hero">
        <div className="plan-hero__heading"><span className="eyebrow">Presupuesto de {new Intl.DateTimeFormat('es-CO', { month: 'long' }).format(new Date(`${month}-15T12:00:00`))}</span><h2>Tu presupuesto</h2></div>
        <div className="plan-hero__metric"><BudgetRing value={used} /><div><span>Has usado</span><strong>{formatMinor(summary.expenses, 'COP', settings.hiddenAmounts)}</strong><small>de {formatMinor(budget?.limit_minor || 0, 'COP', settings.hiddenAmounts)}</small><p>{budget && budget.limit_minor - summary.expenses >= 0 ? `Te quedan ${formatMinor(budget.limit_minor - summary.expenses, 'COP', settings.hiddenAmounts)}.` : `Superaste el límite por ${formatMinor(summary.expenses - (budget?.limit_minor || 0), 'COP', settings.hiddenAmounts)}.`}</p></div></div>
        <PetScene name="budget" />
        <button className="button button--secondary" onClick={() => setBudgetOpen(true)}><Pencil /> Editar límite</button>
      </section>
      <section>
        <div className="section-heading"><div><h2>Próximas compras</h2><p>Evalúa una compra antes de convertirla en gasto.</p></div><button className="button button--quiet" onClick={() => setPlannedOpen('new')}><Plus /> Agregar</button></div>
        <div className="planned-grid">{plannedPurchases.filter((item) => item.status === 'planned').map((item) => {
          const reserved = allocations.reduce((sum, row) => sum + Number(row.amount_minor), 0)
          const liquidAssets = accounts.filter((row) => row.kind === 'asset').reduce((sum, row) => sum + Number(summary.balances[row.id] || 0), 0)
          const assessment = assessPlannedPurchase({ amountMinor: item.amount_minor, budgetLimitMinor: budget?.limit_minor || null, monthlyExpensesMinor: summary.expenses, liquidAssetsMinor: liquidAssets, reservedMinor: reserved })
          const message = assessment.kind === 'unknown' ? assessment.message : assessment.kind === 'good' ? `Cabe en el presupuesto y en tus fondos registrados después de reservas.` : assessment.reason === 'funds' ? `Faltarían ${formatMinor(assessment.shortfall, 'COP', settings.hiddenAmounts)} en fondos registrados después de reservas.` : `Supera el presupuesto mensual restante por ${formatMinor(assessment.shortfall, 'COP', settings.hiddenAmounts)}.`
          return <article className="planned-card" key={item.id}><span className="goal-icon"><CalendarClock /></span><div><h3>{item.name}</h3><p>{formatMinor(item.amount_minor, 'COP', settings.hiddenAmounts)} · {new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${item.target_date}T12:00:00Z`))}</p><strong className={assessment.kind === 'good' ? 'advice advice--good' : 'advice'}>{message}</strong></div><div className="planned-card__actions"><button className="icon-button icon-button--small" aria-label={`Editar ${item.name}`} onClick={() => setPlannedOpen(item)}><Pencil /></button><button className="icon-button icon-button--small" aria-label={`Eliminar ${item.name}`} onClick={async () => { if (!confirm('¿Eliminar esta compra prevista?')) return; await actions.deletePlannedPurchase(item.id); notify('Compra prevista eliminada') }}><Trash2 /></button></div></article>
        })}{!plannedPurchases.some((item) => item.status === 'planned') && <div className="empty-inline"><CalendarClock /><p>Aún no has anotado compras futuras.</p></div>}</div>
      </section>
      <section>
        <div className="section-heading"><div><h2>Metas</h2><p>Las reservas son organización interna.</p></div><button className="button button--quiet" onClick={() => setGoalOpen(true)}><Plus /> Nueva meta</button></div>
        <div className="goals-grid">{goals.map((goal) => {
          const progress = goalProgress(goal, allocations)
          return <article className="goal-card" key={goal.id}><div className="goal-card__top"><span className="goal-icon"><Goal /></span><button className="icon-button icon-button--small" aria-label={`Eliminar meta ${goal.name}`} onClick={async () => { const related = allocations.filter((item) => item.goal_id === goal.id); await actions.deleteGoal(goal.id, related.map((item) => item.id)); notify('Meta eliminada') }}><Trash2 /></button></div><h3>{goal.name}</h3><p>{formatMinor(progress.reserved, 'COP', settings.hiddenAmounts)} de {formatMinor(goal.target_minor, 'COP', settings.hiddenAmounts)}</p><Progress value={progress.percent} label={`${Math.round(progress.percent)}% completado`} /><p className="goal-card__hint">Aparta una parte de una cuenta para seguir el avance. No mueve dinero ni crea un gasto.</p><button className="button button--secondary" onClick={() => setAllocationGoal(goal)}>Reservar dinero</button></article>
        })}</div>
      </section>
      <AnimatePresence>{budgetOpen && <BudgetDialog budget={budget} month={month} close={() => setBudgetOpen(false)} />}</AnimatePresence>
      <AnimatePresence>{goalOpen && <GoalDialog close={() => setGoalOpen(false)} />}</AnimatePresence>
      <AnimatePresence>{allocationGoal && <AllocationDialog goal={allocationGoal} close={() => setAllocationGoal(null)} onComplete={() => setCelebration(true)} />}</AnimatePresence>
      <AnimatePresence>{celebration && <SimpleDialog title="Meta cumplida" close={() => setCelebration(false)}><div className="celebration"><PetScene name="success" /><h3>Lo lograste</h3><p>La reserva alcanzó el objetivo de esta meta.</p><button className="button button--primary" onClick={() => setCelebration(false)}>Continuar</button></div></SimpleDialog>}</AnimatePresence>
      <AnimatePresence>{plannedOpen && <PlannedPurchaseDialog purchase={plannedOpen === 'new' ? null : plannedOpen} close={() => setPlannedOpen(null)} />}</AnimatePresence>
    </div>
  )
}
