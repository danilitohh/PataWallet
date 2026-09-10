import { ensureRemoteWorkspace, executeRemoteOperation, loadRemoteWorkspace } from '../../data/remoteRepository.js'
import { cacheServerWorkspace, getUserDatabase, localSyncSummary, readWorkspace } from './userDatabase.js'
import { isSessionError, SyncConflictError } from './syncErrors.js'

const tableFor = {
  accounts: 'accounts',
  categories: 'categories',
  transactions: 'transactions',
  budgets: 'budgets',
  goals: 'goals',
  goal_allocations: 'goal_allocations',
  user_settings: 'user_settings',
}

function operation(entity, action, entityId, payload, expectedVersion = null) {
  return {
    operation_id: crypto.randomUUID(),
    entity,
    action,
    entity_id: String(entityId),
    payload,
    expected_version: expectedVersion,
    status: 'pending',
    attempts: 0,
    queued_at: new Date().toISOString(),
    last_error: null,
  }
}

export class SyncController {
  constructor(userId, gateway = { ensureRemoteWorkspace, executeRemoteOperation, loadRemoteWorkspace }) {
    this.userId = userId
    this.database = getUserDatabase(userId)
    this.gateway = gateway
    this.listeners = new Set()
    this.running = null
    this.onlineHandler = () => this.syncNow().catch(() => {})
  }

