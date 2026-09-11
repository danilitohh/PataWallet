import { useLiveQuery } from 'dexie-react-hooks'
import { Workspace } from './Workspace.jsx'
import { db } from '../data/db.js'
import { localActions } from '../data/localActions.js'

export function DemoApp() {
  const accounts = useLiveQuery(() => db.accounts.toArray(), [], [])
  const categories = useLiveQuery(() => db.categories.toArray(), [], [])
  const transactions = useLiveQuery(() => db.transactions.orderBy('occurred_at').reverse().toArray(), [], [])
  const budgets = useLiveQuery(() => db.budgets.toArray(), [], [])
  const goals = useLiveQuery(() => db.goals.toArray(), [], [])
  const allocations = useLiveQuery(() => db.allocations.toArray(), [], [])
  const plannedPurchases = useLiveQuery(() => db.planned_purchases.toArray(), [], [])
  const receipts = useLiveQuery(() => db.receipts.toArray(), [], [])
  const settingsRows = useLiveQuery(() => db.settings.toArray(), [], [])
  return <Workspace data={{ accounts, categories, transactions, budgets, goals, allocations, plannedPurchases, receipts, settingsRows }} actions={localActions} isDemo user={null} />
}
