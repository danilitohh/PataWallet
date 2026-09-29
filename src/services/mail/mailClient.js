import { supabase } from '../../lib/supabase/client.js'

// La sesión de PataWallet identifica al propietario; tokens de Google/Microsoft nunca se entregan aquí.
export async function mailRequest(operation = 'status', body, method = 'POST') {
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session?.access_token) throw new Error('Vuelve a iniciar sesión.')
  const response = await fetch(`/api/mail?operation=${operation}`, {
    method: operation === 'status' ? 'GET' : method,
    headers: { Authorization: `Bearer ${data.session.access_token}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error || 'No se pudo consultar la conexión de correo.')
  return result
}
