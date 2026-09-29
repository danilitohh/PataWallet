import { randomBytes } from 'node:crypto'
import { assertBodySize, assertTrustedOrigin, allowMethod, json } from '../../server/api-lib/http.js'
import { adminClient, authenticatedUser } from '../../server/api-lib/supabase-server.js'
import { receiverConfiguration } from '../../server/bank-email/receiver.js'

// Configuración del propietario; las credenciales y cuerpos originales nunca llegan al navegador.
export default async function handler(req, res) {
  if (!allowMethod(req, res, ['GET', 'POST', 'DELETE'])) return
  try {
    assertTrustedOrigin(req); assertBodySize(req, 1000)
    const user = await authenticatedUser(req)
    const configuration = receiverConfiguration()
    // La bandeja también recibe OAuth: permanece legible aunque Resend esté desactivado.
    const admin = adminClient()
    if (req.method === 'POST') {
      if (!configuration.enabled) return json(res, 503, { error: 'El receptor aún no está configurado.' })
      if (req.body?.consent !== true) return json(res, 400, { error: 'Confirma el tratamiento de los correos reenviados.' })
      // Repetir activación conserva la dirección; reactivar una dirección revocada genera otra.
      const { data: existing, error } = await admin.from('bank_email_addresses').select('address,enabled').eq('user_id', user.id).maybeSingle()
      if (error) throw error
      if (!existing?.enabled) {
        const row = { user_id: user.id, address: `pw-${randomBytes(24).toString('hex')}@${configuration.domain}`, enabled: true, consent_at: new Date().toISOString(), verification_code: null, verification_at: null }
        const query = existing
          ? admin.from('bank_email_addresses').update(row).eq('user_id', user.id).eq('enabled', false)
          : admin.from('bank_email_addresses').upsert(row, { onConflict: 'user_id', ignoreDuplicates: true })
        const saved = await query
        if (saved.error) throw saved.error
      }
    }
    if (req.method === 'DELETE') {
      const { error } = await admin.from('bank_email_addresses').update({ enabled: false, verification_code: null, verification_at: null }).eq('user_id', user.id)
      if (error) throw error
      return json(res, 200, { disabled: true })
    }
    const page = Math.max(0, Math.min(10000, Number.parseInt(req.query?.page || '0', 10) || 0))
    const [inbox, events] = await Promise.all([
      admin.from('bank_email_addresses').select('address,enabled,last_received_at,verification_code,verification_at').eq('user_id', user.id).maybeSingle(),
      admin.from('bank_email_events').select('id,bank,candidate,received_at,status,transaction_id').eq('user_id', user.id).eq('status', 'pending').order('received_at', { ascending: false }).order('id').range(page * 20, page * 20 + 20),
    ])
    if (inbox.error || events.error) throw inbox.error || events.error
    if (inbox.data && !(Date.parse(inbox.data.verification_at || '') > Date.now() - 3600000)) inbox.data.verification_code = null
    return json(res, 200, { configured: configuration.enabled, inbox: inbox.data, events: events.data.slice(0, 20), has_more: events.data.length > 20 })
  } catch (error) {
    const status = [400, 401, 403, 413].includes(error.status) ? error.status : 503
    return json(res, status, { error: status < 500 ? error.message : 'La recepción de correos no está disponible. Revisa la configuración y migración.' })
  }
}
