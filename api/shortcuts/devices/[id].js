import { assertBodySize, assertTrustedOrigin, allowMethod, json } from '../../_lib/http.js'
import { shortcutError } from '../../_lib/shortcut-server.js'
import { adminClient, authenticatedUser } from '../../_lib/supabase-server.js'

export default async function handler(req, res) {
  if (!allowMethod(req, res, ['DELETE', 'POST'])) return
  try {
    assertTrustedOrigin(req); assertBodySize(req, 1_000); const user = await authenticatedUser(req)
    if (req.method === 'POST') {
      if (typeof req.body?.automation_declared !== 'boolean') return json(res, 400, { error: 'Declaración de automatización inválida.' })
      const { data, error } = await adminClient().from('device_links').update({ automation_declared_at: req.body.automation_declared ? new Date().toISOString() : null }).eq('id', req.query.id).eq('user_id', user.id).in('status', ['active', 'incomplete']).select('id,automation_declared_at').maybeSingle()
      if (error) throw error
      if (!data) return json(res, 404, { error: 'Vinculación no encontrada.' })
      return json(res, 200, { device: data, message: 'Estado declarado por el usuario; PataWallet no puede verificar la automatización de iOS.' })
    }
    const { data, error } = await adminClient().from('device_links').update({ status: 'revoked', revoked_at: new Date().toISOString() }).eq('id', req.query.id).eq('user_id', user.id).in('status', ['active', 'incomplete']).select('id').maybeSingle()
    if (error) throw error
    if (!data) return json(res, 404, { error: 'Vinculación no encontrada o ya revocada.' })
    return json(res, 200, { revoked: true, message: 'Acceso revocado. Desactiva también la automatización en Atajos.' })
  } catch (error) { const safe = shortcutError(error); return json(res, safe.status, { error: safe.message }) }
}
