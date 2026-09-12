import { describe, expect, it } from 'vitest'
import { canonicalEventHash, normalizeLabel, normalizeShortcutEvent, randomSecret, sha256, templateMetadata } from '../../server/api-lib/shortcut-contract.js'

const event = {
  schema_version: 1,
  event_id: '550e8400-e29b-41d4-a716-446655440000',
  occurred_at: '2026-09-10T12:30:00-05:00', amount_minor: '8500000', currency: 'COP',
  merchant_name: '  Mercado de ejemplo ', card_alias: 'Tarjeta principal',
  source: 'ios_shortcuts', mode: 'capture',
}

describe('contrato de eventos de Atajos', () => {
  it('mantiene dinero como entero menor y normaliza campos deterministas', () => {
    const normalized = normalizeShortcutEvent(event)
    expect(normalized.amount_minor).toBe(8500000)
    expect(normalized.normalized_merchant).toBe('mercado de ejemplo')
    expect(normalized.occurred_at).toBe('2026-09-10T17:30:00.000Z')
    expect(normalized.review_reasons).toEqual([])
  })

  it('manda formatos ambiguos, moneda y fecha inválida a revisión sin inventarlos', () => {
    const normalized = normalizeShortcutEvent({ ...event, amount_minor: '85.000,00', currency: 'USD', occurred_at: 'hoy' })
    expect(normalized.amount_minor).toBeNull()
    expect(normalized.currency).toBe('USD')
    expect(normalized.occurred_at).toBeNull()
    expect(normalized.review_reasons).toContain('amount_missing_or_ambiguous')
    expect(normalized.review_reasons).toContain('date_missing_or_invalid')
  })

  it('produce la misma huella en reintentos y otra si cambia el contenido', () => {
    const normalized = normalizeShortcutEvent(event)
    expect(canonicalEventHash(normalized)).toBe(canonicalEventHash({ ...normalized, received_at: new Date().toISOString() }))
    expect(canonicalEventHash(normalized)).not.toBe(canonicalEventHash({ ...normalized, amount_minor: 1 }))
  })

  it('genera secretos de 32 bytes y almacenable solo como hash', () => {
    const secret = randomSecret()
    expect(secret).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(sha256(secret)).toMatch(/^[0-9a-f]{64}$/)
  })

  it('no habilita una plantilla sin un enlace iCloud real', () => {
    const prior = process.env.SHORTCUT_ICLOUD_URL
    process.env.SHORTCUT_ICLOUD_URL = 'https://ejemplo.invalid/falso.shortcut'
    expect(templateMetadata().availability).toBe('pending')
    expect(templateMetadata().shortcutIcloudUrl).toBeNull()
    if (prior === undefined) delete process.env.SHORTCUT_ICLOUD_URL
    else process.env.SHORTCUT_ICLOUD_URL = prior
  })

  it('habilita una plantilla publicada aunque la prueba de iOS siga pendiente', () => {
    const prior = Object.fromEntries(['SHORTCUT_ICLOUD_URL', 'APP_ORIGIN', 'SHORTCUT_TEMPLATE_VERSION', 'SHORTCUT_MIN_IOS_TESTED'].map((key) => [key, process.env[key]]))
    process.env.SHORTCUT_ICLOUD_URL = 'https://www.icloud.com/shortcuts/12c4f7d2f466425ba3e9379203ab59f5'
    process.env.APP_ORIGIN = 'https://pata-wallet.vercel.app'
    process.env.SHORTCUT_TEMPLATE_VERSION = '1.0.0'
    delete process.env.SHORTCUT_MIN_IOS_TESTED

    const metadata = templateMetadata()
    expect(metadata.availability).toBe('available')
    expect(metadata.minSupportedVersionTested).toBeNull()

    for (const [key, value] of Object.entries(prior)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  })

  it('normaliza alias sin fusionar signos o palabras diferentes', () => {
    expect(normalizeLabel('  Visa   Principal ')).toBe('visa principal')
    expect(normalizeLabel('Mercado Norte')).not.toBe(normalizeLabel('Mercado Sur'))
  })
})
