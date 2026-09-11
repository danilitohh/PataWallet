import { assertBodySize, allowMethod, json } from '../../server/api-lib/http.js'
import { canonicalEventHash, normalizeShortcutEvent, shortcutEventSchema } from '../../server/api-lib/shortcut-contract.js'
import { authorizedShortcut, shortcutError } from '../../server/api-lib/shortcut-server.js'

export default async function handler(req, res) {
  if (!allowMethod(req, res, ['POST'])) return
  try {
    assertBodySize(req, 8_000)
    const structurallyValid = shortcutEventSchema.safeParse(req.body)
    if (!structurallyValid.success) return json(res, 400, { error: 'El evento no cumple el contrato de PataWallet.' })
    const event = normalizeShortcutEvent(structurallyValid.data)
    const { admin, authorization } = await authorizedShortcut(req, 'event')
    const { data, error } = await admin.rpc('server_ingest_shortcut_event', {
      p_user_id: authorization.user_id, p_device_id: authorization.device_id,
      p_event_id: event.event_id, p_request_hash: canonicalEventHash(event),
      p_occurred_at: event.occurred_at, p_amount_minor: event.amount_minor, p_currency: event.currency,
      p_merchant_name: event.merchant_name, p_normalized_merchant: event.normalized_merchant,
      p_card_alias: event.card_alias, p_normalized_card_alias: event.normalized_card_alias,
      p_review_reasons: event.review_reasons,
    })
    if (error) throw error
    return json(res, data.status === 'conflict' ? 409 : 200, { ...data, financial_effect: Boolean(data.transaction_id) })
  } catch (error) { const safe = shortcutError(error); return json(res, safe.status, { error: safe.message }) }
}
