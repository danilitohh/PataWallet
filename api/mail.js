import { z } from 'zod'
import { allowMethod, assertBodySize, assertTrustedOrigin, json } from '../server/api-lib/http.js'
import { adminClient, authenticatedUser } from '../server/api-lib/supabase-server.js'
import { beginConnection, completeConnection, disconnectConnection, renewGmailWatches, syncConnection } from '../server/mail/connection.js'
import { banksSchema, providerAvailable, providerSchema } from '../server/mail/providers.js'
import { assertPubSubIdentity, gmailPushNotification } from '../server/mail/pubsub.js'
import { processPushOutbox } from '../server/api-lib/push-dispatch.js'
import { cookieName, oauthCookie } from '../server/mail/security.js'

// Una ruta física para estados y acciones del módulo; no añade una función por proveedor.
export default async function handler(req, res) {
  if (req.query?.operation === 'callback') return callback(req, res)
  if (req.query?.operation === 'gmail-push') return gmailPush(req, res)
  if (req.query?.operation === 'renew-watches') return renewWatches(req, res)
  if (!allowMethod(req, res, ['GET', 'POST', 'DELETE'])) return
  try {
    assertTrustedOrigin(req); assertBodySize(req, 2000)
    const user = await authenticatedUser(req)
    const admin = adminClient()
    if (req.method === 'GET') {
      const rows = await admin.from('mail_connections').select('provider,status,mailbox,banks,last_sync_at,cursor,gmail_watch_expiration_at').eq('user_id', user.id)
      if (rows.error) throw rows.error
      return json(res, 200, { providers: ['gmail', 'outlook'].map((provider) => {
        const row = rows.data.find((item) => item.provider === provider)
        return { provider, available: providerAvailable(provider), status: row?.status || 'disconnected', mailbox: row?.mailbox || null,
          banks: row?.banks || [], last_sync_at: row?.last_sync_at || null, has_more: Boolean(row?.cursor), automatic: provider === 'gmail' && Boolean(row?.gmail_watch_expiration_at) }
      }) })
    }
    const body = z.object({ provider: providerSchema, banks: banksSchema.optional(), consent: z.boolean().optional() }).strict().parse(req.body)
    if (req.method === 'DELETE') {
      res.setHeader('Set-Cookie', oauthCookie(body.provider, '', 0))
      return json(res, 200, await disconnectConnection(admin, user.id, body.provider))
    }
    if (req.query?.operation === 'connect') {
      if (!body.consent || !body.banks) return json(res, 400, { error: 'Selecciona bancos y autoriza la lectura del correo.' })
      const result = await beginConnection(admin, user.id, body.provider, body.banks)
      res.setHeader('Set-Cookie', oauthCookie(body.provider, result.cookie))
      return json(res, 200, { url: result.url })
    }
    if (req.query?.operation === 'sync') {
      const result = await syncConnection(admin, user.id, body.provider)
      await processPushOutbox(admin).catch(() => {})
      return json(res, 200, result)
    }
    return json(res, 400, { error: 'Acción no admitida.' })
  } catch (error) {
    const status = error instanceof z.ZodError ? 400 : error.code === 'PT409' ? 409 : error.code === 'PT429' || error.status === 429 ? 429 : [401, 403, 413].includes(error.status) ? error.status : 503
    const message = error.reconnect ? 'El permiso del correo venció o fue revocado. Vuelve a conectar la cuenta.' : status === 409 ? 'Espera 30 segundos o desconecta antes de vincular otra cuenta.' : status === 429 ? 'Se alcanzó un límite. Reintenta más tarde.' : 'No se pudo completar la conexión de correo. Revisa la sesión y la configuración.'
    return json(res, status, { error: message })
  }
}

// Recibe únicamente el aviso de cambio de Gmail; el contenido del correo se obtiene después con OAuth del propietario.
async function gmailPush(req, res) {
  if (!allowMethod(req, res, ['POST'])) return
  try {
    assertBodySize(req, 20_000)
    await assertPubSubIdentity(req.headers || {})
    const notification = gmailPushNotification(typeof req.body === 'string' ? JSON.parse(req.body) : req.body)
    const admin = adminClient()
    const { data: connection, error } = await admin.from('mail_connections').select('user_id,provider,status,mailbox').eq('provider', 'gmail').eq('status', 'connected').eq('mailbox', notification.emailAddress.toLowerCase()).maybeSingle()
    if (error) throw error
    if (!connection) return res.status(204).end()
    const result = await syncConnection(admin, connection.user_id, 'gmail')
    await processPushOutbox(admin).catch(() => {})
    return json(res, 200, { accepted: true, added: result.added || 0 })
  } catch (error) {
    const status = error.code === 'PT409' ? 202 : error.status === 401 ? 401 : 503
    return json(res, status, status === 401 ? { error: 'Entrega Pub/Sub no autorizada.' } : { accepted: status === 202 })
  }
}

// Vercel Cron solo mantiene activas las suscripciones; nunca recibe ni procesa correos.
async function renewWatches(req, res) {
  if (!allowMethod(req, res, ['GET'])) return
  if (!process.env.CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return json(res, 401, { error: 'No autorizado.' })
  try { return json(res, 200, await renewGmailWatches(adminClient())) } catch { return json(res, 503, { error: 'No se pudieron renovar las conexiones de Gmail.' }) }
}

// Callback aislado: no renderiza HTML, no registra código/token ni refleja errores del proveedor.
async function callback(req, res) {
  if (!allowMethod(req, res, ['GET'])) return
  let outcome = 'error'
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('Referrer-Policy', 'no-referrer')
  try {
    const query = z.object({ provider: providerSchema, state: z.string().regex(/^[A-Za-z0-9_-]{43}$/), code: z.string().min(1).max(8000).optional(), error: z.string().max(200).optional() }).parse(req.query)
    const cookies = (req.headers.cookie || '').split(';').map((part) => part.trim().split('='))
    const values = cookies.filter(([name]) => name === cookieName(query.provider))
    if (values.length !== 1 || !/^[A-Za-z0-9_-]{43}$/.test(values[0][1]) || (!query.error && !query.code)) throw new Error('Callback inválido.')
    outcome = await completeConnection(adminClient(), query.provider, query.state, values[0][1], query.code, Boolean(query.error))
    res.setHeader('Set-Cookie', oauthCookie(query.provider, '', 0))
  } catch { /* Estado visible y genérico; nunca exponer los detalles del canje. */ }
  res.status(303).setHeader('Location', `/ajustes/correos-bancarios?mail=${outcome}`).end()
}
