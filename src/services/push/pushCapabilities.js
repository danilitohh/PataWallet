export function detectPushCapabilities(scope = globalThis) {
  const navigatorValue = scope.navigator
  const standalone = scope.matchMedia?.('(display-mode: standalone)')?.matches === true || navigatorValue?.standalone === true
  const appleHomeScreenRequired = Boolean(navigatorValue && 'standalone' in navigatorValue && !standalone)
  return {
    secure: scope.isSecureContext === true,
    serviceWorker: Boolean(navigatorValue && 'serviceWorker' in navigatorValue),
    pushManager: 'PushManager' in scope,
    notifications: 'Notification' in scope,
    standalone,
    appleHomeScreenRequired,
  }
}

export function classifyPushState({ capabilities, permission = 'default', subscription = null, configured = false, error = '' }) {
  if (error) return { kind: 'error', label: 'Error', detail: error }
  if (!capabilities.secure) return { kind: 'unsupported', label: 'Contexto no seguro', detail: 'Abre PataWallet mediante HTTPS.' }
  if (capabilities.appleHomeScreenRequired) return { kind: 'needs-install', label: 'Necesita instalación', detail: 'Añade PataWallet a Inicio desde Safari y ábrela desde su icono.' }
  if (!capabilities.serviceWorker || !capabilities.pushManager || !capabilities.notifications) return { kind: 'unsupported', label: 'No compatible', detail: 'Este navegador o contexto no ofrece Web Push.' }
  if (!configured) return { kind: 'unconfigured', label: 'Configuración pendiente', detail: 'Falta la clave pública VAPID de este entorno.' }
  if (permission === 'denied') return { kind: 'denied', label: 'Permiso denegado', detail: 'El permiso debe cambiarse desde los ajustes del sistema o del sitio.' }
  if (permission === 'default') return { kind: 'prompt', label: 'No solicitado', detail: 'PataWallet solo pedirá permiso cuando pulses Activar notificaciones.' }
  if (!subscription) return { kind: 'granted', label: 'Permiso concedido', detail: 'Falta registrar esta instalación en el servidor.' }
  return { kind: 'active', label: 'Suscripción activa', detail: 'Esta instalación está registrada para tu sesión.' }
}

export function urlBase64ToUint8Array(value) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4)
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

export function serializeSubscription(subscription) {
  const json = subscription.toJSON()
  return {
    endpoint: json.endpoint,
    expirationTime: json.expirationTime ?? null,
    keys: { p256dh: json.keys?.p256dh || '', auth: json.keys?.auth || '' },
  }
}
