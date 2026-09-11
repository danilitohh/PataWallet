import { createClient } from '@supabase/supabase-js'

function env(name, fallback) {
  const value = process.env[name] || (fallback ? process.env[fallback] : '')
  if (!value) throw Object.assign(new Error(`Falta configuración de servidor: ${name}.`), { status: 503 })
  return value
}

export function adminClient() {
  return createClient(env('SUPABASE_URL', 'VITE_SUPABASE_URL'), env('SUPABASE_SECRET_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function authenticatedUser(req) {
  const authorization = req.headers.authorization || ''
  if (!authorization.startsWith('Bearer ') || authorization.length > 9000) throw Object.assign(new Error('Sesión ausente.'), { status: 401 })
  const token = authorization.slice(7)
  const verifier = createClient(env('SUPABASE_URL', 'VITE_SUPABASE_URL'), env('SUPABASE_PUBLISHABLE_KEY', 'VITE_SUPABASE_PUBLISHABLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await verifier.auth.getUser(token)
  if (error || !data.user) throw Object.assign(new Error('Sesión vencida o inválida.'), { status: 401 })
  return data.user
}
