import { describe, expect, it } from 'vitest'
import pairHandler, { createPairingTicketHandler as pairingHandler } from './pair.js'
import eventsHandler from './events.js'
import statusHandler from './status.js'
import testHandler from './test.js'
import deviceHandler from './devices/[id].js'

function response() { return { statusCode:0, payload:null, headers:{}, status(code){this.statusCode=code;return this}, setHeader(name,value){this.headers[name]=value;return this}, json(value){this.payload=value;return this} } }

describe('protección HTTP de Atajos', () => {
  it.each([pairingHandler,statusHandler,deviceHandler])('exige sesión para endpoints del propietario', async (handler) => {
    const res=response(); await handler({method:handler===statusHandler?'GET':'POST',headers:{},body:{automation_declared:true},query:{id:'x'}},res)
    expect(res.statusCode).toBe(401); expect(res.headers['Cache-Control']).toBe('no-store')
  })
  it.each([testHandler])('exige token de dispositivo para la prueba', async (handler) => {
    const res=response(); await handler({method:'POST',headers:{},body:{}},res); expect(res.statusCode).toBe(401)
  })
  it('rechaza un evento grande antes de autenticar o guardar', async () => {
    const res=response(); await eventsHandler({method:'POST',headers:{'content-length':'9000'},body:{}},res); expect(res.statusCode).toBe(413)
  })
  it('rechaza eventos estructuralmente falsos', async () => {
    const res=response(); await eventsHandler({method:'POST',headers:{},body:{user_id:'otro'}},res); expect(res.statusCode).toBe(400)
  })
  it('no canjea tickets mal formados', async () => {
    const res=response(); await pairHandler({method:'POST',headers:{},body:{ticket:'corto',template_version:'1'}},res); expect(res.statusCode).toBe(400)
  })
})
