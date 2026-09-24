import { useMemo, useState } from 'react'
import { ArrowDownLeft, CalendarClock, Clock3 } from 'lucide-react'
import { DemoTag, GentleNote, Money, PaydayRail, PaymentCheck, SectionAction, TransactionRow } from '../components.jsx'
import { DEMO } from '../data.js'

// Organiza el Inicio alrededor del tiempo entre pagos y de los compromisos que vencen antes.
export function Quincena({ finances, hidden, paidPayments, onTogglePayment, onNewExpense }) {
  const [showAll, setShowAll] = useState(false)
  const pendingMinor = useMemo(() => DEMO.payments.reduce((sum, payment) => sum + (paidPayments.includes(payment.id) ? 0 : payment.amountMinor), 0), [paidPayments])
  const spendableMinor = DEMO.payPeriodAvailableBeforeBillsMinor - DEMO.payments.reduce((sum, payment) => sum + payment.amountMinor, 0) - finances.extraSpentMinor
  const paidCount = DEMO.payments.length - DEMO.payments.filter((payment) => !paidPayments.includes(payment.id)).length
  const visibleTransactions = showAll ? finances.transactions : finances.transactions.slice(0, 1)
  return <div className="home-screen home-screen--quincena">
    <header className="home-heading"><div><p className="date-caption">TU DINERO, A TU RITMO</p><h1>La quincena en curso</h1><p className="home-subtitle">Un vistazo a lo que falta antes de tu próximo pago.</p></div><DemoTag /></header>

    <section className="payday-card">
      <div className="payday-card__top"><span className="payday-card__icon"><CalendarClock aria-hidden="true" /></span><span className="payday-card__count"><Clock3 aria-hidden="true" /> 7 días</span></div>
      <span className="eyebrow-label">ESTIMADO HASTA EL 30 DE SEPTIEMBRE</span>
      <strong className={spendableMinor < 0 ? 'payday-card__amount--negative' : undefined}><Money value={spendableMinor} hidden={hidden} /></strong>
      <p>{spendableMinor < 0 ? 'Este gasto supera el margen estimado antes de tu próximo pago.' : 'Margen después de reservar los pagos de esta quincena.'}</p>
      <PaydayRail />
    </section>

    <section className="content-panel payments-panel">
      <div className="panel-heading"><div><span className="eyebrow-label">PAGOS PROGRAMADOS</span><h2>Antes del próximo pago</h2></div><span className="count-pill">{paidCount}/{DEMO.payments.length} listos</span></div>
      <div className="payment-list">{DEMO.payments.map((payment) => <PaymentCheck key={payment.id} payment={payment} checked={paidPayments.includes(payment.id)} onChange={() => onTogglePayment(payment.id)} hidden={hidden} />)}</div>
      <div className="pending-total"><span>Falta pagar</span><strong><Money value={pendingMinor} hidden={hidden} /></strong></div>
      <p className="fine-print">Marcar un pago solo actualiza esta lista de ejemplo; no crea movimientos.</p>
    </section>

    <section className="content-panel period-activity">
      <div className="panel-heading"><div><span className="eyebrow-label">REGISTRO DEL MES</span><h2>Lo que ya pasó</h2></div><SectionAction onClick={() => setShowAll((value) => !value)}>{showAll ? 'Menos' : 'Ver más'}</SectionAction></div>
      <div className="transaction-list">{visibleTransactions.map((item) => <TransactionRow key={item.id} item={item} hidden={hidden} />)}</div>
      <div className="period-foot"><span><ArrowDownLeft aria-hidden="true" /> Ingreso mensual</span><Money value={DEMO.salaryMinor} hidden={hidden} /></div>
      <button type="button" className="primary-action" onClick={onNewExpense}><span>+</span> Anotar un gasto</button>
    </section>
    <GentleNote>Pequeños pasos entre pagos también construyen tranquilidad.</GentleNote>
  </div>
}
