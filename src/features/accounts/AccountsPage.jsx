import { useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { CreditCard, Landmark, Pencil, Plus, Trash2 } from 'lucide-react'
import { useApp } from '../../app/AppContext.jsx'
import { db } from '../../data/db.js'
import { calculateSummary } from '../../domain/finance.js'
import { formatMinor } from '../../domain/money.js'
import { PageHeader } from '../../shared/components/PageHeader.jsx'
import { currentMonth } from '../../shared/lib/date.js'
import { AccountDialog, AccountEditDialog } from './components/AccountDialogs.jsx'

export function AccountsPage() {
  const { accounts, transactions, settings, notify } = useApp()
  const [open, setOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState(null)
  const summary = calculateSummary(accounts, transactions, currentMonth())
  const groups = [['Dinero en cuentas', 'asset'], ['Tarjetas y deuda', 'liability']]

  return (
    <div className="route-stack">
      <PageHeader title="Cuentas" subtitle="Activos y deudas se muestran por separado." action={<button className="button button--quiet" onClick={() => setOpen(true)}><Plus /> Agregar</button>} />
      <section className="account-summary"><div><span>Activos registrados</span><strong>{formatMinor(summary.assets, 'COP', settings.hiddenAmounts)}</strong></div><div><span>Deuda registrada</span><strong>{formatMinor(summary.debt, 'COP', settings.hiddenAmounts)}</strong></div><div><span>Posición neta</span><strong>{formatMinor(summary.net, 'COP', settings.hiddenAmounts)}</strong></div></section>
      {groups.map(([title, kind]) => <section key={kind}><div className="section-heading"><h2>{title}</h2></div><div className="account-list">{accounts.filter((item) => item.kind === kind && !item.archived).map((item) => <article className="account-row" key={item.id}><span className="account-row__icon">{kind === 'asset' ? <Landmark /> : <CreditCard />}</span><div><h3>{item.name}</h3><p>{item.subtype === 'cash' ? 'Efectivo' : kind === 'liability' ? 'Tarjeta de crédito' : 'Cuenta de activo'}</p></div><strong>{formatMinor(summary.balances[item.id] || 0, 'COP', settings.hiddenAmounts)}</strong><button className="icon-button icon-button--small" aria-label={`Editar ${item.name}`} onClick={() => setEditingAccount(item)}><Pencil /></button><button className="icon-button icon-button--small" aria-label={`Archivar ${item.name}`} onClick={async () => { if (!confirm(`¿Archivar ${item.name}? Sus movimientos se conservarán.`)) return; await db.accounts.update(item.id, { archived: true }); notify('Cuenta archivada') }}><Trash2 /></button></article>)}</div></section>)}
      <AnimatePresence>{open && <AccountDialog close={() => setOpen(false)} />}</AnimatePresence>
      <AnimatePresence>{editingAccount && <AccountEditDialog account={editingAccount} close={() => setEditingAccount(null)} />}</AnimatePresence>
    </div>
  )
}