  subscribe(listener) {
    if (!this.listeners.size && typeof window !== 'undefined') window.addEventListener('online', this.onlineHandler)
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
      if (!this.listeners.size && typeof window !== 'undefined') window.removeEventListener('online', this.onlineHandler)
    }
  }

  isOnline() {
    return typeof window === 'undefined' || typeof navigator === 'undefined' || navigator.onLine
  }

  async notify() {
    const state = await this.state()
    await Promise.all([...this.listeners].map((listener) => listener(state)))
    return state
  }

  async state() {
    const online = this.isOnline()
    const summary = await localSyncSummary(this.database, online)
    return this.running ? { ...summary, kind: 'syncing', label: 'Sincronizando…' } : summary
  }

  async snapshot() {
    return readWorkspace(this.database)
  }

  async initialize() {
    const cached = await this.snapshot()
    await this.notify()
    const hasCache = cached.settingsRows.length > 0
    if (!this.isOnline()) {
      if (!hasCache) throw new Error('Necesitas conexión para preparar este espacio por primera vez.')
      return cached
    }
    try {
      await this.gateway.ensureRemoteWorkspace(this.userId)
      await this.syncNow()
      return this.snapshot()
    } catch (error) {
      if (!hasCache) throw error
      await this.notify()
      return cached
    }
  }

  async syncNow() {
    if (this.running) return this.running
    if (!this.isOnline()) return this.notify()
    this.running = this.flushAndPull()
    await this.notify()
    try {
      return await this.running
    } finally {
      this.running = null
      await this.notify()
    }
  }

  async flushAndPull() {
    const queued = await this.database.outbox.where('status').anyOf('pending', 'error').sortBy('sequence')
    for (const item of queued) {
      await this.database.outbox.update(item.sequence, { status: 'pending', attempts: (item.attempts || 0) + 1, last_error: null })
      try {
        const result = await this.gateway.executeRemoteOperation(this.userId, item)
        const table = this.database.table(tableFor[result.entity])
        await this.database.transaction('rw', table, this.database.outbox, async () => {
          if (result.deleted) await table.delete(result.id)
          else if (result.row) await table.put(result.row)
          await this.database.outbox.delete(item.sequence)
        })
      } catch (error) {
        const status = error instanceof SyncConflictError ? 'conflict' : 'error'
        await this.database.outbox.update(item.sequence, { status, last_error: error.message || 'No se pudo sincronizar.' })
        const offline = !this.isOnline()
        if (status === 'conflict' || isSessionError(error) || offline) break
      }
    }
    try {
      const remote = await this.gateway.loadRemoteWorkspace(this.userId)
      await cacheServerWorkspace(this.database, remote)
    } catch (error) {
      const cached = await this.snapshot()
      if (!cached.settingsRows.length) throw error
    }
    return this.snapshot()
  }

  async putAndQueue(entity, entityId, row, action) {
    const table = this.database.table(tableFor[entity])
    await this.database.transaction('rw', table, this.database.outbox, async () => {
      const existing = await table.get(entityId)
      const blocked = await this.database.outbox.where('[entity+entity_id]').equals([entity, String(entityId)])
        .filter((item) => item.status === 'conflict' || (item.status === 'error' && item.attempts > 0)).first()
      if (blocked) throw new SyncConflictError('Reintenta o resuelve el cambio pendiente antes de volver a editar este dato.')
      const pending = await this.database.outbox.where('[entity+entity_id]').equals([entity, String(entityId)])
        .filter((item) => item.status !== 'conflict').first()
      const expected = pending?.expected_version ?? (existing ? Number(existing.version || 1) : null)
      const localRow = { ...existing, ...row, version: existing?.version || row.version || 1 }
      await table.put(localRow)
      if (pending && pending.action !== 'delete') {
        await this.database.outbox.update(pending.sequence, { payload: localRow, status: 'pending', last_error: null })
      } else {
        await this.database.outbox.add(operation(entity, action || (existing ? 'update' : 'create'), entityId, localRow, expected))
      }
    })
    await this.notify()
    await this.syncNow()
  }

  async saveTransaction(record) {
    const table = this.database.transactions
    await this.database.transaction('rw', table, this.database.outbox, async () => {
      const existing = await table.get(record.id)
      const blocked = await this.database.outbox.where('[entity+entity_id]').equals(['transactions', String(record.id)])
        .filter((item) => item.status === 'conflict' || (item.status === 'error' && item.attempts > 0)).first()
      if (blocked) throw new SyncConflictError('Reintenta o resuelve el movimiento pendiente antes de editarlo.')
      const pending = await this.database.outbox.where('[entity+entity_id]').equals(['transactions', String(record.id)])
        .filter((item) => item.status !== 'conflict' && item.action === 'save').first()
      const localRow = { ...existing, ...record, version: existing?.version || record.version || 1 }
      await table.put(localRow)
      if (pending) {
        await this.database.outbox.update(pending.sequence, { payload: localRow, status: 'pending', last_error: null })
      } else {
        await this.database.outbox.add(operation('transactions', 'save', record.id, localRow, existing ? Number(existing.version || 1) : null))
      }
    })
    await this.notify()
    await this.syncNow()
  }

  async deleteTransaction(id) {
    const table = this.database.transactions
    await this.database.transaction('rw', table, this.database.outbox, async () => {
      const existing = await table.get(id)
      if (!existing) return
      const blocked = await this.database.outbox.where('[entity+entity_id]').equals(['transactions', String(id)])
        .filter((item) => item.status === 'conflict' || (item.status === 'error' && item.attempts > 0)).first()
      if (blocked) throw new SyncConflictError('Reintenta o resuelve el movimiento pendiente antes de eliminarlo.')
      const pendingCreate = await this.database.outbox.where('[entity+entity_id]').equals(['transactions', String(id)])
        .filter((item) => item.action === 'save' && item.expected_version === null).first()
      if (pendingCreate) {
        await this.database.outbox.delete(pendingCreate.sequence)
        await table.delete(id)
        return
      }
      await table.put({ ...existing, status: 'void' })
      await this.database.outbox.add(operation('transactions', 'void', id, { id }, Number(existing.version || 1)))
    })
    await this.notify()
    await this.syncNow()
  }

  async restoreTransaction(record) {
    const table = this.database.transactions
    await this.database.transaction('rw', table, this.database.outbox, async () => {
      const existing = await table.get(record.id)
      if (!existing) {
        const restoredNew = { ...record, version: 1, status: 'recorded' }
        await table.put(restoredNew)
        await this.database.outbox.add(operation('transactions', 'save', record.id, restoredNew))
        return
      }
      const pendingVoid = await this.database.outbox.where('[entity+entity_id]').equals(['transactions', String(record.id)])
        .filter((item) => item.action === 'void' && item.status !== 'conflict').first()
      if (pendingVoid) {
        if (pendingVoid.attempts > 0) throw new SyncConflictError('Reintenta la eliminación antes de deshacerla para confirmar el estado del servidor.')
        await this.database.outbox.delete(pendingVoid.sequence)
        await table.put({ ...record, version: existing?.version || record.version || 1, status: 'recorded' })
        return
      }
      const restored = { ...record, version: existing?.version || record.version || 1, status: 'recorded' }
      await table.put(restored)
      await this.database.outbox.add(operation('transactions', 'restore', record.id, { id: record.id }, Number(restored.version || 1)))
    })
    await this.notify()
    await this.syncNow()
  }

  async createAccount(account, openingTransaction) {
    await this.database.transaction('rw', this.database.accounts, this.database.transactions, this.database.outbox, async () => {
      const localAccount = { ...account, version: 1, updated_at: new Date().toISOString() }
      await this.database.accounts.add(localAccount)
      await this.database.outbox.add(operation('accounts', 'create', account.id, localAccount))
      if (openingTransaction) {
        const localTransaction = { ...openingTransaction, version: 1, updated_at: new Date().toISOString() }
        await this.database.transactions.add(localTransaction)
        await this.database.outbox.add(operation('transactions', 'save', openingTransaction.id, localTransaction))
      }
    })
    await this.notify()
    await this.syncNow()
  }

  async deleteGoal(id) {
    await this.database.transaction('rw', this.database.goals, this.database.goal_allocations, this.database.outbox, async () => {
      const goal = await this.database.goals.get(id)
      if (!goal) return
      const allocationIds = (await this.database.goal_allocations.where('goal_id').equals(id).primaryKeys()).map(String)
      const pendingCreate = await this.database.outbox.where('[entity+entity_id]').equals(['goals', String(id)])
        .filter((item) => item.action === 'create').first()
      if (pendingCreate) {
        await this.database.outbox.delete(pendingCreate.sequence)
        for (const allocationId of allocationIds) {
          await this.database.outbox.where('[entity+entity_id]').equals(['goal_allocations', allocationId]).delete()
        }
      }
      else await this.database.outbox.add(operation('goals', 'delete', id, { id }, Number(goal.version || 1)))
      await this.database.goal_allocations.where('goal_id').equals(id).delete()
      await this.database.goals.delete(id)
    })
    await this.notify()
    await this.syncNow()
  }

  async addAllocation(allocation, completedGoalId) {
    await this.database.transaction('rw', this.database.goal_allocations, this.database.goals, this.database.outbox, async () => {
      const row = { ...allocation, version: 1, updated_at: new Date().toISOString() }
      await this.database.goal_allocations.add(row)
      await this.database.outbox.add(operation('goal_allocations', 'create', allocation.id, row))
      if (completedGoalId) {
        const goal = await this.database.goals.get(completedGoalId)
        const changed = { ...goal, completed_seen: true }
        await this.database.goals.put(changed)
      }
    })
    await this.notify()
    await this.syncNow()
  }

  actions(refresh) {
    const run = async (callback) => { await callback(); await refresh(await this.snapshot(), await this.state()) }
    return {
      setSetting: (key, value) => run(() => this.putAndQueue('user_settings', key, { key, value }, null)),
      saveTransaction: (record) => run(() => this.saveTransaction(record)),
      deleteTransaction: (id) => run(() => this.deleteTransaction(id)),
      restoreTransaction: (record) => run(() => this.restoreTransaction(record)),
      updateAccount: (id, changes) => run(() => this.putAndQueue('accounts', id, changes, 'update')),
      createAccount: (account, opening) => run(() => this.createAccount(account, opening)),
      saveBudget: (budget) => run(() => this.putAndQueue('budgets', budget.month, budget, null)),
      createGoal: (goal) => run(() => this.putAndQueue('goals', goal.id, goal, 'create')),
      deleteGoal: (id) => run(() => this.deleteGoal(id)),
      addAllocation: (allocation, completedGoalId) => run(() => this.addAllocation(allocation, completedGoalId)),
      importBackup: (additions) => run(() => this.importBackup(additions)),
      retrySync: () => run(() => this.syncNow()),
      discardConflicts: () => run(() => this.discardConflicts()),
    }
  }

  async importBackup(additions) {
    const definitions = [
      ['accounts', 'accounts', 'id', 'create'],
      ['categories', 'categories', 'id', 'create'],
      ['transactions', 'transactions', 'id', 'save'],
      ['budgets', 'budgets', 'month', 'create'],
      ['goals', 'goals', 'id', 'create'],
      ['allocations', 'goal_allocations', 'id', 'create'],
      ['settingsRows', 'user_settings', 'key', 'create'],
    ]
    const tables = definitions.map(([, entity]) => this.database.table(entity))
    await this.database.transaction('rw', [...tables, this.database.outbox], async () => {
      for (const [source, entity, key, action] of definitions) {
        const table = this.database.table(entity)
        for (const record of additions[source] || []) {
          const row = { ...record, version: 1, updated_at: new Date().toISOString() }
          await table.add(row)
          await this.database.outbox.add(operation(entity, action, row[key], row))
        }
      }
    })
    await this.notify()
    await this.syncNow()
  }

  async discardConflicts() {
    await this.database.outbox.where('status').equals('conflict').delete()
    const remote = await this.gateway.loadRemoteWorkspace(this.userId)
    await cacheServerWorkspace(this.database, remote)
    await this.notify()
  }

  async pendingCount() {
    return this.database.outbox.where('status').anyOf('pending', 'error', 'conflict').count()
  }

  dispose() {
    if (typeof window !== 'undefined') window.removeEventListener('online', this.onlineHandler)
    this.listeners.clear()
  }
}
