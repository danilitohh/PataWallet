import { assertBodySize, assertTrustedOrigin, allowMethod, json, safeError } from '../../../server/api-lib/http.js'
import { assertSafeEndpoint, subscriptionRequestSchema } from '../../../server/api-lib/push-schema.js'
import { adminClient, authenticatedUser } from '../../../server/api-lib/supabase-server.js'

export default async function handler(req, res) {
  if (!allowMethod(req, res, ['POST'])) return
  try {
    assertTrustedOrigin(req)
    assertBodySize(req, 20_000)
    const user = await authenticatedUser(req)
    const parsed = subscriptionRequestSchema.safeParse(req.body)
    if (!parsed.success) return json(res, 400, { error: 'Suscripción o preferencias inválidas.' })
    const { subscription, preferences } = parsed.data
    const endpoint = assertSafeEndpoint(subscription.endpoint)
    const admin = adminClient()
    const { data: existing, error: readError } = await admin.from('push_subscriptions').select('id,user_id').eq('endpoint', endpoint).maybeSingle()
    if (readError) throw readError
    if (existing && existing.user_id !== user.id) return json(res, 409, { error: 'Esta suscripción pertenece a otra sesión. Desactívala y vuelve a intentarlo.' })
    const row = {
      id: existing?.id,
      user_id: user.id,
      endpoint,
      p256dh: subscription.keys.p256dh,
      auth_key: subscription.keys.auth,
      expiration_time: subscription.expirationTime ? new Date(subscription.expirationTime).toISOString() : null,
      active: true,
      disabled_at: null,
      updated_at: new Date().toISOString(),
    }
    if (preferences) Object.assign(row, {
      notify_movements: preferences.movements,
      notify_budgets: preferences.budgets,
      notify_review: preferences.review,
      show_sensitive_details: preferences.showDetails,
    })
    const query = existing
      ? admin.from('push_subscriptions').update(row).eq('id', existing.id).eq('user_id', user.id)
      : admin.from('push_subscriptions').insert(row)
    const { data, error } = await query.select('id,active,updated_at,notify_movements,notify_budgets,notify_review,show_sensitive_details').single()
    if (error) throw error
    return json(res, 200, { subscription: { id: data.id, active: data.active, updated_at: data.updated_at, preferences: { movements: data.notify_movements, budgets: data.notify_budgets, review: data.notify_review, showDetails: data.show_sensitive_details } } })
  } catch (error) {
    const safe = safeError(error)
    return json(res, safe.status, { error: safe.message })
  }
}
