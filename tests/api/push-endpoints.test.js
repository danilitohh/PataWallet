import { describe, expect, it } from 'vitest'
import subscriptionsHandler from '../../api/push/subscriptions/index.js'
import processHandler from '../../api/push/process.js'
import { handlePushTest as testHandler } from '../../server/api-lib/push-test.js'

function response() {
  return {
    statusCode: 0,
    payload: null,
    headers: {},
    status(code) { this.statusCode = code; return this },
    setHeader(name, value) { this.headers[name] = value; return this },
    json(value) { this.payload = value; return this },
  }
}

describe('protección de endpoints Push', () => {
  it.each([subscriptionsHandler, testHandler])('rechaza solicitudes sin sesión antes de tocar secretos o datos', async (handler) => {
    const res = response()
    await handler({ method: 'POST', headers: {}, body: {} }, res)
    expect(res.statusCode).toBe(401)
    expect(res.payload.error).toMatch(/Sesión/)
    expect(res.headers['Cache-Control']).toBe('no-store')
  })

  it('rechaza métodos no permitidos', async () => {
    const res = response()
    await subscriptionsHandler({ method: 'GET', headers: {} }, res)
    expect(res.statusCode).toBe(405)
  })

  it('rechaza cuerpos grandes antes de procesarlos', async () => {
    const priorOrigin = process.env.APP_ORIGIN
    process.env.APP_ORIGIN = 'https://pata-wallet.example'
    const res = response()
    await subscriptionsHandler({ method: 'POST', headers: { origin: process.env.APP_ORIGIN, 'content-length': '25000' }, body: {} }, res)
    expect(res.statusCode).toBe(413)
    if (priorOrigin === undefined) delete process.env.APP_ORIGIN
    else process.env.APP_ORIGIN = priorOrigin
  })

  it('expone solo la clave pública VAPID para activar el navegador', async () => {
    const prior = process.env.VAPID_PUBLIC_KEY
    process.env.VAPID_PUBLIC_KEY = 'public-key-for-browser'
    const res = response()
    await processHandler({ method: 'GET', query: { operation: 'config' }, headers: {} }, res)
    expect(res.statusCode).toBe(200)
    expect(res.payload).toEqual({ publicKey: 'public-key-for-browser' })
    if (prior === undefined) delete process.env.VAPID_PUBLIC_KEY
    else process.env.VAPID_PUBLIC_KEY = prior
  })
})
