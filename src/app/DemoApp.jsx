import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { AnimatePresence, MotionConfig, useReducedMotion } from 'motion/react'
import { AppContext } from './AppContext.jsx'
import { AppRoutes } from './routes/AppRoutes.jsx'
import { AppShell } from './AppShell.jsx'
import { db } from '../data/db.js'
import { WelcomePage } from '../features/onboarding/WelcomePage.jsx'
import { MovementSheet } from '../features/transactions/components/MovementSheet.jsx'
import { LoadingScreen, Toast } from '../shared/components/Feedback.jsx'

export function DemoApp() {
  const accounts = useLiveQuery(() => db.accounts.toArray(), [], [])
  const categories = useLiveQuery(() => db.categories.toArray(), [], [])
  const transactions = useLiveQuery(() => db.transactions.orderBy('occurred_at').reverse().toArray(), [], [])
  const budgets = useLiveQuery(() => db.budgets.toArray(), [], [])
  const goals = useLiveQuery(() => db.goals.toArray(), [], [])
  const allocations = useLiveQuery(() => db.allocations.toArray(), [], [])
  const settingsRows = useLiveQuery(() => db.settings.toArray(), [], [])
  const settingsMap = useMemo(() => Object.fromEntries(settingsRows.map((row) => [row.key, row.value])), [settingsRows])
  const [sheet, setSheet] = useState(null)
  const [toast, setToast] = useState(null)
  const systemReduce = useReducedMotion()
  const reduceMotion = settingsMap.motion === 'off' || (settingsMap.motion === 'system' && systemReduce)

  useEffect(() => {
    const root = document.documentElement
    const preferred = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    root.dataset.theme = settingsMap.theme === 'system' || !settingsMap.theme ? preferred : settingsMap.theme
    root.dataset.motion = settingsMap.motion || 'system'
  }, [settingsMap.theme, settingsMap.motion])

  if (!settingsRows.length) return <LoadingScreen />
  if (!settingsMap.entered) return <WelcomePage />

  const notify = (message, undo) => {
    setToast({ message, undo })
    window.setTimeout(() => setToast(null), 5000)
  }
  const value = { accounts, categories, transactions, budgets, goals, allocations, settings: settingsMap, reduceMotion, setSheet, notify }

  return (
    <AppContext.Provider value={value}>
      <MotionConfig reducedMotion={settingsMap.motion === 'off' ? 'always' : settingsMap.motion === 'soft' ? 'never' : 'user'}>
        <AppShell><AppRoutes /></AppShell>
        <AnimatePresence>{sheet && <MovementSheet transaction={sheet === 'new' ? null : sheet} onClose={() => setSheet(null)} />}</AnimatePresence>
        <AnimatePresence>{toast && <Toast toast={toast} close={() => setToast(null)} />}</AnimatePresence>
      </MotionConfig>
    </AppContext.Provider>
  )
}
