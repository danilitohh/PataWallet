import { supabase } from '../../lib/supabase/client.js'
import { serializeSubscription, urlBase64ToUint8Array } from './pushCapabilities.js'

const OWNER_KEY = 'patawallet.push.owner.v1'
const ID_PREFIX = 'patawallet.push.subscription.'

async function accessToken() {
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session?.access_token) throw new Error('Tu sesión venció. Vuelve a iniciar sesión.')
  return data.session.access_token
}

async function request(path, options = {}) {
  const token = await accessToken()
  const response = await fetch(path, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...options.headers },
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error || 'No se pudo completar la operación de notificaciones.')
  return result
}

export async function currentBrowserSubscription() {
  const registration = await navigator.serviceWorker.ready
  return registration.pushManager.getSubscription()
}

export async function reconcilePushSubscription(userId) {
  const existing = await currentBrowserSubscription()
  const priorOwner = localStorage.getItem(OWNER_KEY)
  if (existing && priorOwner !== userId) {
    await existing.unsubscribe()
    if (priorOwner) localStorage.removeItem(`${ID_PREFIX}${priorOwner}`)
    localStorage.removeItem(OWNER_KEY)
    return null
  }
  if (!existing) return null
  const result = await request('/api/push/subscriptions', {
    method: 'POST',
    body: JSON.stringify({ subscription: serializeSubscription(existing) }),
  })
  localStorage.setItem(OWNER_KEY, userId)
  localStorage.setItem(`${ID_PREFIX}${userId}`, result.subscription.id)
  return { subscription: existing, record: result.subscription }
}

export async function activatePush(userId, vapidPublicKey, preferences) {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return { permission, subscription: null }
  const registration = await navigator.serviceWorker.ready
  const current = await registration.pushManager.getSubscription()
  const subscription = current || await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  })
  const result = await request('/api/push/subscriptions', {
    method: 'POST',
    body: JSON.stringify({ subscription: serializeSubscription(subscription), preferences }),
  })
  localStorage.setItem(OWNER_KEY, userId)
  localStorage.setItem(`${ID_PREFIX}${userId}`, result.subscription.id)
  return { permission, subscription, record: result.subscription }
}

export async function savePushPreferences(userId, subscription, preferences) {
  const result = await request('/api/push/subscriptions', {
    method: 'POST',
    body: JSON.stringify({ subscription: serializeSubscription(subscription), preferences }),
  })
  localStorage.setItem(`${ID_PREFIX}${userId}`, result.subscription.id)
  return result.subscription
}

export async function deactivatePush(userId) {
  const subscription = await currentBrowserSubscription().catch(() => null)
  const id = localStorage.getItem(`${ID_PREFIX}${userId}`)
  let serverRemoved = !id
  if (id) {
    try {
      await request(`/api/push/subscriptions/${encodeURIComponent(id)}`, { method: 'DELETE' })
      serverRemoved = true
    } catch {
      serverRemoved = false
    }
  }
  if (subscription) await subscription.unsubscribe()
  localStorage.removeItem(`${ID_PREFIX}${userId}`)
  if (localStorage.getItem(OWNER_KEY) === userId) localStorage.removeItem(OWNER_KEY)
  return { serverRemoved }
}

export function sendTestPush(subscriptionId) {
  return request('/api/push/test', { method: 'POST', body: JSON.stringify({ subscriptionId }) })
}

export function storedSubscriptionId(userId) {
  return localStorage.getItem(`${ID_PREFIX}${userId}`)
}
