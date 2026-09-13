import { useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { CreditCard, Landmark, Pencil, Plus, Trash2 } from 'lucide-react'
import { useApp } from '../../app/AppContext.jsx'
import { calculateSummary } from '../../domain/finance.js'
import { formatMinor } from '../../domain/money.js'
import { PageHeader } from '../../shared/components/PageHeader.jsx'
import { currentMonth } from '../../shared/lib/date.js'
import { AccountDialog, AccountEditDialog } from './components/AccountDialogs.jsx'
import { accountTypeLabel } from './model/accountTypes.js'

export function AccountsPage() {
  const { accounts, transactions, settings, notify, actions } = useApp()
  const [open, setOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState(null)
  const summary = calculateSummary(accounts, transactions, currentMonth())
  // Los dos grupos reflejan el modelo contable mínimo: patrimonio disponible frente a deuda.
  const groups = [
    { title: 'Dinero disponible', kind: 'asset', description: 'Efectivo, bancos y billeteras que son tuyos.' },
    { title: 'Deudas', kind: 'liability', description: 'Tarjetas, préstamos y otras obligaciones pendientes.' },
  ]

  return (
    <div className="route-stack">
      <PageHeader title="Cuentas" subtitle="Activos y deudas se muestran por separado." action={<button className="button button--quiet" onClick={() => setOpen(true)}><Plus /> Agregar</button>} />
      <section className="account-summary"><div><span>Activos registrados</span><strong>{formatMinor(summary.assets, 'COP', settings.hiddenAmounts)}</strong></div><div><span>Deuda registrada</span><strong>{formatMinor(summary.debt, 'COP', settings.hiddenAmounts)}</strong></div><div><span>Posición neta</span><strong>{formatMinor(summary.net, 'COP', settings.hiddenAmounts)}</strong></div></section>
      {groups.map(({ title, kind, description }) => <section key={kind}><div className="section-heading"><div><h2>{title}</h2><p>{description}</p></div></div><div className="account-list">{accounts.filter((item) => item.kind === kind && !item.archived).map((item) => <article className="account-row" key={item.id}><span className="account-row__icon">{kind === 'asset' ? <Landmark /> : <CreditCard />}</span><div><h3>{item.name}</h3><p>{accountTypeLabel(item)}</p></div><strong>{formatMinor(summary.balances[item.id] || 0, 'COP', settings.hiddenAmounts)}</strong><button className="icon-button icon-button--small" aria-label={`Editar ${item.name}`} onClick={() => setEditingAccount(item)}><Pencil /></button><button className="icon-button icon-button--small" aria-label={`Archivar ${item.name}`} onClick={async () => { if (!confirm(`¿Archivar ${item.name}? Sus movimientos se conservarán.`)) return; await actions.updateAccount(item.id, { archived: true }); notify('Cuenta archivada') }}><Trash2 /></button></article>)}</div></section>)}
      <AnimatePresence>{open && <AccountDialog close={() => setOpen(false)} />}</AnimatePresence>
      <AnimatePresence>{editingAccount && <AccountEditDialog account={editingAccount} close={() => setEditingAccount(null)} />}</AnimatePresence>
    </div>
  )
}
