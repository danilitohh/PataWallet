import { assertTrustedOrigin, allowMethod, json, safeError } from '../../_lib/http.js'
import { adminClient, authenticatedUser } from '../../_lib/supabase-server.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export default async function handler(req, res) {
  if (!allowMethod(req, res, ['DELETE'])) return
  try {
    assertTrustedOrigin(req)
    const user = await authenticatedUser(req)
    const id = String(req.query.id || '')
    if (!UUID.test(id)) return json(res, 400, { error: 'Identificador inválido.' })
    const admin = adminClient()
    const { data, error } = await admin.from('push_subscriptions').update({ active: false, disabled_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', id).eq('user_id', user.id).select('id').maybeSingle()
    if (error) throw error
    if (!data) return json(res, 404, { error: 'Suscripción no encontrada.' })
    return json(res, 200, { disabled: true })
  } catch (error) {
    const safe = safeError(error)
    return json(res, safe.status, { error: safe.message })
  }
}
