import { useCallback, useEffect, useState } from 'react'
import { Mail } from 'lucide-react'
import { useApp } from '../../app/AppContext.jsx'
import { IntegrationsHeader } from '../integrations/components/IntegrationsHeader.jsx'
import { GlassHero } from '../../shared/components/GlassHero.jsx'
import { NightIcon } from '../../shared/components/NightIcon.jsx'
import { formatMinor } from '../../domain/money.js'
import { bankEmailRequest, resolveBankEmail } from '../../services/bank-email/bankEmailClient.js'
import { BankEmailReview } from './BankEmailReview.jsx'
import { MailConnections } from './MailConnections.jsx'
import './bank-email.css'

// Aísla todo estado de recepción al cambiar de usuario y evita peticiones en la demo.
export function BankEmailPage() {
  const app = useApp()
  return <BankEmailContent key={app.user?.id || 'demo'} app={app} />
}

// Bandeja de recepción, no de sincronización bancaria. Refresca al regresar y mediante acción explícita.
function BankEmailContent({ app }) {
  const { isDemo, accounts, categories, transactions, settings, actions, notify } = app
  const [data, setData] = useState({ configured: false, inbox: null, events: [], has_more: false })
  const [loading, setLoading] = useState(!isDemo)
  const [error, setError] = useState('')
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [page, setPage] = useState(0)
  const refresh = useCallback(async () => {
    if (isDemo) return
    setLoading(true); setError('')
    try {
      setData(await bankEmailRequest('GET', page))
      window.dispatchEvent(new Event('patawallet:notifications-changed'))
    } catch (issue) { setError(issue.message) } finally { setLoading(false) }
  }, [isDemo, page])
  useEffect(() => { refresh() }, [refresh])
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') refresh() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [refresh])

  // Activar expresa consentimiento; desactivar invalida recepción, no elimina movimientos guardados.
  const changeConnection = async (method) => {
    setBusy(true); setError('')
    try { await bankEmailRequest(method); await refresh() } catch (issue) { setError(issue.message) } finally { setBusy(false) }
  }
  const resolve = async (...args) => {
    await resolveBankEmail(...args)
    await refresh()
    try { await actions.retrySync() } catch { notify('Decisión guardada. Reintenta la sincronización para actualizar tus saldos.'); return }
    notify('Decisión guardada')
  }
  return <div className="route-stack bank-email-page">
    <IntegrationsHeader title="Correos bancarios" subtitle="Conecta tu correo o reenvía avisos bancarios. Revisa cada movimiento antes de registrarlo." />
    <MailConnections isDemo={isDemo} onImported={refresh} />
    <section className="integration-card">
      <GlassHero className="integration-glass-hero"><NightIcon icon={Mail} className="integration-icon" /><h2>Reenvío como alternativa</h2><p>Esta opción no da acceso a tu buzón.</p></GlassHero>
      <p className="status-label">{isDemo ? 'Demostración · sin conexión' : loading ? 'Comprobando recepción…' : error ? 'Estado no disponible' : !data.configured ? 'Configuración pendiente' : data.inbox?.enabled ? 'Dirección habilitada · revisión manual' : 'Recepción desactivada'}</p>
      <p>La recepción es automática después de configurar el reenvío. Esta primera versión no cambia saldos hasta que confirmes. La firma del proveedor no demuestra que el correo sea auténtico del banco.</p>
      {!isDemo && !loading && !error && !data.configured && <p>Falta configurar el servicio receptor. No hay una dirección disponible todavía.</p>}
      {!isDemo && <button className="button button--secondary" disabled={loading || busy} onClick={refresh}>Actualizar recepción</button>}
      {error && <p role="alert" className="form-error">{error}</p>}
    </section>
    {!isDemo && data.configured && <section className="integration-card">
      <h2>Tu dirección de reenvío</h2>
      {data.inbox?.enabled ? <>
        <label className="field"><span>Copia esta dirección privada</span><input readOnly value={data.inbox.address} onFocus={(event) => event.target.select()} /></label>
        <p>No la publiques. Úsala únicamente para los filtros de correos bancarios.</p>
        {data.inbox.verification_code && <p role="status">Código recibido para confirmar el reenvío en Gmail: <strong>{data.inbox.verification_code}</strong>. No activa ni verifica un banco.</p>}
        <p>Último correo bancario recibido: {data.inbox.last_received_at ? new Date(data.inbox.last_received_at).toLocaleString('es-CO', { timeZone: 'America/Bogota' }) : 'Sin registro'}.</p>
        <button className="button button--secondary" disabled={busy} onClick={() => { if (confirm('¿Desactivar la recepción? Tus movimientos se conservan. También debes retirar los filtros de reenvío en Gmail.')) changeConnection('DELETE') }}>Desactivar recepción</button>
      </> : <>
        <p>Los correos que reenvíes serán procesados por Resend y PataWallet. Guardamos los datos extraídos para revisión, no el cuerpo completo en PataWallet. Resend puede conservar el correo según su configuración y política. No enviamos estos correos a la IA.</p>
        <label className="check-row"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /> Autorizo el procesamiento de los correos bancarios que reenvíe.</label>
        <button className="button button--primary" disabled={!consent || busy} onClick={() => changeConnection('POST')}>Crear dirección privada</button>
      </>}
    </section>}
    <section className="integration-card">
      <h2>Cómo configurar el reenvío en Gmail</h2>
      <ol><li>Crea tu dirección privada cuando el receptor esté disponible.</li><li>En Gmail desde un computador, abre Configuración → Ver todos los ajustes → Reenvío y correo POP/IMAP. Añade esa dirección.</li><li>Vuelve aquí y pulsa «Actualizar recepción». Introduce en Gmail el código de confirmación recibido. Si no aparece, revisa el mensaje de verificación en el receptor con el administrador.</li><li>Deja desactivado el reenvío general. Crea filtros específicos para los remitentes bancarios y los asuntos de movimientos; selecciona «Reenviarlo a» tu dirección privada.</li><li>Comprueba el siguiente correo habitual. No hagas un pago innecesario para probar.</li></ol>
      <p>Retira los filtros en Gmail si desactivas esta función. PataWallet no puede cambiarlos por ti.</p>
    </section>
    {!isDemo && <section className="integration-card" aria-busy={loading}>
      <h2>Por revisar</h2><p>El envío y la recepción pueden describir una misma transferencia. Puedes vincular ambos al movimiento existente.</p>
      {!data.events.length && <p>{loading ? 'Cargando…' : 'No hay correos pendientes en esta página.'}</p>}
      {data.events.map((item) => <details className="calm-details" key={item.id}><summary>{item.candidate.counterparty || item.bank} · {item.candidate.amount_minor ? formatMinor(item.candidate.amount_minor, 'COP', settings.hiddenAmounts) : 'Monto por confirmar'}</summary><p>Banco: {item.bank}. {item.candidate.direction === 'incoming' ? 'Aviso de entrada' : item.candidate.direction === 'outgoing' ? 'Aviso de salida' : 'Formato no reconocido'}. Moneda y cuentas por confirmar.</p><BankEmailReview item={item} accounts={accounts} categories={categories} transactions={transactions} hidden={settings.hiddenAmounts} resolve={resolve} /></details>)}
      <div className="notification-actions"><button className="button button--secondary" disabled={!page || loading} onClick={() => setPage(page - 1)}>Anterior</button><span>Página {page + 1}</span><button className="button button--secondary" disabled={!data.has_more || loading} onClick={() => setPage(page + 1)}>Siguiente</button></div>
    </section>}
  </div>
}
