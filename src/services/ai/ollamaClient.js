import { supabase } from '../../lib/supabase/client.js'

// Obtiene la sesión actual sin exponer el token en el estado de React ni en una URL.
async function accessToken() {
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session?.access_token) throw new Error('Tu sesión venció. Vuelve a iniciar sesión.')
  return data.session.access_token
}

// Envía una consulta de solo lectura al backend autenticado que protege las credenciales de Ollama.
export async function askAssistant(question, context) {
  const token = await accessToken()
  const response = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, context }),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || 'No se pudo consultar el asistente.')
  return payload.answer
}
