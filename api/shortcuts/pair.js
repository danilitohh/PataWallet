import { assertBodySize, allowMethod, json } from '../_lib/http.js'
import { pairSchema, randomSecret, sha256, templateMetadata } from '../_lib/shortcut-contract.js'
import { shortcutError } from '../_lib/shortcut-server.js'
import { adminClient } from '../_lib/supabase-server.js'

export default async function handler(req, res) {
  if (!allowMethod(req, res, ['POST'])) return
  try {
    assertBodySize(req, 2_000)
    const parsed = pairSchema.safeParse(req.body)
    if (!parsed.success) return json(res, 400, { error: 'Código o versión inválidos.' })
    const template = templateMetadata()
    if (template.availability !== 'available') return json(res, 409, { error: 'La plantilla todavía no está habilitada.' })
    if (parsed.data.template_version !== template.templateVersion) return json(res, 409, { error: 'La versión de la plantilla no coincide.' })
    const token = randomSecret()
    const tokenExpiresAt = new Date(Date.now() + 180 * 24 * 60 * 60_000).toISOString()
    const { data, error } = await adminClient().rpc('server_consume_pairing_ticket', {
      p_ticket_hash: sha256(parsed.data.ticket), p_token_hash: sha256(token),
      p_token_expires_at: tokenExpiresAt, p_template_version: template.templateVersion,
    })
    if (error) throw error
    return json(res, 201, { device_id: data.device_id, token, expires_at: data.expires_at, api_origin: process.env.APP_ORIGIN.replace(/\/$/, '') })
  } catch (error) { const safe = shortcutError(error); return json(res, safe.status, { error: safe.message }) }
}
