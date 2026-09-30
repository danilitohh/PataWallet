// Shared server-only Shortcuts contract. This file is not a Vercel route.
import { createHash, randomBytes } from 'node:crypto'
import { z } from 'zod'

const shortText = (max) => z.string().trim().max(max)

export const pairingTicketSchema = z.object({ label: shortText(60).min(1).default('iPhone') }).strict()
export const pairSchema = z.object({ ticket: z.string().min(40).max(100), template_version: shortText(30).min(1) }).strict()
export const mappingSchema = z.object({ card_alias: shortText(80).min(1), account_id: shortText(180).min(1) }).strict()
export const ruleSchema = z.object({ merchant_pattern: shortText(120).min(1), category_id: shortText(180).min(1), priority: z.number().int().min(1).max(1000).default(100) }).strict()
export const reviewSchema = z.object({
  expected_version: z.number().int().positive(), action: z.enum(['record', 'categorize', 'associate']),
  account_id: shortText(180).min(1).optional(), category_id: shortText(180).min(1).optional(),
  amount_minor: z.string().regex(/^[1-9]\d{0,11}$/).optional(), occurred_at: z.string().datetime({ offset: true }).optional(),
  transaction_id: shortText(180).min(1).optional(), create_rule: z.boolean().default(false), remember_card_mapping: z.boolean().default(false),
}).strict().superRefine((value, context) => {
  if (value.remember_card_mapping && (value.action !== 'record' || !value.account_id)) {
    context.addIssue({ code: 'custom', message: 'Guardar la tarjeta requiere registrar el evento con una cuenta.', path: ['remember_card_mapping'] })
  }
})

export const shortcutEventSchema = z.object({
  schema_version: z.literal(1), event_id: z.string().uuid(),
  occurred_at: z.union([z.string().max(50), z.null()]).optional(),
  amount_minor: z.union([z.string().max(40), z.number().finite(), z.null()]).optional(),
  amount: z.union([z.string().max(40), z.number().finite()]).nullable().optional(),
  currency: z.union([z.string().trim().max(8), z.null()]).optional(),
  merchant_name: z.union([shortText(120), z.null()]).optional(),
  card_alias: z.union([shortText(80), z.null()]).optional(),
  source: z.literal('ios_shortcuts'), mode: z.literal('capture'),
  template_version: z.union([shortText(30), z.null()]).optional(),
}).strict()

export function normalizeLabel(value) {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('es-CO')
}

// Convierte solo cantidades decimales inequívocas de Wallet (pesos) a unidades menores.
function walletAmountToMinor(value) {
  const raw = typeof value === 'number' && Number.isFinite(value) ? String(value) : typeof value === 'string' ? value.trim() : ''
  if (!/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(raw)) return null
  const [whole, fraction = ''] = raw.split('.')
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  return Number.isSafeInteger(minor) && minor > 0 && minor <= 999_999_999_999 ? minor : null
}

export function normalizeShortcutEvent(input) {
  const parsed = shortcutEventSchema.parse(input)
  const reasons = []
  const declaredMinor = typeof parsed.amount_minor === 'string'
    ? (/^[1-9]\d{0,11}$/.test(parsed.amount_minor) ? Number(parsed.amount_minor) : null)
    : Number.isSafeInteger(parsed.amount_minor) && parsed.amount_minor > 0 && parsed.amount_minor <= 999_999_999_999
      ? parsed.amount_minor : null
  const walletMinor = walletAmountToMinor(parsed.amount)
  const hasConflictingAmountFields = parsed.amount_minor != null && parsed.amount != null
    && (declaredMinor === null || walletMinor === null || declaredMinor !== walletMinor)
  const amountMinor = hasConflictingAmountFields ? null : parsed.amount_minor != null ? declaredMinor : walletMinor
  if (hasConflictingAmountFields) reasons.push('amount_conflict')
  if (!hasConflictingAmountFields && (parsed.amount_minor != null || parsed.amount != null) && amountMinor === null) reasons.push('amount_missing_or_ambiguous')
  const currency = typeof parsed.currency === 'string' && /^[A-Z]{3}$/.test(parsed.currency) ? parsed.currency : null
  if (parsed.currency != null && currency === null) reasons.push('currency_missing_or_unsupported')
  const occurredAt = typeof parsed.occurred_at === 'string' && !Number.isNaN(Date.parse(parsed.occurred_at)) && /(Z|[+-]\d{2}:\d{2})$/.test(parsed.occurred_at)
    ? new Date(parsed.occurred_at).toISOString() : null
  if (parsed.occurred_at != null && occurredAt === null) reasons.push('date_missing_or_invalid')
  return {
    ...parsed, amount_minor: amountMinor, currency, occurred_at: occurredAt,
    merchant_name: parsed.merchant_name || null,
    normalized_merchant: parsed.merchant_name ? normalizeLabel(parsed.merchant_name) : null,
    card_alias: parsed.card_alias || null,
    normalized_card_alias: parsed.card_alias ? normalizeLabel(parsed.card_alias) : null,
    review_reasons: [...new Set(reasons)].sort(),
  }
}

export function canonicalEventHash(event) {
  const keys = ['schema_version','event_id','occurred_at','amount_minor','amount','currency','merchant_name','normalized_merchant','card_alias','normalized_card_alias','source','mode','template_version']
  return sha256(JSON.stringify(Object.fromEntries(keys.map((key) => [key, event[key] ?? null]))))
}

export function randomSecret(bytes = 32) { return randomBytes(bytes).toString('base64url') }
export function sha256(value) { return createHash('sha256').update(value, 'utf8').digest('hex') }

export function deviceToken(req) {
  const value = req.headers.authorization || ''
  if (!value.startsWith('Bearer ') || value.length > 500) throw Object.assign(new Error('Vinculación ausente.'), { status: 401 })
  const token = value.slice(7)
  if (!/^[A-Za-z0-9_-]{40,100}$/.test(token)) throw Object.assign(new Error('Vinculación inválida.'), { status: 401 })
  return token
}

export const templateMetadata = () => {
  const url = process.env.SHORTCUT_ICLOUD_URL?.trim() || null
  const apiOrigin = process.env.APP_ORIGIN?.trim().replace(/\/$/, '') || null
  const configuredVersion = process.env.SHORTCUT_TEMPLATE_VERSION?.trim() || null
  const version = configuredVersion || '1.0.0-blueprint'
  const testedVersion = process.env.SHORTCUT_MIN_IOS_TESTED?.trim() || null
  const validUrl = Boolean(url && /^https:\/\/www\.icloud\.com\/shortcuts\/[A-Za-z0-9]+$/.test(url))
  const validOrigin = Boolean(apiOrigin && /^https:\/\/[^/]+$/.test(apiOrigin))
  return {
    shortcutIcloudUrl: validUrl ? url : null,
    templateVersion: version,
    shortcutName: process.env.SHORTCUT_NAME?.trim() || 'PataWallet - Registrar compra',
    minSupportedVersionTested: testedVersion,
    availability: validUrl && validOrigin && configuredVersion ? 'available' : 'pending',
  }
}
