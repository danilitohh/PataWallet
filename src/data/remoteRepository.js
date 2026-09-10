import { supabase } from '../lib/supabase/client.js'
import { SyncConflictError } from '../services/sync/syncErrors.js'

const defaultSettings = [
  { key: 'entered', value: true },
  { key: 'theme', value: 'system' },
  { key: 'hiddenAmounts', value: false },
  { key: 'motion', value: 'system' },
]

const defaultCategories = [
  ['income-salary', 'Salario', 'income'],
  ['expense-groceries', 'Mercado', 'expense'],
  ['expense-transport', 'Transporte', 'expense'],
  ['expense-pets', 'Mascotas', 'expense'],
  ['expense-restaurants', 'Restaurantes', 'expense'],
]

function ensure(error) {
  if (error) throw error
}

export async function ensureRemoteWorkspace(userId) {
  const { data: { user } } = await supabase.auth.getUser()
  const preferredName = user?.user_metadata?.display_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || ''
  const displayName = preferredName.trim().length >= 2 ? preferredName.trim().slice(0, 80) : 'Usuario'
  const { error: profileError } = await supabase.from('profiles').upsert({ id: userId, display_name: displayName })
  ensure(profileError)
  const { count, error } = await supabase.from('user_settings').select('key', { count: 'exact', head: true }).eq('user_id', userId)
  ensure(error)
  if (!count) {
    const { error: settingsError } = await supabase.from('user_settings').insert(defaultSettings.map((row) => ({ ...row, user_id: userId })))
    ensure(settingsError)
  }
  const { count: categoryCount, error: categoryReadError } = await supabase.from('categories').select('id', { count: 'exact', head: true }).eq('user_id', userId)
  ensure(categoryReadError)
  if (!categoryCount) {
    const rows = defaultCategories.map(([suffix, name, type]) => ({ id: `${userId}:${suffix}`, user_id: userId, name, type }))
    const { error: categoryError } = await supabase.from('categories').insert(rows)
    ensure(categoryError)
  }
}

export async function loadRemoteWorkspace(userId) {
  const tables = ['accounts', 'categories', 'transactions', 'budgets', 'goals', 'goal_allocations', 'user_settings']
  const results = await Promise.all(tables.map((table) => supabase.from(table).select('*').eq('user_id', userId)))
  results.forEach(({ error }) => ensure(error))
  const clean = (rows) => rows.map(({ user_id: _owner, created_at: _created, ...row }) => row)
  return {
    accounts: clean(results[0].data),
    categories: clean(results[1].data),
    transactions: clean(results[2].data).sort((a, b) => b.occurred_at.localeCompare(a.occurred_at)),
    budgets: clean(results[3].data),
    goals: clean(results[4].data),
    allocations: clean(results[5].data),
    settingsRows: clean(results[6].data),
  }
}

function cleanWrite(row) {
  const { _sync_state, user_id, created_at, ...clean } = row
  void _sync_state; void user_id; void created_at
  return clean
}

function normalizeServerRow(row) {
  if (!row) return row
  const copy = { ...row }
  for (const key of ['amount_minor', 'limit_minor', 'target_minor', 'version']) {
    if (copy[key] !== undefined && copy[key] !== null) copy[key] = Number(copy[key])
  }
  return copy
}

function conflict(error, fallback = 'El dato cambió en otro dispositivo.') {
  if (error?.code === 'PT409' || error?.status === 409 || error?.code === '23505') {
    throw new SyncConflictError(error.message || fallback, error)
  }
  ensure(error)
}

async function currentUserIs(userId) {
  const { data, error } = await supabase.auth.getUser()
  ensure(error)
  if (data.user?.id !== userId) {
    const issue = new Error('La sesión cambió. La cola local no se enviará con otro usuario.')
    issue.code = 'PT401'
    throw issue
  }
}

async function insertStable(table, userId, payload, idColumn = 'id') {
  const desired = { ...cleanWrite(payload), user_id: userId }
  const { data, error } = await supabase.from(table).insert(desired).select().single()
  if (!error) return normalizeServerRow(data)
  if (error.code !== '23505') conflict(error)
  const idValue = desired[idColumn]
  const existingResult = await supabase.from(table).select('*').eq('user_id', userId).eq(idColumn, idValue).maybeSingle()
  ensure(existingResult.error)
  if (!existingResult.data) throw new SyncConflictError('El identificador ya existe, pero no pertenece a esta sesión.')
  const comparableKeys = Object.keys(cleanWrite(payload)).filter((key) => !['version', 'updated_at'].includes(key))
  const identical = comparableKeys.every((key) => JSON.stringify(existingResult.data[key]) === JSON.stringify(desired[key]))
  if (!identical) throw new SyncConflictError('El mismo identificador contiene datos diferentes en el servidor.')
  return normalizeServerRow(existingResult.data)
}

async function updateVersioned(table, userId, idColumn, idValue, payload, expectedVersion) {
  if (!Number.isInteger(expectedVersion)) throw new SyncConflictError('Falta la versión necesaria para comprobar el cambio.')
  const values = { ...cleanWrite(payload), version: expectedVersion + 1, updated_at: new Date().toISOString() }
  const { data, error } = await supabase.from(table).update(values)
    .eq('user_id', userId).eq(idColumn, idValue).eq('version', expectedVersion).select().maybeSingle()
  conflict(error)
  if (!data) throw new SyncConflictError('El dato cambió o fue eliminado en otro dispositivo.')
  return normalizeServerRow(data)
}

export async function executeRemoteOperation(userId, operation) {
  await currentUserIs(userId)
  const payload = cleanWrite(operation.payload || {})
  if (operation.entity === 'transactions') {
    const { data, error } = await supabase.rpc('mutate_transaction', {
      p_operation_id: operation.operation_id,
      p_action: operation.action,
      p_payload: payload,
      p_expected_version: operation.expected_version ?? null,
    })
    conflict(error)
    return { entity: 'transactions', row: normalizeServerRow(data?.transaction) }
  }
  if (operation.entity === 'goal_allocations' && operation.action === 'create') {
    const { data, error } = await supabase.rpc('add_goal_allocation', {
      p_operation_id: operation.operation_id,
      p_payload: payload,
    })
    conflict(error)
    return { entity: 'goal_allocations', row: normalizeServerRow(data?.allocation) }
  }
  if (operation.action === 'create') {
    const idColumn = operation.entity === 'budgets' ? 'month' : operation.entity === 'user_settings' ? 'key' : 'id'
    return { entity: operation.entity, row: await insertStable(operation.entity, userId, payload, idColumn) }
  }
  if (operation.action === 'update') {
    const idColumn = operation.entity === 'budgets' ? 'month' : operation.entity === 'user_settings' ? 'key' : 'id'
    return { entity: operation.entity, row: await updateVersioned(operation.entity, userId, idColumn, operation.entity_id, payload, operation.expected_version) }
  }
  if (operation.action === 'delete' && operation.entity === 'goals') {
    const { data, error } = await supabase.from('goals').delete().eq('user_id', userId)
      .eq('id', operation.entity_id).eq('version', operation.expected_version).select().maybeSingle()
    conflict(error)
    if (!data) throw new SyncConflictError('La meta cambió o ya fue eliminada.')
    return { entity: 'goals', deleted: true, id: operation.entity_id }
  }
  throw new Error(`Operación remota no soportada: ${operation.entity}/${operation.action}`)
}
