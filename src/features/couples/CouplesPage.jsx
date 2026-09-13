import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Copy, Handshake, Link2, LockKeyhole, Send, ShieldCheck, UserRound, X } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../../app/AppContext.jsx'
import { formatInputAmount, formatMinor, parseLocalizedAmount } from '../../domain/money.js'
import { getCoupleOverview, performCoupleAction } from '../../services/couples/couplesClient.js'
import { PageHeader } from '../../shared/components/PageHeader.jsx'
import { StateMessage } from '../../shared/components/Feedback.jsx'

const emptyOverview = { couples: [], outgoing_invitations: [], incoming_invitations: [] }

export function CouplesPage() {
  const { accounts, isDemo, user, settings, notify } = useApp()
  const location = useLocation()
  const navigate = useNavigate()
  const [overview, setOverview] = useState(emptyOverview)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [email, setEmail] = useState('')
  const [inviteUrl, setInviteUrl] = useState('')

  const reload = useCallback(async () => {
    if (isDemo) return
    setLoading(true)
    setError('')
    try { setOverview(await getCoupleOverview()) } catch (issue) { setError(issue.message) } finally { setLoading(false) }
  }, [isDemo])

  useEffect(() => { reload() }, [reload])

  useEffect(() => {
    const token = new URLSearchParams(location.search).get('invite')
    if (!token || isDemo || busy) return
    setBusy(true)
    performCoupleAction('accept_invite', { token }).then(() => { notify('Cuenta en pareja aceptada'); window.dispatchEvent(new Event('couples:updated')); navigate('/parejas', { replace: true }); return reload() }).catch((issue) => setError(issue.message)).finally(() => setBusy(false))
  }, [busy, isDemo, location.search, navigate, notify, reload])

  if (isDemo) return <div className="route-stack"><PageHeader title="Parejas" subtitle="Comparte solo lo que ambos decidan." /><StateMessage illustration="empty" title="Disponible con una cuenta real" body="Las cuentas en pareja requieren sesión y permisos explícitos. Tus datos de demostración no se comparten." /></div>
  if (loading) return <div className="route-stack"><PageHeader title="Parejas" subtitle="Cargando tu espacio compartido…" /><div className="skeleton skeleton--hero" /></div>
  if (error && !overview.couples.length && !overview.incoming_invitations.length) return <div className="route-stack"><PageHeader title="Parejas" subtitle="Comparte solo lo que ambos decidan." /><StateMessage title="No pudimos cargar Parejas" body={error} actionLabel="Reintentar" action={reload} /></div>

  const active = overview.couples.find((couple) => couple.status === 'active')
  const pending = overview.couples.find((couple) => couple.status === 'pending')
  return <div className="route-stack couples-page">
    <PageHeader title="Parejas" subtitle="Un espacio compartido, sin mezclar tus cuentas personales." />
    {error && <div className="data-warning" role="alert"><p>{error}</p></div>}
    {overview.incoming_invitations.length > 0 && <IncomingInvitations invitations={overview.incoming_invitations} token={new URLSearchParams(location.search).get('invite')} onAccepted={reload} notify={notify} />}
    {!active && <InvitePanel email={email} setEmail={setEmail} pending={pending} inviteUrl={inviteUrl} busy={busy} onInvite={async () => { setBusy(true); setError(''); try { const response = await performCoupleAction('invite', { email }); setInviteUrl(response.result?.invite_url || ''); setEmail(''); notify(response.result?.invite_url ? 'Invitación creada: copia el enlace para compartirlo.' : 'Invitación creada. Configura APP_ORIGIN para generar el enlace.'); window.dispatchEvent(new Event('couples:updated')); await reload() } catch (issue) { setError(issue.message) } finally { setBusy(false) } }} />}
    {active && <ActiveCouple couple={active} accounts={accounts} settings={settings} user={user} busy={busy} setBusy={setBusy} reload={reload} notify={notify} />}
    {overview.outgoing_invitations.filter((item) => item.status === 'pending').map((item) => <div className="couple-invite-status" key={item.id}><Send /><div><strong>Invitación pendiente</strong><p>{item.invitee_email} · vence {new Date(item.expires_at).toLocaleDateString('es-CO')}</p></div></div>)}
  </div>
}

