import Dexie from 'dexie'

const databases = new Map()

const tableKeys = {
  accounts: 'id',
  categories: 'id',
  transactions: 'id',
  budgets: 'month',
  goals: 'id',
  goal_allocations: 'id',
  user_settings: 'key',
  planned_purchases: 'id',
}

export function getUserDatabase(userId) {
  if (!userId || !/^[0-9a-f-]{20,}$/i.test(userId)) throw new Error('No se pudo identificar el espacio local del usuario.')
  if (databases.has(userId)) return databases.get(userId)
  const database = new Dexie(`patawallet-user-${userId}`)
  database.version(1).stores({
    accounts: 'id, kind, archived',
    categories: 'id, type',
    transactions: 'id, type, occurred_at, from_account_id, to_account_id, status',
    budgets: 'month',
    goals: 'id',
    goal_allocations: 'id, goal_id, account_id',
    user_settings: 'key',
    outbox: '++sequence, &operation_id, [entity+entity_id], status, queued_at',
    sync_meta: 'key',
  })
  database.version(2).stores({
    accounts: 'id, kind, archived', categories: 'id, type', transactions: 'id, type, occurred_at, from_account_id, to_account_id, status', budgets: 'month', goals: 'id',
    goal_allocations: 'id, goal_id, account_id', user_settings: 'key', planned_purchases: 'id, target_date, status', receipts: 'transaction_id',
    outbox: '++sequence, &operation_id, [entity+entity_id], status, queued_at', sync_meta: 'key',
  })
  databases.set(userId, database)
  return database
}

function normalizeRow(table, row) {
  const copy = { ...row }
  for (const key of ['amount_minor', 'limit_minor', 'target_minor', 'version', 'debt_installments_total', 'debt_installments_paid', 'debt_installment_amount_minor', 'debt_monthly_payment_minor']) {
    if (copy[key] !== undefined && copy[key] !== null) copy[key] = Number(copy[key])
  }
  if (table === 'transactions') copy.note ||= ''
  return copy
}

export async function readWorkspace(database) {
  const [accounts, categories, transactions, budgets, goals, allocations, plannedPurchases, receipts, settingsRows] = await Promise.all([
    database.accounts.toArray(),
    database.categories.toArray(),
    database.transactions.toArray(),
    database.budgets.toArray(),
    database.goals.toArray(),
    database.goal_allocations.toArray(),
    database.planned_purchases.toArray(),
    database.receipts.toArray(),
    database.user_settings.toArray(),
  ])
  return {
    accounts,
    categories,
    transactions: transactions.filter((row) => row.status !== 'void').sort((a, b) => b.occurred_at.localeCompare(a.occurred_at)),
    budgets,
    goals,
    allocations,
    plannedPurchases,
    receipts,
    settingsRows,
  }
}

export async function cacheServerWorkspace(database, workspace) {
  const mapping = {
    accounts: workspace.accounts,
    categories: workspace.categories,
    transactions: workspace.transactions,
    budgets: workspace.budgets,
    goals: workspace.goals,
    goal_allocations: workspace.allocations,
    user_settings: workspace.settingsRows,
    planned_purchases: workspace.plannedPurchases || [],
  }
  const tables = Object.keys(mapping).map((name) => database.table(name))
  await database.transaction('rw', [...tables, database.outbox, database.sync_meta], async () => {
    const dirty = await database.outbox.where('status').anyOf('pending', 'error', 'conflict').toArray()
    for (const [name, incoming] of Object.entries(mapping)) {
      const table = database.table(name)
      const key = tableKeys[name]
      const dirtyIds = new Set(dirty.filter((item) => item.entity === name).map((item) => item.entity_id))
      const localDirtyRows = (await table.toArray()).filter((row) => dirtyIds.has(String(row[key])))
      await table.clear()
      await table.bulkPut(incoming.map((row) => normalizeRow(name, row)))
      await table.bulkPut(localDirtyRows)
    }
    await database.sync_meta.put({ key: 'last_synced_at', value: new Date().toISOString() })
  })
}

export async function localSyncSummary(database, online = typeof navigator === 'undefined' ? true : navigator.onLine) {
  const [pending, errors, conflicts, last] = await Promise.all([
    database.outbox.where('status').equals('pending').count(),
    database.outbox.where('status').equals('error').count(),
    database.outbox.where('status').equals('conflict').count(),
    database.sync_meta.get('last_synced_at'),
  ])
  const unsynced = pending + errors + conflicts
  if (conflicts) return { kind: 'conflict', label: `${conflicts} conflicto${conflicts === 1 ? '' : 's'} por resolver`, pending: unsynced, conflicts, lastSyncedAt: last?.value || null }
  if (unsynced) return { kind: online ? 'pending' : 'local', label: online ? `${unsynced} pendiente${unsynced === 1 ? '' : 's'} de sincronizar` : 'Guardado en este dispositivo', pending: unsynced, conflicts: 0, lastSyncedAt: last?.value || null }
  if (!online) return { kind: 'local', label: 'Copia local · sin conexión', pending: 0, conflicts: 0, lastSyncedAt: last?.value || null }
  return { kind: 'synced', label: last ? 'Sincronizado' : 'Guardado en este dispositivo', pending: 0, conflicts: 0, lastSyncedAt: last?.value || null }
}

export async function clearUserDatabase(userId) {
  const database = getUserDatabase(userId)
  await database.delete()
  databases.delete(userId)
}
