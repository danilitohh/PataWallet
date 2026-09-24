import { ArrowUpRight, ChevronRight, Goal, Pencil, Plus } from 'lucide-react'
import { formatPlanMoney, formatPlanMonth } from '../fixtures.js'
import { BudgetProgress, CommitmentSummary, GoalRow, MonthNavigator, PlanDemoBadge, PlanGentleNote, PurchaseAssessment, SpendCategoryRow, formatPlanDate } from '../components/PlanChrome.jsx'
import './plan-sereno.css'

// Ordena el módulo como una lectura tranquila: dinero libre, presupuesto, luego metas.
export function PlanSereno({ model, hidden, actions }) {
  const { month, budgetMinor, spentMinor, monthlyFreeMinor, categories, goals, purchase, purchaseChecked, analysisVisible } = model
  const budgetRemainingMinor = budgetMinor === null ? null : budgetMinor - spentMinor
  const totalCategoryLimits = categories.map((item) => Math.round((budgetMinor || 0) * item.weightBps / 10_000))
  return <div className="plan-variant plan-sereno">
    <header className="plan-page-heading"><div><span className="plan-eyebrow">TU DINERO, CON MÁS CALMA</span><h1>Tu plan</h1><p>Decisiones pequeñas, un mes más claro.</p></div><PlanDemoBadge /></header>
    <div className="plan-sereno__month"><MonthNavigator month={month} onChange={actions.shiftMonth} /></div>

    <section className="plan-sereno__hero" aria-labelledby="sereno-title">
      <div className="plan-sereno__hero-top"><span>DINERO LIBRE ESTIMADO</span><span className="plan-sereno__moon" aria-hidden="true">✦</span></div>
      <h2 id="sereno-title">{formatPlanMoney(monthlyFreeMinor, hidden)}</h2>
      <p>Después de gastos fijos, deuda y compras registradas en {formatPlanMonth(month)}.</p>
      <div className="plan-sereno__budget">
        <div><span>Presupuesto del mes</span><button type="button" className="plan-inline-action" onClick={actions.editBudget}><Pencil aria-hidden="true" />{budgetMinor === null ? 'Definir' : 'Editar'}</button></div>
        <BudgetProgress spentMinor={spentMinor} limitMinor={budgetMinor} hidden={hidden} compact />
      </div>
      <img className="plan-sereno__illustration" src="/assets/illustrations/night-companions-480.webp" alt="" width="480" height="320" />
    </section>

    <CommitmentSummary salaryMinor={model.salaryMinor} fixedMinor={model.fixedMinor} debtMinor={model.debtMinor} hidden={hidden} />

    <section className="plan-sereno__columns">
      <section className="plan-panel plan-sereno__spending">
        <div className="plan-section-heading"><div><span className="plan-eyebrow">LECTURA DEL MES</span><h2>En qué va tu presupuesto</h2></div><span className="plan-section-heading__spark" aria-hidden="true"><ArrowUpRight /></span></div>
        <div className="plan-sereno__spend-list">{categories.map((category, index) => <SpendCategoryRow key={category.id} category={category} spentMinor={category.amountMinor} limitMinor={totalCategoryLimits[index]} hidden={hidden} />)}</div>
        {spentMinor === 0 && <p className="plan-inline-empty">Aún no hay gastos registrados en este periodo.</p>}
      </section>

      <section className="plan-panel plan-sereno__goal">
        <div className="plan-section-heading"><div><span className="plan-eyebrow">A TU RITMO</span><h2>Metas que avanzan</h2></div><Goal aria-hidden="true" /></div>
        {goals.length ? <div className="plan-sereno__goal-list">{goals.map((goal) => <GoalRow key={goal.id} goal={goal} hidden={hidden} onReserve={actions.reserve} />)}</div> : <button type="button" className="plan-secondary-action" onClick={actions.newGoal}><Plus aria-hidden="true" />Crear primera meta</button>}
      </section>
    </section>

    <section className="plan-sereno__purchase plan-panel">
      <div className="plan-purchase-copy"><span className="plan-eyebrow">ANTES DE COMPRAR</span><h2>{purchase.name}</h2><p>{formatPlanMoney(purchase.amountMinor, hidden)} · fecha objetivo {formatPlanDate(purchase.targetDate)}</p></div>
      <button type="button" className="plan-text-action" aria-expanded={analysisVisible} onClick={actions.evaluatePurchase}>{analysisVisible ? 'Ocultar cálculo' : 'Evaluar compra'}<ChevronRight aria-hidden="true" /></button>
      {analysisVisible && <PurchaseAssessment amountMinor={purchase.amountMinor} budgetRemainingMinor={budgetRemainingMinor} monthlyFreeMinor={monthlyFreeMinor} nextPayDate={model.nextPayDate} hidden={hidden} />}
      <span className="plan-purchase-check" aria-label={purchaseChecked ? 'Compra revisada' : 'Compra pendiente de revisar'}>{purchaseChecked ? '✓ Revisada' : 'Por evaluar'}</span>
    </section>

    <PlanGentleNote />
  </div>
}
