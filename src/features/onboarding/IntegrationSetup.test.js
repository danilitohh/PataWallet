import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { IntegrationSetup } from './IntegrationSetup.jsx'

function renderSetup(preferences) {
  return renderToString(createElement(MemoryRouter, null, createElement(IntegrationSetup, { preferences, onFinish() {} })))
}

describe('guía opcional de conexiones después del registro', () => {
  it('muestra enlaces de configuración solo para las integraciones elegidas', () => {
    const html = renderSetup({ shortcut: true, bankEmail: true, notifications: false })
    expect(html).toContain('Pagos con tarjeta')
    expect(html).toContain('https://www.icloud.com/shortcuts/8062e3a7c10748a7aceaf47b9d0fdb19')
    expect(html).toContain('/ajustes/correos-bancarios')
    expect(html).not.toContain('Activar notificaciones')
  })

  it('muestra el acceso para activar notificaciones cuando se seleccionó', () => {
    const html = renderSetup({ shortcut: false, bankEmail: false, notifications: true })
    expect(html).toContain('/ajustes/notificaciones')
    expect(html).toContain('Activar notificaciones')
    expect(html).not.toContain('Pagos con tarjeta')
  })

  it('no muestra una guía vacía si no hay opciones pendientes', () => {
    expect(renderSetup({ shortcut: false, bankEmail: false, notifications: false })).toBe('')
  })
})
