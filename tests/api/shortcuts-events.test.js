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

const event = {
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

describe('captura de eventos Wallet', () => {
  afterEach(() => { vi.clearAllMocks() })

  it('guarda el evento sin depender de consultas o clasificación opcionales', async () => {
    admin.rpc.mockResolvedValue({ data: { status: 'recorded_needs_category', transaction_id: null }, error: null })
    authorize.mockResolvedValue({ admin, authorization: { device_id: 'device-1', user_id: 'user-1' } })
    const res = response()

    await shortcutHandler({ method: 'POST', headers: {}, body: event, query: { operation: 'events' } }, res)

    expect(authorize).toHaveBeenCalledWith(expect.any(Object), 'event')
    expect(admin.rpc).toHaveBeenCalledTimes(1)
    expect(admin.rpc).toHaveBeenCalledWith('server_ingest_shortcut_event', expect.objectContaining({
      p_user_id: 'user-1', p_device_id: 'device-1', p_event_id: event.event_id, p_amount_minor: event.amount_minor,
    }))
    expect(res.statusCode).toBe(200)
    expect(res.payload).toMatchObject({ status: 'recorded_needs_category', financial_effect: false })
  })
})
