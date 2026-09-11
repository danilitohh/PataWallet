import { db, resetDemo } from './db.js'

export const localActions = {
  setSetting: (key, value) => db.settings.put({ key, value }),
  saveTransaction: (record) => db.transactions.put(record),
  saveReceipt: (receipt) => db.receipts.put(receipt),
  deleteReceipt: (transactionId) => db.receipts.delete(transactionId),
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
  createCategory: (category) => db.categories.add(category),
  savePlannedPurchase: (purchase) => db.planned_purchases.put(purchase),
  deletePlannedPurchase: (id) => db.planned_purchases.delete(id),
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
