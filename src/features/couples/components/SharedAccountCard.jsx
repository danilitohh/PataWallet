import { formatMinor } from '../../../domain/money.js'
import { debtProgress } from '../../../domain/debtProgress.js'
import { CreditCard, Wallet } from 'lucide-react'
import { NightIcon } from '../../../shared/components/NightIcon.jsx'
import './sharedAccountCard.css'

// Separa el saldo de la cuenta del progreso de deuda, respetando la privacidad visual.
export function SharedAccountCard({ item, hiddenAmounts }) {
  const { account } = item
  const progress = debtProgress(account)
  const currency = account.currency || 'COP'
  const percent = progress && new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 }).format(progress.percent)
  return <article className="shared-account-card">
    <div className="shared-account-card__heading"><NightIcon icon={account.kind === 'liability' ? CreditCard : Wallet} tone={account.kind === 'liability' ? 'violet' : 'mint'} /><div><strong>{account.name}</strong><small>{item.owner_label} · {account.kind === 'liability' ? account.balance_minor < 0 ? 'Saldo a favor' : 'Pendiente' : 'Saldo registrado'}</small></div><strong>{formatMinor(account.balance_minor, currency, hiddenAmounts)}</strong></div>
    {account.kind === 'liability' && <div className="shared-debt-progress">
      {hiddenAmounts ? <small>Avance oculto</small> : progress ? <>
        <div className="shared-debt-progress__label"><span>Pagado según registros</span><strong>{percent}%</strong></div>
        <progress max="100" value={progress.percent} aria-label={`Porcentaje pagado de ${account.name}`} aria-valuetext={`${percent}% pagado según registros`} />
        <small>{formatMinor(progress.paid, currency)} abonados · {formatMinor(progress.remaining, currency)} pendientes</small>
      </> : <small>{account.debt_paid_minor === 0 && account.balance_minor <= 0 ? 'Sin deuda pendiente ni abonos registrados' : 'Avance no disponible'}</small>}
    </div>}
  </article>
}
