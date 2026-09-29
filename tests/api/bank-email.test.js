import { describe, expect, it } from 'vitest'
import { parseBankEmail } from '../../server/bank-email/parseBankEmail.js'

// Datos sintéticos: conservan las plantillas, no las identidades, cuentas o referencias del usuario.
const senders = { lulo: 'notificaciones@lulobank.com', bancolombia: 'alertasynotificaciones@notificacionesbancolombia.com', nequi: 'notificaciones@nequi.com.co' }
const parse = (bank, text, subject = 'Operación exitosa') => parseBankEmail({ sender: senders[bank], subject, text })
const payment = 'Hiciste un pago en LULO BANK S A por $706.750 Fecha: El 29 de abril de 2026 Hora: 8:33 p. m. CUS: 90000001'

describe('candidatos de correos bancarios (sin efectos financieros)', () => {
  it.each([
    ['lulo', 'Realizaste una transferencia a PERSONA EJEMPLO por $50,000 Origen cuenta • 1234 Llave • @EJEMPLO ID. transacción • 90000002 Fecha 25 de septiembre de 2026 Hora 9:12 p.m.', 'outgoing', 5000000, '2026-09-26T02:12:00.000Z'],
    ['bancolombia', 'Bancolombia: Transferiste $60,000.00 desde tu cuenta 1234 a la cuenta *9999999999 el 27/10/2025 a las 15:07.', 'outgoing', 6000000, '2025-10-27T20:07:00.000Z'],
    ['bancolombia', 'Bancolombia: USUARIO, recibiste una transferencia de PERSONA EJEMPLO por $46,000.00 en tu cuenta *1234 conectada a la llave 8888888 el 26/10/2025 a las 02:53.', 'incoming', 4600000, '2025-10-26T07:53:00.000Z'],
    ['nequi', 'Recibiste 150.000 de PERSONA EJEMPLO el 26 de septiembre de 2026 a las 7:21 p. m. desde el banco.', 'incoming', 15000000, '2026-09-27T00:21:00.000Z'],
    ['nequi', 'Enviaste de manera exitosa 7.900 a la llave 9999999999 de PERSONA EJEMPLO el 25 de septiembre de 2026 a las 12:42 p. m.', 'outgoing', 790000, '2026-09-25T17:42:00.000Z'],
    ['nequi', 'Enviaste de manera exitosa 150.000 a la llave 9999999999 de PERSONA EJEMPLO el 5 de septiembre de 2026 a las 12:40 p. m.', 'outgoing', 15000000, '2026-09-05T17:40:00.000Z'],
    ['nequi', 'Hiciste un pago en CINE DE EJEMPLO SAS por $8.500 Fecha: El 26 de julio de 2026 Hora: 12:59 p. m. CUS: 90000003', 'outgoing', 850000, '2026-07-26T17:59:00.000Z'],
    ['nequi', payment, 'outgoing', 70675000, '2026-04-30T01:33:00.000Z'],
  ])('extrae %s: %s', (bank, text, direction, amount, date) => {
    const result = parse(bank, text)
    expect(result).toMatchObject({ bank, direction, amount_minor: amount, occurred_at: date, status: 'needs_review', transaction_type: null, currency: null })
    expect(result.review_reasons).toContain('email_authentication_required')
  })

  it('no convierte el pago a Lulo en gasto ni inventa la titularidad del destino', () => {
    const result = parseBankEmail({ sender: 'somos@nequi.com.co', subject: '¡Pago exitoso!', text: payment })
    expect(result).toMatchObject({ notice_kind: 'payment_notice', transaction_type: null, counterparty: 'LULO BANK S A', bank_reference: '90000001' })
    expect(result.review_reasons).toContain('transaction_type_required')
  })

  it('conserva centavos y reconoce COP solamente si es explícito', () => {
    expect(parse('nequi', payment.replace('706.750', '706.750,25') + ' COP')).toMatchObject({ amount_minor: 70675025, currency: 'COP' })
    expect(parse('bancolombia', 'Transferiste $60,000.25 desde tu cuenta 1234 a la cuenta *9999 el 27/10/2025 a las 15:07.')).toMatchObject({ amount_minor: 6000025 })
  })

  it.each(['7,90.0', '7.90', '0', '99999999999999999999999'])('no corrige un importe inválido: %s', (amount) => {
    expect(parse('nequi', payment.replace('706.750', amount)).amount_minor).toBeNull()
  })

  it('rechaza cambio de separadores de la plantilla Lulo', () => {
    expect(parse('lulo', 'Realizaste una transferencia a EJEMPLO por $50.000').amount_minor).toBeNull()
  })

  it.each(['31 de abril de 2026', '29 de febrero de 2025', '29 de desconocido de 2026'])('no normaliza una fecha imposible: %s', (date) => {
    expect(parse('nequi', payment.replace('29 de abril de 2026', date)).occurred_at).toBeNull()
  })

  it('no inventa hora, respeta medianoche y rechaza una hora inválida', () => {
    expect(parse('nequi', payment.replace('Hora: 8:33 p. m.', '')).occurred_at).toBeNull()
    expect(parse('nequi', payment.replace('8:33 p. m.', '12:00 a. m.')).occurred_at).toBe('2026-04-29T05:00:00.000Z')
    expect(parse('nequi', payment.replace('8:33 p. m.', '13:33 p. m.')).occurred_at).toBeNull()
  })

  it.each(['Pendiente', 'Transferencia rechazada', 'Operación reversada'])('no interpreta como éxito: %s', (subject) => {
    expect(parse('nequi', payment, subject)).toMatchObject({ amount_minor: null, review_reasons: expect.arrayContaining(['non_final_or_failed_notice']) })
  })

  it('deja mensajes con múltiples operaciones y plantillas desconocidas para revisión', () => {
    expect(parse('nequi', payment + ' ' + payment).review_reasons).toContain('multiple_operations')
    expect(parse('nequi', 'Tu saldo disponible es $100.000').review_reasons).toContain('unsupported_template')
  })

  it('no confía en dominios parecidos, HTML o un indicador de autenticación enviado como dato', () => {
    expect(parseBankEmail({ sender: 'somos@nequi.com.co.ejemplo.com', subject: '', text: payment }).review_reasons).toContain('unsupported_sender')
    expect(parse('nequi', `<p>${payment}</p>`).review_reasons).toContain('plain_text_required')
    expect(() => parseBankEmail({ sender: senders.nequi, subject: '', text: payment, authenticated: true })).toThrow()
  })

  it('limita el tamaño y no devuelve el correo completo, llave o cuenta completa', () => {
    expect(() => parse('nequi', 'x'.repeat(32_001))).toThrow()
    const result = parse('bancolombia', 'Transferiste $60,000.00 desde tu cuenta 1234 a la cuenta *9999999999 el 27/10/2025 a las 15:07.')
    expect(JSON.stringify(result)).not.toContain('9999999999')
    expect(result).not.toHaveProperty('text')
  })
})
