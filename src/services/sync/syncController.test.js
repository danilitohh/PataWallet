import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { SyncController } from './syncController.js'
import { SyncConflictError } from './syncErrors.js'
import { clearUserDatabase } from './userDatabase.js'

const users = []
const base = {
  accounts: [{ id: 'account-1', name: 'Cuenta', kind: 'asset', subtype: 'bank', currency: 'COP', archived: false, version: 1 }],
  categories: [{ id: 'category-1', name: 'Mercado', type: 'expense', version: 1 }],
  transactions: [], budgets: [], goals: [], allocations: [],
  settingsRows: [{ key: 'entered', value: true, version: 1 }, { key: 'theme', value: 'system', version: 1 }, { key: 'hiddenAmounts', value: false, version: 1 }, { key: 'motion', value: 'system', version: 1 }],
}

function id() {
  const value = crypto.randomUUID()
  users.push(value)
  return value
}

function transaction(note = 'Compra') {
  return { id: 'transaction-1', type: 'expense', amount_minor: 10000, currency: 'COP', occurred_at: '2026-09-10T12:00:00-05:00', from_account_id: 'account-1', to_account_id: null, category_id: 'category-1', merchant_name: note, note, source: 'manual', status: 'recorded' }
}

afterEach(async () => {
  while (users.length) await clearUserDatabase(users.pop())
})

describe('cola por usuario', () => {
  it('guarda el pago recurrente y su marca juntos aunque la red falle, sin duplicarlo', async () => {
    const fixed = { id: 'internet', name: 'Internet', amount_minor: 10000, frequency: 'monthly', next_due_date: '2026-09-15', payment_history: [] }
    const remote = { ...structuredClone(base), settingsRows: [...base.settingsRows, { key: 'fixedExpenses', value: [fixed], version: 1 }] }
    const gateway = {
      ensureRemoteWorkspace: async () => {},
      loadRemoteWorkspace: async () => structuredClone(remote),
      executeRemoteOperation: async () => { throw new Error('sin conexión') },
    }
    const controller = new SyncController(id(), gateway)
    await controller.initialize()
    const occurrence = { id: 'internet:2026-09-15', expenseId: 'internet', dueDate: '2026-09-15', amount_minor: 10000 }
    const record = { ...transaction(), id: `fixed-payment:${occurrence.id}` }
    await controller.recordRecurringPayment(occurrence, record)
    const snapshot = await controller.snapshot()
    expect(snapshot.transactions.map((item) => item.id)).toEqual([record.id])
    expect(snapshot.settingsRows.find((item) => item.key === 'fixedExpenses').value[0].payment_history[0].transaction_id).toBe(record.id)
    expect(await controller.pendingCount()).toBe(2)
    await expect(controller.recordRecurringPayment(occurrence, record)).rejects.toThrow(/ya tiene un movimiento/)
    expect(await controller.pendingCount()).toBe(2)
    controller.dispose()
  })

  it('conserva el identificador en un reintento y no duplica', async () => {
    let fail = true
    const received = []
    const remote = { ...base, transactions: [] }
    const gateway = {
      ensureRemoteWorkspace: async () => {},
      loadRemoteWorkspace: async () => structuredClone(remote),
      executeRemoteOperation: async (_userId, item) => {
        received.push(item.operation_id)
        if (fail) { fail = false; throw new Error('red temporal') }
        const row = { ...item.payload, version: 1 }
        remote.transactions = [row]
        return { entity: 'transactions', row }
      },
    }
    const controller = new SyncController(id(), gateway)
    await controller.initialize()
    await controller.saveTransaction(transaction())
    expect((await controller.state()).pending).toBe(1)
    await controller.syncNow()
    expect(received).toHaveLength(2)
    expect(new Set(received).size).toBe(1)
    expect((await controller.snapshot()).transactions).toHaveLength(1)
    expect((await controller.state()).kind).toBe('synced')
    controller.dispose()
  })

  it('mantiene el cambio local visible cuando detecta conflicto', async () => {
    const remote = { ...structuredClone(base), transactions: [{ ...transaction('Servidor'), version: 1 }] }
    let conflict = false
    const gateway = {
      ensureRemoteWorkspace: async () => {},
      loadRemoteWorkspace: async () => structuredClone(remote),
      executeRemoteOperation: async () => {
        if (conflict) throw new SyncConflictError('Cambió en otro dispositivo')
        throw new Error('No se esperaba una escritura inicial')
      },
    }
    const controller = new SyncController(id(), gateway)
    await controller.initialize()
    conflict = true
    remote.transactions[0] = { ...transaction('Servidor nuevo'), version: 2 }
    await controller.saveTransaction({ ...transaction('Cambio local'), version: 1 })
    expect((await controller.state()).kind).toBe('conflict')
    expect((await controller.snapshot()).transactions[0].note).toBe('Cambio local')
    await expect(controller.saveTransaction({ ...transaction('Segundo cambio'), version: 1 })).rejects.toThrow(/resuelve/i)
    await controller.discardConflicts()
    expect((await controller.snapshot()).transactions[0].note).toBe('Servidor nuevo')
    controller.dispose()
  })

  it('usa bases y colas distintas al cambiar de usuario', async () => {
    const offlineGateway = {
      ensureRemoteWorkspace: async () => {},
      loadRemoteWorkspace: async () => structuredClone(base),
      executeRemoteOperation: async () => { throw new Error('sin conexión') },
    }
    const first = new SyncController(id(), offlineGateway)
    const second = new SyncController(id(), offlineGateway)
    await first.initialize(); await second.initialize()
    await first.saveTransaction(transaction('Solo A'))
    expect((await first.snapshot()).transactions[0].note).toBe('Solo A')
    expect((await second.snapshot()).transactions).toEqual([])
    expect(await first.pendingCount()).toBe(1)
    expect(await second.pendingCount()).toBe(0)
    first.dispose(); second.dispose()
  })
})
