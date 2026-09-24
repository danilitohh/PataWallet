import { describe, expect, it, vi } from 'vitest'
import { createPwaInstallManager } from './installManager.js'

// Construye una ventana mínima para comprobar eventos PWA sin depender de un navegador real.
function createScope({ standalone = false } = {}) {
  const handlers = new Map()
  const scope = {
    navigator: { standalone },
    matchMedia: () => ({ matches: false }),
    addEventListener: (type, handler) => handlers.set(type, handler),
    removeEventListener: (type) => handlers.delete(type),
  }
  return {
    scope,
    dispatch(type, event = {}) {
      handlers.get(type)?.(event)
    },
  }
}

describe('PWA install manager', () => {
  it('retains the browser prompt and calls it only when requested', async () => {
    const { scope, dispatch } = createScope()
    const manager = createPwaInstallManager(scope)
    const event = {
      preventDefault: vi.fn(),
      prompt: vi.fn(),
      userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
    }

    dispatch('beforeinstallprompt', event)

    expect(event.preventDefault).toHaveBeenCalledOnce()
    expect(manager.getSnapshot().canPrompt).toBe(true)
    expect(event.prompt).not.toHaveBeenCalled()
    await expect(manager.prompt()).resolves.toEqual({ outcome: 'accepted', platform: 'web' })
    expect(event.prompt).toHaveBeenCalledOnce()
    expect(manager.getSnapshot().canPrompt).toBe(false)
    await expect(manager.prompt()).resolves.toEqual({ outcome: 'unavailable' })
    manager.dispose()
  })

  it('marks the app installed after the browser confirms it', () => {
    const { scope, dispatch } = createScope()
    const manager = createPwaInstallManager(scope)

    dispatch('appinstalled')

    expect(manager.getSnapshot().installed).toBe(true)
    expect(manager.getSnapshot().canPrompt).toBe(false)
    manager.dispose()
  })

  it('recognizes an app that was already launched in standalone mode', () => {
    const { scope } = createScope({ standalone: true })
    const manager = createPwaInstallManager(scope)

    expect(manager.getSnapshot().installed).toBe(true)
    manager.dispose()
  })

  it('reports a browser prompt failure without throwing into the UI', async () => {
    const { scope, dispatch } = createScope()
    const manager = createPwaInstallManager(scope)
    dispatch('beforeinstallprompt', {
      preventDefault() {},
      prompt: () => { throw new Error('browser prompt failed') },
      userChoice: Promise.resolve({ outcome: 'accepted' }),
    })

    await expect(manager.prompt()).resolves.toEqual({ outcome: 'error' })
    manager.dispose()
  })
})
