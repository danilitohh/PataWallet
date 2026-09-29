import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

// Una clave independiente del login y de Supabase; nunca sale del servidor.
function encryptionKey() {
  const value = process.env.MAIL_TOKEN_KEY || ''
  if (!/^[A-Za-z0-9+/]{43}=$/.test(value)) throw new Error('Configuración de correo incompleta.')
  return Buffer.from(value, 'base64')
}

export const secret = () => randomBytes(32).toString('base64url')
export const hash = (value) => createHash('sha256').update(value).digest('hex')
export const challenge = (value) => createHash('sha256').update(value).digest('base64url')

// AES-GCM vincula los secretos al propietario/proveedor/generación, evitando intercambiar filas.
export function seal(value, context) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv)
  cipher.setAAD(Buffer.from(context))
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()])
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString('base64url')).join('.')
}

export function unseal(value, context) {
  if (typeof value !== 'string' || value.length > 32000) throw new Error('Credencial inválida.')
  const parts = value.split('.').map((part) => Buffer.from(part, 'base64url'))
  if (parts.length !== 3 || parts[0].length !== 12 || parts[1].length !== 16) throw new Error('Credencial inválida.')
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), parts[0])
  decipher.setAAD(Buffer.from(context)); decipher.setAuthTag(parts[1])
  return JSON.parse(Buffer.concat([decipher.update(parts[2]), decipher.final()]).toString('utf8'))
}

// No se deduce el origen de Host/X-Forwarded-Host ni se admiten redirecciones elegidas por cliente.
export function mailOrigin() {
  const url = new URL(process.env.APP_ORIGIN || '')
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('Se requiere origen HTTPS.')
  encryptionKey()
  return url.origin
}

export const contextFor = (row) => `${row.user_id}:${row.provider}:${row.generation}`
export const cookieName = (provider) => `__Host-pw-mail-${provider}`
export const oauthCookie = (provider, value, maxAge = 600) => `${cookieName(provider)}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`

// Identificador UUID determinista para compatibilidad con la bandeja, separado por usuario/buzón.
export function messageUuid(identity) {
  const hex = hash(identity)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`
}
