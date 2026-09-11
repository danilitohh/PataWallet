// Shared server-only Web Push client. This file is not a Vercel route.
import webpush from 'web-push'

let configured = false

function configure() {
  if (configured) return
  const subject = process.env.VAPID_SUBJECT
  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!subject || !publicKey || !privateKey) throw Object.assign(new Error('Falta configuración VAPID del servidor.'), { status: 503 })
  webpush.setVapidDetails(subject, publicKey, privateKey)
  configured = true
}

export async function deliver(subscription, payload) {
  configure()
  return webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth_key } }, JSON.stringify(payload), {
    TTL: 300,
    urgency: 'normal',
    topic: payload.tag.replace(/[^A-Za-z0-9_-]/g, '').slice(-32) || undefined,
  })
}

export function deliveryKind(error) {
  if ([404, 410].includes(error?.statusCode)) return 'permanent'
  if (error?.status === 503 || [400, 401, 403].includes(error?.statusCode)) return 'configuration'
  return 'transient'
}
