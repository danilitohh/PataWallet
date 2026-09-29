import { createPublicKey, verify as verifySignature } from 'node:crypto'
import { z } from 'zod'

let certificateCache = { expiresAt: 0, keys: new Map() }

function decode(value, limit = 12_000) {
  if (typeof value !== 'string' || value.length > limit) throw Object.assign(new Error('Token Pub/Sub inválido.'), { status: 401 })
  return Buffer.from(value, 'base64url').toString('utf8')
}

function jsonPart(value) {
  try { return JSON.parse(decode(value)) } catch { throw Object.assign(new Error('Token Pub/Sub inválido.'), { status: 401 }) }
}

async function googleCertificates() {
  if (certificateCache.expiresAt > Date.now()) return certificateCache.keys
  const response = await fetch('https://www.googleapis.com/oauth2/v3/certs', { redirect: 'error', signal: AbortSignal.timeout(5000) })
  if (!response.ok) throw Object.assign(new Error('No se pudieron validar las credenciales de Pub/Sub.'), { status: 503 })
  const body = z.object({ keys: z.array(z.object({ kid: z.string().min(1).max(200), kty: z.literal('RSA'), n: z.string().min(1).max(4000), e: z.string().min(1).max(20) }).passthrough()).max(20) }).parse(await response.json())
  const keys = new Map(body.keys.map((key) => [key.kid, createPublicKey({ key, format: 'jwk' })]))
  const maxAge = Number(response.headers.get('cache-control')?.match(/max-age=(\d+)/i)?.[1] || 300)
  certificateCache = { keys, expiresAt: Date.now() + Math.min(3600000, Math.max(60000, maxAge * 1000)) }
  return keys
}

// Verifica el JWT OIDC que Pub/Sub añade a la entrega; un endpoint público no confía solo en el cuerpo recibido.
export async function assertPubSubIdentity(headers) {
  const audience = process.env.MAIL_GOOGLE_PUSH_AUDIENCE?.trim()
  const serviceAccount = process.env.MAIL_GOOGLE_PUSH_SERVICE_ACCOUNT?.trim().toLowerCase()
  if (!audience || !serviceAccount) throw Object.assign(new Error('Falta configurar la identidad OIDC de Pub/Sub.'), { status: 503 })
  const authorization = Array.isArray(headers.authorization) ? headers.authorization[0] : headers.authorization
  if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) throw Object.assign(new Error('Entrega Pub/Sub no autorizada.'), { status: 401 })
  const token = authorization.slice(7)
  const parts = token.split('.')
  if (parts.length !== 3 || token.length > 12_000) throw Object.assign(new Error('Entrega Pub/Sub no autorizada.'), { status: 401 })
  const header = jsonPart(parts[0]); const claims = jsonPart(parts[1])
  if (header.alg !== 'RS256' || typeof header.kid !== 'string') throw Object.assign(new Error('Entrega Pub/Sub no autorizada.'), { status: 401 })
  const now = Math.floor(Date.now() / 1000)
  const payload = z.object({ iss: z.string(), aud: z.union([z.string(), z.array(z.string())]), sub: z.string().min(1), email: z.email(), email_verified: z.boolean(), iat: z.number(), exp: z.number() }).passthrough().parse(claims)
  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud]
  if (!['https://accounts.google.com', 'accounts.google.com'].includes(payload.iss) || !audiences.includes(audience)
    || payload.email.toLowerCase() !== serviceAccount || !payload.email_verified || payload.iat > now + 60 || payload.exp < now - 60) {
    throw Object.assign(new Error('Entrega Pub/Sub no autorizada.'), { status: 401 })
  }
  const key = (await googleCertificates()).get(header.kid)
  if (!key || !verifySignature('RSA-SHA256', Buffer.from(`${parts[0]}.${parts[1]}`), key, Buffer.from(parts[2], 'base64url'))) {
    throw Object.assign(new Error('Entrega Pub/Sub no autorizada.'), { status: 401 })
  }
}

export function gmailPushNotification(body) {
  const data = z.object({ message: z.object({ data: z.string().min(1).max(12_000) }).passthrough() }).passthrough().parse(body)
  let decoded
  // Gmail entrega Pub/Sub data en Base64URL, sin garantizar el padding estándar.
  try { decoded = JSON.parse(Buffer.from(data.message.data, 'base64url').toString('utf8')) } catch { throw Object.assign(new Error('Notificación Gmail inválida.'), { status: 400 }) }
  return z.object({ emailAddress: z.email(), historyId: z.string().min(1).max(80) }).passthrough().parse(decoded)
}