function InvitePanel({ email, setEmail, pending, inviteUrl, busy, onInvite }) {
  return <section className="feature-panel couple-card"><div className="couple-card__icon"><Handshake /></div><h2>Invita a tu pareja</h2><p>La otra persona tendrá que aceptar. Después, cada uno elegirá qué cuentas o deudas compartir.</p><form onSubmit={(event) => { event.preventDefault(); onInvite() }} className="couple-form"><label>Correo de tu pareja<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="pareja@ejemplo.com" required /></label><button className="button button--primary" disabled={busy}><Send /> {busy ? 'Creando…' : 'Crear invitación'}</button></form>{pending && <p className="couple-muted">Ya hay una invitación pendiente. Cuando la acepten, aparecerá aquí el espacio compartido.</p>}{inviteUrl && <CopyInviteLink inviteUrl={inviteUrl} />}</section>
}

function CopyInviteLink({ inviteUrl }) {
  const [copied, setCopied] = useState(false)
  return <div className="couple-invite-link"><input readOnly value={inviteUrl} aria-label="Enlace de invitación" /><button type="button" className="icon-button" aria-label="Copiar enlace de invitación" onClick={async () => { await navigator.clipboard?.writeText(inviteUrl); setCopied(true) }}><Copy /></button>{copied && <small>Copiado</small>}</div>
}

function IncomingInvitations({ invitations, token, onAccepted, notify }) {
  const [busyId, setBusyId] = useState('')
  return <section className="feature-panel couple-card"><h2>Invitaciones recibidas</h2>{invitations.map((item) => <div className="couple-incoming" key={item.id}><div><strong>Invitación a compartir finanzas</strong><p>Válida hasta {new Date(item.expires_at).toLocaleDateString('es-CO')}</p></div><button className="button button--primary" disabled={busyId === item.id || !token} onClick={async () => { setBusyId(item.id); try { await performCoupleAction('accept_invite', { token }); notify('Invitación aceptada'); await onAccepted(); window.dispatchEvent(new Event('couples:updated')) } finally { setBusyId('') } }}>Aceptar</button></div>)}</section>
}

