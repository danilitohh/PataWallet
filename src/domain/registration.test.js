import { describe, expect, it } from 'vitest'
import { normalizeIntegrationSetup } from './registration.js'

describe('preferencias opcionales de integración al registrarse', () => {
  it('guarda únicamente opciones habilitadas y elimina propiedades desconocidas', () => {
    expect(normalizeIntegrationSetup({ shortcut: true, bankEmail: false, notifications: true, token: 'ignored' })).toEqual({
      shortcut: true,
      bankEmail: false,
      notifications: true,
    })
  })

  it('no crea una tarea de configuración cuando no hay opciones seleccionadas', () => {
    expect(normalizeIntegrationSetup({ shortcut: false, bankEmail: false, notifications: false })).toBeNull()
    expect(normalizeIntegrationSetup(null)).toBeNull()
  })
})
