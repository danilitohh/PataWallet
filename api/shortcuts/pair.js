import { assertBodySize, assertTrustedOrigin, allowMethod, json } from '../../server/api-lib/http.js'
import { pairSchema, pairingTicketSchema, randomSecret, sha256, templateMetadata } from '../../server/api-lib/shortcut-contract.js'
import { shortcutError } from '../../server/api-lib/shortcut-server.js'
import { adminClient, authenticatedUser } from '../../server/api-lib/supabase-server.js'

export default async function handler(req, res) {
  if (req.query?.operation === 'create-ticket') return createPairingTicketHandler(req, res)
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

export async function createPairingTicketHandler(req, res) {
  if (!allowMethod(req, res, ['POST'])) return
  try {
    assertTrustedOrigin(req)
    assertBodySize(req, 2_000)
    const user = await authenticatedUser(req)
    const parsed = pairingTicketSchema.safeParse(req.body || {})
    if (!parsed.success) return json(res, 400, { error: 'Nombre de dispositivo inválido.' })
    const template = templateMetadata()
    if (template.availability !== 'available') return json(res, 409, { error: 'La plantilla aún no está publicada y verificada.' })
    const ticket = randomSecret()
    const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString()
    const { error } = await adminClient().rpc('server_create_pairing_ticket', {
      p_user_id: user.id,
      p_ticket_hash: sha256(ticket),
      p_label: parsed.data.label,
      p_expires_at: expiresAt,
    })
    if (error) throw error
    const input = encodeURIComponent(JSON.stringify({ mode: 'pair', ticket }))
    const runUrl = `shortcuts://run-shortcut?name=${encodeURIComponent(template.shortcutName)}&input=text&text=${input}`
    return json(res, 201, { ticket, expiresAt, runUrl })
  } catch (error) {
    const safe = shortcutError(error)
    return json(res, safe.status, { error: safe.message })
  }
}
