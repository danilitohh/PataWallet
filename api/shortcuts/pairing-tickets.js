import { assertBodySize, assertTrustedOrigin, allowMethod, json } from '../_lib/http.js'
import { pairingTicketSchema, randomSecret, sha256, templateMetadata } from '../_lib/shortcut-contract.js'
import { shortcutError } from '../_lib/shortcut-server.js'
import { adminClient, authenticatedUser } from '../_lib/supabase-server.js'

export default async function handler(req, res) {
  if (!allowMethod(req, res, ['POST'])) return
  try {
    assertTrustedOrigin(req); assertBodySize(req, 2_000)
    const user = await authenticatedUser(req)
    const parsed = pairingTicketSchema.safeParse(req.body || {})
    if (!parsed.success) return json(res, 400, { error: 'Nombre de dispositivo inválido.' })
    const template = templateMetadata()
    if (template.availability !== 'available') return json(res, 409, { error: 'La plantilla aún no está publicada y verificada.' })
    const ticket = randomSecret()
    const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString()
    const { error } = await adminClient().rpc('server_create_pairing_ticket', { p_user_id: user.id, p_ticket_hash: sha256(ticket), p_label: parsed.data.label, p_expires_at: expiresAt })
    if (error) throw error
    const input = encodeURIComponent(JSON.stringify({ mode: 'pair', ticket }))
    const runUrl = `shortcuts://run-shortcut?name=${encodeURIComponent(template.shortcutName)}&input=text&text=${input}`
    return json(res, 201, { ticket, expiresAt, runUrl })
  } catch (error) { const safe = shortcutError(error); return json(res, safe.status, { error: safe.message }) }
}
