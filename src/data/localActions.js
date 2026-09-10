import { db, resetDemo } from './db.js'

export const localActions = {
  setSetting: (key, value) => db.settings.put({ key, value }),
  saveTransaction: (record) => db.transactions.put(record),
  deleteTransaction: (id) => db.transactions.delete(id),
  restoreTransaction: (record) => db.transactions.put(record),
  updateAccount: (id, changes) => db.accounts.update(id, changes),
  async createAccount(account, openingTransaction) {
    await db.transaction('rw', db.accounts, db.transactions, async () => {
      await db.accounts.add(account)
      if (openingTransaction) await db.transactions.add(openingTransaction)
    })
  },
  saveBudget: (budget) => db.budgets.put(budget),
  createGoal: (goal) => db.goals.add(goal),
  async deleteGoal(id, allocationIds) {
    await db.transaction('rw', db.goals, db.allocations, async () => {
      await db.goals.delete(id)
      await db.allocations.bulkDelete(allocationIds)
    })
  },
  async addAllocation(allocation, completedGoalId) {
    await db.transaction('rw', db.allocations, db.goals, async () => {
      await db.allocations.add(allocation)
      if (completedGoalId) await db.goals.update(completedGoalId, { completed_seen: true })
    })
  },
  async resetWorkspace() {
    await resetDemo()
    await db.settings.put({ key: 'entered', value: true })
  },
}
