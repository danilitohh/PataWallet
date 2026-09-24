import { isStandaloneApp } from '../../shared/lib/mobileViewport.js'

/**
 * Conserva la oportunidad de instalación desde que se carga el módulo, aunque
 * la persona navegue por la SPA antes de abrir el control de instalación.
 */
export function createPwaInstallManager(scope = globalThis) {
  const listeners = new Set()
  let deferredPrompt = null
  let installed = isStandaloneApp(scope)
  let snapshot = { canPrompt: false, installed }

  // Publica una instantánea estable para que React pueda suscribirse sin renders infinitos.
  const publish = () => {
    const next = { canPrompt: Boolean(deferredPrompt), installed: installed || isStandaloneApp(scope) }
    if (next.canPrompt === snapshot.canPrompt && next.installed === snapshot.installed) return
    snapshot = next
    listeners.forEach((listener) => listener())
  }

  // Chrome y navegadores compatibles entregan este evento cuando la PWA puede instalarse.
  const onBeforeInstallPrompt = (event) => {
    event.preventDefault?.()
    deferredPrompt = event
    publish()
  }

  // El navegador avisa cuando la persona termina la instalación nativa.
  const onAppInstalled = () => {
    deferredPrompt = null
    installed = true
    publish()
  }

  scope.addEventListener?.('beforeinstallprompt', onBeforeInstallPrompt)
  scope.addEventListener?.('appinstalled', onAppInstalled)

  return {
    /** Suscribe una vista a cambios de disponibilidad o instalación. */
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    /** Devuelve la instantánea inmutable hasta que cambia el estado. */
    getSnapshot() {
      return snapshot
    },
    /** Abre el diálogo del navegador únicamente tras una acción explícita. */
    async prompt() {
      const promptEvent = deferredPrompt
      if (!promptEvent) return { outcome: 'unavailable' }

      deferredPrompt = null
      publish()
      try {
        await promptEvent.prompt()
        return await promptEvent.userChoice
      } catch {
        return { outcome: 'error' }
      }
    },
    /** Libera listeners en pruebas o si un consumidor temporal deja de usarse. */
    dispose() {
      scope.removeEventListener?.('beforeinstallprompt', onBeforeInstallPrompt)
      scope.removeEventListener?.('appinstalled', onAppInstalled)
      listeners.clear()
    },
  }
}

// La SPA comparte este gestor entre rutas para no perder eventos tempranos del navegador.
export const pwaInstallManager = createPwaInstallManager(globalThis)
