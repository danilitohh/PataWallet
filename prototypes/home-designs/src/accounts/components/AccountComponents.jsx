import { motion } from 'motion/react'
import { Banknote, Building2, CalendarDays, Check, ChevronDown, CreditCard, Ellipsis, Home, Pencil, Plus, Trash2, Wifi, X } from 'lucide-react'
import { formatCOP } from '../data.js'

// Traduce los tipos de cuenta en iconografía común, sin mostrar datos bancarios sensibles.
const accountIcons = { cash: Banknote, bank: Building2, card: CreditCard }
const paymentIcons = { home: Home, wifi: Wifi, market: Banknote }

// Mantiene consistentes las tarjetas numéricas y oculta cifras cuando el usuario lo solicita.
export function Money({ amount, hidden = false, className = '' }) {
  return <span className={className}>{hidden ? '••••••' : formatCOP(amount)}</span>
}

// Presenta una fila de cuenta con acciones operativas de edición y archivo local.
export function AccountRow({ account, hidden, onEdit, onArchive, compact = false }) {
  const Icon = accountIcons[account.icon] || (account.type === 'liability' ? CreditCard : Building2)
  return <motion.article className={`account-row ${compact ? 'account-row--compact' : ''} ${account.type === 'liability' ? 'account-row--debt' : ''}`} layout initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .2, ease: [0.16, 1, 0.3, 1] }}>
    <span className={`account-glyph account-glyph--${account.type}`}><Icon aria-hidden="true" /></span>
    <span className="account-row__copy"><strong>{account.name}</strong><small>{account.note || (account.type === 'liability' ? 'Deuda' : 'Saldo disponible')}</small></span>
    <Money amount={account.amount} hidden={hidden} className={`account-row__amount ${account.type === 'liability' ? 'is-debt' : ''}`} />
    <span className="account-row__actions">
      <button type="button" aria-label={`Editar ${account.name}`} title="Editar" onClick={() => onEdit(account)}><Pencil aria-hidden="true" /></button>
      <button type="button" aria-label={`Archivar ${account.name}`} title="Archivar" onClick={() => onArchive(account)}><Trash2 aria-hidden="true" /></button>
    </span>
  </motion.article>
}

// Agrupa una lista de cuentas y ofrece una acción contextual para crear otra.
export function AccountGroup({ title, subtitle, accounts, hidden, onAdd, onEdit, onArchive, tone = 'asset', compact = false }) {
  return <section className={`account-group account-group--${tone}`}>
    <header className="account-group__heading"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button type="button" className="quiet-action" onClick={onAdd}><Plus aria-hidden="true" /><span>Agregar</span></button></header>
    {accounts.length ? <div className="account-list">{accounts.map((account) => <AccountRow key={account.id} account={account} hidden={hidden} onEdit={onEdit} onArchive={onArchive} compact={compact} />)}</div> : <p className="accounts-empty">Aún no has agregado cuentas aquí.</p>}
  </section>
}

// Renderiza los ingresos recurrentes con su frecuencia de referencia y próximo pago.
export function IncomeList({ entries, hidden, onAdd, compact = false }) {
  return <section className={`commitment-card income-card ${compact ? 'commitment-card--compact' : ''}`}>
    <header className="commitment-card__heading"><div><span className="commitment-icon commitment-icon--mint"><Banknote aria-hidden="true" /></span><div><h2>Ingresos</h2><p>Lo que esperas recibir</p></div></div><button type="button" className="icon-action" aria-label="Agregar ingreso" onClick={onAdd}><Plus aria-hidden="true" /></button></header>
    <div className="commitment-list">{entries.map((entry) => <div className="commitment-row" key={entry.id}><span className="commitment-row__symbol">↗</span><span className="commitment-row__copy"><strong>{entry.name}</strong><small>{entry.frequency} · {entry.next}</small></span><Money amount={entry.amount} hidden={hidden} className="commitment-row__amount is-income" /></div>)}</div>
  </section>
}

