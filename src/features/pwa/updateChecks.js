const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000

// Comprueba la versión al registrar y volver a la app, y periódicamente mientras está visible y en línea.
export function watchPwaUpdateChecks(registration, scope = window) {
  if (!registration || typeof registration.update !== 'function' || !scope?.document) return () => {}

  const checkForUpdates = () => {
    if (scope.document.visibilityState === 'hidden' || scope.navigator?.onLine === false) return
    void registration.update().catch(() => {})
  }

  checkForUpdates()
  scope.document.addEventListener('visibilitychange', checkForUpdates)
  scope.addEventListener('pageshow', checkForUpdates)
  scope.addEventListener('online', checkForUpdates)
  const interval = scope.setInterval(checkForUpdates, UPDATE_CHECK_INTERVAL)

  return () => {
    scope.document.removeEventListener('visibilitychange', checkForUpdates)
    scope.removeEventListener('pageshow', checkForUpdates)
    scope.removeEventListener('online', checkForUpdates)
    scope.clearInterval(interval)
  }
}
