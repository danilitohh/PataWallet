import { useCallback, useEffect, useState } from 'react'
import { Copy, Handshake, Send } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../../app/AppContext.jsx'
import { NightIcon } from '../../shared/components/NightIcon.jsx'
import { ActiveCouple } from './components/ActiveCouple.jsx'
import { getCoupleOverview, performCoupleAction } from '../../services/couples/couplesClient.js'
import { PageHeader } from '../../shared/components/PageHeader.jsx'
import { StateMessage } from '../../shared/components/Feedback.jsx'

const emptyOverview = { couples: [], outgoing_invitations: [], incoming_invitations: [] }

// Conserva invitaciones y carga autenticada; Serena solo cambia la presentación del espacio activo.
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
  // Las recargas no desmontan diálogos ni borradores que aún deben mostrar un error recuperable.
  if (loading && overview === emptyOverview) return <div className="route-stack"><PageHeader title="Parejas" subtitle="Cargando tu espacio compartido…" /><div className="skeleton skeleton--hero" /></div>
  if (error && !overview.couples.length && !overview.incoming_invitations.length) return <div className="route-stack"><PageHeader title="Parejas" subtitle="Comparte solo lo que ambos decidan." /><StateMessage title="No pudimos cargar Parejas" body={error} actionLabel="Reintentar" action={reload} /></div>

  const active = overview.couples.find((couple) => couple.status === 'active')
  const pending = overview.couples.find((couple) => couple.status === 'pending')
  return <div className="route-stack couples-page">
    {!active && <PageHeader title="Parejas" subtitle="Comparte solo lo que ambos decidan." />}
    {error && <div className="data-warning" role="alert"><p>{error}</p></div>}
    {overview.incoming_invitations.length > 0 && <IncomingInvitations invitations={overview.incoming_invitations} token={new URLSearchParams(location.search).get('invite')} onAccepted={reload} notify={notify} />}
    {!active && <InvitePanel email={email} setEmail={setEmail} pending={pending} inviteUrl={inviteUrl} busy={busy} onInvite={async () => { setBusy(true); setError(''); try { const response = await performCoupleAction('invite', { email }); setInviteUrl(response.result?.invite_url || ''); setEmail(''); notify(response.result?.invite_url ? 'Invitación creada: copia el enlace para compartirlo.' : 'Invitación creada. Configura APP_ORIGIN para generar el enlace.'); window.dispatchEvent(new Event('couples:updated')); await reload() } catch (issue) { setError(issue.message) } finally { setBusy(false) } }} />}
    {active && <ActiveCouple key={active.id} couple={active} accounts={accounts} settings={settings} user={user} busy={busy} setBusy={setBusy} reload={reload} notify={notify} />}
    {overview.outgoing_invitations.filter((item) => item.status === 'pending').map((item) => <div className="couple-invite-status" key={item.id}><Send /><div><strong>Invitación pendiente</strong><p>{item.invitee_email} · vence {new Date(item.expires_at).toLocaleDateString('es-CO')}</p></div></div>)}
  </div>
}

function InvitePanel({ email, setEmail, pending, inviteUrl, busy, onInvite }) {
  return <section className="feature-panel couple-card"><NightIcon icon={Handshake} className="couple-card__icon" tone="rose" /><h2>Invita a tu pareja</h2><p>La otra persona tendrá que aceptar. Después, cada uno elegirá qué cuentas o deudas compartir.</p><form onSubmit={(event) => { event.preventDefault(); onInvite() }} className="couple-form"><label>Correo de tu pareja<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="pareja@ejemplo.com" required /></label><button className="button button--primary" disabled={busy}><Send /> {busy ? 'Creando…' : 'Crear invitación'}</button></form>{pending && <p className="couple-muted">Ya hay una invitación pendiente. Cuando la acepten, aparecerá aquí el espacio compartido.</p>}{inviteUrl && <CopyInviteLink inviteUrl={inviteUrl} />}</section>
}

function CopyInviteLink({ inviteUrl }) {
  const [copied, setCopied] = useState(false)
  return <div className="couple-invite-link"><input readOnly value={inviteUrl} aria-label="Enlace de invitación" /><button type="button" className="icon-button" aria-label="Copiar enlace de invitación" onClick={async () => { await navigator.clipboard?.writeText(inviteUrl); setCopied(true) }}><Copy /></button>{copied && <small>Copiado</small>}</div>
}

function IncomingInvitations({ invitations, token, onAccepted, notify }) {
  const [busyId, setBusyId] = useState('')
  return <section className="feature-panel couple-card"><h2>Invitaciones recibidas</h2>{invitations.map((item) => <div className="couple-incoming" key={item.id}><div><strong>Invitación a compartir finanzas</strong><p>Válida hasta {new Date(item.expires_at).toLocaleDateString('es-CO')}</p></div><button className="button button--primary" disabled={busyId === item.id || !token} onClick={async () => { setBusyId(item.id); try { await performCoupleAction('accept_invite', { token }); notify('Invitación aceptada'); await onAccepted(); window.dispatchEvent(new Event('couples:updated')) } finally { setBusyId('') } }}>Aceptar</button></div>)}</section>
}
