import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { mailRequest } from '../../services/mail/mailClient.js'

const NAMES = { gmail: 'Gmail', outlook: 'Outlook / Hotmail' }
const BANKS = { lulo: 'Lulo', bancolombia: 'Bancolombia', nequi: 'Nequi' }
const STATUS = { disconnected: 'Sin conectar', pending: 'Autorización pendiente', connected: 'Correo vinculado', reauthorize: 'Necesita nueva autorización' }

// Conexión del buzón separada del reenvío; no permite simularla en demo ni sin configuración.
export function MailConnections({ isDemo, onImported }) {
  const [providers, setProviders] = useState(Object.keys(NAMES).map((provider) => ({ provider, available: false, status: 'disconnected' })))
  const [banks, setBanks] = useState([])
  const [consent, setConsent] = useState(false)
  const [loading, setLoading] = useState(!isDemo)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [params, setParams] = useSearchParams()
  const callback = params.get('mail')
  useEffect(() => {
    if (isDemo) return
    let active = true
    mailRequest().then((result) => { if (active) setProviders(result.providers) }).catch((issue) => { if (active) setError(issue.message) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [isDemo])
  useEffect(() => {
    if (!callback) return
    // Quita el marcador de retorno; no lo usa como prueba de que exista una cuenta conectada.
    setMessage(callback === 'cancelled' ? 'Autorización cancelada. No se importó ningún correo.' : callback === 'error' ? 'No se completó la autorización. Reintenta la conexión.' : 'Autorización procesada. Comprueba abajo el estado de la cuenta.')
    setParams({}, { replace: true })
  }, [callback, setParams])

  // Cambios explícitos; errores conservan selección y la bandeja financiera existente.
  const act = async (operation, provider) => {
    setBusy(provider || 'status'); setError(''); setMessage('')
    try {
      const result = await mailRequest(operation, operation === 'status' ? undefined : { provider, ...(operation === 'connect' ? { banks, consent } : {}) }, operation === 'disconnect' ? 'DELETE' : 'POST')
      if (operation === 'status') { setProviders(result.providers); return }
      if (operation === 'connect') { window.location.assign(result.url); return }
      if (operation === 'sync') {
        setMessage(`${result.added} correos nuevos por revisar.${result.has_more ? ' Hay más: espera 30 segundos y continúa la búsqueda.' : ' Búsqueda completada.'} No se modificaron saldos.`)
        await onImported()
      } else setMessage('Acceso local eliminado. Retira también el permiso en tu cuenta de Google o Microsoft. Los movimientos se conservan.')
      setProviders((await mailRequest()).providers)
    } catch (issue) { setError(issue.message) } finally { setBusy('') }
  }
  return <section className="integration-card mail-connections" aria-busy={loading}>
    <h2>Conecta tu correo</h2>
    <p>Sin configurar reenvíos. El permiso de lectura abarca tu buzón; PataWallet buscará avisos de los bancos que selecciones. No enviará ni borrará mensajes, ni usará estos correos con IA.</p>
    <p>La primera búsqueda cubre los últimos 7 días y después retoma la búsqueda anterior. Si la detección automática está activa, los nuevos avisos pueden llegar sin abrir la app; el botón manual sigue disponible.</p>
    {isDemo ? <p>Demostración: no se conecta ninguna cuenta de correo.</p> : <>
      <fieldset disabled={Boolean(busy)}><legend>Bancos para una nueva conexión</legend>{Object.entries(BANKS).map(([id, name]) => <label key={id} className="check-row"><input type="checkbox" checked={banks.includes(id)} onChange={(event) => setBanks(event.target.checked ? [...banks, id] : banks.filter((bank) => bank !== id))} />{name}</label>)}</fieldset>
      <label className="check-row"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />Autorizo la lectura para buscar avisos de estos bancos y guardar los datos extraídos para revisión.</label>
    </>}
    {providers.map((item) => <div className="mail-connection" key={item.provider}>
      <h3>{NAMES[item.provider]}</h3>
      <p>{loading ? 'Comprobando…' : !item.available ? 'Configuración del proveedor pendiente' : STATUS[item.status]}</p>
      {item.mailbox && <p>{item.mailbox}</p>}
      {item.status === 'connected' && <>
        <p>Bancos: {(item.banks || []).map((id) => BANKS[id]).join(', ')}. Para cambiarlos, desconecta y vuelve a autorizar.</p>
        {item.provider === 'gmail' && <p>{item.automatic ? 'Detección automática activa. Los nuevos correos llegarán como movimientos por revisar.' : 'Detección automática pendiente de configuración del servidor; puedes buscar manualmente.'}</p>}
        <p>Última búsqueda completada: {item.last_sync_at ? new Date(item.last_sync_at).toLocaleString('es-CO', { timeZone: 'America/Bogota' }) : 'Sin registro'}.</p>
        <button className="button button--primary" disabled={!item.available || Boolean(busy) || loading} onClick={() => act('sync', item.provider)}>{busy === item.provider ? 'Procesando…' : item.has_more ? `Continuar búsqueda en ${NAMES[item.provider]}` : `Buscar correos en ${NAMES[item.provider]}`}</button>
      </>}
      {item.status !== 'connected' && <button className="button button--primary" disabled={isDemo || !item.available || !consent || !banks.length || Boolean(busy) || loading} onClick={() => act('connect', item.provider)}>Conectar {NAMES[item.provider]}</button>}
      {!isDemo && item.status !== 'disconnected' && <button className="button button--secondary" disabled={Boolean(busy) || loading} onClick={() => { if (confirm('¿Desconectar este correo? Se eliminarán sus credenciales de PataWallet. Tus movimientos se conservan.')) act('disconnect', item.provider) }}>Desconectar {NAMES[item.provider]}</button>}
    </div>)}
    <p>Yahoo: pendiente de autorización del proveedor. Puedes conservar el reenvío como alternativa.</p>
    {!isDemo && <button className="button button--secondary" disabled={loading || Boolean(busy)} onClick={() => act('status')}>Actualizar conexiones</button>}
    {error && <p role="alert" className="form-error">{error}</p>}
    {message && <p role="status">{message}</p>}
  </section>
}
