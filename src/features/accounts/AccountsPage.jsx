import { useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { useLocation, useNavigate } from 'react-router-dom'
import { BadgeCheck, Clock3, Landmark, ListChecks, Plus } from 'lucide-react'
import { useApp } from '../../app/AppContext.jsx'
import { calculateSummary } from '../../domain/finance.js'
import { formatMinor } from '../../domain/money.js'
import { PageHeader } from '../../shared/components/PageHeader.jsx'
import { currentMonth } from '../../shared/lib/date.js'
import { AccountDialog, AccountEditDialog } from './components/AccountDialogs.jsx'
import { AccountLedgerPane } from './components/AccountLedgerPane.jsx'
import { FixedExpensesSection } from './components/FixedExpensesSection.jsx'
import { IncomeSection } from './components/IncomeSection.jsx'
import { incomeReference } from '../settings/model/incomeSources.js'

// Presenta saldos, deudas, ingresos y compromisos como un registro financiero compacto.
export function AccountsPage() {
  const { accounts, transactions, settings } = useApp()
  const location = useLocation()
  const navigate = useNavigate()
  const params = new URLSearchParams(location.search)
  const confirmingPreviousBalance = params.get('confirmar-saldo') === '1'
  const [accountKind, setAccountKind] = useState('asset')
  const [editingAccount, setEditingAccount] = useState(null)
  const [open, setOpen] = useState(confirmingPreviousBalance || params.get('agregar-cuenta') === '1')
  const summary = calculateSummary(accounts, transactions, currentMonth())
  const visibleAccounts = accounts.filter((account) => !account.archived)
  const previousAmount = confirmingPreviousBalance && !visibleAccounts.some((account) => account.kind === 'asset') ? incomeReference(settings, accounts).salaryMinor : null
  const closeAccountDialog = () => {
    setOpen(false)
    if (location.search) navigate('/cuentas', { replace: true })
  }
  // Conserva el tipo del panel para que el formulario contextual se abra con la naturaleza correcta.
  const openAccountDialog = (kind = 'asset') => {
    setAccountKind(kind)
    setOpen(true)
  }

  return (
    <div className="route-stack accounts-ledger">
      <PageHeader
        className="accounts-ledger__heading"
        eyebrow="RESUMEN DE CUENTAS"
        title="Tu dinero, de un vistazo"
        subtitle="Saldos y próximos compromisos en un mismo registro."
      />

      <section className="accounts-ledger__summary" aria-label="Totales de cuentas">
        <div className="accounts-ledger__balance">
          <span><Landmark aria-hidden="true" /> Dinero en tus cuentas</span>
          <strong>{formatMinor(summary.assets, 'COP', settings.hiddenAmounts)}</strong>
          <small>Disponible en efectivo y cuentas propias</small>
        </div>
        <div className="accounts-ledger__metrics">
          <Metric label="Deuda" amount={summary.debt} hidden={settings.hiddenAmounts} tone="debt" />
          <Metric label="Neto" amount={summary.net} hidden={settings.hiddenAmounts} tone="net" />
        </div>
        <button className="button button--secondary accounts-ledger__add" type="button" onClick={() => openAccountDialog()}>
          <Plus aria-hidden="true" /> Agregar
        </button>
      </section>

      <div className="accounts-ledger__status" aria-label="Próximos pagos">
        <span><Clock3 aria-hidden="true" /> Próximos pagos</span>
        <strong>Checklist manual</strong>
        <span className="accounts-ledger__separator" aria-hidden="true" />
        <span><BadgeCheck aria-hidden="true" /> Marca los pagos al realizarlos</span>
      </div>

      <div className="accounts-ledger__columns">
        <AccountLedgerPane
          kind="asset"
          accounts={visibleAccounts.filter((account) => account.kind === 'asset')}
          amount={summary.assets}
          balances={summary.balances}
          hidden={settings.hiddenAmounts}
          onAdd={() => openAccountDialog('asset')}
          onEdit={setEditingAccount}
        />
        <AccountLedgerPane
          kind="liability"
          accounts={visibleAccounts.filter((account) => account.kind === 'liability')}
          amount={summary.debt}
          balances={summary.balances}
          hidden={settings.hiddenAmounts}
          onAdd={() => openAccountDialog('liability')}
          onEdit={setEditingAccount}
        />
      </div>

      <div className="accounts-ledger__commitments-heading">
        <div><span className="accounts-ledger__eyebrow">FLUJO DEL MES</span><h2>Entradas y compromisos</h2></div>
        <ListChecks aria-hidden="true" />
      </div>
      <div className="accounts-ledger__commitments">
        <IncomeSection />
        <FixedExpensesSection />
      </div>

      <AnimatePresence>
        {open && <AccountDialog initialKind={accountKind} initialAmount={previousAmount} close={closeAccountDialog} />}
        {editingAccount && <AccountEditDialog account={editingAccount} close={() => setEditingAccount(null)} />}
      </AnimatePresence>
    </div>
  )
}

// Da jerarquía visual a una cifra sin duplicar las reglas de privacidad ni formato monetario.
function Metric({ label, amount, hidden, tone }) {
  return <div className={`accounts-ledger__metric accounts-ledger__metric--${tone}`}>
    <span>{label}</span>
    <strong>{formatMinor(amount, 'COP', hidden)}</strong>
  </div>
}
