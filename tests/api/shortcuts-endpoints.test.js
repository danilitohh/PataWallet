import { describe, expect, it } from 'vitest'
import shortcutHandler from '../../api/shortcuts.js'
import testHandler from '../../api/shortcuts/test.js'

function response() { return { statusCode:0, payload:null, headers:{}, status(code){this.statusCode=code;return this}, setHeader(name,value){this.headers[name]=value;return this}, json(value){this.payload=value;return this} } }

describe('protección HTTP de Atajos', () => {
  it.each([['create-ticket', 'POST'], ['status', 'GET'], ['device', 'POST']])('exige sesión para endpoints del propietario', async (operation, method) => {
    const res=response(); await shortcutHandler({method,headers:{},body:{automation_declared:true},query:{operation,id:'x'}},res)
    expect(res.statusCode).toBe(401); expect(res.headers['Cache-Control']).toBe('no-store')
  })
  it.each([testHandler])('exige token de dispositivo para la prueba', async (handler) => {
    const res=response(); await handler({method:'POST',headers:{},body:{}},res); expect(res.statusCode).toBe(401)
  })
  it('exige token de dispositivo para validar un evento sin guardarlo', async () => {
    const res=response(); await shortcutHandler({method:'POST',headers:{},body:{schema_version:1,event_id:'550e8400-e29b-41d4-a716-446655440000',amount_minor:3250000,occurred_at:'2026-09-30T12:30:00-05:00',currency:'COP',merchant_name:'PRUEBA SEGURA',card_alias:'Tarjeta de prueba',source:'ios_shortcuts',mode:'capture'},query:{operation:'events-validate'}},res)
    expect(res.statusCode).toBe(401)
  })
  it('rechaza un evento grande antes de autenticar o guardar', async () => {
    const res=response(); await shortcutHandler({method:'POST',headers:{'content-length':'9000'},body:{},query:{operation:'events'}},res); expect(res.statusCode).toBe(413)
  })
  it('rechaza eventos estructuralmente falsos', async () => {
    const res=response(); await shortcutHandler({method:'POST',headers:{},body:{user_id:'otro'},query:{operation:'events'}},res); expect(res.statusCode).toBe(400)
  })
  it('no canjea tickets mal formados', async () => {
    const res=response(); await shortcutHandler({method:'POST',headers:{},body:{ticket:'corto',template_version:'1'},query:{operation:'pair'}},res); expect(res.statusCode).toBe(400)
  })
})
