import { afterEach, describe, expect, it, vi } from 'vitest'
import { classifyMerchantCategory } from '../../server/api-lib/shortcut-category-ai.js'

const openAiReply = (category, confidence = 'alta') => Response.json({
  output: [{ content: [{ type: 'output_text', text: JSON.stringify({ category, confidence }) }] }],
})
const geminiReply = (category, confidence = 'alta') => Response.json({
  candidates: [{ content: { parts: [{ text: JSON.stringify({ category, confidence }) }] } }],
})
const input = { geminiApiKey: 'gemini-server-secret', openAiApiKey: 'openai-server-secret', geminiModel: 'gemini-test', verifierModel: 'gpt-cheap', arbiterModel: 'gpt-judge', merchant: 'Tienda Uno', categories: ['Mercado', 'Transporte'] }

// Responde a cada proveedor con contenido simulado sin contactar servicios externos.
function mockProviders({ gemini, openAi }) {
  const fetch = vi.fn((url) => String(url).includes('generativelanguage.googleapis.com') ? gemini() : openAi())
  vi.stubGlobal('fetch', fetch)
  return fetch
}

describe('clasificación de comercios con cascada de IA', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('usa Gemini y el verificador OpenAI; con acuerdo no consulta al árbitro', async () => {
    const fetch = mockProviders({ gemini: () => geminiReply('Mercado'), openAi: () => openAiReply('Mercado') })
    await expect(classifyMerchantCategory(input)).resolves.toBe('Mercado')
    expect(fetch).toHaveBeenCalledTimes(2)
    const geminiCall = fetch.mock.calls.find(([url]) => String(url).includes('generativelanguage.googleapis.com'))
    expect(geminiCall[1].headers['x-goog-api-key']).toBe('gemini-server-secret')
    expect(JSON.parse(geminiCall[1].body).generationConfig.responseFormat.text.schema.properties.category.enum).toEqual(['Mercado', 'Transporte', 'ninguna'])
    expect(geminiCall[1].body).not.toMatch(/monto|cuenta|fecha|correo|usuario/i)
  })

  it('consulta al tercer modelo solo ante discrepancia y requiere mayoría', async () => {
    const fetch = mockProviders({ gemini: () => geminiReply('Mercado'), openAi: vi.fn()
      .mockResolvedValueOnce(openAiReply('Transporte'))
      .mockResolvedValueOnce(openAiReply('Mercado')) })
    await expect(classifyMerchantCategory(input)).resolves.toBe('Mercado')
    expect(fetch).toHaveBeenCalledTimes(3)
  })

  it('se abstiene si no hay mayoría, baja confianza, proveedor falla o faltan credenciales', async () => {
    const fetch = mockProviders({ gemini: () => geminiReply('Mercado'), openAi: vi.fn()
      .mockResolvedValueOnce(openAiReply('Transporte'))
      .mockResolvedValueOnce(openAiReply('ninguna'))
      .mockResolvedValueOnce(openAiReply('Mercado', 'media'))
      .mockResolvedValueOnce(Response.json({}, { status: 503 })) })
    await expect(classifyMerchantCategory(input)).resolves.toBeNull()
    await expect(classifyMerchantCategory(input)).resolves.toBeNull()
    await expect(classifyMerchantCategory({ ...input, geminiApiKey: '' })).resolves.toBeNull()
    expect(fetch).toHaveBeenCalledTimes(6)
  })
})
