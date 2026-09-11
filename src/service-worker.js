import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html'), {
  denylist: [/^\/api\//, /\/auth\/v1\//, /\/rest\/v1\//],
}))

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

const SAFE_ROUTES = new Set(['/', '/actividad', '/plan', '/cuentas', '/ajustes', '/ajustes/notificaciones'])

function safeRoute(value) {
  if (typeof value !== 'string') return '/ajustes/notificaciones'
  try {
    const url = new URL(value, self.location.origin)
    return url.origin === self.location.origin && SAFE_ROUTES.has(url.pathname)
      ? `${url.pathname}${url.search}`
      : '/ajustes/notificaciones'
  } catch {
    return '/ajustes/notificaciones'
  }
}

self.addEventListener('push', (event) => {
  let payload = {}
  try { payload = event.data?.json() || {} } catch { payload = {} }
  const title = typeof payload.title === 'string' && payload.title.length <= 80 ? payload.title : 'PataWallet'
  const body = typeof payload.body === 'string' && payload.body.length <= 180
    ? payload.body
    : 'Tienes una actualización en PataWallet.'
  event.waitUntil(self.registration.showNotification(title, {
    body,
    icon: '/icons/patawallet-192.png',
    badge: '/icons/patawallet-192.png',
    tag: typeof payload.tag === 'string' ? payload.tag.slice(0, 80) : 'patawallet-update',
    data: { route: safeRoute(payload.route) },
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const destination = new URL(safeRoute(event.notification.data?.route), self.location.origin).href
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clients) => {
    const existing = clients.find((client) => new URL(client.url).origin === self.location.origin)
    if (existing) {
      await existing.focus()
      if ('navigate' in existing) await existing.navigate(destination)
      return
    }
    return self.clients.openWindow(destination)
  }))
})
