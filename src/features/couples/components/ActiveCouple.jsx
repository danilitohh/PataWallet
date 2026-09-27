import { useRef, useState } from 'react'
import { Bell, Check, ChevronRight, Heart, Pencil, ShieldCheck, UserRound, X } from 'lucide-react'
import { SimpleDialog } from '../../../shared/components/Modal.jsx'
import { NightIcon } from '../../../shared/components/NightIcon.jsx'
import { formatInputAmount, formatMinor, parseLocalizedAmount } from '../../../domain/money.js'
import { performCoupleAction } from '../../../services/couples/couplesClient.js'
import { SharedAccountCard } from './SharedAccountCard.jsx'
import './couplesSerena.css'

// Incluye al propietario porque los identificadores locales pueden repetirse entre usuarios.
const accountKey = (item) => `${item.owner_user_id}::${item.account_id}`

// Serena prioriza la lectura; compartir y proponer conservan las acciones autorizadas existentes.
export function ActiveCouple({ couple, accounts, settings, user, busy, setBusy, reload, notify }) {
  const [panel, setPanel] = useState(null)
  const [error, setError] = useState('')
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [requestAccount, setRequestAccount] = useState('')
  const [requestType, setRequestType] = useState('account_adjustment')
  const [direction, setDirection] = useState('increase')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [monthlyPayment, setMonthlyPayment] = useState('')
  const requestsRef = useRef(null)
  const ownAccounts = accounts.filter((account) => !account.archived)
  const debts = couple.shared_accounts.filter((item) => item.account.kind === 'liability')
  const money = couple.shared_accounts.filter((item) => item.account.kind === 'asset')
  const pending = couple.requests.filter((request) => request.status === 'pending')
  const selectedAccount = couple.shared_accounts.find((item) => accountKey(item) === requestAccount)?.account

  // Captura también el foco por toque en Safari y prepara la selección desde el último estado remoto.
  const openPanel = (name, event) => {
    event.currentTarget.focus()
    setError('')
    if (name === 'sharing') setSelectedIds(new Set(couple.shared_accounts.filter((item) => item.owner_user_id === user?.id).map((item) => item.account_id)))
    if (name === 'proposal' && !selectedAccount) {
      setRequestAccount(couple.shared_accounts[0] ? accountKey(couple.shared_accounts[0]) : '')
      setRequestType('account_adjustment')
    }
    setPanel(name)
  }
  // Cerrar no cancela la petición ni desmonta su estado; los envíos siguen bloqueados por busy.
  const closePanel = () => setPanel(null)
  const toggle = (id) => setSelectedIds((current) => {
    const next = new Set(current)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  // Solo envía diferencias sobre cuentas propias; conserva la selección si alguna petición falla.
  const saveSharing = async (event) => {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    const shared = new Set(couple.shared_accounts.filter((item) => item.owner_user_id === user?.id).map((item) => item.account_id))
    try {
      for (const account of ownAccounts) {
        if (selectedIds.has(account.id) === shared.has(account.id)) continue
        await performCoupleAction(selectedIds.has(account.id) ? 'share_account' : 'unshare_account', { couple_id: couple.id, account_id: account.id })
      }
      setPanel(null)
      notify('Cuentas compartidas actualizadas')
    } catch (issue) { setError(issue.message) }
    finally { await reload(); setBusy(false) }
  }

  // Una propuesta no modifica saldos: el servidor sigue exigiendo la aprobación de la otra persona.
  const createRequest = async (event) => {
    event.preventDefault()
    if (busy || !selectedAccount) return
    setBusy(true)
    setError('')
    try {
      const payload = requestType === 'account_adjustment'
        ? { amount_minor: parseLocalizedAmount(amount), direction, note }
        : { debt_monthly_payment_minor: parseLocalizedAmount(monthlyPayment) }
      const [owner_user_id, account_id] = requestAccount.split('::')
      await performCoupleAction('create_change_request', { couple_id: couple.id, owner_user_id, account_id, change_type: requestType, payload })
      setAmount(''); setMonthlyPayment(''); setNote(''); setPanel(null)
      notify('Solicitud enviada para aprobación')
      await reload()
    } catch (issue) { setError(issue.message) }
    finally { setBusy(false) }
  }

  // Revisar conserva la validación y la detección de conflictos de la API, sin cambios optimistas de dinero.
  const review = async (requestId, decision) => {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await performCoupleAction('review_change_request', { request_id: requestId, decision })
      notify(decision === 'approve' ? 'Cambio aprobado y aplicado' : 'Solicitud rechazada')
      await reload()
    } catch (issue) { setError(issue.message) }
    // El botón aprobado puede desaparecer; mantiene el teclado dentro del diálogo.
    finally { setBusy(false); requestsRef.current?.focus() }
  }

  return <div className="couples-serena">
    <header className="couples-serena__intro">
      <div><h1>Parejas</h1><p>Un espacio compartido.<br />Cada cuenta sigue siendo de quien la creó.</p>
        <button className="button button--secondary" onClick={(event) => openPanel('sharing', event)} disabled={busy}>Qué compartimos <ChevronRight aria-hidden="true" /></button>
      </div>
      <div className="couples-serena__members" aria-label="Integrantes del espacio compartido">
        <span><NightIcon icon={UserRound} />Tú</span><Heart className="couples-serena__heart" aria-hidden="true" /><span><NightIcon icon={UserRound} tone="mint" />Tu pareja</span>
      </div>
    </header>

    <div className="couples-serena__groups">
      {[{ title: 'Deudas compartidas', rows: debts, empty: 'Aún no comparten deudas.' }, { title: 'Dinero compartido', rows: money, empty: 'Aún no comparten cuentas de dinero.' }].map(({ title, rows, empty }) => <section className="couples-serena__group" aria-label={title} key={title}>
        <div className="couples-serena__heading"><h2>{title}</h2><span>{rows.length}</span></div>
        <div className="shared-account-list">{rows.length ? rows.map((item) => <SharedAccountCard key={accountKey(item)} item={item} hiddenAmounts={settings.hiddenAmounts} />) : <p className="couples-serena__empty">{empty} Elige qué mostrar en «Qué compartimos».</p>}</div>
      </section>)}
    </div>

    <button className="couples-serena__requests" onClick={(event) => openPanel('requests', event)}>
      <NightIcon icon={Bell} /><span><strong>{pending.length ? `${pending.length} ${pending.length === 1 ? 'solicitud pendiente' : 'solicitudes pendientes'}` : 'Sin solicitudes pendientes'}</strong><small>{pending.length ? 'Revisen los cambios propuestos.' : 'Ver solicitudes e historial.'}</small></span><ChevronRight aria-hidden="true" />
    </button>
    {couple.shared_accounts.length > 0 && <button className="button button--secondary couples-serena__propose" disabled={busy} onClick={(event) => openPanel('proposal', event)}><Pencil aria-hidden="true" /> Proponer un cambio</button>}
    <p className="couples-serena__privacy"><ShieldCheck aria-hidden="true" /> Solo se muestra lo que cada uno decide compartir.</p>
    {debts.length > 0 && <details className="couples-serena__help"><summary>Cómo se calcula el avance</summary><p>Compara los abonos registrados con abonos más deuda pendiente. Nuevas compras pueden reducir el porcentaje; ajustes y devoluciones no cuentan como pagos. No incluye pagos anteriores que no hayas registrado.</p></details>}

    {panel && <SimpleDialog title={panel === 'sharing' ? 'Qué compartimos' : panel === 'proposal' ? 'Proponer un cambio' : 'Solicitudes'} close={closePanel}>
      <div className="couples-serena__dialog">
        {error && <p className="data-warning" role="alert">{error}</p>}
        {panel === 'sharing' && <form className="couple-form" onSubmit={saveSharing}>
          <p>Selecciona tus cuentas. Tu pareja elige las suyas. Dejar de compartir no elimina cuentas ni movimientos.</p>
          <div className="couple-account-picker">{ownAccounts.length ? ownAccounts.map((account) => <label key={account.id}><input type="checkbox" checked={selectedIds.has(account.id)} disabled={busy} onChange={() => toggle(account.id)} /><span><strong>{account.name}</strong><small>{account.kind === 'liability' ? 'Deuda' : 'Cuenta'}</small></span></label>) : <p>No tienes cuentas activas para compartir. Puedes crearlas desde Cuentas.</p>}</div>
          <button className="button button--primary" disabled={busy || !ownAccounts.length}>{busy ? 'Guardando…' : 'Guardar selección'}</button>
        </form>}
        {panel === 'proposal' && <form onSubmit={createRequest} className="couple-form">
          <p>El saldo no cambia hasta que la otra persona lo apruebe. Para registrar un pago, usa «Pagué una deuda» en Nuevo movimiento.</p>
          <label>Cuenta compartida<select disabled={busy} value={requestAccount} onChange={(event) => { setRequestAccount(event.target.value); setRequestType('account_adjustment') }}>{couple.shared_accounts.map((item) => <option key={accountKey(item)} value={accountKey(item)}>{item.account.name} · {item.owner_label}</option>)}</select></label>
          <label>Tipo de cambio<select disabled={busy} value={requestType} onChange={(event) => setRequestType(event.target.value)}><option value="account_adjustment">Ajustar saldo</option>{selectedAccount?.kind === 'liability' && <option value="account_update">Cambiar cuota mensual</option>}</select></label>
          {requestType === 'account_adjustment' ? <>
            <label>Monto<input disabled={busy} inputMode="decimal" value={amount} onChange={(event) => setAmount(formatInputAmount(event.target.value))} placeholder="100.000" required /></label>
            <label>Dirección<select disabled={busy} value={direction} onChange={(event) => setDirection(event.target.value)}><option value="increase">Aumenta el saldo</option><option value="decrease">Disminuye el saldo</option></select></label>
            <label>Nota (opcional)<input disabled={busy} value={note} onChange={(event) => setNote(event.target.value)} maxLength="160" placeholder="Motivo del ajuste" /></label>
          </> : <label>Cuota mensual<input disabled={busy} inputMode="decimal" value={monthlyPayment} onChange={(event) => setMonthlyPayment(formatInputAmount(event.target.value))} placeholder="300.000" required /></label>}
          <button className="button button--primary" disabled={busy || !selectedAccount}>{busy ? 'Enviando…' : 'Enviar para aprobación'}</button>
        </form>}
        {panel === 'requests' && <div ref={requestsRef} tabIndex="-1" className="couple-request-list couples-serena__request-list">
          <p>Los cambios necesitan la aprobación de la otra persona.</p>
          {couple.requests.length ? couple.requests.map((request) => <article key={request.id}>
            <div><strong>{request.change_type === 'account_update' ? 'Cambio de cuota' : request.payload.direction === 'increase' ? 'Ajuste al alza' : 'Ajuste a la baja'} · {request.account_name}</strong>
              <span>{formatMinor(request.payload.amount_minor ?? request.payload.debt_monthly_payment_minor, settings.currency || 'COP', settings.hiddenAmounts)}</span>
              <small>{request.status === 'pending' ? request.proposer_id === user?.id ? 'Esperando a tu pareja' : 'Pendiente de tu revisión' : request.status === 'approved' ? 'Aprobada' : request.status === 'conflict' ? 'No se pudo aplicar: cambió la cuenta' : 'Rechazada'}</small>
            </div>
            {request.status === 'pending' && request.proposer_id !== user?.id && <div><button className="button button--secondary" disabled={busy} onClick={() => review(request.id, 'approve')}><Check aria-hidden="true" /> Aprobar</button><button className="button button--secondary" disabled={busy} onClick={() => review(request.id, 'reject')}><X aria-hidden="true" /> Rechazar</button></div>}
          </article>) : <p>No hay solicitudes todavía.</p>}
        </div>}
      </div>
    </SimpleDialog>}
  </div>
}
