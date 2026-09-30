import { afterEach, describe, expect, it, vi } from 'vitest'

const { admin, authorize } = vi.hoisted(() => ({ admin: { rpc: vi.fn() }, authorize: vi.fn() }))

vi.mock('../../server/api-lib/shortcut-server.js', () => ({
  authorizedShortcut: authorize,
  shortcutError: (error) => ({ status: error.status || 503, message: error.message }),
}))

import shortcutHandler from '../../api/shortcuts.js'

function response() {
  return { statusCode: 0, payload: null, headers: {}, status(code) { this.statusCode = code; return this }, setHeader(name, value) { this.headers[name] = value; return this }, json(value) { this.payload = value; return this } }
}

const validEvent = {
  schema_version: 1,
  event_id: '550e8400-e29b-41d4-a716-446655440000',
  occurred_at: '2026-09-30T12:30:00-05:00',
  amount_minor: 3250000,
  currency: 'COP',
  merchant_name: 'Comercio de prueba',
  card_alias: 'Tarjeta de prueba',
  source: 'ios_shortcuts',
  mode: 'capture',
}

// Ensures the diagnostic route authenticates and normalizes but never calls financial persistence.
describe('validación segura de eventos de Atajos', () => {
  afterEach(() => { vi.clearAllMocks() })

  it('returns a normalized preview and explicitly reports no writes or notifications', async () => {
    authorize.mockResolvedValue({ admin, authorization: { device_id: 'device-1', user_id: 'user-1' } })
    const res = response()

    await shortcutHandler({ method: 'POST', headers: {}, body: validEvent, query: { operation: 'events-validate' } }, res)

    expect(res.statusCode).toBe(200)
    expect(res.payload).toMatchObject({
      ok: true, validation_only: true, event_persisted: false, financial_effect: false, notification_sent: false,
      payload_complete: true, missing_fields: [],
      event: { amount_minor: 3250000, currency: 'COP', merchant_name: 'Comercio de prueba', card_alias: 'Tarjeta de prueba', review_reasons: [] },
    })
    expect(authorize).toHaveBeenCalledWith(expect.any(Object), 'validate')
    expect(admin.rpc).not.toHaveBeenCalled()
  })

  it('identifies missing fields without blocking the safe diagnostic response', async () => {
    authorize.mockResolvedValue({ admin, authorization: { device_id: 'device-1', user_id: 'user-1' } })
    const incompleteEvent = { schema_version: 1, event_id: validEvent.event_id, source: 'ios_shortcuts', mode: 'capture' }
    const res = response()

    await shortcutHandler({ method: 'POST', headers: {}, body: incompleteEvent, query: { operation: 'events-validate' } }, res)

    expect(res.statusCode).toBe(200)
    expect(res.payload.payload_complete).toBe(false)
    expect(res.payload.missing_fields).toEqual(['amount', 'currency', 'occurred_at', 'merchant_name', 'card_alias'])
    expect(res.payload.event_persisted).toBe(false)
    expect(admin.rpc).not.toHaveBeenCalled()
  })

  it('reports safe field hints for invalid payloads before authorization', async () => {
    const res = response()
    const invalidEvent = { ...validEvent, schema_version: '1', unexpected: 'do-not-echo' }

    await shortcutHandler({ method: 'POST', headers: {}, body: invalidEvent, query: { operation: 'events-validate' } }, res)

    expect(res.statusCode).toBe(400)
    expect(res.payload).toMatchObject({
      code: 'INVALID_EVENT_CONTRACT',
      validation_errors: [
        { field: 'schema_version', problem: 'valor_incorrecto', expected: 'Número 1' },
        { field: 'campos_adicionales', problem: 'campo_no_permitido' },
      ],
    })
    expect(JSON.stringify(res.payload)).not.toContain('do-not-echo')
    expect(JSON.stringify(res.payload)).not.toContain('unexpected')
    expect(authorize).not.toHaveBeenCalled()
    expect(admin.rpc).not.toHaveBeenCalled()
  })
})
