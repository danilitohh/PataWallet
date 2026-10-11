import { describe, expect, it } from 'vitest'
import { normalizeCurrency, normalizeIntegrationSetup, normalizeSignupSetup, SUPPORTED_CURRENCIES } from './registration.js'

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

describe('moneda base del perfil', () => {
  it('incluye las monedas ofrecidas por el registro', () => {
    expect(SUPPORTED_CURRENCIES.map(({ code }) => code)).toEqual(['COP', 'GTQ', 'USD', 'EUR', 'MXN', 'GBP'])
  })

  it('valida la moneda elegida al procesar las preferencias de registro', () => {
    expect(normalizeCurrency('USD')).toBe('USD')
    expect(normalizeCurrency('ZZZ')).toBe('COP')
    expect(normalizeSignupSetup({ version: 1, currency: 'MXN' })).toMatchObject({ currency: 'MXN' })
    expect(normalizeSignupSetup({ version: 1, currency: 'invalid' })).toMatchObject({ currency: 'COP' })
  })
})
