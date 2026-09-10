import { useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { Goal, Pencil, Plus, Trash2 } from 'lucide-react'
import { useApp } from '../../app/AppContext.jsx'
import { PetScene } from '../../components/PetScene.jsx'
import { db } from '../../data/db.js'
import { calculateSummary, goalProgress } from '../../domain/finance.js'
import { formatMinor } from '../../domain/money.js'
import { PageHeader } from '../../shared/components/PageHeader.jsx'
import { Progress } from '../../shared/components/Progress.jsx'
import { SimpleDialog } from '../../shared/components/Modal.jsx'
import { currentMonth } from '../../shared/lib/date.js'
import { AllocationDialog, BudgetDialog, GoalDialog } from './components/PlanningDialogs.jsx'
import { BudgetRing } from './components/BudgetRing.jsx'

export function PlanPage() {
  const { accounts, transactions, budgets, goals, allocations, settings, notify } = useApp()
  const month = currentMonth()
  const summary = calculateSummary(accounts, transactions, month)
  const budget = budgets.find((item) => item.month === month) || budgets[0]
  const [budgetOpen, setBudgetOpen] = useState(false)
  const [goalOpen, setGoalOpen] = useState(false)
  const [allocationGoal, setAllocationGoal] = useState(null)
  const [celebration, setCelebration] = useState(false)
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
        <div className="section-heading"><div><h2>Metas</h2><p>Las reservas son organización interna.</p></div><button className="button button--quiet" onClick={() => setGoalOpen(true)}><Plus /> Nueva meta</button></div>
        <div className="goals-grid">{goals.map((goal) => {
          const progress = goalProgress(goal, allocations)
          return <article className="goal-card" key={goal.id}><div className="goal-card__top"><span className="goal-icon"><Goal /></span><button className="icon-button icon-button--small" aria-label={`Eliminar meta ${goal.name}`} onClick={async () => { const related = allocations.filter((item) => item.goal_id === goal.id); await db.transaction('rw', db.goals, db.allocations, async () => { await db.goals.delete(goal.id); await db.allocations.bulkDelete(related.map((item) => item.id)) }); notify('Meta eliminada') }}><Trash2 /></button></div><h3>{goal.name}</h3><p>{formatMinor(progress.reserved, 'COP', settings.hiddenAmounts)} de {formatMinor(goal.target_minor, 'COP', settings.hiddenAmounts)}</p><Progress value={progress.percent} label={`${Math.round(progress.percent)}% completado`} /><button className="button button--secondary" onClick={() => setAllocationGoal(goal)}>Reservar dinero</button></article>
        })}</div>
      </section>
      <AnimatePresence>{budgetOpen && <BudgetDialog budget={budget} month={month} close={() => setBudgetOpen(false)} />}</AnimatePresence>
      <AnimatePresence>{goalOpen && <GoalDialog close={() => setGoalOpen(false)} />}</AnimatePresence>
      <AnimatePresence>{allocationGoal && <AllocationDialog goal={allocationGoal} close={() => setAllocationGoal(null)} onComplete={() => setCelebration(true)} />}</AnimatePresence>
      <AnimatePresence>{celebration && <SimpleDialog title="Meta cumplida" close={() => setCelebration(false)}><div className="celebration"><PetScene name="success" /><h3>Lo lograste</h3><p>La reserva alcanzó el objetivo de esta meta.</p><button className="button button--primary" onClick={() => setCelebration(false)}>Continuar</button></div></SimpleDialog>}</AnimatePresence>
    </div>
  )
}
