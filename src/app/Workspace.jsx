import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, MotionConfig, useReducedMotion } from 'motion/react'
import { AppContext } from './AppContext.jsx'
import { AppRoutes } from './routes/AppRoutes.jsx'
import { AppShell } from './AppShell.jsx'
import { WelcomePage } from '../features/onboarding/WelcomePage.jsx'
import { MovementSheet } from '../features/transactions/components/MovementSheet.jsx'
import { LoadingScreen, Toast } from '../shared/components/Feedback.jsx'
import { PwaUpdatePrompt } from '../features/pwa/PwaUpdatePrompt.jsx'

export function Workspace({ data, actions, syncState = null, isDemo, user, signOut }) {
  const { accounts, categories, transactions, budgets, goals, allocations, plannedPurchases = [], receipts = [], settingsRows } = data
  const settingsMap = useMemo(() => Object.fromEntries(settingsRows.map((row) => [row.key, row.value])), [settingsRows])
  const [sheet, setSheet] = useState(null)
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)
  const systemReduce = useReducedMotion()
  const reduceMotion = settingsMap.motion === 'off' || (settingsMap.motion === 'system' && systemReduce)

  useEffect(() => {
    const root = document.documentElement
    const preferred = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    root.dataset.theme = settingsMap.theme === 'system' || !settingsMap.theme ? preferred : settingsMap.theme
    root.dataset.motion = settingsMap.motion || 'system'
  }, [settingsMap.theme, settingsMap.motion])

  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  const dismissToast = useCallback(() => {
    window.clearTimeout(toastTimer.current)
    setToast(null)
  }, [])

  if (!settingsRows.length) return <LoadingScreen />
  if (isDemo && !settingsMap.entered) return <AppContext.Provider value={{ actions }}><WelcomePage /></AppContext.Provider>

  const notify = (message, undo) => {
    window.clearTimeout(toastTimer.current)
    setToast({ message, undo })
    toastTimer.current = window.setTimeout(() => setToast(null), 5000)
  }
  const value = { accounts, categories, transactions, budgets, goals, allocations, plannedPurchases, receipts, settings: settingsMap, syncState, reduceMotion, setSheet, notify, actions, isDemo, user, signOut }

  return (
    <AppContext.Provider value={value}>
      <MotionConfig reducedMotion={settingsMap.motion === 'off' ? 'always' : settingsMap.motion === 'soft' ? 'never' : 'user'}>
        <AppShell><AppRoutes /></AppShell>
        <AnimatePresence>{sheet && <MovementSheet transaction={sheet === 'new' ? null : sheet} onClose={() => setSheet(null)} />}</AnimatePresence>
        <AnimatePresence>{toast && <Toast toast={toast} close={dismissToast} />}</AnimatePresence>
        <PwaUpdatePrompt />
      </MotionConfig>
    </AppContext.Provider>
  )
}
