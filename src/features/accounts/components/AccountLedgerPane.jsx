import { Banknote, CreditCard, Landmark, Pencil, Plus, Trash2, Wallet } from 'lucide-react'
import { useApp } from '../../../app/AppContext.jsx'
import { debtScheduleLabel } from '../../../domain/debtSchedule.js'
import { formatMinor, safeAdd } from '../../../domain/money.js'
import { debtProgress } from '../../../domain/debtProgress.js'
import { Progress } from '../../../shared/components/Progress.jsx'
import { GlassHero, OrbAction } from '../../../shared/components/GlassHero.jsx'
import { NightIcon } from '../../../shared/components/NightIcon.jsx'
import { accountTypeLabel } from '../model/accountTypes.js'

const GROUPS = {
  asset: { eyebrow: 'ACTIVOS', title: 'Dinero disponible', tone: 'asset', icon: Landmark },
  liability: { eyebrow: 'OBLIGACIONES', title: 'Deudas', tone: 'debt', icon: CreditCard },
}

// Agrupa activos y pasivos con sus acciones para mantener claro el saldo de cada cuenta.
export function AccountLedgerPane({ kind, accounts, amount, balances, hidden, onAdd, onEdit }) {
  const { actions, notify, transactions, setSheet } = useApp()
  const group = GROUPS[kind]
  // Agrupa los abonos una sola vez para no recorrer el historial por cada tarjeta.
  const paidByAccount = new Map()
  if (kind === 'liability') for (const item of transactions) {
    if (item.type === 'card_payment' && item.status !== 'void') paidByAccount.set(item.to_account_id, safeAdd(paidByAccount.get(item.to_account_id) || 0, Number(item.amount_minor)))
  }

  // Archiva tras confirmación y conserva los movimientos ligados a la cuenta.
  const archive = async (account) => {
    if (!confirm(`¿Archivar ${account.name}? Sus movimientos se conservarán.`)) return
    await actions.updateAccount(account.id, { archived: true })
    notify('Cuenta archivada')
  }

  return (
    <section className={`accounts-ledger__pane accounts-ledger__pane--${group.tone}`}>
      {kind === 'liability' && <GlassHero><span>Deuda registrada</span><strong className="glass-amount">{formatMinor(amount, 'COP', hidden)}</strong><p>Saldo pendiente en tus cuentas de deuda.</p></GlassHero>}
      <div className="glass-actions"><OrbAction className={kind === 'asset' ? 'accounts-ledger__add' : ''} icon={Plus} onClick={onAdd}>Agregar {kind === 'asset' ? 'cuenta' : 'deuda'}</OrbAction></div>
      <header className="accounts-ledger__pane-heading">
        <div><span className="accounts-ledger__eyebrow">{group.eyebrow}</span><h2>{group.title}</h2></div>
        <strong>{formatMinor(amount, 'COP', hidden)}</strong>
      </header>
      {accounts.length ? <div className="account-list">
        {accounts.map((account) => <AccountRow key={account.id} account={account} kind={kind} balance={balances[account.id] || 0} hidden={hidden} onEdit={onEdit} onArchive={archive} onPayment={() => setSheet(`debt:${account.id}`)} paid={paidByAccount.get(account.id) || 0} />)}
      </div> : <div className="accounts-ledger__empty">
        <p>{kind === 'asset' ? 'Aún no hay dinero disponible registrado.' : 'No tienes deudas registradas.'}</p>
      </div>}
    </section>
  )
}

// Mantiene saldo, tipo y acciones legibles en el espacio compacto de cada panel.
function AccountRow({ account, kind, balance, hidden, onEdit, onArchive, paid, onPayment }) {
  const Icon = kind === 'asset' ? account.subtype === 'cash' ? Banknote : Wallet : GROUPS[kind].icon
  const schedule = kind === 'liability' ? debtScheduleLabel(account, (value) => formatMinor(value, 'COP', hidden)) : null
  // Progreso de solo lectura: usa la misma regla de Parejas y los abonos ya registrados.
  const progress = debtProgress({ ...account, balance_minor: balance, debt_paid_minor: paid })
  return <article className="account-row">
    <NightIcon icon={Icon} className="account-row__icon" tone={kind === 'asset' ? 'sky' : 'violet'} />
    <div><h3>{account.name}</h3><p>{accountTypeLabel(account)}</p>{schedule && <small className="account-row__schedule">{schedule}</small>}</div>
    <strong>{formatMinor(balance, 'COP', hidden)}</strong>
    <details className="account-row__options"><summary aria-label={`Opciones de ${account.name}`}>···</summary><div><button type="button" className="icon-button icon-button--small account-row__action--edit" aria-label={`Editar ${account.name}`} onClick={() => onEdit(account)}><Pencil aria-hidden="true" /></button><button type="button" className="icon-button icon-button--small account-row__action--archive" aria-label={`Archivar ${account.name}`} onClick={() => onArchive(account)}><Trash2 aria-hidden="true" /></button></div></details>
    {kind === 'liability' && <section className="account-row__progress">{hidden ? <small>Avance oculto</small> : progress ? <><Progress value={progress.percent} label={`${progress.percent}% pagado según registros`} /><small>{formatMinor(progress.paid)} abonados · {formatMinor(progress.remaining)} pendientes</small></> : <small>Sin abonos ni deuda pendiente registrados.</small>}<button className="button button--secondary" type="button" onClick={onPayment}>Registrar pago</button></section>}
  </article>
}
