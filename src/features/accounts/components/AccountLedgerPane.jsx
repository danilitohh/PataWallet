import { CreditCard, Landmark, Pencil, Plus, Trash2 } from 'lucide-react'
import { useApp } from '../../../app/AppContext.jsx'
import { debtScheduleLabel } from '../../../domain/debtSchedule.js'
import { formatMinor } from '../../../domain/money.js'
import { NightIcon } from '../../../shared/components/NightIcon.jsx'
import { accountTypeLabel } from '../model/accountTypes.js'

const GROUPS = {
  asset: { eyebrow: 'ACTIVOS', title: 'Dinero disponible', tone: 'asset', icon: Landmark },
  liability: { eyebrow: 'OBLIGACIONES', title: 'Deudas', tone: 'debt', icon: CreditCard },
}

// Agrupa activos y pasivos con sus acciones para mantener claro el saldo de cada cuenta.
export function AccountLedgerPane({ kind, accounts, amount, balances, hidden, onAdd, onEdit }) {
  const { actions, notify } = useApp()
  const group = GROUPS[kind]

  // Archiva tras confirmación y conserva los movimientos ligados a la cuenta.
  const archive = async (account) => {
    if (!confirm(`¿Archivar ${account.name}? Sus movimientos se conservarán.`)) return
    await actions.updateAccount(account.id, { archived: true })
    notify('Cuenta archivada')
  }

  return (
    <section className={`accounts-ledger__pane accounts-ledger__pane--${group.tone}`}>
      <header className="accounts-ledger__pane-heading">
        <div><span className="accounts-ledger__eyebrow">{group.eyebrow}</span><h2>{group.title}</h2></div>
        <strong>{formatMinor(amount, 'COP', hidden)}</strong>
      </header>
      {accounts.length ? <div className="account-list">
        {accounts.map((account) => <AccountRow key={account.id} account={account} kind={kind} balance={balances[account.id] || 0} hidden={hidden} onEdit={onEdit} onArchive={archive} />)}
      </div> : <div className="accounts-ledger__empty">
        <p>{kind === 'asset' ? 'Aún no hay dinero disponible registrado.' : 'No tienes deudas registradas.'}</p>
        <button type="button" className="accounts-ledger__inline-add" onClick={onAdd}><Plus aria-hidden="true" /> Agregar {kind === 'asset' ? 'cuenta' : 'deuda'}</button>
      </div>}
      {!!accounts.length && <button type="button" className="accounts-ledger__inline-add" onClick={onAdd}><Plus aria-hidden="true" /> Agregar {kind === 'asset' ? 'cuenta' : 'deuda'}</button>}
    </section>
  )
}

// Mantiene saldo, tipo y acciones legibles en el espacio compacto de cada panel.
function AccountRow({ account, kind, balance, hidden, onEdit, onArchive }) {
  const Icon = GROUPS[kind].icon
  const schedule = kind === 'liability' ? debtScheduleLabel(account, (value) => formatMinor(value, 'COP', hidden)) : null
  return <article className="account-row">
    <NightIcon icon={Icon} className="account-row__icon" tone={kind === 'asset' ? 'sky' : 'violet'} />
    <div><h3>{account.name}</h3><p>{accountTypeLabel(account)}</p>{schedule && <small className="account-row__schedule">{schedule}</small>}</div>
    <strong>{formatMinor(balance, 'COP', hidden)}</strong>
    <button type="button" className="icon-button icon-button--small account-row__action--edit" aria-label={`Editar ${account.name}`} onClick={() => onEdit(account)}><Pencil aria-hidden="true" /></button>
    <button type="button" className="icon-button icon-button--small account-row__action--archive" aria-label={`Archivar ${account.name}`} onClick={() => onArchive(account)}><Trash2 aria-hidden="true" /></button>
  </article>
}
