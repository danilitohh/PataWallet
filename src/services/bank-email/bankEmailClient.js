import { supabase } from '../../lib/supabase/client.js'

// Mantiene la sesión de PataWallet; no solicita acceso al buzón ni credenciales de Gmail.
export async function bankEmailRequest(method = 'GET', page = 0) {
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session?.access_token) throw new Error('Vuelve a iniciar sesión.')
  const response = await fetch(`/api/bank-email?page=${page}`, {
    method, headers: { Authorization: `Bearer ${data.session.access_token}`, 'Content-Type': 'application/json' },
    ...(method === 'POST' ? { body: JSON.stringify({ consent: true }) } : {}),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error || 'No se pudo consultar la recepción de correos.')
  return result
}

// PostgreSQL confirma el movimiento y resuelve el correo en una sola transacción con auth.uid().
export async function resolveBankEmail(id, action, payload = {}, transactionId = null, distinct = false) {
  const { data, error } = await supabase.rpc('resolve_bank_email', {
    p_id: id, p_action: action, p_payload: payload, p_transaction_id: transactionId, p_distinct: distinct,
  })
  if (error) throw new Error(error.code === 'PT409' ? error.message : 'No se pudo guardar. Comprueba los datos y vuelve a intentarlo.')
  return data
}
