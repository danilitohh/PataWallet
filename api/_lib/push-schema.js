import { z } from 'zod'

const preferencesSchema = z.object({
  movements: z.boolean().default(true),
  budgets: z.boolean().default(true),
  review: z.boolean().default(false),
  showDetails: z.boolean().default(false),
}).strict()

export const subscriptionRequestSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url().max(2048),
    expirationTime: z.number().nullable().optional(),
    keys: z.object({ p256dh: z.string().min(20).max(512), auth: z.string().min(8).max(256) }).strict(),
  }).strict(),
  preferences: preferencesSchema.optional(),
}).strict()

export const testRequestSchema = z.object({ subscriptionId: z.string().uuid() }).strict()

const allowedHosts = [
  'fcm.googleapis.com',
  'updates.push.services.mozilla.com',
  'web.push.apple.com',
]

export function assertSafeEndpoint(value) {
  const url = new URL(value)
  const hostname = url.hostname.toLowerCase()
  const allowed = allowedHosts.includes(hostname) || hostname.endsWith('.push.apple.com')
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !allowed) {
    throw Object.assign(new Error('El destino Push no pertenece a un proveedor compatible.'), { status: 400 })
  }
  return url.href
}

export function safeNotificationRoute(value) {
  const allowed = new Set(['/', '/actividad', '/plan', '/cuentas', '/ajustes', '/ajustes/notificaciones'])
  return typeof value === 'string' && allowed.has(value) ? value : '/ajustes/notificaciones'
}

export function notificationPayload(event, subscription, transaction = null) {
  const detailed = subscription.show_sensitive_details === true
  if (event.event_kind === 'movement') {
    const amount = transaction ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 2 }).format(Number(transaction.amount_minor) / 100) : ''
    const merchant = transaction?.merchant_name?.slice(0, 80) || 'Movimiento'
    return { title: 'Movimiento confirmado', body: detailed && transaction ? `${merchant}: ${amount}` : 'Se guardó un movimiento en PataWallet.', route: '/actividad', tag: event.event_key }
  }
  if (event.event_kind === 'budget') {
    return { title: 'Revisa tu presupuesto', body: detailed ? `Tu presupuesto llegó al ${event.payload?.threshold || 80} %.` : 'Hay una actualización en tu presupuesto.', route: '/plan', tag: event.event_key }
  }
  return { title: 'PataWallet', body: 'Tienes una actualización en PataWallet.', route: safeNotificationRoute(event.payload?.route), tag: event.event_key }
}
