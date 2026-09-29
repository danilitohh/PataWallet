import { notificationPayload } from './push-schema.js'
import { deliver, deliveryKind } from './web-push.js'

const MAX_BATCH = 20

// Entrega avisos encolados y conserva el reintento cuando el proveedor Push está temporalmente indisponible.
export async function processPushOutbox(admin, limit = MAX_BATCH) {
  const { data: events, error } = await admin.rpc('claim_push_outbox', { p_limit: Math.min(MAX_BATCH, Math.max(1, limit)) })
  if (error) throw error
  const now = new Date().toISOString(); let accepted = 0
  for (const event of events || []) {
    const { data: subscriptions, error: subscriptionError } = await admin.from('push_subscriptions').select('*').eq('user_id', event.user_id).eq('active', true)
    if (subscriptionError) throw subscriptionError
    let transaction = null
    if (event.event_kind === 'movement' && subscriptions?.some((item) => item.show_sensitive_details)) {
      const result = await admin.from('transactions').select('amount_minor,merchant_name').eq('user_id', event.user_id).eq('id', event.payload.transaction_id).maybeSingle()
      transaction = result.data
    }
    let retry = false
    for (const subscription of subscriptions || []) {
      const enabled = event.event_kind === 'movement' ? subscription.notify_movements : event.event_kind === 'budget' ? subscription.notify_budgets : subscription.notify_review
      if (!enabled) { await recordDelivery(admin, event, subscription, 'skipped'); continue }
      try {
        const result = await deliver(subscription, notificationPayload(event, subscription, transaction))
        await recordDelivery(admin, event, subscription, 'accepted', result.statusCode); accepted += 1
      } catch (pushError) {
        const kind = deliveryKind(pushError)
        await recordDelivery(admin, event, subscription, kind, pushError.statusCode)
        if (kind === 'permanent') await admin.from('push_subscriptions').update({ active: false, disabled_at: now }).eq('id', subscription.id)
        if (kind === 'transient' || kind === 'configuration') retry = true
      }
    }
    const exhausted = event.attempts >= 5
    await admin.from('push_outbox').update(retry && !exhausted
      ? { status: 'failed', next_attempt_at: new Date(Date.now() + Math.min(3600, 30 * (2 ** Math.max(0, event.attempts - 1))) * 1000).toISOString() }
      : { status: retry ? 'expired' : 'delivered', processed_at: now }).eq('id', event.id)
  }
  return { processed: events?.length || 0, accepted }
}

async function recordDelivery(admin, event, subscription, status, providerStatus = null) {
  await admin.from('push_deliveries').upsert({ outbox_id: event.id, subscription_id: subscription.id, status, attempts: Math.min(8, event.attempts), provider_status: providerStatus, updated_at: new Date().toISOString() })
}
