import { z } from 'zod'
import { limitedBody, emailText } from '../bank-email/receiver.js'
import { challenge, mailOrigin } from './security.js'

export const providerSchema = z.enum(['gmail', 'outlook'])
export const banksSchema = z.array(z.enum(['lulo', 'bancolombia', 'nequi'])).min(1).max(3).transform((values) => [...new Set(values)])
const SENDERS = {
  lulo: ['notificaciones@lulobank.com'],
  bancolombia: ['alertasynotificaciones@notificacionesbancolombia.com'],
  nequi: ['notificaciones@nequi.com.co', 'somos@nequi.com.co'],
}
const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly'
const GRAPH = 'https://graph.microsoft.com/v1.0'

// Proveedores cerrados y permisos mínimos de lectura; no usar URLs enviadas por el navegador.
export function providerConfig(provider) {
  providerSchema.parse(provider)
  const gmail = provider === 'gmail'
  const prefix = gmail ? 'MAIL_GOOGLE' : 'MAIL_MICROSOFT'
  const clientId = process.env[`${prefix}_CLIENT_ID`]
  const clientSecret = process.env[`${prefix}_CLIENT_SECRET`]
  if (process.env[`${prefix}_ENABLED`] !== 'true' || !clientId || !clientSecret) throw new Error('Proveedor pendiente de configurar.')
  return {
    provider, clientId, clientSecret,
    // Outlook personal no admite parámetros en la URI registrada; Vercel enruta la ruta fija.
    redirectUri: `${mailOrigin()}/api/mail/callback/${provider}`,
    authorize: gmail ? 'https://accounts.google.com/o/oauth2/v2/auth' : 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    token: gmail ? 'https://oauth2.googleapis.com/token' : 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    scope: gmail ? GMAIL_SCOPE : 'offline_access https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/User.Read',
  }
}

export function providerAvailable(provider) {
  try { providerConfig(provider); return true } catch { return false }
}

export function authorizationUrl(config, state, verifier) {
  const url = new URL(config.authorize)
  url.search = new URLSearchParams({ client_id: config.clientId, redirect_uri: config.redirectUri, response_type: 'code', scope: config.scope,
    state, code_challenge: challenge(verifier), code_challenge_method: 'S256',
    ...(config.provider === 'gmail' ? { access_type: 'offline', prompt: 'consent', include_granted_scopes: 'false' } : { response_mode: 'query', prompt: 'select_account' }),
  }).toString()
  return url.toString()
}

// Respuestas acotadas, sin redirecciones ni mensajes externos que puedan exponer tokens o correos.
async function requestJson(url, options = {}) {
  const response = await fetch(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(10000) })
  const body = JSON.parse((await limitedBody(response.body, 1_000_000)).toString('utf8'))
  if (!response.ok) throw Object.assign(new Error('El proveedor no pudo completar la solicitud.'), { reconnect: response.status === 401 || body.error === 'invalid_grant', status: response.status === 429 ? 429 : 503 })
  return body
}

// Renueva y valida tokens; Microsoft puede rotar refresh_token en cada canje.
export async function tokenRequest(config, values) {
  const data = await requestJson(config.token, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, ...values }).toString() })
  const token = z.object({ access_token: z.string().min(1).max(16000), token_type: z.string().regex(/^bearer$/i), refresh_token: z.string().min(1).max(16000).optional(), scope: z.string().max(4000).optional() }).parse(data)
  if (token.scope) {
    const scopes = token.scope.toLowerCase().split(/\s+/)
    const required = config.provider === 'gmail' ? [GMAIL_SCOPE.toLowerCase()] : ['mail.read', 'user.read']
    if (required.some((scope) => !scopes.includes(scope) && !scopes.includes(`https://graph.microsoft.com/${scope}`))) throw new Error('Faltan permisos de lectura.')
  }
  return token
}

const auth = (token) => ({ headers: { Authorization: `Bearer ${token}`, Prefer: 'IdType="ImmutableId", outlook.body-content-type="text"' } })

// Identidad obtenida del proveedor con el token canjeado, nunca del formulario ni de un JWT sin verificar.
export async function mailboxIdentity(provider, token) {
  const data = await requestJson(provider === 'gmail' ? 'https://gmail.googleapis.com/gmail/v1/users/me/profile' : `${GRAPH}/me?$select=id,mail,userPrincipalName`, auth(token))
  const address = z.email().max(254).parse(provider === 'gmail' ? data.emailAddress : data.mail || data.userPrincipalName)
  return { address, id: provider === 'gmail' ? address.toLowerCase() : z.string().min(1).max(300).parse(data.id) }
}

