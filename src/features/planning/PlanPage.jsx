import { useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { ArrowDownRight, ArrowUpRight, CalendarDays, CalendarClock, Pencil, Plus, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useApp } from '../../app/AppContext.jsx'
import { calculateAvailableMoney, calculateSummary, goalProgress } from '../../domain/finance.js'
import { readFixedExpenses } from '../../domain/financialSetup.js'
import { formatMinor, safeAdd } from '../../domain/money.js'
import { assessPlannedPurchase } from '../../domain/plannedPurchases.js'
import { PageHeader } from '../../shared/components/PageHeader.jsx'
import { Progress } from '../../shared/components/Progress.jsx'
import { SimpleDialog } from '../../shared/components/Modal.jsx'
import { currentMonth } from '../../shared/lib/date.js'
import { AllocationDialog, BudgetDialog, GoalDialog } from './components/PlanningDialogs.jsx'
import { PlanGoalFeature, PlanGoalRow } from './components/PlanGoalFeatures.jsx'
import { PlanPurchaseCard } from './components/PlanPurchaseCard.jsx'
import { PlannedPurchaseDialog } from './components/PlannedPurchaseDialog.jsx'
import { incomeReference } from '../settings/model/incomeSources.js'

// Pone la meta al frente y conserva los cálculos, formularios y acciones financieras de Plan.
export function PlanPage() {
  const { accounts, transactions, budgets, goals, allocations, plannedPurchases, settings, notify, actions } = useApp()
  const month = currentMonth()
  const monthLabel = formatPlanMonth(month)
  const summary = calculateSummary(accounts, transactions, month)
  const income = incomeReference(settings, accounts)
  const available = calculateAvailableMoney({
    monthlySalaryMinor: income.salaryMinor,
    fixedExpenses: readFixedExpenses(settings.fixedExpenses),
    accounts,
    transactions,
    month,
    payFrequency: income.primary?.frequency,
    nextPayDate: income.primary?.next_pay_date,
  })
  const budget = budgets.find((item) => item.month === month)
  const featuredGoal = goals[0] || null
  const featuredProgress = featuredGoal ? goalProgress(featuredGoal, allocations) : null
  const otherGoals = goals.slice(1)
  const activePurchases = plannedPurchases
    .filter((item) => item.status === 'planned')
    .sort((left, right) => left.target_date.localeCompare(right.target_date))
  const assetAccounts = accounts.filter((account) => account.kind === 'asset' && !account.archived)
  const liquidAssetsMinor = assetAccounts.length
    ? assetAccounts.reduce((total, account) => safeAdd(total, Number(summary.balances[account.id] || 0)), 0)
    : null
  const reservedMinor = allocations.reduce((total, allocation) => safeAdd(total, Number(allocation.amount_minor)), 0)
  const budgetLimitMinor = budget?.limit_minor || null
  const budgetUsedPercent = budgetLimitMinor ? (summary.expenses / budgetLimitMinor) * 100 : 0

  const [budgetOpen, setBudgetOpen] = useState(false)
  const [goalOpen, setGoalOpen] = useState(false)
  const [allocationGoal, setAllocationGoal] = useState(null)
  const [celebration, setCelebration] = useState(false)
  const [plannedOpen, setPlannedOpen] = useState(null)
  const [expandedAssessment, setExpandedAssessment] = useState(null)

  // Elimina la meta con sus reservas usando la acción ya persistida por el contexto.
  const deleteGoal = async (goal) => {
    const related = allocations.filter((item) => item.goal_id === goal.id)
    await actions.deleteGoal(goal.id, related.map((item) => item.id))
    notify('Meta eliminada')
  }

  // Elimina una compra futura solo después de confirmar la acción destructiva.
  const deletePlannedPurchase = async (purchase) => {
    if (!window.confirm(`¿Eliminar la compra prevista “${purchase.name}”?`)) return
    await actions.deletePlannedPurchase(purchase.id)
    notify('Compra prevista eliminada')
  }

  // Cambia la visibilidad del análisis únicamente para la compra seleccionada.
  const toggleAssessment = (purchaseId) => {
    setExpandedAssessment((current) => current === purchaseId ? null : purchaseId)
  }

  return (
    <div className="route-stack plan-page">
      <div className="plan-page__intro">
        <span className="plan-eyebrow">Lo que estás construyendo</span>
        <PageHeader
          title="Metas y plan"
          subtitle="Cuida el hoy mientras avanzas hacia lo que quieres."
          action={<div className="plan-current-period" aria-label={`Periodo actual: ${monthLabel}`}><CalendarDays aria-hidden="true" /><span>{monthLabel}</span></div>}
        />
      </div>

      <PlanGoalFeature
        goal={featuredGoal}
        progress={featuredProgress}
        hidden={settings.hiddenAmounts}
        onReserve={() => setAllocationGoal(featuredGoal)}
        onCreate={setGoalOpen}
        onDelete={deleteGoal}
      />

      <section className="plan-overview-grid" aria-label="Presupuesto y dinero libre">
        <BudgetOverview
          monthLabel={monthLabel}
          spentMinor={summary.expenses}
          limitMinor={budgetLimitMinor}
          percent={budgetUsedPercent}
          hidden={settings.hiddenAmounts}
          onEdit={() => setBudgetOpen(true)}
        />
        <AvailablePlanSummary available={available} hidden={settings.hiddenAmounts} />
      </section>

      <section className="plan-purchases" aria-labelledby="plan-purchases-title">
        <div className="section-heading">
          <div><h2 id="plan-purchases-title">Próximas compras</h2><p>Revísalas antes de comprometer ese dinero.</p></div>
          <button className="button button--quiet" type="button" onClick={() => setPlannedOpen('new')}><Plus aria-hidden="true" /> Agregar</button>
        </div>
        {activePurchases.length ? <div className="plan-purchase-list">
          {activePurchases.map((purchase, index) => {
            const assessment = assessPlannedPurchase({
              amountMinor: purchase.amount_minor,
              budgetLimitMinor,
              monthlyExpensesMinor: summary.expenses,
              liquidAssetsMinor,
              reservedMinor,
              monthlyFreeMinor: available.monthlyFreeMinor,
              nextPayDate: income.primary?.next_pay_date || null,
            })
            return <PlanPurchaseCard
              key={purchase.id}
              purchase={purchase}
              featured={index === 0}
              hidden={settings.hiddenAmounts}
              assessment={assessment}
              expanded={expandedAssessment === purchase.id}
              onToggle={() => toggleAssessment(purchase.id)}
              onEdit={() => setPlannedOpen(purchase)}
              onDelete={() => deletePlannedPurchase(purchase)}
            />
          })}
        </div> : <div className="empty-inline"><CalendarClock aria-hidden="true" /><p>Aún no has anotado compras futuras.</p></div>}
      </section>

      {otherGoals.length > 0 && <section className="plan-other-goals" aria-labelledby="plan-other-goals-title">
        <div className="section-heading">
          <div><span className="plan-eyebrow">También importa</span><h2 id="plan-other-goals-title">Otras metas</h2></div>
          <span className="plan-other-goals__count" aria-label={`${otherGoals.length} metas adicionales`}>{otherGoals.length}</span>
        </div>
        <div className="plan-goal-list">{otherGoals.map((goal) => <PlanGoalRow
          key={goal.id}
          goal={goal}
          progress={goalProgress(goal, allocations)}
          hidden={settings.hiddenAmounts}
          onReserve={() => setAllocationGoal(goal)}
          onDelete={deleteGoal}
        />)}</div>
      </section>}

      <footer className="plan-page__footer">
        <p><Sparkles aria-hidden="true" /> Una reserva organiza tu meta, pero no mueve dinero entre cuentas.</p>
        {featuredGoal && <button className="button button--secondary" type="button" onClick={() => setGoalOpen(true)}><Plus aria-hidden="true" /> Otra meta</button>}
      </footer>

      <AnimatePresence>{budgetOpen && <BudgetDialog budget={budget} month={month} close={() => setBudgetOpen(false)} />}</AnimatePresence>
      <AnimatePresence>{goalOpen && <GoalDialog close={() => setGoalOpen(false)} />}</AnimatePresence>
      <AnimatePresence>{allocationGoal && <AllocationDialog goal={allocationGoal} close={() => setAllocationGoal(null)} onComplete={() => setCelebration(true)} />}</AnimatePresence>
      <AnimatePresence>{celebration && <SimpleDialog title="Meta cumplida" close={() => setCelebration(false)}><div className="celebration"><h3>Lo lograste</h3><p>La reserva alcanzó el objetivo de esta meta.</p><button className="button button--primary" onClick={() => setCelebration(false)}>Continuar</button></div></SimpleDialog>}</AnimatePresence>
      <AnimatePresence>{plannedOpen && <PlannedPurchaseDialog purchase={plannedOpen === 'new' ? null : plannedOpen} close={() => setPlannedOpen(null)} />}</AnimatePresence>
    </div>
  )
}

// Muestra avance presupuestal neto y mantiene visible el límite que el usuario puede editar.
function BudgetOverview({ monthLabel, spentMinor, limitMinor, percent, hidden, onEdit }) {
  const hasLimit = Number.isSafeInteger(Number(limitMinor)) && Number(limitMinor) > 0
  const remainingMinor = hasLimit ? limitMinor - spentMinor : null

  return <section className="plan-panel plan-budget" aria-labelledby="plan-budget-title">
    <div className="plan-panel__heading">
      <div><span className="plan-eyebrow">Este mes · {monthLabel}</span><h2 id="plan-budget-title">Tu presupuesto</h2></div>
      <button className="icon-button" type="button" aria-label={hasLimit ? 'Editar presupuesto' : 'Definir presupuesto'} onClick={onEdit}><Pencil aria-hidden="true" /></button>
    </div>
    {hasLimit ? <>
      <Progress value={Math.max(0, percent)} label="Presupuesto usado" />
      <div className="plan-budget__amounts"><span>{formatMinor(spentMinor, 'COP', hidden)} gasto neto</span><span>de {formatMinor(limitMinor, 'COP', hidden)}</span></div>
      <p className={`plan-budget__status ${remainingMinor < 0 ? 'plan-budget__status--over' : ''}`}>
        {remainingMinor < 0 ? `Superaste el límite por ${formatMinor(Math.abs(remainingMinor), 'COP', hidden)}.` : `Te quedan ${formatMinor(remainingMinor, 'COP', hidden)} de presupuesto.`}
      </p>
      <button className="plan-text-action" type="button" onClick={onEdit}>Ajustar límite <Pencil aria-hidden="true" /></button>
    </> : <div className="plan-budget__empty"><p>Este mes aún no tiene un límite.</p><button className="plan-text-action" type="button" onClick={onEdit}>Definir presupuesto <Plus aria-hidden="true" /></button></div>}
  </section>
}

// Distingue el disponible estimado de los activos y explica qué compromisos ya descuenta.
function AvailablePlanSummary({ available, hidden }) {
  if (available.availableNowMinor === null) return <section className="plan-panel plan-free plan-free--setup">
    <span className="plan-eyebrow">Dinero libre estimado</span>
    <h2>Completa tu punto de partida</h2>
    <p>Agrega ingresos y gastos fijos en <Link to="/cuentas" aria-label="Configurar ingresos y gastos en Cuentas">Cuentas</Link> para calcular cuánto margen tienes este mes.</p>
  </section>

  const committedAndSpentMinor = safeAdd(available.salaryMinor, -available.availableNowMinor)
  const isNegative = available.availableNowMinor < 0
  return <section className={`plan-panel plan-free ${isNegative ? 'plan-free--warning' : ''}`} aria-labelledby="plan-free-title">
    <span className="plan-eyebrow" id="plan-free-title">Dinero libre estimado</span>
    <strong className="plan-free__amount">{formatMinor(available.availableNowMinor, 'COP', hidden)}</strong>
    <div className="plan-free__breakdown">
      <p><ArrowDownRight aria-hidden="true" /><span>Ingreso mensual previsto</span><strong>{formatMinor(available.salaryMinor, 'COP', hidden)}</strong></p>
      <p><ArrowUpRight aria-hidden="true" /><span>Compromisos y gastos anotados</span><strong>{formatMinor(committedAndSpentMinor, 'COP', hidden)}</strong></p>
    </div>
    <small>Incluye gastos fijos, pagos de deuda y gastos netos registrados este mes; no es el saldo de tus cuentas.</small>
  </section>
}

// Formatea el periodo sin desplazar el mes por diferencias entre UTC y la zona del dispositivo.
function formatPlanMonth(month) {
  return new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${month}-15T12:00:00Z`))
}
