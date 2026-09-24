import { ArrowUpRight, ChartNoAxesColumnIncreasing, ChevronRight, CircleCheck, Pencil, Plus, Wallet } from 'lucide-react'
import { formatPlanMoney } from '../fixtures.js'
import { BudgetProgress, GoalRow, MonthNavigator, PlanDemoBadge, PlanGentleNote, PurchaseAssessment, formatPlanDate } from '../components/PlanChrome.jsx'
import './presupuesto-central.css'

// Prioriza el control práctico: total, categorías y decisiones de gasto en una cuadrícula.
export function PresupuestoCentral({ model, hidden, actions }) {
  const { month, budgetMinor, spentMinor, monthlyFreeMinor, categories, goals, purchase, analysisVisible } = model
  const remainingMinor = budgetMinor === null ? null : budgetMinor - spentMinor
  return <div className="plan-variant plan-presupuesto">
    <header className="plan-page-heading"><div><span className="plan-eyebrow">CONTROL CLARO, SIN COMPLICARLO</span><h1>Presupuesto</h1><p>Cada categoría cuenta dentro de un mismo límite.</p></div><PlanDemoBadge /></header>
    <div className="plan-presupuesto__month"><MonthNavigator month={month} onChange={actions.shiftMonth} /></div>

    <section className="plan-panel plan-presupuesto__overview">
      <div className="plan-presupuesto__overview-head"><span className="plan-presupuesto__overview-icon"><ChartNoAxesColumnIncreasing aria-hidden="true" /></span><div><span>GASTADO EN EL PERIODO</span><small>Presupuesto global · {model.monthLabel}</small></div><button type="button" className="plan-icon-action" aria-label={budgetMinor === null ? 'Definir presupuesto' : 'Editar presupuesto'} onClick={actions.editBudget}><Pencil aria-hidden="true" /></button></div>
      <div className="plan-presupuesto__numbers"><strong>{formatPlanMoney(spentMinor, hidden)}</strong><span>{budgetMinor === null ? 'Sin límite' : `de ${formatPlanMoney(budgetMinor, hidden)}`}</span></div>
      <BudgetProgress spentMinor={spentMinor} limitMinor={budgetMinor} hidden={hidden} />
      <div className="plan-presupuesto__left"><span>{remainingMinor !== null && remainingMinor < 0 ? 'Exceso sobre el límite' : 'Restante del presupuesto'}</span><strong className={remainingMinor !== null && remainingMinor < 0 ? 'is-over-budget' : ''}>{remainingMinor === null ? '—' : formatPlanMoney(Math.abs(remainingMinor), hidden)}</strong></div>
    </section>

    <section className="plan-presupuesto__categories">
      <div className="plan-section-heading"><div><span className="plan-eyebrow">REPARTO DEL LÍMITE</span><h2>Gastos por categoría</h2></div><span className="plan-presupuesto__category-count">{categories.length} categorías</span></div>
      <div className="plan-presupuesto__category-list">{categories.map((category) => {
        const categoryLimit = budgetMinor === null ? 0 : Math.round(budgetMinor * category.weightBps / 10_000)
        const percent = categoryLimit ? Math.round(category.amountMinor / categoryLimit * 100) : 0
        return <article className="plan-category-card" key={category.id}>
          <span className={`plan-category-card__icon plan-category-card__icon--${category.tone}`}><Wallet aria-hidden="true" /></span>
          <div className="plan-category-card__body"><div className="plan-category-card__top"><strong>{category.label}</strong><span>{percent}%</span></div>
            <div className="plan-category-track" role="progressbar" aria-label={`${percent}% de ${category.label}`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.min(100, percent)}><span style={{ transform: `scaleX(${categoryLimit ? Math.min(1, category.amountMinor / categoryLimit) : 0})` }} /></div>
            <div className="plan-category-card__amounts"><strong>{formatPlanMoney(category.amountMinor, hidden)}</strong><span>{categoryLimit ? `de ${formatPlanMoney(categoryLimit, hidden)}` : 'Define un límite global'}</span></div>
          </div>
          {percent >= 80 && category.amountMinor > 0 && <span className="plan-category-card__signal"><CircleCheck aria-label="Cerca del límite" /></span>}
        </article>
      })}</div>
      <p className="plan-presupuesto__hint">Las categorías distribuyen visualmente el límite global; no son dinero apartado.</p>
    </section>

    <section className="plan-presupuesto__bottom-grid">
      <section className="plan-panel plan-presupuesto__purchase">
        <div className="plan-section-heading"><div><span className="plan-eyebrow">DECISIÓN EN CONTEXTO</span><h2>Compra prevista</h2></div><span className="plan-presupuesto__purchase-glyph"><ArrowUpRight aria-hidden="true" /></span></div>
        <strong className="plan-presupuesto__purchase-name">{purchase.name}</strong><p>{formatPlanMoney(purchase.amountMinor, hidden)} · {formatPlanDate(purchase.targetDate)}</p>
        <button type="button" className="plan-primary-action plan-primary-action--compact" aria-expanded={analysisVisible} onClick={actions.evaluatePurchase}>{analysisVisible ? 'Actualizar cálculo' : 'Ver si cabe en el mes'}<ChevronRight aria-hidden="true" /></button>
        {analysisVisible && <PurchaseAssessment amountMinor={purchase.amountMinor} budgetRemainingMinor={remainingMinor} monthlyFreeMinor={monthlyFreeMinor} nextPayDate={model.nextPayDate} hidden={hidden} />}
      </section>
      <section className="plan-panel plan-presupuesto__goal">
        <div className="plan-section-heading"><div><span className="plan-eyebrow">AHORRO</span><h2>Tu meta activa</h2></div><Plus aria-hidden="true" /></div>
        {goals.length ? <div className="plan-presupuesto__goal-list">{goals.map((goal) => <GoalRow key={goal.id} goal={goal} hidden={hidden} onReserve={actions.reserve} />)}</div> : <button type="button" className="plan-text-action" onClick={actions.newGoal}>Crear una meta<ChevronRight aria-hidden="true" /></button>}
      </section>
    </section>
    <PlanGentleNote>Una categoría cerca del límite es una señal para revisar, no un juicio.</PlanGentleNote>
  </div>
}
