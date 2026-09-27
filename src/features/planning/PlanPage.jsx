import { useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { ArrowDownRight, ArrowUpRight, CalendarClock, Eye, EyeOff, Pencil, Plus } from 'lucide-react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useApp } from '../../app/AppContext.jsx'
import { calculateRecordedMoney, calculateSummary, goalProgress } from '../../domain/finance.js'
import { readFixedExpenses } from '../../domain/financialSetup.js'
import { formatMinor, safeAdd } from '../../domain/money.js'
import { assessPlannedPurchase } from '../../domain/plannedPurchases.js'
import { PageHeader } from '../../shared/components/PageHeader.jsx'
import { Progress } from '../../shared/components/Progress.jsx'
import { SimpleDialog } from '../../shared/components/Modal.jsx'
import { currentMonth } from '../../shared/lib/date.js'
import { AllocationDialog, BudgetDialog, GoalDialog } from './components/PlanningDialogs.jsx'
import { PlanGoalRow } from './components/PlanGoalFeatures.jsx'
import { PlanPurchaseCard } from './components/PlanPurchaseCard.jsx'
import { PlannedPurchaseDialog } from './components/PlannedPurchaseDialog.jsx'
import { incomeReference } from '../settings/model/incomeSources.js'

// Pone la meta al frente y conserva los cálculos, formularios y acciones financieras de Plan.
export function PlanPage() {
  const { accounts, transactions, budgets, goals, allocations, plannedPurchases, settings, notify, actions, isDemo, guideOpen } = useApp()
  const location = useLocation()
  const showingBudget = location.pathname === '/plan/presupuesto'
  const month = currentMonth()
  const monthLabel = formatPlanMonth(month)
  const summary = calculateSummary(accounts, transactions, month)
  const income = incomeReference(settings, accounts)
  const cash = calculateRecordedMoney({
    fixedExpenses: readFixedExpenses(settings.fixedExpenses),
    accounts,
    transactions,
    allocations,
    payFrequency: settings.payFrequency || income.primary?.frequency,
    nextPayDate: settings.nextPayDate || income.primary?.next_pay_date,
  })
  const budget = budgets.find((item) => item.month === month)
  const activePurchases = plannedPurchases
    .filter((item) => item.status === 'planned')
    .sort((left, right) => left.target_date.localeCompare(right.target_date))
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
      <PageHeader title="Plan" subtitle="Tus metas, paso a paso." action={isDemo && <span className="calm-demo">Datos de ejemplo</span>} />
      <nav className="calm-tabs" aria-label="Secciones de Plan"><NavLink to="/plan" end>Metas</NavLink><NavLink to="/plan/presupuesto">Presupuesto</NavLink></nav>
      <section className="calm-goals" hidden={showingBudget && !guideOpen}>
        <div className="calm-goal-balance"><div className="calm-balance-label"><span>Reservado para tus metas</span><button className="icon-button" aria-label={settings.hiddenAmounts ? 'Mostrar montos' : 'Ocultar montos'} onClick={() => actions.setSetting('hiddenAmounts', !settings.hiddenAmounts)}>{settings.hiddenAmounts ? <EyeOff /> : <Eye />}</button></div><strong className="calm-balance">{formatMinor(cash.reservedMinor, 'COP', settings.hiddenAmounts)}</strong><p>Parte de tu saldo, no dinero adicional.</p></div>
        <button className="button button--primary calm-primary plan-featured-goal__action" onClick={() => setGoalOpen(true)}><Plus aria-hidden="true" /> Crear meta</button>
        <div className="section-heading"><h2>Metas activas</h2><span className="helper">{goals.length} {goals.length === 1 ? 'meta' : 'metas'}</span></div>
        <div className="plan-goal-list">{goals.map((goal) => <PlanGoalRow key={goal.id} goal={goal} progress={goalProgress(goal, allocations)} hidden={settings.hiddenAmounts} onReserve={() => setAllocationGoal(goal)} onDelete={deleteGoal} />)}</div>
        {!goals.length && <p className="helper">Aún no tienes metas. Crea la primera cuando quieras.</p>}
      </section>

      <section className="plan-overview-grid" aria-label="Presupuesto y dinero libre">
        <BudgetOverview
          monthLabel={monthLabel}
          spentMinor={summary.expenses}
          limitMinor={budgetLimitMinor}
          percent={budgetUsedPercent}
          hidden={settings.hiddenAmounts}
          onEdit={() => setBudgetOpen(true)}
        />
      </section>

      <details className="calm-details calm-planning-details" open={guideOpen || showingBudget}><summary>Compras previstas y margen disponible</summary>
      <AvailablePlanSummary cash={cash} hidden={settings.hiddenAmounts} />
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
              liquidAssetsMinor: cash.hasAccount ? cash.balanceMinor : null,
              reservedMinor: safeAdd(safeAdd(cash.pendingFixedMinor, cash.pendingDebtMinor), cash.reservedMinor),
              nextPayDate: settings.nextPayDate || income.primary?.next_pay_date || null,
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

      </details>

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

// Distingue el saldo registrado del margen después de compromisos aún pendientes.
function AvailablePlanSummary({ cash, hidden }) {
  if (!cash.hasAccount) return <section className="plan-panel plan-free plan-free--setup">
    <span className="plan-eyebrow">Dinero registrado</span>
    <h2>Agrega tu saldo actual</h2>
    <p>Registra en <Link to="/cuentas" aria-label="Agregar una cuenta con saldo actual">Cuentas</Link> el dinero que realmente tienes hoy.</p>
  </section>

  const isNegative = cash.spendableMinor < 0
  return <section className={`plan-panel plan-free ${isNegative ? 'plan-free--warning' : ''}`} aria-labelledby="plan-free-title">
    <span className="plan-eyebrow" id="plan-free-title">Margen tras pagos pendientes</span>
    <strong className="plan-free__amount">{formatMinor(cash.spendableMinor, 'COP', hidden)}</strong>
    <div className="plan-free__breakdown">
      <p><ArrowDownRight aria-hidden="true" /><span>Dinero en cuentas</span><strong>{formatMinor(cash.balanceMinor, 'COP', hidden)}</strong></p>
      <p><ArrowUpRight aria-hidden="true" /><span>Pagos y reservas pendientes</span><strong>{formatMinor(safeAdd(safeAdd(cash.pendingFixedMinor, cash.pendingDebtMinor), cash.reservedMinor), 'COP', hidden)}</strong></p>
    </div>
    <small>El saldo en cuentas solo cambia al registrar un movimiento real. Los pagos pendientes se apartan para evaluar compras; aún no se han descontado.</small>
  </section>
}

// Formatea el periodo sin desplazar el mes por diferencias entre UTC y la zona del dispositivo.
function formatPlanMonth(month) {
  return new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${month}-15T12:00:00Z`))
}
