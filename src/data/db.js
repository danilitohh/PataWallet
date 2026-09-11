import Dexie from 'dexie'
import fixtures from '../../examples/demo-fixtures.json'

export const db = new Dexie('patawallet-demo-v1')
db.version(1).stores({
  accounts: 'id, kind, archived',
  categories: 'id, type',
  transactions: 'id, type, occurred_at, from_account_id, to_account_id, status',
  budgets: 'month',
  goals: 'id',
  allocations: 'id, goal_id, account_id',
  settings: 'key',
})
db.version(2).stores({
  accounts: 'id, kind, archived',
  categories: 'id, type',
  transactions: 'id, type, occurred_at, from_account_id, to_account_id, status',
  budgets: 'month',
  goals: 'id',
  allocations: 'id, goal_id, account_id',
  planned_purchases: 'id, target_date, status',
  receipts: 'transaction_id',
  settings: 'key',
})

function normalizeTransaction(transaction) {
  return { ...transaction, amount_minor: Number(transaction.amount_minor), note: transaction.note || '', updated_at: new Date().toISOString() }
}

export async function seedDemo() {
  const alreadySeeded = await db.settings.get('seeded')
  if (alreadySeeded) return
  await db.transaction('rw', db.tables, async () => {
    await db.accounts.bulkPut(fixtures.accounts.map((account) => ({ ...account, archived: false })))
    await db.categories.bulkPut(fixtures.categories)
    await db.transactions.bulkPut(fixtures.transactions.map(normalizeTransaction))
    await db.budgets.put({ ...fixtures.budget, limit_minor: Number(fixtures.budget.limit_minor) })
    await db.goals.bulkPut(fixtures.goals.map((goal) => ({ ...goal, target_minor: Number(goal.target_minor), completed_seen: false })))
    await db.allocations.bulkPut(fixtures.goal_allocations.map((item, index) => ({ ...item, id: `demo-allocation-${index}`, amount_minor: Number(item.amount_minor) })))
    await db.settings.bulkPut([
      { key: 'seeded', value: true },
      { key: 'entered', value: false },
      { key: 'theme', value: 'system' },
      { key: 'hiddenAmounts', value: false },
      { key: 'motion', value: 'system' },
    ])
  })
}

export async function resetDemo() {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((table) => table.clear()))
  })
  await seedDemo()
}
