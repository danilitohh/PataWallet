import { assertBodySize, assertTrustedOrigin, allowMethod, json, safeError } from './http.js'
import { notificationPayload, testRequestSchema } from './push-schema.js'
import { adminClient, authenticatedUser } from './supabase-server.js'
import { deliver, deliveryKind } from './web-push.js'

/**
 * Envía una notificación de prueba para el propietario de la suscripción.
 * Se mantiene en una utilidad compartida para que Vercel no cree otra función
 * serverless solo para este endpoint.
 */
export async function handlePushTest(req, res) {
  if (!allowMethod(req, res, ['POST'])) return
  try {
    assertTrustedOrigin(req)
    assertBodySize(req, 2_000)
    const user = await authenticatedUser(req)
    const parsed = testRequestSchema.safeParse(req.body)
    if (!parsed.success) return json(res, 400, { error: 'Solicitud de prueba inválida.' })
    const admin = adminClient()
    const { data: allowed, error: rateError } = await admin.rpc('reserve_push_test_slot', { p_user_id: user.id })
    if (rateError) throw rateError
    if (!allowed) return json(res, 429, { error: 'Espera un minuto antes de enviar otra prueba.' })
    const { data: subscription, error } = await admin.from('push_subscriptions').select('*').eq('id', parsed.data.subscriptionId).eq('user_id', user.id).eq('active', true).maybeSingle()
    if (error) throw error
    if (!subscription) return json(res, 404, { error: 'La suscripción no está activa para esta sesión.' })
    const event = { event_kind: 'test', event_key: `test-${crypto.randomUUID()}`, payload: { route: '/ajustes/notificaciones' } }
    try {
      const result = await deliver(subscription, notificationPayload(event, subscription))
      return json(res, 202, { accepted: true, providerStatus: result.statusCode, message: 'El servicio Push aceptó el envío. Confirma manualmente si apareció en tu dispositivo.' })
    } catch (pushError) {
      const kind = deliveryKind(pushError)
      if (kind === 'permanent') await admin.from('push_subscriptions').update({ active: false, disabled_at: new Date().toISOString() }).eq('id', subscription.id)
      throw Object.assign(new Error(kind === 'permanent' ? 'La suscripción venció; actívala de nuevo.' : 'El proveedor Push rechazó o no pudo aceptar el envío.'), { status: kind === 'configuration' ? 503 : 502 })
    }
  } catch (error) {
    const safe = safeError(error)
    return json(res, safe.status, { error: safe.message })
  }
}
