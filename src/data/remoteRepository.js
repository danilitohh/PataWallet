import { supabase } from '../lib/supabase/client.js'

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
  const { count, error } = await supabase.from('user_settings').select('key', { count: 'exact', head: true })
  ensure(error)
  if (!count) {
    const { error: settingsError } = await supabase.from('user_settings').insert(defaultSettings.map((row) => ({ ...row, user_id: userId })))
    ensure(settingsError)
  }
  const { count: categoryCount, error: categoryReadError } = await supabase.from('categories').select('id', { count: 'exact', head: true })
  ensure(categoryReadError)
  if (!categoryCount) {
    const rows = defaultCategories.map(([suffix, name, type]) => ({ id: `${userId}:${suffix}`, user_id: userId, name, type }))
    const { error: categoryError } = await supabase.from('categories').insert(rows)
    ensure(categoryError)
  }
}

export async function loadRemoteWorkspace() {
  const tables = ['accounts', 'categories', 'transactions', 'budgets', 'goals', 'goal_allocations', 'user_settings']
  const results = await Promise.all(tables.map((table) => supabase.from(table).select('*')))
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

export function createRemoteActions(userId, refresh) {
  const owned = (row) => ({ ...row, user_id: userId })
  const run = async (promise) => { const { error } = await promise; ensure(error); await refresh() }
  return {
    setSetting: (key, value) => run(supabase.from('user_settings').upsert(owned({ key, value }), { onConflict: 'user_id,key' })),
    saveTransaction: (record) => run(supabase.from('transactions').upsert(owned(record))),
    deleteTransaction: (id) => run(supabase.from('transactions').delete().eq('id', id).eq('user_id', userId)),
    restoreTransaction: (record) => run(supabase.from('transactions').upsert(owned(record))),
    updateAccount: (id, changes) => run(supabase.from('accounts').update(changes).eq('id', id).eq('user_id', userId)),
    async createAccount(account, openingTransaction) {
      const { error } = await supabase.from('accounts').insert(owned(account)); ensure(error)
      if (openingTransaction) { const { error: openingError } = await supabase.from('transactions').insert(owned(openingTransaction)); ensure(openingError) }
      await refresh()
    },
    saveBudget: (budget) => run(supabase.from('budgets').upsert(owned(budget), { onConflict: 'user_id,month' })),
    createGoal: (goal) => run(supabase.from('goals').insert(owned(goal))),
    async deleteGoal(id) { await run(supabase.from('goals').delete().eq('id', id).eq('user_id', userId)) },
    async addAllocation(allocation, completedGoalId) {
      const { error } = await supabase.from('goal_allocations').insert(owned(allocation)); ensure(error)
      if (completedGoalId) { const { error: goalError } = await supabase.from('goals').update({ completed_seen: true }).eq('id', completedGoalId).eq('user_id', userId); ensure(goalError) }
      await refresh()
    },
  }
}
