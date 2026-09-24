import { ArrowDownLeft, ArrowUpRight, CalendarDays, Check, ChevronRight, CreditCard, PawPrint, ReceiptText, ShoppingBasket, Sparkles } from 'lucide-react'
import { formatMoney } from './data.js'

// Muestra un importe con jerarquía uniforme en todas las propuestas.
export function Money({ value, hidden = false, compact = false, className = '' }) {
  return <span className={className}>{formatMoney(value, hidden, compact)}</span>
}

// Marca el contenido como demostración, separado de cualquier información real.
export function DemoTag() {
  return <span className="demo-tag"><span aria-hidden="true" /> Datos de ejemplo</span>
}

// Reutiliza una fila financiera compacta con icono, contexto y monto realista.
export function TransactionRow({ item, hidden = false }) {
  const positive = item.type === 'income'
  const Icon = item.tone === 'food' ? ShoppingBasket : item.tone === 'pets' ? PawPrint : item.tone === 'salary' ? ArrowDownLeft : item.tone === 'transfer' ? ArrowUpRight : ReceiptText
  return (
    <article className="transaction-row">
      <span className={`transaction-glyph transaction-glyph--${item.tone || 'market'}`}><Icon aria-hidden="true" /></span>
      <span className="transaction-copy"><strong>{item.name}</strong><small>{item.category} · {item.date}</small></span>
      <strong className={`transaction-amount ${positive ? 'transaction-amount--positive' : ''}`}><span>{positive ? '+' : '−'}</span><Money value={item.amountMinor} hidden={hidden} /></strong>
    </article>
  )
}

// Resume compromisos mensuales en un renglón de lectura rápida.
export function CommitmentLine({ icon: Icon, label, value, tone = 'violet', hidden = false, compact = false }) {
  return <div className="commitment-line"><span className={`commitment-icon commitment-icon--${tone}`}><Icon aria-hidden="true" /></span><span>{label}</span><strong><Money value={value} hidden={hidden} compact={compact} /></strong></div>
}

// Construye un elemento sencillo del dock en las maquetas de Inicio.
export function DockGlyph({ icon: Icon, label, active = false, onClick, primary = false }) {
  const className = `dock-glyph ${active ? 'dock-glyph--active' : ''} ${primary ? 'dock-glyph--primary' : ''}`.trim()
  return onClick
    ? <button type="button" className={className} aria-label={label} onClick={onClick}><Icon aria-hidden="true" /></button>
    : <span className={className} aria-hidden="true"><Icon /></span>
}

// Presenta un acceso de sección que responde mostrando el contexto disponible en esta exploración de Inicio.
export function SectionAction({ children, onClick }) {
  return <button type="button" className="section-action" onClick={onClick}>{children}<ChevronRight aria-hidden="true" /></button>
}

// Resume visualmente el calendario del próximo pago para la propuesta de quincena.
export function PaydayRail() {
  return <div className="payday-rail" aria-label="Periodo del 15 al 30 de septiembre"><span className="payday-rail__stop payday-rail__stop--paid"><Check aria-hidden="true" /><small>15 sep</small><b>Pago recibido</b></span><span className="payday-rail__line"><i /></span><span className="payday-rail__stop payday-rail__stop--today"><i /><small>Hoy · 23 sep</small><b>En curso</b></span><span className="payday-rail__line"><i /></span><span className="payday-rail__stop"><CalendarDays aria-hidden="true" /><small>30 sep</small><b>Próximo pago</b></span></div>
}

// Permite reconocer estados de pago con un control nativo de casilla.
export function PaymentCheck({ payment, checked, onChange, hidden = false }) {
  return <label className={`payment-row ${checked ? 'payment-row--paid' : ''}`}>
    <input type="checkbox" checked={checked} onChange={onChange} aria-label={`Marcar ${payment.name} como pagado`} />
    <span className={`payment-row__icon payment-row__icon--${payment.tone}`}><CreditCard aria-hidden="true" /></span>
    <span className="payment-row__copy"><strong>{payment.name}</strong><small>Vence el {payment.date}</small></span>
    <strong className="payment-row__amount"><Money value={payment.amountMinor} hidden={hidden} /></strong>
  </label>
}

// Explica el presupuesto en forma de barra para que el porcentaje tenga una referencia concreta.
export function BudgetMeter({ spentMinor, budgetMinor, hidden = false, compact = false }) {
  const percent = Math.min(100, Math.round((spentMinor / budgetMinor) * 100))
  return <div className={`budget-meter ${compact ? 'budget-meter--compact' : ''}`}>
    <div className="budget-meter__labels"><span>{compact ? 'Presupuesto usado' : 'Presupuesto de septiembre'}</span><strong>{percent}%</strong></div>
    <div className="budget-meter__track" role="progressbar" aria-label={`${percent}% del presupuesto usado`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={percent}><span style={{ transform: `scaleX(${percent / 100})` }} /></div>
    <small><Money value={spentMinor} hidden={hidden} /> de <Money value={budgetMinor} hidden={hidden} /> · te quedan <Money value={Math.max(0, budgetMinor - spentMinor)} hidden={hidden} /></small>
  </div>
}

// Devuelve una señal de ánimo tranquila, sin asociar culpa o juicio a los gastos.
export function GentleNote({ children = 'Cada decisión cuenta. Vamos paso a paso.' }) {
  return <p className="gentle-note"><Sparkles aria-hidden="true" />{children}</p>
}
