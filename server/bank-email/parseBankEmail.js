import { z } from 'zod'
import { parseLocalizedAmount } from '../../src/domain/money.js'

// Contrato interno de texto ya decodificado; no acepta adjuntos, HTML ni cabeceras de autenticación.
const emailSchema = z.object({
  sender: z.string().trim().email().max(254),
  subject: z.string().max(500),
  text: z.string().min(1).max(32_000),
}).strict()

// Los remitentes observados seleccionan una plantilla, NO prueban la autenticidad del mensaje.
const BANKS = new Map([
  ['notificaciones@lulobank.com', 'lulo'],
  ['alertasynotificaciones@notificacionesbancolombia.com', 'bancolombia'],
  ['notificaciones@nequi.com.co', 'nequi'],
  ['somos@nequi.com.co', 'nequi'],
])
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

// Cada patrón conserva la gramática del banco: Lulo/Bancolombia usan miles con coma; Nequi, punto.
const PATTERNS = {
  lulo: [
    { direction: 'outgoing', kind: 'transfer_notice', pattern: /Realizaste una transferencia a (?<party>[^\n]{1,160}?) por\s*\$(?<amount>[\d.,]+)(?=\s|$)/gi },
  ],
  bancolombia: [
    { direction: 'outgoing', kind: 'transfer_notice', pattern: /Transferiste\s*\$(?<amount>[\d.,]+) desde tu cuenta (?<account>\d{4}) a la cuenta \*?\d{4,20}(?=\s|$)/gi },
    { direction: 'incoming', kind: 'transfer_notice', pattern: /recibiste una transferencia de (?<party>[^\n]{1,160}?) por\s*\$(?<amount>[\d.,]+) en tu cuenta\s*\*?(?<account>\d{4})(?=\s|$)/gi },
  ],
  nequi: [
    { direction: 'incoming', kind: 'transfer_notice', pattern: /Recibiste\s*\$?(?<amount>[\d.,]+) de (?<party>[^\n]{1,160}?) el (?=\d{1,2} de )/gi },
    { direction: 'outgoing', kind: 'transfer_notice', pattern: /Enviaste de manera exitosa\s*\$?(?<amount>[\d.,]+) a la llave \S{1,100} de (?<party>[^\n]{1,160}?) el (?=\d{1,2} de )/gi },
    { direction: 'outgoing', kind: 'payment_notice', pattern: /Hiciste un pago en (?<party>[^\n]{1,160}?) por\s*\$(?<amount>[\d.,]+)(?=\s|$)/gi },
  ],
}

// Convierte únicamente formatos conocidos a unidades menores; jamás adivina separadores nuevos.
function readAmount(value, bank) {
  try {
    if (bank === 'nequi') return parseLocalizedAmount(value)
    if (!/^(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?$/.test(value)) return null
    return parseLocalizedAmount(value.replaceAll(',', '').replace('.', ','))
  } catch {
    return null
  }
}

// Usa la fecha de operación del texto, nunca la recepción del correo ni la fecha del dispositivo.
function readDate(text, bank) {
  const date = bank === 'bancolombia'
    ? text.match(/\b(\d{2})\/(\d{2})\/(\d{4})\b/)
    : text.match(/\b(\d{1,2}) de (\p{L}+) de (\d{4})\b/iu)
  const time = text.match(/(?:\bHora:?|\ba las)\s*(\d{1,2}):(\d{2})(?:\s*([ap])\.?\s*m\.?)?/i)
  if (!date || !time) return null
  const day = Number(date[1])
  const month = bank === 'bancolombia' ? Number(date[2]) : MONTHS.indexOf(date[2].toLowerCase()) + 1
  const year = Number(date[3])
  let hour = Number(time[1])
  const minute = Number(time[2])
  if (year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1 || minute > 59) return null
  if (time[3]) {
    if (hour < 1 || hour > 12) return null
    hour = hour % 12 + (time[3].toLowerCase() === 'p' ? 12 : 0)
  } else if (bank !== 'bancolombia' || hour > 23) return null
  const local = new Date(Date.UTC(year, month - 1, day, hour, minute))
  if (local.getUTCDate() !== day || local.getUTCMonth() !== month - 1) return null
  // Plantillas colombianas: America/Bogota, UTC−05:00. Otros países requieren otra plantilla.
  return new Date(local.getTime() + 5 * 60 * 60 * 1000).toISOString()
}

/**
 * Extrae un candidato de los formatos observados. No autentica correos, deduplica ni escribe dinero.
 * Siempre requiere revisión: «pago» no significa gasto y «recibiste» no significa ingreso.
 * El receptor valida entrega y propietario; el usuario confirma el efecto financiero.
 */
export function parseBankEmail(input) {
  const email = emailSchema.parse(input)
  const bank = BANKS.get(email.sender.toLowerCase()) || null
  const result = {
    bank, status: 'needs_review', direction: null, notice_kind: null,
    amount_minor: null, currency: null, occurred_at: null, counterparty: null,
    account_last4: null, bank_reference: null, transaction_type: null,
    review_reasons: ['email_authentication_required', 'account_mapping_required', 'transaction_type_required'],
  }
  if (!bank) return { ...result, review_reasons: [...result.review_reasons, 'unsupported_sender'] }
  // El receptor suministra texto plano. HTML inesperado se rechaza, no se limpia con regex.
  if (/<\/?[a-z][^>]*>/i.test(email.text)) return { ...result, review_reasons: [...result.review_reasons, 'plain_text_required'] }
  const text = email.text.normalize('NFC').replace(/\s+/g, ' ').trim()
  if (/\b(?:pendiente|rechazad[oa]|fallid[oa]|reversad[oa]|cancelad[oa]|no exitos[oa])\b/i.test(`${email.subject} ${text}`)) {
    return { ...result, review_reasons: [...result.review_reasons, 'non_final_or_failed_notice'] }
  }
  const matches = (PATTERNS[bank] || []).flatMap(({ pattern, ...type }) =>
    [...text.matchAll(pattern)].map((match) => ({ ...type, ...match.groups })),
  )
  if (matches.length !== 1) return { ...result, review_reasons: [...result.review_reasons, matches.length ? 'multiple_operations' : 'unsupported_template'] }
  const match = matches[0]
  result.direction = match.direction
  result.notice_kind = match.kind
  result.amount_minor = readAmount(match.amount, bank)
  result.occurred_at = readDate(text, bank)
  result.counterparty = match.party?.trim() || null
  result.account_last4 = match.account || text.match(/Origen cuenta\s*[•·:]\s*(\d{4})\b/i)?.[1] || null
  result.bank_reference = text.match(/(?:ID\. transacción\s*[•·:]|CUS:)\s*(\d{4,40})\b/i)?.[1] || null
  // «$» solo no determina moneda. Confirmarla evita registrar dólares como pesos.
  if (/\bCOP\b/.test(text) && !/\b(?:USD|EUR)\b/.test(text)) result.currency = 'COP'
  else result.review_reasons.push('currency_confirmation_required')
  if (result.amount_minor === null) result.review_reasons.push('amount_missing_or_ambiguous')
  if (!result.occurred_at) result.review_reasons.push('date_missing_or_invalid')
  return result
}
