import { supabase } from '../../lib/supabase/client.js'

// Obtiene un token de sesión fresco para que las acciones compartidas respeten la cuenta activa.
async function accessToken() {
  if (!supabase) throw new Error('Las cuentas en pareja requieren una cuenta real.')
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session?.access_token) throw new Error('Tu sesión expiró. Inicia sesión de nuevo.')
  return data.session.access_token
}

// Centraliza las peticiones para no exponer tokens ni repetir el manejo de errores en cada pantalla.
async function request(path, options = {}) {
  const token = await accessToken()
  const response = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) } })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || 'No pudimos completar la operación.')
  return body
}

export function getCoupleOverview() {
  return request('/api/couples')
}

export function performCoupleAction(action, payload) {
  return request('/api/couples', { method: 'POST', body: JSON.stringify({ action, ...payload }) })
}
