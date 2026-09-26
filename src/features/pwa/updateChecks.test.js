import { describe, expect, it, vi } from 'vitest'
import { watchPwaUpdateChecks } from './updateChecks.js'

// Construye eventos de visibilidad y temporizador controlables sin depender de un navegador.
function createBrowserScope() {
  const documentListeners = new Map()
  const windowListeners = new Map()
  let intervalCallback
  const scope = {
    document: {
      visibilityState: 'visible',
      addEventListener: vi.fn((name, callback) => documentListeners.set(name, callback)),
      removeEventListener: vi.fn((name) => documentListeners.delete(name)),
    },
    navigator: { onLine: true },
    addEventListener: vi.fn((name, callback) => windowListeners.set(name, callback)),
    removeEventListener: vi.fn((name) => windowListeners.delete(name)),
    setInterval: vi.fn((callback) => { intervalCallback = callback; return 7 }),
    clearInterval: vi.fn(),
  }
  return {
    scope,
    emitVisibility: () => documentListeners.get('visibilitychange')?.(),
    emitPageShow: () => windowListeners.get('pageshow')?.(),
    emitOnline: () => windowListeners.get('online')?.(),
    checkInterval: () => intervalCallback?.(),
  }
}

describe('comprobaciones de actualización PWA', () => {
  it('revisa al registrar, al volver visible y periódicamente, sin sondear offline', () => {
    const registration = { update: vi.fn(() => Promise.resolve()) }
    const { scope, emitVisibility, emitPageShow, emitOnline, checkInterval } = createBrowserScope()
    const stop = watchPwaUpdateChecks(registration, scope)

    expect(registration.update).toHaveBeenCalledTimes(1)
    expect(scope.setInterval).toHaveBeenCalledWith(expect.any(Function), 60 * 60 * 1000)

    checkInterval()
    scope.document.visibilityState = 'hidden'
    emitVisibility()
    expect(registration.update).toHaveBeenCalledTimes(2)

    scope.document.visibilityState = 'visible'
    emitVisibility()
    emitPageShow()
    scope.navigator.onLine = false
    checkInterval()
    expect(registration.update).toHaveBeenCalledTimes(4)
    scope.navigator.onLine = true
    emitOnline()
    expect(registration.update).toHaveBeenCalledTimes(5)

    stop()
    expect(scope.document.removeEventListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function))
    expect(scope.removeEventListener).toHaveBeenCalledWith('pageshow', expect.any(Function))
    expect(scope.removeEventListener).toHaveBeenCalledWith('online', expect.any(Function))
    expect(scope.clearInterval).toHaveBeenCalledWith(7)
  })
})
