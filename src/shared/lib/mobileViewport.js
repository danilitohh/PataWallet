const BASE_VIEWPORT = 'width=device-width, initial-scale=1, viewport-fit=cover'
const LOCKED_VIEWPORT = `${BASE_VIEWPORT}, maximum-scale=1, user-scalable=no`

// Detecta una instalación PWA sin desactivar el zoom cuando PataWallet está en Safari.
export function isStandaloneApp(scope = globalThis) {
  return scope.matchMedia?.('(display-mode: standalone)')?.matches === true || scope.navigator?.standalone === true
}

// Bloquea el zoom de gesto solo en la app instalada y conserva el zoom del sitio web.
export function configureStandaloneViewport(scope = globalThis) {
  const documentValue = scope.document
  const viewport = documentValue?.querySelector?.('meta[name="viewport"]')
  if (!viewport) return false

  const standalone = isStandaloneApp(scope)
  viewport.setAttribute('content', standalone ? LOCKED_VIEWPORT : BASE_VIEWPORT)
  documentValue.documentElement?.classList?.toggle?.('standalone-app', standalone)
  if (!standalone) return false

  // Safari iOS puede iniciar un gesto de pellizco aunque el viewport esté bloqueado.
  const preventGesture = (event) => event.preventDefault()
  for (const eventName of ['gesturestart', 'gesturechange', 'gestureend']) {
    documentValue.addEventListener?.(eventName, preventGesture, { passive: false })
  }
  return true
}
