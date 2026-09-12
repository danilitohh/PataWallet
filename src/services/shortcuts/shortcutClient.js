import { supabase } from '../../lib/supabase/client.js'

async function accessToken() {
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session?.access_token) throw new Error('Tu sesión venció. Vuelve a iniciar sesión.')
  return data.session.access_token
}

async function request(path, options = {}) {
  const token = await accessToken()
  const response = await fetch(path, { ...options, headers: { Authorization:`Bearer ${token}`, 'Content-Type':'application/json', ...options.headers } })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error || 'No se pudo completar la operación de Atajos.')
  return result
}

export const readShortcutStatus = () => request('/api/shortcuts/status')
export const createPairingTicket = (label) => request('/api/shortcuts/pairing-tickets',{method:'POST',body:JSON.stringify({label})})
export const revokeShortcutDevice = (id) => request(`/api/shortcuts/devices/${encodeURIComponent(id)}`,{method:'DELETE'})
export const declareShortcutAutomation = (id, declared) => request(`/api/shortcuts/devices/${encodeURIComponent(id)}`,{method:'POST',body:JSON.stringify({automation_declared:declared})})
export const saveCardMapping = (value) => request('/api/shortcuts/mappings',{method:'POST',body:JSON.stringify(value)})
export const deleteCardMapping = (id) => request('/api/shortcuts/mappings',{method:'DELETE',body:JSON.stringify({id})})
export const saveCategoryRule = (value) => request('/api/shortcuts/rules',{method:'POST',body:JSON.stringify(value)})
export const deleteCategoryRule = (id) => request('/api/shortcuts/rules',{method:'DELETE',body:JSON.stringify({id})})
export const resolveShortcutEvent = (id,value) => request(`/api/shortcuts/review/${encodeURIComponent(id)}`,{method:'POST',body:JSON.stringify(value)})

export const pendingTemplate = {
  shortcutIcloudUrl:null, templateVersion:'1.0.0-blueprint', shortcutName:'PataWallet - Registrar compra',
  minSupportedVersionTested:null, availability:'pending',
}
