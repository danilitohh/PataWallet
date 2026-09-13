import { describe, expect, it } from 'vitest'
import { configureStandaloneViewport } from './mobileViewport.js'

function createScope({ standalone }) {
  const listeners = new Map()
  const viewport = { content: '', setAttribute(_name, value) { this.content = value } }
  const documentValue = {
    querySelector: () => viewport,
    documentElement: { classList: { toggle(_name, value) { documentValue.isStandalone = value } } },
    addEventListener(name, listener) { listeners.set(name, listener) },
  }
  return {
    document: documentValue,
    navigator: { standalone },
    matchMedia: () => ({ matches: false }),
    listeners,
    viewport,
    documentValue,
  }
}

describe('viewport de la PWA', () => {
  it('bloquea el zoom y los gestos solo en la app instalada', () => {
    const scope = createScope({ standalone: true })
    expect(configureStandaloneViewport(scope)).toBe(true)
    expect(scope.viewport.content).toContain('maximum-scale=1')
    expect(scope.viewport.content).toContain('user-scalable=no')
    expect(scope.documentValue.isStandalone).toBe(true)
    const event = { preventDefault: () => { event.prevented = true } }
    scope.listeners.get('gesturestart')(event)
    expect(event.prevented).toBe(true)
  })

  it('conserva el zoom del navegador web', () => {
    const scope = createScope({ standalone: false })
    expect(configureStandaloneViewport(scope)).toBe(false)
    expect(scope.viewport.content).not.toContain('user-scalable=no')
    expect(scope.documentValue.isStandalone).toBe(false)
    expect(scope.listeners.size).toBe(0)
  })
})
