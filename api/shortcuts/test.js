import { assertBodySize, allowMethod, json } from '../../server/api-lib/http.js'
import { authorizedShortcut, shortcutError } from '../../server/api-lib/shortcut-server.js'

export default async function handler(req, res) {
  if (!allowMethod(req, res, ['POST'])) return
  try {
    assertBodySize(req, 500)
    const { admin, authorization } = await authorizedShortcut(req, 'test')
    const { data, error } = await admin.rpc('server_record_shortcut_test', { p_device_id: authorization.device_id, p_user_id: authorization.user_id })
    if (error) throw error
    return json(res, 200, { status: 'connection_verified', tested_at: data, financial_effect: false, message: 'Conexión verificada. Esta prueba no creó un movimiento.' })
  } catch (error) { const safe = shortcutError(error); return json(res, safe.status, { error: safe.message }) }
}