// Registers Gmail's mailbox change signal. Pub/Sub only announces a change; the server still fetches and parses the message.
export async function startGmailWatch(config, token) {
  if (config.provider !== 'gmail') throw new Error('La vigilancia automática solo está disponible para Gmail.')
  const topicName = process.env.MAIL_GOOGLE_PUBSUB_TOPIC?.trim() || ''
  if (!/^projects\/[A-Za-z0-9._-]+\/topics\/[A-Za-z0-9._-]+$/.test(topicName)) {
    throw Object.assign(new Error('Falta configurar el tema Pub/Sub de Gmail.'), { status: 503 })
  }
  const body = await requestJson('https://gmail.googleapis.com/gmail/v1/users/me/watch', {
    method: 'POST', headers: { ...auth(token).headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ topicName, labelIds: ['INBOX'], labelFilterAction: 'include' }),
  })
  return z.object({ historyId: z.string().min(1).max(80), expiration: z.string().regex(/^\d+$/) }).parse(body)
}

// Una página de IDs por búsqueda. La ventana se fija al empezar y se conserva hasta agotar páginas.
export async function listBankMessages(provider, token, banks, cursor) {
  const senders = banksSchema.parse(banks).flatMap((bank) => SENDERS[bank])
  let url
  if (provider === 'gmail') {
    url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages')
    url.search = new URLSearchParams({ maxResults: '20', q: `{${senders.map((sender) => `from:${sender}`).join(' ')}} after:${Math.floor(Date.parse(cursor.since) / 1000)} before:${Math.ceil(Date.parse(cursor.until) / 1000)}`,
      ...(cursor.next ? { pageToken: cursor.next } : {}) }).toString()
  } else {
    url = new URL(cursor.next || `${GRAPH}/me/messages`)
    // @odata.nextLink es entrada externa: nunca reenviar Bearer a otro host, ruta o puerto.
    if (url.origin !== 'https://graph.microsoft.com' || url.pathname !== '/v1.0/me/messages' || url.username || url.password || url.hash) throw new Error('Paginación inválida.')
    if (!cursor.next) url.search = new URLSearchParams({ '$top': '20', '$select': 'id', '$filter': `receivedDateTime ge ${cursor.since} and receivedDateTime lt ${cursor.until} and (${senders.map((sender) => `from/emailAddress/address eq '${sender}'`).join(' or ')})` }).toString()
  }
  const body = await requestJson(url.toString(), auth(token))
  const ids = z.array(z.object({ id: z.string().min(1).max(1500) })).max(20).parse((provider === 'gmail' ? body.messages : body.value) || [])
  const next = z.string().max(8000).optional().parse(provider === 'gmail' ? body.nextPageToken : body['@odata.nextLink'])
  return { ids: ids.map((item) => item.id), next: next || null }
}

// Extrae únicamente texto MIME inline, sin adjuntos; impone profundidad/tamaño antes del parser común.
export function gmailText(payload) {
  const parts = []; let nodes = 0; let length = 0
  function visit(part, depth) {
    if (++nodes > 100 || depth > 12) throw new Error('Correo demasiado complejo.')
    if (part.filename || part.body?.attachmentId) return
    if (['text/plain', 'text/html'].includes(part.mimeType) && part.body?.data) {
      const content = Buffer.from(z.string().max(280000).parse(part.body.data), 'base64url').toString('utf8')
      length += content.length
      if (length > 200000) throw new Error('Correo demasiado grande.')
      parts.push({ type: part.mimeType, content })
    }
    for (const child of z.array(z.unknown()).max(100).parse(part.parts || [])) visit(child, depth + 1)
  }
  visit(payload, 0)
  const plain = parts.filter((part) => part.type === 'text/plain').map((part) => part.content).join('\n')
  return emailText({ text: plain || null, html: parts.filter((part) => part.type === 'text/html').map((part) => part.content).join('\n') })
}

// Se vuelve a comprobar el remitente después de la búsqueda. Solo devuelve datos mínimos al parser.
export async function readBankMessage(provider, token, id, banks) {
  const data = await requestJson(provider === 'gmail'
    ? `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(id)}?format=full`
    : `${GRAPH}/me/messages/${encodeURIComponent(id)}?$select=id,subject,from,body,internetMessageId`, auth(token))
  let sender, subject, text, messageId
  if (provider === 'gmail') {
    const headers = z.array(z.object({ name: z.string(), value: z.string().max(4000) })).max(200).parse(data.payload?.headers)
    const header = (name) => headers.find((entry) => entry.name.toLowerCase() === name)?.value || ''
    const from = header('from'); sender = (from.match(/^[^<>]*<([^<>]+)>$/)?.[1] || from).trim().toLowerCase()
    subject = header('subject'); messageId = header('message-id')
  } else { sender = data.from?.emailAddress?.address?.toLowerCase(); subject = data.subject; messageId = data.internetMessageId }
  if (!banks.flatMap((bank) => SENDERS[bank]).includes(sender)) return null
  text = provider === 'gmail' ? gmailText(data.payload) : emailText(data.body?.contentType?.toLowerCase() === 'html' ? { html: data.body.content } : { text: data.body?.content })
  return { sender, subject, text, messageId: z.string().max(1000).parse(messageId || '') }
}