function ActiveCouple({ couple, accounts, settings, user, busy, setBusy, reload, notify }) {
  const [selectedIds, setSelectedIds] = useState(() => new Set(couple.shared_accounts.filter((item) => item.owner_user_id === user?.id).map((item) => item.account_id)))
  const accountKey = (item) => `${item.owner_user_id}::${item.account_id}`
  const [requestAccount, setRequestAccount] = useState(couple.shared_accounts[0] ? accountKey(couple.shared_accounts[0]) : '')
  const [requestType, setRequestType] = useState('account_adjustment')
  const [direction, setDirection] = useState('increase')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [monthlyPayment, setMonthlyPayment] = useState('')
  const ownAccounts = accounts.filter((account) => !account.archived)
  const sharedById = useMemo(() => new Set(couple.shared_accounts.filter((item) => item.owner_user_id === user?.id).map((item) => item.account_id)), [couple.shared_accounts, user?.id])
  const selectedShared = couple.shared_accounts.find((item) => accountKey(item) === requestAccount)
  const selectedAccount = selectedShared?.account
  const toggle = (accountId) => setSelectedIds((current) => { const next = new Set(current); next.has(accountId) ? next.delete(accountId) : next.add(accountId); return next })
  const saveSharing = async () => { setBusy(true); try { for (const account of ownAccounts) { const shouldShare = selectedIds.has(account.id); const isShared = sharedById.has(account.id); if (shouldShare && !isShared) await performCoupleAction('share_account', { couple_id: couple.id, account_id: account.id }); if (!shouldShare && isShared) await performCoupleAction('unshare_account', { couple_id: couple.id, account_id: account.id }) } notify('Cuentas compartidas actualizadas'); await reload() } catch (issue) { notify(issue.message) } finally { setBusy(false) } }
  const createRequest = async (event) => { event.preventDefault(); setBusy(true); try { const payload = requestType === 'account_adjustment' ? { amount_minor: parseLocalizedAmount(amount), direction, note } : { debt_monthly_payment_minor: parseLocalizedAmount(monthlyPayment) }; const [owner_user_id, account_id] = requestAccount.split('::'); await performCoupleAction('create_change_request', { couple_id: couple.id, owner_user_id, account_id, change_type: requestType, payload }); setAmount(''); setMonthlyPayment(''); setNote(''); notify('Solicitud enviada para aprobación'); await reload() } catch (issue) { notify(issue.message) } finally { setBusy(false) } }
  const review = async (requestId, decision) => { setBusy(true); try { await performCoupleAction('review_change_request', { request_id: requestId, decision }); notify(decision === 'approve' ? 'Cambio aprobado y aplicado' : 'Solicitud rechazada'); await reload() } catch (issue) { notify(issue.message) } finally { setBusy(false) } }
  return <>
    <section className="feature-panel couple-card"><div className="couple-card__heading"><div><h2><ShieldCheck /> Espacio compartido</h2><p>Ambos tienen que aprobar los cambios propuestos.</p></div><span className="couple-status"><Check /> Activo</span></div><div className="couple-members"><span><UserRound /> Tú</span><span><UserRound /> Tu pareja</span></div></section>
    <section className="feature-panel couple-card"><div className="section-heading"><div><h2>Qué compartes</h2><p>Selecciona solo tus cuentas. Tu pareja hará lo mismo con las suyas.</p></div></div><div className="couple-account-picker">{ownAccounts.length ? ownAccounts.map((account) => <label key={account.id}><input type="checkbox" checked={selectedIds.has(account.id)} onChange={() => toggle(account.id)} /><span><strong>{account.name}</strong><small>{account.kind === 'liability' ? 'Deuda' : 'Cuenta'}</small></span></label>) : <p>No tienes cuentas activas para compartir.</p>}</div><button className="button button--secondary" disabled={busy} onClick={saveSharing}>Guardar selección</button></section>
    <section className="feature-panel couple-card"><div className="section-heading"><div><h2>Lo que ven juntos</h2><p>Los saldos se calculan con el libro contable del propietario.</p></div><LockKeyhole /></div><div className="shared-account-list">{couple.shared_accounts.length ? couple.shared_accounts.map((item) => <article key={`${item.owner_user_id}:${item.account_id}`}><div><strong>{item.account.name}</strong><small>{item.owner_label} · {item.account.kind === 'liability' ? 'Deuda' : 'Cuenta'}</small></div><strong>{formatMinor(item.account.balance_minor, item.account.currency || 'COP', settings.hiddenAmounts)}</strong></article>) : <p>Aún no han seleccionado cuentas para compartir.</p>}</div></section>
    {couple.shared_accounts.length > 0 && <section className="feature-panel couple-card"><div className="section-heading"><div><h2>Proponer un cambio</h2><p>El saldo no cambia hasta que la otra persona lo apruebe.</p></div><Link2 /></div><form onSubmit={createRequest} className="couple-form"><label>Cuenta compartida<select value={requestAccount} onChange={(event) => { setRequestAccount(event.target.value); setRequestType('account_adjustment') }}>{couple.shared_accounts.map((item) => <option key={accountKey(item)} value={accountKey(item)}>{item.account.name} · {item.owner_label}</option>)}</select></label><label>Tipo de cambio<select value={requestType} onChange={(event) => setRequestType(event.target.value)}><option value="account_adjustment">Ajustar saldo</option>{selectedAccount?.kind === 'liability' && <option value="account_update">Cambiar cuota mensual</option>}</select></label>{requestType === 'account_adjustment' ? <><label>Monto<input inputMode="decimal" value={amount} onChange={(event) => setAmount(formatInputAmount(event.target.value))} placeholder="100.000" required /></label><label>Dirección<select value={direction} onChange={(event) => setDirection(event.target.value)}><option value="increase">Aumenta el saldo</option><option value="decrease">Disminuye el saldo</option></select></label><label>Nota (opcional)<input value={note} onChange={(event) => setNote(event.target.value)} maxLength="160" placeholder="Ej. Pago realizado" /></label></> : <label>Cuota mensual<input inputMode="decimal" value={monthlyPayment} onChange={(event) => setMonthlyPayment(formatInputAmount(event.target.value))} placeholder="300.000" required /></label>}<button className="button button--primary" disabled={busy}>Enviar para aprobación</button></form></section>}
    <section className="feature-panel couple-card"><div className="section-heading"><div><h2>Solicitudes</h2><p>Revisa y aprueba cambios pendientes.</p></div></div><div className="couple-request-list">{couple.requests.length ? couple.requests.map((request) => <article key={request.id}><div><strong>{request.change_type === 'account_update' ? 'Cambio de cuota' : request.payload.direction === 'increase' ? 'Ajuste al alza' : 'Ajuste a la baja'} · {request.account_name}</strong><small>{request.status === 'pending' ? 'Pendiente de revisión' : request.status === 'approved' ? 'Aprobada' : request.status === 'conflict' ? 'No se pudo aplicar: cambió la cuenta' : 'Rechazada'}</small></div>{request.status === 'pending' && request.proposer_id !== user?.id && <div><button className="icon-button" aria-label="Aprobar solicitud" disabled={busy} onClick={() => review(request.id, 'approve')}><Check /></button><button className="icon-button" aria-label="Rechazar solicitud" disabled={busy} onClick={() => review(request.id, 'reject')}><X /></button></div>}</article>) : <p>No hay solicitudes todavía.</p>}</div></section>
  </>
}
