import { motion } from 'motion/react'
import { ArrowDownLeft, ArrowUpRight, BadgeCheck, Clock3, Landmark, ListChecks } from 'lucide-react'
import { AccountGroup, AddAccountButton, IncomeList, Metric, PaymentList } from '../components/AccountComponents.jsx'
import { formatCOP } from '../data.js'

// Prioriza lectura rápida con un libro compacto de saldos y compromisos próximos.
export function RegistroTranquilo({ accounts, income, payments, summary, hidden, onAddAccount, onEditAccount, onArchiveAccount, onTogglePayment, onAddIncome, onAddPayment }) {
  const assets = accounts.filter((account) => account.type === 'asset')
  const debts = accounts.filter((account) => account.type === 'liability')
  const pending = payments.filter((payment) => !payment.paid).length
  return <motion.section className="accounts-screen ledger-screen" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .22, ease: [0.16, 1, 0.3, 1] }}>
    <div className="accounts-heading"><div><p className="accounts-eyebrow">RESUMEN DE CUENTAS</p><h1>Tu dinero, de un vistazo</h1><p className="accounts-subtitle">Saldos y próximos compromisos en un mismo registro.</p></div><span className="accounts-demo-tag"><i /> Datos de ejemplo</span></div>

    <section className="ledger-summary" aria-label="Totales de cuentas">
      <div className="ledger-summary__main"><span><Landmark aria-hidden="true" /> Dinero en tus cuentas</span><strong>{hidden ? '••••••' : formatCOP(summary.assets)}</strong><small>Disponible en efectivo y cuentas propias</small></div>
      <div className="ledger-summary__metrics"><Metric label="Deuda" amount={summary.debts} hidden={hidden} tone="rose" /><Metric label="Neto" amount={summary.net} hidden={hidden} tone="mint" /></div>
      <AddAccountButton label="Agregar" onClick={() => onAddAccount()} />
    </section>

    <div className="ledger-status"><span><Clock3 aria-hidden="true" /> Próximos pagos</span><strong>{pending} pendientes</strong><span className="ledger-status__separator" /><span><BadgeCheck aria-hidden="true" /> {payments.length - pending} marcados</span></div>

    <div className="ledger-columns">
      <div className="ledger-pane">
        <div className="ledger-pane__heading"><div><span className="accounts-eyebrow">ACTIVOS</span><h2>Dinero disponible</h2></div><strong>{hidden ? '••••••' : formatCOP(summary.assets)}</strong></div>
        <AccountGroup title="" accounts={assets} hidden={hidden} onAdd={() => onAddAccount('asset')} onEdit={onEditAccount} onArchive={onArchiveAccount} tone="asset" compact />
      </div>
      <div className="ledger-pane ledger-pane--debt">
        <div className="ledger-pane__heading"><div><span className="accounts-eyebrow">OBLIGACIONES</span><h2>Deudas</h2></div><strong>{hidden ? '••••••' : formatCOP(summary.debts)}</strong></div>
        <AccountGroup title="" accounts={debts} hidden={hidden} onAdd={() => onAddAccount('liability')} onEdit={onEditAccount} onArchive={onArchiveAccount} tone="debt" compact />
      </div>
    </div>

    <div className="ledger-commitments-heading"><div><span className="accounts-eyebrow">FLUJO DEL MES</span><h2>Entradas y compromisos</h2></div><ListChecks aria-hidden="true" /></div>
    <div className="ledger-commitments">
      <div className="ledger-pane"><div className="ledger-pane__heading ledger-pane__heading--small"><div><ArrowDownLeft aria-hidden="true" /><h3>Ingresos</h3></div><button type="button" className="quiet-action" onClick={() => onAddIncome()}>+ Agregar</button></div><IncomeList entries={income} hidden={hidden} onAdd={() => onAddIncome()} compact /></div>
      <div className="ledger-pane"><div className="ledger-pane__heading ledger-pane__heading--small"><div><ArrowUpRight aria-hidden="true" /><h3>Gastos fijos</h3></div><button type="button" className="quiet-action" onClick={() => onAddPayment()}>+ Agregar</button></div><PaymentList entries={payments} hidden={hidden} onToggle={onTogglePayment} onAdd={() => onAddPayment()} compact /></div>
    </div>
    <AddAccountButton onClick={() => onAddAccount()} />
  </motion.section>
}
