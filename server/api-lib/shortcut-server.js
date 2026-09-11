// Shared server-only authorization. This file is not a Vercel route.
import { adminClient } from './supabase-server.js'
import { deviceToken, sha256 } from './shortcut-contract.js'

export async function authorizedShortcut(req, action) {
  const token = deviceToken(req)
  const admin = adminClient()
  const { data, error } = await admin.rpc('server_authorize_shortcut', { p_token_hash: sha256(token), p_action: action })
  if (error) {
    const status = error.code === 'PT429' ? 429 : 401
    throw Object.assign(new Error(status === 429 ? 'Demasiados intentos; espera un minuto.' : 'Vinculación inválida, vencida o revocada.'), { status })
  }
  return { admin, authorization: data }
}

export function shortcutError(error) {
  const code = error?.code
  const status = Number(error?.status) || ({ PT401: 401, PT404: 404, PT409: 409, PT410: 410, PT429: 429, 23503: 400, 22023: 400 }[code] ?? 503)
  const publicMessages = new Set([
    'El código venció o ya fue utilizado.', 'Demasiados intentos; espera un minuto.',
    'Vinculación inválida, vencida o revocada.', 'Este evento ya cambió o fue resuelto.',
    'Completa monto, moneda COP y fecha antes de registrar.', 'La cuenta no pertenece al usuario o está archivada.',
    'La categoría de gasto no pertenece al usuario.', 'El movimiento no pertenece al usuario.',
  ])
  return { status, message: publicMessages.has(error?.message) ? error.message : status >= 500 ? 'La integración de Atajos no está disponible.' : 'No se pudo completar la operación.' }
}
