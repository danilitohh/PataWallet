import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, MotionConfig, useReducedMotion } from 'motion/react'
import { AppContext } from './AppContext.jsx'
import { AppRoutes } from './routes/AppRoutes.jsx'
import { AppShell } from './AppShell.jsx'
import { WelcomePage } from '../features/onboarding/WelcomePage.jsx'
import { FirstUseGuide } from '../features/onboarding/FirstUseGuide.jsx'
import { MovementSheet } from '../features/transactions/components/MovementSheet.jsx'
import { LoadingScreen, Toast } from '../shared/components/Feedback.jsx'
import { PwaUpdatePrompt } from '../features/pwa/PwaUpdatePrompt.jsx'

// Comparte datos y preferencias de la cuenta, manteniendo Noche como identidad única y respetando accesibilidad.
export function Workspace({ data, actions, syncState = null, isDemo, user, signOut }) {
  const { accounts, categories, transactions, budgets, goals, allocations, plannedPurchases = [], receipts = [], settingsRows } = data
  const rawSettingsMap = useMemo(() => Object.fromEntries(settingsRows.map((row) => [row.key, row.value])), [settingsRows])
  const settingsMap = useMemo(() => ({ ...rawSettingsMap, theme: 'dark' }), [rawSettingsMap])
  const [sheet, setSheet] = useState(null)
  // La demo ya tiene una bienvenida propia; las cuentas reales reciben la guía al entrar por primera vez.
  const [guideOpen, setGuideOpen] = useState(() => !isDemo && !settingsMap.financialOnboardingComplete)
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)
  const systemReduce = useReducedMotion()
  const reduceMotion = settingsMap.motion === 'off' || Boolean(systemReduce)

  useEffect(() => {
    const root = document.documentElement
    // La interfaz es siempre oscura; las preferencias antiguas se normalizan para no reintroducir el tema claro.
    root.dataset.theme = 'dark'
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#0b1425')
    root.dataset.motion = settingsMap.motion || 'system'
    if (settingsRows.length && rawSettingsMap.theme !== 'dark') {
      // La interfaz permanece oscura aunque la normalización de una preferencia antigua falle temporalmente.
      void Promise.resolve(actions.setSetting('theme', 'dark')).catch(() => {})
    }
  }, [actions, rawSettingsMap.theme, settingsMap.motion, settingsRows.length])

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
  const finishGuide = async () => {
    try {
      await actions.setSetting('financialOnboardingComplete', true)
      setGuideOpen(false)
      return true
    } catch {
      notify('No pudimos guardar la guía. Inténtalo de nuevo.')
      return false
    }
  }
  const value = { accounts, categories, transactions, budgets, goals, allocations, plannedPurchases, receipts, settings: settingsMap, syncState, reduceMotion, setSheet, startGuide: () => setGuideOpen(true), notify, actions, isDemo, user, signOut }

  if (!settingsRows.length) return <LoadingScreen />
  if (isDemo && !settingsMap.entered) return <AppContext.Provider value={value}><WelcomePage /></AppContext.Provider>

  return (
    <AppContext.Provider value={value}>
      <MotionConfig reducedMotion={reduceMotion ? 'always' : 'user'}>
        <AppShell><AppRoutes /></AppShell>
        <AnimatePresence>{sheet && <MovementSheet transaction={typeof sheet === 'object' ? sheet : null} initialFlow={sheet === 'income' ? 'income' : 'expense'} onClose={() => setSheet(null)} />}</AnimatePresence>
        <AnimatePresence>{toast && <Toast toast={toast} close={dismissToast} />}</AnimatePresence>
        <PwaUpdatePrompt />
        <AnimatePresence>{guideOpen && <FirstUseGuide onFinish={finishGuide} />}</AnimatePresence>
      </MotionConfig>
    </AppContext.Provider>
  )
}
