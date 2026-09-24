import { useState } from 'react'
import { ArrowUpRight, Home, Landmark, ReceiptText, WalletCards } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { BudgetMeter, CommitmentLine, DemoTag, GentleNote, Money, SectionAction, TransactionRow } from '../components.jsx'
import { DEMO } from '../data.js'

// Prioriza el dinero utilizable hoy para resolver rápidamente la pregunta principal del Inicio.
export function Saldo({ finances, hidden, onNewExpense }) {
  const [showAll, setShowAll] = useState(false)
  const [showBreakdown, setShowBreakdown] = useState(false)
  const visibleTransactions = showAll ? finances.transactions : finances.transactions.slice(0, 2)
  return <div className="home-screen home-screen--saldo">
    <header className="home-heading"><div><p className="date-caption">MIÉRCOLES · 23 SEP</p><h1>Hola, {DEMO.name}</h1><p className="home-subtitle">Tu dinero, con un poco más de calma.</p></div><DemoTag /></header>

    <section className="saldo-hero" aria-label="Dinero libre disponible">
      <div className="saldo-hero__copy"><span className="eyebrow-label">DINERO LIBRE ESTE MES</span><strong className="saldo-hero__amount"><Money value={finances.availableMinor} hidden={hidden} /></strong><p>Después de tus gastos y compromisos registrados</p><span className="payday-chip"><ArrowUpRight aria-hidden="true" /> Próximo pago · {DEMO.paycheckDate}</span></div>
      <img src="/assets/illustrations/night-companions-480.webp" alt="Tus mascotas descansan bajo la luz de la noche" />
    </section>

    <section className="commitment-grid" aria-label="Resumen mensual">
      <CommitmentLine icon={Landmark} label="Ingresos" value={DEMO.salaryMinor} tone="mint" hidden={hidden} compact />
      <CommitmentLine icon={Home} label="Gastos fijos" value={DEMO.fixedMinor} tone="peach" hidden={hidden} compact />
      <CommitmentLine icon={WalletCards} label="Deuda" value={DEMO.debtMinor} tone="violet" hidden={hidden} compact />
    </section>

    <section className="content-panel saldo-budget">
      <div className="panel-heading"><div><span className="eyebrow-label">ORDEN PARA TU MES</span><h2>Tu presupuesto</h2></div><button type="button" className="round-link" aria-label="Ver desglose del presupuesto" onClick={() => setShowBreakdown((value) => !value)}><ArrowUpRight aria-hidden="true" /></button></div>
      <BudgetMeter spentMinor={finances.spentMinor} budgetMinor={DEMO.budgetMinor} hidden={hidden} />
      <AnimatePresence initial={false}>{showBreakdown && <motion.div className="budget-detail" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: .18 }}><CommitmentLine icon={ReceiptText} label="Gastos registrados" value={finances.spentMinor} tone="sky" hidden={hidden} /><p>El presupuesto es un límite para orientarte; tus saldos siguen mostrando el dinero en tus cuentas.</p></motion.div>}</AnimatePresence>
    </section>

    <section className="content-panel saldo-activity">
      <div className="panel-heading"><div><span className="eyebrow-label">LO MÁS RECIENTE</span><h2>Últimos movimientos</h2></div><SectionAction onClick={() => setShowAll((value) => !value)}>{showAll ? 'Menos' : 'Ver todos'}</SectionAction></div>
      <div className="transaction-list">{visibleTransactions.map((item) => <TransactionRow key={item.id} item={item} hidden={hidden} />)}</div>
      <button type="button" className="primary-action" onClick={onNewExpense}><span>+</span> Registrar un gasto</button>
    </section>
    <GentleNote />
  </div>
}
