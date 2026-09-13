import { describe, expect, it, vi } from 'vitest'

vi.mock('../../server/api-lib/supabase-server.js', () => ({
  authenticatedUser: vi.fn(async (req) => {
    if (!req.headers.authorization) throw Object.assign(new Error('Sesión ausente.'), { status: 401 })
    return { id: 'user-1' }
  }),
}))

import handler from '../../api/ai/chat.js'

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

describe('endpoint seguro del asistente Ollama', () => {
  it('rechaza solicitudes sin sesión antes de consultar el proveedor', async () => {
    const res = response()
    await handler({ method: 'POST', headers: {}, body: { question: 'Resume mis gastos', context: {} } }, res)
    expect(res.statusCode).toBe(401)
    expect(res.payload.error).toMatch(/Sesión/)
    expect(res.headers['Cache-Control']).toBe('no-store')
  })

  it('rechaza cuerpos grandes antes de autenticar o enviar datos financieros', async () => {
    const res = response()
    await handler({ method: 'POST', headers: { 'content-length': '25000' }, body: {} }, res)
    expect(res.statusCode).toBe(413)
  })

  it('rechaza métodos distintos de POST', async () => {
    const res = response()
    await handler({ method: 'GET', headers: {} }, res)
    expect(res.statusCode).toBe(405)
  })

  it('consulta Ollama desde el servidor y devuelve solo la respuesta', async () => {
    const previous = Object.fromEntries(['OLLAMA_BASE_URL', 'OLLAMA_MODEL', 'OLLAMA_API_KEY'].map((key) => [key, process.env[key]]))
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: 'Tus gastos bajaron este mes.' } }),
    })
    process.env.OLLAMA_BASE_URL = 'https://ollama.com/api'
    process.env.OLLAMA_MODEL = 'modelo-de-prueba'
    process.env.OLLAMA_API_KEY = 'server-only-test-key'
    const res = response()

    await handler({ method: 'POST', headers: { authorization: 'Bearer supabase-token' }, body: { question: 'Resume mis gastos', context: { summary: { expenses_minor: 10 } } } }, res)

    expect(res.statusCode).toBe(200)
    expect(res.payload).toEqual({ answer: 'Tus gastos bajaron este mes.' })
    expect(fetchSpy).toHaveBeenCalledWith('https://ollama.com/api/chat', expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer server-only-test-key' }),
      body: expect.stringContaining('"stream":false'),
    }))
    fetchSpy.mockRestore()
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  })
})
