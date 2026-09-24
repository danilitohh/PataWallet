import { useRef, useState } from 'react'
import { motion } from 'motion/react'
import { Banknote, CreditCard, Layers3, WalletCards } from 'lucide-react'
import { AccountGroup, AddAccountButton, IncomeList, Metric, PaymentList } from '../components/AccountComponents.jsx'
import { formatCOP } from '../data.js'

// Cambia el foco de la pantalla por bóvedas; solo el grupo elegido ocupa el primer plano.
export function Bovedas({ accounts, income, payments, summary, hidden, onAddAccount, onEditAccount, onArchiveAccount, onTogglePayment, onAddIncome, onAddPayment }) {
  const [shelf, setShelf] = useState('available')
  const tablistRef = useRef(null)
  const assets = accounts.filter((account) => account.type === 'asset')
  const debts = accounts.filter((account) => account.type === 'liability')
  const tabs = [
    { id: 'available', label: 'Disponible', count: assets.length, icon: WalletCards },
    { id: 'debts', label: 'Deudas', count: debts.length, icon: CreditCard },
    { id: 'rhythm', label: 'Ingresos y pagos', count: income.length + payments.length, icon: Banknote },
  ]
  const activeLabel = tabs.find((tab) => tab.id === shelf)?.label || 'Disponible'
  return <motion.section className="accounts-screen vault-screen" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .22, ease: [0.16, 1, 0.3, 1] }}>
    <div className="accounts-heading"><div><p className="accounts-eyebrow">ORDENA TUS RECURSOS</p><h1>Tu dinero, por espacios</h1><p className="accounts-subtitle">Entra a cada bóveda y encuentra justo lo que buscas.</p></div><span className="accounts-demo-tag"><i /> Vista de ejemplo</span></div>

    <div className="vault-overview"><span className="vault-overview__glyph"><Layers3 aria-hidden="true" /></span><div><span className="vault-overview__label">PATRIMONIO NETO</span><strong>{hidden ? '••••••' : formatCOP(summary.net)}</strong><small>Activos menos deudas</small></div><div className="vault-overview__split"><Metric label="Tuyo" amount={summary.assets} hidden={hidden} tone="mint" /><Metric label="Por pagar" amount={summary.debts} hidden={hidden} tone="rose" /></div></div>

    <div className="vault-tabs" role="tablist" aria-label="Espacios de cuentas" ref={tablistRef} onKeyDown={(event) => {
      const currentIndex = tabs.findIndex((tab) => tab.id === shelf)
      let nextIndex = currentIndex
      if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length
      else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length
      else if (event.key === 'Home') nextIndex = 0
      else if (event.key === 'End') nextIndex = tabs.length - 1
      if (nextIndex !== currentIndex) {
        event.preventDefault()
        event.stopPropagation()
        setShelf(tabs[nextIndex].id)
        tablistRef.current?.querySelectorAll('[role="tab"]')[nextIndex]?.focus()
      }
    }}>{tabs.map(({ id, label, count, icon: Icon }) => <button key={id} type="button" role="tab" aria-selected={shelf === id} tabIndex={shelf === id ? 0 : -1} className={shelf === id ? 'is-selected' : ''} onClick={() => setShelf(id)}><Icon aria-hidden="true" /><span>{label}</span><small>{count}</small></button>)}</div>

    <div className="vault-content" role="tabpanel" aria-label={activeLabel} key={shelf}>
      {shelf === 'available' && <>
        <div className="vault-section-heading"><div><span className="accounts-eyebrow">ESPACIO 01</span><h2>Dinero disponible</h2><p>Lo que puedes usar hoy.</p></div><strong>{hidden ? '••••••' : formatCOP(summary.assets)}</strong></div>
        <AccountGroup title="" accounts={assets} hidden={hidden} onAdd={() => onAddAccount('asset')} onEdit={onEditAccount} onArchive={onArchiveAccount} tone="asset" />
        <div className="vault-tip">Cada saldo inicial es dinero que ya tienes; no cuenta como ingreso nuevo.</div>
      </>}
      {shelf === 'debts' && <>
        <div className="vault-section-heading"><div><span className="accounts-eyebrow">ESPACIO 02</span><h2>Deudas pendientes</h2><p>Separadas de tus cuentas disponibles.</p></div><strong className="is-debt">{hidden ? '••••••' : formatCOP(summary.debts)}</strong></div>
        <AccountGroup title="" accounts={debts} hidden={hidden} onAdd={() => onAddAccount('liability')} onEdit={onEditAccount} onArchive={onArchiveAccount} tone="debt" />
        <div className="vault-tip">Registrar el pago de una tarjeta no debe duplicar el gasto original.</div>
      </>}
      {shelf === 'rhythm' && <>
        <div className="vault-section-heading"><div><span className="accounts-eyebrow">ESPACIO 03</span><h2>Tu ritmo de dinero</h2><p>Entradas y pagos en sus propias fechas.</p></div></div>
        <div className="vault-rhythm-grid"><IncomeList entries={income} hidden={hidden} onAdd={() => onAddIncome()} compact /><PaymentList entries={payments} hidden={hidden} onToggle={onTogglePayment} onAdd={() => onAddPayment()} compact /></div>
        <p className="vault-footnote">Las marcas de pago son manuales; no se hacen cargos ni se modifica el saldo.</p>
      </>}
    </div>
    <AddAccountButton label={shelf === 'rhythm' ? 'Agregar ingreso' : shelf === 'debts' ? 'Agregar deuda' : 'Agregar cuenta'} onClick={() => shelf === 'rhythm' ? onAddIncome() : onAddAccount(shelf === 'debts' ? 'liability' : 'asset')} />
  </motion.section>
}
