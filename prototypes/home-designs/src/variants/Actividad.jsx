import { useMemo, useState } from 'react'
import { ArrowDown, ChartNoAxesColumnIncreasing, PieChart } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { BudgetMeter, DemoTag, GentleNote, Money, SectionAction, TransactionRow } from '../components.jsx'
import { DEMO } from '../data.js'

// Hace visible dónde se concentra el gasto para apoyar el hábito de revisar antes de comprar.
export function Actividad({ finances, hidden, onNewExpense }) {
  const [showAll, setShowAll] = useState(false)
  const [showBudget, setShowBudget] = useState(false)
  const categoryTotals = useMemo(() => {
    const totals = new Map()
    for (const transaction of finances.transactions) totals.set(transaction.category, (totals.get(transaction.category) || 0) + transaction.amountMinor)
    return [...totals.entries()].sort((a, b) => b[1] - a[1])
  }, [finances.transactions])
  const visibleTransactions = showAll ? finances.transactions : finances.transactions.slice(0, 3)
  return <div className="home-screen home-screen--actividad">
    <header className="home-heading"><div><p className="date-caption">SEPTIEMBRE · 2026</p><h1>Así va tu dinero</h1><p className="home-subtitle">Una mirada clara a tus movimientos del mes.</p></div><DemoTag /></header>

    <section className="pulse-summary">
      <div className="pulse-summary__balance"><span>Saldo en tus cuentas</span><strong><Money value={DEMO.liquidMinor - finances.extraSpentMinor} hidden={hidden} /></strong><small>Actualizado con tus movimientos registrados</small></div>
      <div className="pulse-summary__spent"><span className="pulse-icon"><ArrowDown aria-hidden="true" /></span><span>Gastos del mes</span><strong><Money value={finances.spentMinor} hidden={hidden} /></strong><small>{finances.transactions.length} movimientos · 23 sep</small></div>
    </section>

    <section className="content-panel spending-panel">
      <div className="panel-heading"><div><span className="eyebrow-label">DÓNDE SE FUE</span><h2>Gastos por categoría</h2></div><span className="panel-icon"><PieChart aria-hidden="true" /></span></div>
      <div className="category-breakdown">{categoryTotals.map(([category, amount], index) => {
        const percent = finances.spentMinor > 0 ? Math.round((amount / finances.spentMinor) * 100) : 0
        return <div className="category-row" key={category}><div className="category-row__label"><span className={`category-dot category-dot--${index % 4}`} /><span>{category}</span><small>{percent}%</small><strong><Money value={amount} hidden={hidden} /></strong></div><div className="category-track"><span className={`category-fill category-fill--${index % 4}`} style={{ transform: `scaleX(${percent / 100})` }} /></div></div>
      })}</div>
      <AnimatePresence initial={false}>{showBudget && <motion.div className="budget-in-context" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: .18 }}><BudgetMeter spentMinor={finances.spentMinor} budgetMinor={DEMO.budgetMinor} hidden={hidden} compact /></motion.div>}</AnimatePresence>
      <SectionAction onClick={() => setShowBudget((value) => !value)}>{showBudget ? 'Ocultar presupuesto' : 'Comparar con presupuesto'}</SectionAction>
    </section>

    <section className="content-panel pulse-activity">
      <div className="panel-heading"><div><span className="eyebrow-label">ACTIVIDAD RECIENTE</span><h2>Movimientos del mes</h2></div><span className="panel-icon"><ChartNoAxesColumnIncreasing aria-hidden="true" /></span></div>
      <div className="transaction-list">{visibleTransactions.map((item) => <TransactionRow key={item.id} item={item} hidden={hidden} />)}</div>
      <SectionAction onClick={() => setShowAll((value) => !value)}>{showAll ? 'Mostrar menos' : 'Ver historial completo'}</SectionAction>
      <button type="button" className="primary-action" onClick={onNewExpense}><span>+</span> Registrar gasto</button>
    </section>
    <GentleNote>Ver tus patrones ayuda a decidir con intención.</GentleNote>
  </div>
}
