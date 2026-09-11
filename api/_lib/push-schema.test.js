import { describe, expect, it } from 'vitest'
import { assertSafeEndpoint, notificationPayload, safeNotificationRoute, subscriptionRequestSchema } from './push-schema.js'

describe('contrato del servidor Push', () => {
  it('rechaza destinos inseguros y cuerpos manipulados', () => {
    expect(() => assertSafeEndpoint('http://127.0.0.1/push')).toThrow()
    expect(() => assertSafeEndpoint('https://example.com/internal')).toThrow()
    expect(assertSafeEndpoint('https://fcm.googleapis.com/fcm/send/abc')).toContain('fcm.googleapis.com')
    expect(subscriptionRequestSchema.safeParse({ subscription: { endpoint: 'https://fcm.googleapis.com/a', keys: { p256dh: 'short', auth: 'short' } }, preferences: { movements: true, budgets: true, review: false, showDetails: false }, user_id: 'forged' }).success).toBe(false)
  })

  it('protege contenido y rutas por defecto', () => {
    const event = { event_kind: 'movement', event_key: 'movement:one:v1', payload: {} }
    const privatePayload = notificationPayload(event, { show_sensitive_details: false }, { amount_minor: 8500000, merchant_name: 'Veterinaria' })
    expect(privatePayload.body).not.toMatch(/85|Veterinaria/)
    const detailed = notificationPayload(event, { show_sensitive_details: true }, { amount_minor: 8500000, merchant_name: 'Veterinaria' })
    expect(detailed.body).toContain('Veterinaria')
    expect(safeNotificationRoute('https://evil.example')).toBe('/ajustes/notificaciones')
    expect(safeNotificationRoute('/actividad')).toBe('/actividad')
  })
})