// Muestra periodicidad y una checklist manual sin ejecutar pagos ni alterar saldos.
export function PaymentList({ entries, hidden, onToggle, onAdd, compact = false }) {
  const paidCount = entries.filter((entry) => entry.paid).length
  return <section className={`commitment-card payment-card ${compact ? 'commitment-card--compact' : ''}`}>
    <header className="commitment-card__heading"><div><span className="commitment-icon commitment-icon--peach"><CalendarDays aria-hidden="true" /></span><div><h2>Gastos fijos</h2><p>{paidCount} de {entries.length} pagos marcados</p></div></div><button type="button" className="icon-action" aria-label="Agregar gasto fijo" onClick={onAdd}><Plus aria-hidden="true" /></button></header>
    <div className="commitment-list">{entries.map((entry) => {
      const Icon = paymentIcons[entry.icon] || CalendarDays
      return <div className={`commitment-row ${entry.paid ? 'is-paid' : ''}`} key={entry.id}>
        <button type="button" className="payment-check" aria-label={`${entry.paid ? 'Desmarcar' : 'Marcar pagado'} ${entry.name}`} aria-pressed={entry.paid} onClick={() => onToggle(entry.id)}>{entry.paid && <Check aria-hidden="true" />}</button>
        <span className="commitment-icon commitment-icon--small"><Icon aria-hidden="true" /></span>
        <span className="commitment-row__copy"><strong>{entry.name}</strong><small>{entry.frequency} · Próximo: {entry.next}</small></span>
        <Money amount={entry.amount} hidden={hidden} className="commitment-row__amount" />
      </div>
    })}</div>
    <p className="commitment-footnote">Marcar un pago no lo descuenta de la cuenta; registra el movimiento por separado.</p>
  </section>
}

// Conserva expandibles el ingreso y el checklist, como paneles accionables en cada propuesta.
export function Disclosure({ title, detail, children, defaultOpen = false, icon: Icon }) {
  return <details className="accounts-disclosure" open={defaultOpen}>
    <summary><span className="disclosure-icon"><Icon aria-hidden="true" /></span><span className="disclosure-copy"><strong>{title}</strong><small>{detail}</small></span><ChevronDown className="disclosure-chevron" aria-hidden="true" /></summary>
    <div className="accounts-disclosure__body">{children}</div>
  </details>
}

// Abre formularios accesibles para cuenta, ingreso o gasto fijo y permite guardar datos de muestra.
export function AccountDialog({ dialog, onClose, onSubmit }) {
  if (!dialog) return null
  const item = dialog.item || {}
  const kind = dialog.kind
  const title = kind === 'income' ? (item.id ? 'Editar ingreso' : 'Nuevo ingreso') : kind === 'payment' ? (item.id ? 'Editar gasto fijo' : 'Nuevo gasto fijo') : (item.id ? 'Editar cuenta' : 'Agregar cuenta')
  const amountLabel = kind === 'account' ? 'Saldo o deuda actual' : 'Monto por periodo'
  const frequency = kind !== 'account'
  return <div className="accounts-dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <motion.section className="accounts-dialog" role="dialog" aria-modal="true" aria-labelledby="accounts-dialog-title" initial={{ opacity: 0, y: 12, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: .99 }} transition={{ duration: .2, ease: [0.16, 1, 0.3, 1] }}>
      <header><div><p className="accounts-dialog__kicker">SOLO EN ESTA VISTA PREVIA</p><h2 id="accounts-dialog-title">{title}</h2></div><button type="button" className="dialog-close" aria-label="Cerrar formulario" onClick={onClose}><X aria-hidden="true" /></button></header>
      <form onSubmit={onSubmit}>
        <label>Nombre<input name="name" required maxLength="48" defaultValue={item.name || ''} placeholder={kind === 'account' ? 'Ej. Cuenta de ahorros' : kind === 'income' ? 'Ej. Salario' : 'Ej. Arriendo'} autoFocus /></label>
        {kind === 'account' && <label>Tipo de cuenta<select name="type" defaultValue={item.type || dialog.defaultType || 'asset'}><option value="asset">Dinero disponible</option><option value="liability">Deuda</option></select></label>}
        <label>{amountLabel}<span className="accounts-amount-field"><span>$</span><input name="amount" type="number" inputMode="numeric" min="1" step="1" required defaultValue={item.amount || ''} placeholder="250.000" /></span></label>
        {frequency && <label>Frecuencia<select name="frequency" defaultValue={item.frequency || 'Mensual'}><option>Mensual</option><option>Cada 15 días</option><option>Semanal</option><option>Ocasional</option></select></label>}
        <p>Los cambios solo viven en esta exploración local y no afectan tus datos reales.</p>
        <button type="submit" className="accounts-submit">Guardar en la vista</button>
      </form>
    </motion.section>
  </div>
}

// Da formato coherente a una métrica resumida dentro de tarjetas y ledger.
export function Metric({ label, amount, hidden, tone = 'default' }) {
  return <div className={`accounts-metric accounts-metric--${tone}`}><span>{label}</span><Money amount={amount} hidden={hidden} /></div>
}

// Botón de encabezado para acceder a una nueva cuenta desde todas las variantes.
export function AddAccountButton({ onClick, label = 'Agregar cuenta' }) {
  return <button type="button" className="accounts-add-button" onClick={onClick}><Plus aria-hidden="true" /><span>{label}</span></button>
}

// Botón compacto para acceder a acciones secundarias dentro de listas.
export function MoreButton({ label, onClick }) {
  return <button type="button" className="icon-action" aria-label={label} onClick={onClick}><Ellipsis aria-hidden="true" /></button>
}
