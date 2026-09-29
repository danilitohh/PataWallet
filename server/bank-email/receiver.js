import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { convert } from 'html-to-text'
import { z } from 'zod'
import { parseBankEmail } from './parseBankEmail.js'

// Contratos del proveedor: los campos extra no se persisten ni se presentan al usuario.
const notificationSchema = z.object({ type: z.literal('email.received'), data: z.object({
  email_id: z.uuid(), to: z.array(z.string().max(254)).max(20),
  received_for: z.array(z.string().max(254)).max(20).optional(),
}) })
const receivedSchema = z.object({
  id: z.uuid(), from: z.string().max(400), to: z.array(z.string().max(254)).max(20),
  received_for: z.array(z.string().max(254)).max(20).optional(), subject: z.string().max(500),
  text: z.string().max(32_000).nullable(), html: z.string().max(200_000).nullable(),
  message_id: z.string().max(1000).optional(),
})

// Estado de despliegue explícito: no anunciar recepción disponible con credenciales incompletas.
export function receiverConfiguration() {
  const domain = process.env.BANK_EMAIL_DOMAIN?.trim().toLowerCase() || ''
  const enabled = process.env.BANK_EMAIL_ENABLED === 'true'
    && /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/.test(domain)
    && Boolean(process.env.RESEND_API_KEY && process.env.RESEND_WEBHOOK_SECRET)
  return { enabled: Boolean(enabled), domain }
}

// Verifica bytes originales y ventana temporal; la firma prueba Resend, NO el banco remitente.
export function verifyWebhook(body, headers, secret, now = Date.now()) {
  const id = headers['svix-id']; const timestamp = headers['svix-timestamp']; const signatures = headers['svix-signature']
  if (typeof id !== 'string' || id.length > 200 || typeof timestamp !== 'string' || !/^\d{10}$/.test(timestamp)
    || Math.abs(now / 1000 - Number(timestamp)) > 300 || typeof signatures !== 'string' || signatures.length > 2000) return false
  if (!/^whsec_[A-Za-z0-9+/]+={0,2}$/.test(secret || '')) return false
  const key = Buffer.from(secret.slice(6), 'base64')
  const expected = createHmac('sha256', key).update(`${id}.${timestamp}.`).update(body).digest()
  return signatures.split(' ').some((signature) => {
    if (!/^v1,[A-Za-z0-9+/]{43}=$/.test(signature)) return false
    const actual = Buffer.from(signature.slice(3), 'base64')
    return actual.length === expected.length && timingSafeEqual(actual, expected)
  })
}

// Lee streams con límite real aunque Content-Length falte o mienta; no imprime contenido sensible.
export async function limitedBody(stream, limit) {
  const chunks = []; let size = 0
  for await (const chunk of stream) {
    const bytes = Buffer.from(chunk); size += bytes.length
    if (size > limit) throw Object.assign(new Error('Contenido demasiado grande.'), { status: 413 })
    chunks.push(bytes)
  }
  return Buffer.concat(chunks)
}

// Convierte HTML sin ejecutar scripts, descargar imágenes, adjuntos ni seguir enlaces.
export function emailText(email) {
  if (email.text?.trim()) return email.text
  const text = convert(email.html || '', {
    wordwrap: false, limits: { maxInputLength: 200_000, maxDepth: 40, maxChildNodes: 5000 },
    selectors: [{ selector: 'a', options: { ignoreHref: true } }, { selector: 'img', format: 'skip' }, { selector: 'script', format: 'skip' }, { selector: 'style', format: 'skip' }],
  })
  if (!text || text.length > 32_000) throw Object.assign(new Error('Formato de correo no admitido.'), { status: 422 })
  return text
}

// Acepta direcciones RFC comunes sin confiar en nombres visibles o cabeceras internas reenviadas.
function senderAddress(from) {
  const address = from.match(/^[^<>]*<([^<>]+)>$/)?.[1] || from
  return z.email().parse(address.trim().toLowerCase())
}

// Idempotencia de transporte por Message-ID del correo original; no usa monto/fecha como certeza.
export function emailDedupeKey(email) {
  return createHash('sha256').update(email.message_id || email.id).digest('hex')
}

/** Procesa un webhook ya firmado. Cualquier fallo de red/DB se devuelve para permitir reintento. */
export async function receiveBankEmail(notification, admin) {
  const parsed = notificationSchema.safeParse(notification)
  if (!parsed.success) return { status: 'ignored' }
  const { email_id: id, to, received_for: delivered } = parsed.data.data
  // El reenvío conserva To original; received_for identifica el destinatario de entrega SMTP.
  const recipients = delivered?.length ? delivered : to
  // No descargar el cuerpo de mensajes para direcciones ajenas o desactivadas.
  const { data: inboxes, error } = await admin.from('bank_email_addresses').select('address,user_id').in('address', recipients.map((value) => value.toLowerCase())).eq('enabled', true)
  if (error) throw error
  if (inboxes.length !== 1) return { status: 'ignored' }
  const inbox = inboxes[0]
  const { data: prior, error: priorError } = await admin.from('bank_email_events').select('id').eq('provider_id', id).maybeSingle()
  if (priorError) throw priorError
  if (prior) return { status: 'duplicate' }
  const response = await fetch(`https://api.resend.com/emails/receiving/${id}`, {
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` }, redirect: 'error', signal: AbortSignal.timeout(10_000),
  })
  if (!response.ok) throw new Error('Proveedor temporalmente no disponible.')
  const bytes = await limitedBody(response.body, 400_000)
  const email = receivedSchema.parse(JSON.parse(bytes.toString('utf8')))
  const deliveredTo = email.received_for?.length ? email.received_for : email.to
  if (email.id !== id || !deliveredTo.map((value) => value.toLowerCase()).includes(inbox.address)) throw new Error('Destinatario no coincide.')
  const text = emailText(email)
  const sender = senderAddress(email.from)
  // Gmail requiere que la persona copie el código en su configuración. Nunca abrir enlaces del email.
  if (sender === 'forwarding-noreply@google.com') {
    const code = text.match(/(?:confirmation code|código de confirmación)\s*[:：]\s*(\d{6,12})\b/i)?.[1]
    if (code) {
      const { error: codeError } = await admin.from('bank_email_addresses').update({ verification_code: code, verification_at: new Date().toISOString() }).eq('user_id', inbox.user_id).eq('address', inbox.address).eq('enabled', true)
      if (codeError) throw codeError
    }
    return { status: 'verification_received' }
  }
  const candidate = parseBankEmail({ sender, subject: email.subject, text })
  if (!candidate.bank) return { status: 'ignored' }
  const { data, error: saveError } = await admin.rpc('server_receive_bank_email', {
    p_address: inbox.address, p_provider_id: id, p_dedupe_key: emailDedupeKey(email), p_bank: candidate.bank, p_candidate: candidate,
  })
  if (saveError) throw saveError
  return data
}
