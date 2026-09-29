import { afterEach, describe, expect, it, vi } from 'vitest'
import { agreeOnMerchantCategory } from './shortcut-category-ai.js'

const jsonResponse = (category, confidence = 'alta', status = 200) => Response.json({
  output: [{ content: [{ type: 'output_text', text: JSON.stringify({ category, confidence }) }] }],
}, { status })

describe('clasificación de comercios por consenso', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('acepta solo la misma categoría permitida con confianza alta de ambos modelos', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(jsonResponse('Mercado'))
      .mockResolvedValueOnce(jsonResponse('Mercado'))
    vi.stubGlobal('fetch', fetch)
    await expect(agreeOnMerchantCategory({ apiKey: 'server-secret', firstModel: 'a', secondModel: 'b', merchant: 'Tienda Uno', categories: ['Mercado', 'Transporte'] })).resolves.toBe('Mercado')
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer server-secret')
    expect(JSON.parse(fetch.mock.calls[0][1].body).input[1].content).toBe(JSON.stringify({ comercio: 'Tienda Uno', categorias_permitidas: ['Mercado', 'Transporte'] }))
    expect(fetch.mock.calls[0][1].body).not.toMatch(/monto|cuenta|fecha|correo|usuario/i)
  })

  it('no aprende si los modelos discrepan, dudan o el proveedor falla', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(jsonResponse('Mercado'))
      .mockResolvedValueOnce(jsonResponse('Transporte'))
      .mockResolvedValueOnce(jsonResponse('Mercado', 'media'))
      .mockResolvedValueOnce(jsonResponse('Mercado'))
      .mockResolvedValueOnce(jsonResponse('Mercado', 'alta', 503)))
    const input = { apiKey: 'server-secret', firstModel: 'a', secondModel: 'b', merchant: 'Comercio incierto', categories: ['Mercado', 'Transporte'] }
    await expect(agreeOnMerchantCategory(input)).resolves.toBeNull()
    await expect(agreeOnMerchantCategory(input)).resolves.toBeNull()
    await expect(agreeOnMerchantCategory(input)).resolves.toBeNull()
  })

  it('falla sin clave y nunca propone una categoría fuera de la lista', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(jsonResponse('Comida'))
      .mockResolvedValueOnce(jsonResponse('Mercado'))
    vi.stubGlobal('fetch', fetch)
    await expect(agreeOnMerchantCategory({ firstModel: 'a', secondModel: 'b', merchant: 'Tienda', categories: ['Mercado'] })).resolves.toBeNull()
    await expect(agreeOnMerchantCategory({ apiKey: 'server-secret', firstModel: 'a', secondModel: 'b', merchant: 'Tienda', categories: ['Mercado'] })).resolves.toBeNull()
    expect(fetch).toHaveBeenCalledTimes(2)
  })
})
