import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { mailRequest } from '../../services/mail/mailClient.js'

const NAMES = { gmail: 'Gmail', outlook: 'Outlook / Hotmail' }
const BANKS = { lulo: 'Lulo', bancolombia: 'Bancolombia', nequi: 'Nequi' }
const STATUS = { disconnected: 'Sin conectar', pending: 'Autorización pendiente', connected: 'Correo vinculado', reauthorize: 'Necesita nueva autorización' }

// Conexión del buzón separada del reenvío; no permite simularla en demo ni sin configuración.
export function MailConnections({ isDemo, onImported }) {
  const [providers, setProviders] = useState(Object.keys(NAMES).map((provider) => ({ provider, available: false, status: 'disconnected' })))
  const [aiAvailable, setAiAvailable] = useState(false)
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
    mailRequest().then((result) => { if (active) { setProviders(result.providers); setAiAvailable(Boolean(result.aiAvailable)) } }).catch((issue) => { if (active) setError(issue.message) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [isDemo])
  useEffect(() => {
    if (!callback) return
    // Quita el marcador de retorno; no lo usa como prueba de que exista una cuenta conectada.
    setMessage(callback === 'cancelled' ? 'Autorización cancelada. No se importó ningún correo.' : callback === 'error' ? 'No se completó la autorización. Reintenta la conexión.' : 'Autorización procesada. Comprueba abajo el estado de la cuenta.')
    setParams({}, { replace: true })
  }, [callback, setParams])

  // Cambios explícitos; errores conservan selección y la bandeja financiera existente.
  const act = async (operation, provider, options = {}) => {
    setBusy(provider || 'status'); setError(''); setMessage('')
    try {
      const result = await mailRequest(operation, operation === 'status' ? undefined : { provider, ...(operation === 'connect' ? { banks, consent } : {}), ...(operation === 'ai-consent' ? options : {}) }, operation === 'disconnect' ? 'DELETE' : 'POST')
      if (operation === 'status') { setProviders(result.providers); setAiAvailable(Boolean(result.aiAvailable)); return }
      if (operation === 'connect') { window.location.assign(result.url); return }
      if (operation === 'sync') {
        const outcome = Number.isInteger(result.searched) && Number.isInteger(result.recognized)
          ? result.searched === 0
            ? 'Gmail no encontró correos de los bancos seleccionados en los últimos 7 días. Comprueba que esta sea la cuenta que recibió el aviso y que Bancolombia esté seleccionado.'
            : result.recognized === 0
              ? `Gmail encontró ${result.searched} correo(s), pero no pudo validar su remitente. Revisa la dirección completa que aparece en “De”.`
              : result.added === 0 && result.updated_candidates > 0
                ? `${result.updated_candidates} aviso(s) pendiente(s) se actualizaron con la lectura asistida.`
              : result.added === 0
                ? `${result.recognized} aviso(s) reconocido(s); ya estaban importados.`
                : `${result.added} correo(s) nuevo(s) por revisar.`
          : `${result.added} correos nuevos por revisar.`
        const aiOutcome = result.aiEnabled && result.aiClassified
          ? ` La IA sugirió el tipo de ${result.aiClassified} aviso(s); revísalo antes de registrar.`
          : result.aiAttempted > 0 && result.aiAnalyzed > 0
            ? ' La IA no encontró un tipo suficientemente claro en algunos avisos; elige manualmente.'
            : result.aiAttempted > 0
              ? ' La IA no respondió esta vez; los avisos quedaron disponibles para revisión manual.'
              : ''
        setMessage(`${outcome}${aiOutcome}${result.has_more ? ' Hay más resultados: espera 30 segundos y pulsa «Continuar búsqueda en Gmail».' : ' Búsqueda completada.'} No se modificaron saldos.`)
        await onImported()
      } else if (operation === 'ai-consent') setMessage(options.aiClassificationConsent ? 'Lectura asistida con IA activada para este correo. Puedes revocarla aquí.' : 'Lectura asistida con IA desactivada para este correo.')
      else setMessage('Acceso local eliminado. Retira también el permiso en tu cuenta de Google o Microsoft. Los movimientos se conservan.')
      const status = await mailRequest()
      setProviders(status.providers); setAiAvailable(Boolean(status.aiAvailable))
    } catch (issue) {
      setError(issue.message)
      if (operation === 'ai-consent') {
        const status = await mailRequest().catch(() => null)
        if (status) { setProviders(status.providers); setAiAvailable(Boolean(status.aiAvailable)) }
      }
    } finally { setBusy('') }
  }
  return <section className="integration-card mail-connections" aria-busy={loading}>
    <h2>Conecta tu correo</h2>
    <p>Sin configurar reenvíos. El permiso de lectura abarca tu buzón; PataWallet buscará avisos de los bancos que selecciones. No enviará ni borrará mensajes. La IA queda desactivada hasta que la autorices por separado.</p>
    <p>Cada búsqueda manual revisa los últimos 7 días y evita duplicados. Si falta un aviso, puedes recuperarlo con el botón de búsqueda.</p>
    {isDemo ? <p>Demostración: no se conecta ninguna cuenta de correo.</p> : <>
      <fieldset disabled={Boolean(busy)}><legend>Bancos para una nueva conexión</legend>{Object.entries(BANKS).map(([id, name]) => <label key={id} className="check-row"><input type="checkbox" checked={banks.includes(id)} onChange={(event) => setBanks(event.target.checked ? [...banks, id] : banks.filter((bank) => bank !== id))} />{name}</label>)}</fieldset>
      {banks.includes('bancolombia') && <p>Para Bancolombia también buscaremos avisos cuyo asunto o contenido mencione el banco junto con palabras de una operación, aunque el remitente no esté en la lista conocida. Esos avisos quedarán marcados para que verifiques el remitente.</p>}
      <label className="check-row"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />Autorizo la lectura para buscar avisos de estos bancos y guardar los datos extraídos para revisión.</label>
    </>}
    {providers.map((item) => <div className="mail-connection" key={item.provider}>
      <h3>{NAMES[item.provider]}</h3>
      <p>{loading ? 'Comprobando…' : !item.available ? 'Configuración del proveedor pendiente' : STATUS[item.status]}</p>
      {item.mailbox && <p>{item.mailbox}</p>}
      {item.status === 'connected' && <>
        <p>Bancos: {(item.banks || []).map((id) => BANKS[id]).join(', ')}. Para cambiarlos, desconecta y vuelve a autorizar.</p>
        {(item.banks || []).includes('bancolombia') && <p>La búsqueda también encuentra mensajes que mencionan Bancolombia en el asunto o contenido y hablan de una operación, incluso si el remitente no está en la lista conocida. Estos avisos se muestran como remitente no reconocido para que los compruebes.</p>}
        {aiAvailable || item.aiConsent ? <>
          <p>Lectura asistida opcional: al activarla, el asunto y el texto de los avisos bancarios de este correo, incluidos los encontrados por contenido de Bancolombia, se enviarán al servicio de IA configurado por PataWallet. Pueden contener información financiera. PataWallet no guarda el texto ni la evidencia enviada al modelo; conserva solo una sugerencia de tipo y su nivel de confianza. La IA puede equivocarse y nunca registra movimientos ni cambia saldos. Puedes revocar este permiso cuando quieras.</p>
          {!aiAvailable && item.aiConsent && <p>El servicio de IA no está disponible en este momento; puedes revocar el permiso guardado.</p>}
          <label className="check-row"><input type="checkbox" checked={Boolean(item.aiConsent)} disabled={Boolean(busy) || loading || (!aiAvailable && !item.aiConsent)} onChange={(event) => {
            const aiClassificationConsent = event.target.checked
            setProviders((current) => current.map((provider) => provider.provider === item.provider ? { ...provider, aiConsent: aiClassificationConsent } : provider))
            act('ai-consent', item.provider, { aiClassificationConsent })
          }} />Permito que la IA analice avisos bancarios de {NAMES[item.provider]} para sugerir si son una compra, un ingreso, una transferencia o un pago de deuda.</label>
        </> : <p>La clasificación con IA no está configurada en el servidor. Los avisos siguen disponibles para revisión manual.</p>}
        {item.provider === 'gmail' && <p>{item.automatic ? 'Vigilancia de Gmail registrada. Si falta un aviso, búscalo manualmente en los últimos 7 días.' : 'Detección automática pendiente de configuración del servidor; puedes buscar manualmente.'}</p>}
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
