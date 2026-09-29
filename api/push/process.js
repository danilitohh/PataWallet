import { allowMethod, json, safeError } from '../../server/api-lib/http.js'
import { adminClient } from '../../server/api-lib/supabase-server.js'
import { processPushOutbox } from '../../server/api-lib/push-dispatch.js'
import { handlePushTest } from '../../server/api-lib/push-test.js'
import { getVapidPublicKey } from '../../server/api-lib/vapid.js'

export default async function handler(req, res) {
  // El rewrite de /api/push/test comparte esta función para respetar el límite Hobby de Vercel.
  if (req.query?.operation === 'test') return handlePushTest(req, res)
  // La clave pública VAPID puede entregarse al navegador; la privada nunca sale del servidor.
  if (req.query?.operation === 'config') {
    if (!allowMethod(req, res, ['GET'])) return
    return json(res, 200, { publicKey: getVapidPublicKey() })
  }
  if (!allowMethod(req, res, ['POST', 'GET'])) return
  if (!process.env.CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return json(res, 401, { error: 'No autorizado.' })
  try {
    return json(res, 200, await processPushOutbox(adminClient()))
  } catch (error) {
    const safe = safeError(error)
    return json(res, safe.status, { error: safe.message })
  }
}
