import { Readable } from 'node:stream'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { emailDedupeKey, emailText, limitedBody, receiverConfiguration, verifyWebhook, receiveBankEmail } from '../../server/bank-email/receiver.js'
import handler from '../../api/bank-email/index.js'
import { POST } from '../../api/bank-email/receive.js'

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })
const secret = 'whsec_plJ3nmyCDGBKInavdOK15jsl'
const payload = '{"event_type":"ping","data":{"success":true}}'
const headers = { 'svix-id': 'msg_loFOjxBNrRLzqYUf', 'svix-timestamp': '1731705121', 'svix-signature': 'v1,rAvfW3dJ/X/qxhsaXPOyyCGmRKsaKWcsNccKXlIktD0=' }

describe('frontera del receptor de correos', () => {
  it('valida el vector público de Svix, rechaza alteraciones y expiración', () => {
    expect(verifyWebhook(Buffer.from(payload), headers, secret, 1731705121000)).toBe(true)
    expect(verifyWebhook(Buffer.from(payload + ' '), headers, secret, 1731705121000)).toBe(false)
    expect(verifyWebhook(Buffer.from(payload), headers, secret, 1731705422000)).toBe(false)
    expect(verifyWebhook(Buffer.from(payload), { ...headers, 'svix-timestamp': '1731705500' }, secret, 1731705121000)).toBe(false)
    expect(verifyWebhook(Buffer.from(payload), { ...headers, 'svix-signature': 'v1,garbage' }, secret, 1731705121000)).toBe(false)
  })

  it('limita el cuerpo real sin depender de Content-Length', async () => {
    await expect(limitedBody(Readable.from(['ab', 'cd']), 3)).rejects.toMatchObject({ status: 413 })
    expect((await limitedBody(Readable.from(['ab', 'cd']), 4)).toString()).toBe('abcd')
  })

  it('convierte HTML sin URLs, imágenes ni scripts y conserva importes', () => {
    expect(emailText({ html: '<p>Pago $8.500&nbsp;COP</p><a href="https://example.invalid/secret">Comercio</a><img src="https://example.invalid/track"><script>secret()</script><style>secret</style>' })).toBe('Pago $8.500\u00a0COP\n\nComercio')
  })

  it('mantiene la huella de reenvíos del mismo Message-ID, sin fusionar compras parecidas', () => {
    expect(emailDedupeKey({ id: 'one', message_id: 'original' })).toBe(emailDedupeKey({ id: 'two', message_id: 'original' }))
    expect(emailDedupeKey({ id: 'one' })).not.toBe(emailDedupeKey({ id: 'two' }))
  })

  it('no habilita recepción parcial y exige sesión al consultar', async () => {
    vi.stubEnv('BANK_EMAIL_ENABLED', 'false')
    expect(receiverConfiguration().enabled).toBe(false)
    const res = { status(code) { this.code = code; return this }, setHeader() { return this }, json(body) { this.body = body } }
    await handler({ method: 'GET', headers: {} }, res)
    expect(res.code).toBe(401)
    const response = await POST(new Request('https://example.invalid', { method: 'POST', body: '{}' }))
    expect(response.status).toBe(503)
  })

  it('no descarga correos para alias desconocidos o desactivados', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
    const admin = { from: () => ({ select: () => ({ in: () => ({ eq: async () => ({ data: [], error: null }) }) }) }) }
    expect(await receiveBankEmail({ type: 'email.received', data: { email_id: '00000000-0000-4000-8000-000000000001', to: ['unknown@example.invalid'] } }, admin)).toEqual({ status: 'ignored' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('rechaza webhook sin firma antes de tocar la base o proveedor', async () => {
    vi.stubEnv('BANK_EMAIL_ENABLED', 'true'); vi.stubEnv('BANK_EMAIL_DOMAIN', 'example.invalid')
    vi.stubEnv('RESEND_API_KEY', 'test'); vi.stubEnv('RESEND_WEBHOOK_SECRET', secret)
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
    const result = await POST(new Request('https://example.invalid', { method: 'POST', body: '{}' }))
    expect(result.status).toBe(401)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('recibe reenvíos por destinatario SMTP, guarda solo propuesta y permite reintentar fallos', async () => {
    const id = '00000000-0000-4000-8000-000000000001'
    const address = 'pw-test@example.invalid'
    const lookup = vi.fn(() => ({ eq: async () => ({ data: [{ address, user_id: 'owner' }], error: null }) }))
    const rpc = vi.fn().mockResolvedValue({ data: { status: 'pending' }, error: null })
    const admin = { from: (table) => ({ select: () => table === 'bank_email_addresses' ? { in: lookup } : { eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) } }), rpc }
    const email = { id, from: 'somos@nequi.com.co', to: ['original@example.invalid'], received_for: [address], subject: '¡Pago exitoso!', text: 'Hiciste un pago en LULO BANK S A por $706.750\nFecha: El 29 de abril de 2026\nHora: 8:33 p. m.\nCUS: 123456', html: null, message_id: 'unique@example.invalid' }
    vi.stubGlobal('fetch', vi.fn(async () => Response.json(email)))
    const event = { type: 'email.received', data: { email_id: id, to: email.to, received_for: [address] } }
    expect(await receiveBankEmail(event, admin)).toEqual({ status: 'pending' })
    expect(lookup).toHaveBeenCalledWith('address', [address])
    expect(rpc).toHaveBeenCalledWith('server_receive_bank_email', expect.objectContaining({ p_address: address, p_candidate: expect.objectContaining({ amount_minor: 70675000, transaction_type: null }) }))
    expect(JSON.stringify(rpc.mock.calls)).not.toContain('original@example.invalid')
    rpc.mockResolvedValueOnce({ error: new Error('Database unavailable') })
    await expect(receiveBankEmail(event, admin)).rejects.toThrow('Database unavailable')
    email.received_for = ['someone-else@example.invalid']
    await expect(receiveBankEmail(event, admin)).rejects.toThrow('Destinatario no coincide')
    expect(rpc).toHaveBeenCalledTimes(2)
  })
})
