import { useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { ArrowDownCircle, CalendarDays, ChevronRight, CreditCard, Eye, EyeOff, ListChecks } from 'lucide-react'
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
import { readFixedExpenses } from '../../domain/financialSetup.js'
import { RecurringPaymentChecklist } from './components/RecurringPaymentChecklist.jsx'
import { NightIcon } from '../../shared/components/NightIcon.jsx'
import { GlassHero } from '../../shared/components/GlassHero.jsx'

// Presenta saldos, deudas, ingresos y compromisos como un registro financiero compacto.
export function AccountsPage() {
  const { accounts, transactions, settings, isDemo, setSheet, guideOpen, actions } = useApp()
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
  // Las pestañas solo cambian la vista; los formularios y sus acciones se conservan.
  const tab = location.hash === '#gastos-fijos' ? 'gastos-fijos' : location.hash === '#ingresos' ? 'ingresos' : location.pathname.split('/')[2] || 'dinero'
  const expenses = readFixedExpenses(settings.fixedExpenses)
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
      <PageHeader title="Cuentas" subtitle="Tu dinero y tus compromisos." action={isDemo && <span className="calm-demo">Datos de ejemplo</span>} />
      <nav className="calm-tabs" aria-label="Secciones de cuentas"><NavLink to="/cuentas" end>Dinero</NavLink><NavLink to="/cuentas/deudas">Deudas</NavLink><NavLink to="/cuentas/gastos-fijos">Gastos fijos</NavLink><NavLink to="/cuentas/pagos">Pagos</NavLink></nav>
      <div className="calm-account-panel" hidden={tab !== 'dinero' && !guideOpen}>
        <GlassHero className="calm-account-balance" aria-label="Totales de cuentas"><div className="calm-balance-label"><span>Saldo en cuentas</span><button className="icon-button" aria-label={settings.hiddenAmounts ? 'Mostrar montos' : 'Ocultar montos'} onClick={() => actions.setSetting('hiddenAmounts', !settings.hiddenAmounts)}>{settings.hiddenAmounts ? <EyeOff /> : <Eye />}</button></div><strong className="calm-balance">{formatMinor(summary.assets, 'COP', settings.hiddenAmounts)}</strong><p>Dinero registrado. No descuenta pagos pendientes.</p></GlassHero>
        <AccountLedgerPane
          kind="asset"
          accounts={visibleAccounts.filter((account) => account.kind === 'asset')}
          amount={summary.assets}
          balances={summary.balances}
          hidden={settings.hiddenAmounts}
          onAdd={() => openAccountDialog('asset')}
          onEdit={setEditingAccount}
        />
        <button className="button button--secondary calm-primary calm-income-action" onClick={() => setSheet('income')}><ArrowDownCircle aria-hidden="true" /> Registrar ingreso<ChevronRight aria-hidden="true" /></button>
        <section className="calm-account-shortcuts"><h2>Por organizar</h2>
          <Link to="/cuentas/deudas"><NightIcon icon={CreditCard} /><span><strong>Deudas</strong><small>{visibleAccounts.filter((item) => item.kind === 'liability').length} registradas</small></span><b>{formatMinor(summary.debt, 'COP', settings.hiddenAmounts)}</b><ChevronRight aria-hidden="true" /></Link>
          <Link to="/cuentas/gastos-fijos"><NightIcon icon={CalendarDays} /><span><strong>Gastos fijos</strong><small>{expenses.length} registrados</small></span><span>Ver lista</span><ChevronRight aria-hidden="true" /></Link>
          <Link to="/cuentas/pagos"><NightIcon icon={ListChecks} /><span><strong>Pagos pendientes</strong><small>Actuales y siguientes</small></span><ChevronRight aria-hidden="true" /></Link>
        </section>
        <details className="calm-details"><summary>Detalle del saldo</summary><Metric label="Posición neta registrada" amount={summary.net} hidden={settings.hiddenAmounts} tone="net" /></details>
      </div>
      <div hidden={tab !== 'deudas' && !guideOpen}>
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
      <details className="calm-details" hidden={tab !== 'dinero' && tab !== 'ingresos' && !guideOpen} open={tab === 'ingresos' || guideOpen}><summary>Mis ingresos</summary><IncomeSection /></details>
      <div hidden={tab !== 'gastos-fijos' && !guideOpen}><FixedExpensesSection standalone showChecklist={false} /></div>
      <div hidden={tab !== 'pagos' && !guideOpen}><RecurringPaymentChecklist expenses={expenses} settings={settings} /></div>

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
