import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { IntegrationSetup } from './IntegrationSetup.jsx'

function renderSetup(preferences) {
  return renderToString(createElement(MemoryRouter, null, createElement(IntegrationSetup, { preferences, onFinish() {}, user: { id: 'test-user' }, isDemo: false, onImported() {} })))
}

describe('configuración opcional de conexiones después del registro', () => {
  it('muestra controles reales de correo solo cuando se eligió conectarlo', () => {
    const html = renderSetup({ shortcut: true, bankEmail: true, notifications: false })
    expect(html).toContain('Pagos con tarjeta')
    expect(html).toContain('https://www.icloud.com/shortcuts/8062e3a7c10748a7aceaf47b9d0fdb19')
    expect(html).toContain('Bancos para una nueva conexión')
    expect(html).toContain('Autorizo la lectura para buscar avisos de estos bancos')
    expect(html).toContain('Outlook / Hotmail')
    expect(html).not.toContain('Activar notificaciones')
  })

  it('muestra el panel de estado y activación de notificaciones cuando se eligió', () => {
    const html = renderSetup({ shortcut: false, bankEmail: false, notifications: true })
    expect(html).toContain('Avisos privados de PataWallet')
    expect(html).toContain('El permiso solo se solicita desde el botón')
    expect(html).not.toContain('Pagos con tarjeta')
  })

  it('no muestra una pantalla vacía si no hay opciones pendientes', () => {
    expect(renderSetup({ shortcut: false, bankEmail: false, notifications: false })).toBe('')
  })
})
