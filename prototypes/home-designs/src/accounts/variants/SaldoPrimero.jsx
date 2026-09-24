import { motion } from 'motion/react'
import { ArrowDownLeft, ArrowUpRight, Landmark, PawPrint, Sparkles } from 'lucide-react'
import { AccountGroup, AddAccountButton, Disclosure, IncomeList, Metric, PaymentList } from '../components/AccountComponents.jsx'
import { formatCOP } from '../data.js'

// Prioriza cuánto hay disponible y separa las obligaciones del dinero propio.
export function SaldoPrimero({ accounts, income, payments, summary, hidden, onAddAccount, onEditAccount, onArchiveAccount, onTogglePayment, onAddIncome, onAddPayment }) {
  const assets = accounts.filter((account) => account.type === 'asset')
  const debts = accounts.filter((account) => account.type === 'liability')
  return <motion.section className="accounts-screen saldo-screen" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .22, ease: [0.16, 1, 0.3, 1] }}>
    <div className="accounts-heading"><div><p className="accounts-eyebrow">TUS FINANZAS, EN CALMA</p><h1>Cuentas</h1><p className="accounts-subtitle">Lo que tienes y lo que aún estás pagando.</p></div><span className="accounts-demo-tag"><i /> Datos de ejemplo</span></div>

    <section className="balance-hero" aria-label="Resumen de cuentas">
      <div className="balance-hero__content"><span className="balance-hero__label">SALDO EN TUS CUENTAS</span><strong className="balance-hero__amount">{hidden ? '••••••' : formatCOP(summary.assets)}</strong><p>Dinero disponible, separado de tus deudas.</p><div className="balance-hero__net"><Landmark aria-hidden="true" /><span>Patrimonio neto</span><b>{hidden ? '••••••' : formatCOP(summary.net)}</b></div></div>
      <div className="balance-hero__art" aria-hidden="true"><img src="/assets/illustrations/night-companions-480.webp" alt="" /></div>
      <span className="balance-hero__spark" aria-hidden="true"><Sparkles /></span>
    </section>

    <div className="summary-strip"><Metric label="Disponible" amount={summary.assets} hidden={hidden} tone="mint" /><Metric label="Deuda pendiente" amount={summary.debts} hidden={hidden} tone="rose" /><div className="summary-strip__note"><PawPrint aria-hidden="true" /><span>Un buen plan empieza por ver el panorama completo.</span></div></div>

    <div className="balance-columns">
      <AccountGroup title="Dinero disponible" subtitle="Efectivo y cuentas propias" accounts={assets} hidden={hidden} onAdd={() => onAddAccount('asset')} onEdit={onEditAccount} onArchive={onArchiveAccount} tone="asset" />
      <AccountGroup title="Deudas" subtitle="Se muestran aparte de tu saldo" accounts={debts} hidden={hidden} onAdd={() => onAddAccount('liability')} onEdit={onEditAccount} onArchive={onArchiveAccount} tone="debt" />
    </div>

    <div className="accounts-support-grid">
      <Disclosure title="Ingresos" detail={`${income.length} fuentes · ${income[0] ? income[0].frequency.toLowerCase() : 'sin ingresos registrados'}`} icon={ArrowDownLeft}>
        <IncomeList entries={income} hidden={hidden} onAdd={() => onAddIncome()} compact />
      </Disclosure>
      <Disclosure title="Gastos fijos" detail={`${payments.length} pagos · checklist por frecuencia`} icon={ArrowUpRight} defaultOpen>
        <PaymentList entries={payments} hidden={hidden} onToggle={onTogglePayment} onAdd={() => onAddPayment()} compact />
      </Disclosure>
    </div>
    <AddAccountButton onClick={() => onAddAccount()} />
  </motion.section>
}
