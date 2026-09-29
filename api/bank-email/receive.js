import { adminClient } from '../../server/api-lib/supabase-server.js'
import { processPushOutbox } from '../../server/api-lib/push-dispatch.js'
import { limitedBody, receiveBankEmail, receiverConfiguration, verifyWebhook } from '../../server/bank-email/receiver.js'

// Request nativo conserva el cuerpo original requerido por Svix; no usa JSON reserializado.
export async function POST(request) {
  const reply = (status, body) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
  if (!receiverConfiguration().enabled) return reply(503, { error: 'Recepción no configurada.' })
  try {
    const body = await limitedBody(request.body, 32_000)
    if (!verifyWebhook(body, Object.fromEntries(request.headers), process.env.RESEND_WEBHOOK_SECRET)) return reply(401, { error: 'Firma inválida.' })
    const admin = adminClient()
    const result = await receiveBankEmail(JSON.parse(body.toString('utf8')), admin)
    await processPushOutbox(admin).catch(() => {})
    return reply(200, result)
  } catch (error) {
    // No devolver mensajes de proveedor, cabeceras, direcciones o texto del banco.
    return reply(error.status === 413 ? 413 : 503, { error: 'No se pudo procesar el correo.' })
  }
}
