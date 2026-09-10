import { assertMinor, safeAdd } from './money.js'

export const NON_BUDGET_TYPES = new Set(['opening', 'transfer', 'card_payment', 'adjustment'])

export function transactionDeltas(transaction, accountsById) {
  const amount = assertMinor(transaction.amount_minor)
  const from = transaction.from_account_id ? accountsById[transaction.from_account_id] : null
  const to = transaction.to_account_id ? accountsById[transaction.to_account_id] : null
  switch (transaction.type) {
    case 'opening':
      return [{ accountId: to.id, delta: amount }]
    case 'income':
      return [{ accountId: to.id, delta: amount }]
    case 'expense':
      return [{ accountId: from.id, delta: from.kind === 'liability' ? amount : -amount }]
    case 'transfer':
      return [{ accountId: from.id, delta: -amount }, { accountId: to.id, delta: amount }]
    case 'card_payment':
      return [{ accountId: from.id, delta: -amount }, { accountId: to.id, delta: -amount }]
    case 'refund':
      return [{ accountId: (to || from).id, delta: (to || from).kind === 'liability' ? -amount : amount }]
    case 'adjustment':
      return [{ accountId: (to || from).id, delta: transaction.direction === 'decrease' ? -amount : amount }]
    default:
      return []
  }
}

export function calculateBalances(accounts, transactions) {
  const byId = Object.fromEntries(accounts.map((account) => [account.id, account]))
  const balances = Object.fromEntries(accounts.map((account) => [account.id, 0]))
  for (const transaction of transactions.filter((item) => item.status !== 'void')) {
    for (const entry of transactionDeltas(transaction, byId)) {
      balances[entry.accountId] = safeAdd(balances[entry.accountId], entry.delta)
    }
  }
  return balances
}

export function calculateSummary(accounts, transactions, month) {
  const balances = calculateBalances(accounts, transactions)
  const active = accounts.filter((account) => !account.archived)
  const assets = active.filter((account) => account.kind === 'asset').reduce((sum, account) => safeAdd(sum, balances[account.id] || 0), 0)
  const debt = active.filter((account) => account.kind === 'liability').reduce((sum, account) => safeAdd(sum, balances[account.id] || 0), 0)
  const inMonth = transactions.filter((item) => item.status !== 'void' && item.occurred_at.slice(0, 7) === month)
  const income = inMonth.filter((item) => item.type === 'income').reduce((sum, item) => safeAdd(sum, Number(item.amount_minor)), 0)
  const expenses = inMonth.reduce((sum, item) => {
    if (item.type === 'expense') return safeAdd(sum, Number(item.amount_minor))
    if (item.type === 'refund') return safeAdd(sum, -Number(item.amount_minor))
    return sum
  }, 0)
  return { balances, assets, debt, net: safeAdd(assets, -debt), income, expenses }
}

export function goalProgress(goal, allocations) {
  const reserved = allocations.filter((item) => item.goal_id === goal.id).reduce((sum, item) => safeAdd(sum, Number(item.amount_minor)), 0)
  return { reserved, percent: goal.target_minor > 0 ? (reserved / Number(goal.target_minor)) * 100 : 0 }
}
