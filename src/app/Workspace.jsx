import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, MotionConfig, useReducedMotion } from 'motion/react'
import { AppContext } from './AppContext.jsx'
import { AppRoutes } from './routes/AppRoutes.jsx'
import { AppShell } from './AppShell.jsx'
import { WelcomePage } from '../features/onboarding/WelcomePage.jsx'
import { FinancialOnboarding } from '../features/onboarding/FinancialOnboarding.jsx'
import { MovementSheet } from '../features/transactions/components/MovementSheet.jsx'
import { LoadingScreen, Toast } from '../shared/components/Feedback.jsx'
import { PwaUpdatePrompt } from '../features/pwa/PwaUpdatePrompt.jsx'

// Comparte datos y preferencias de la cuenta, respetando tema y accesibilidad del sistema.
export function Workspace({ data, actions, syncState = null, isDemo, user, signOut }) {
  const { accounts, categories, transactions, budgets, goals, allocations, plannedPurchases = [], receipts = [], settingsRows } = data
  const settingsMap = useMemo(() => Object.fromEntries(settingsRows.map((row) => [row.key, row.value])), [settingsRows])
  const [sheet, setSheet] = useState(null)
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)
  const systemReduce = useReducedMotion()
  const reduceMotion = settingsMap.motion === 'off' || Boolean(systemReduce)

  useEffect(() => {
    const root = document.documentElement
    // Noche es la nueva dirección inicial; las preferencias ya guardadas se conservan.
    const preference = matchMedia('(prefers-color-scheme: dark)')
    const updateTheme = () => {
      const theme = settingsMap.theme === 'system' ? (preference.matches ? 'dark' : 'light') : settingsMap.theme || 'dark'
      root.dataset.theme = theme
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0b1425' : '#faf8f6')
    }
    updateTheme()
    preference.addEventListener('change', updateTheme)
    root.dataset.motion = settingsMap.motion || 'system'
    return () => preference.removeEventListener('change', updateTheme)
  }, [settingsMap.theme, settingsMap.motion])

  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  const dismissToast = useCallback(() => {
    window.clearTimeout(toastTimer.current)
    setToast(null)
  }, [])

  const notify = (message, undo) => {
    window.clearTimeout(toastTimer.current)
    setToast({ message, undo })
    toastTimer.current = window.setTimeout(() => setToast(null), 5000)
  }
  const value = { accounts, categories, transactions, budgets, goals, allocations, plannedPurchases, receipts, settings: settingsMap, syncState, reduceMotion, setSheet, notify, actions, isDemo, user, signOut }

  if (!settingsRows.length) return <LoadingScreen />
  if (isDemo && !settingsMap.entered) return <AppContext.Provider value={value}><WelcomePage /></AppContext.Provider>
  if (!settingsMap.financialOnboardingComplete) return <AppContext.Provider value={value}><FinancialOnboarding /></AppContext.Provider>

  return (
    <AppContext.Provider value={value}>
      <MotionConfig reducedMotion={reduceMotion ? 'always' : 'user'}>
        <AppShell><AppRoutes /></AppShell>
        <AnimatePresence>{sheet && <MovementSheet transaction={sheet === 'new' ? null : sheet} onClose={() => setSheet(null)} />}</AnimatePresence>
        <AnimatePresence>{toast && <Toast toast={toast} close={dismissToast} />}</AnimatePresence>
        <PwaUpdatePrompt />
      </MotionConfig>
    </AppContext.Provider>
  )
}
