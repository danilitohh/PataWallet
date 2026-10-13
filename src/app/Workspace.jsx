import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, MotionConfig, useReducedMotion } from 'motion/react'
import { useLocation } from 'react-router-dom'
import { AppContext } from './AppContext.jsx'
import { AppRoutes } from './routes/AppRoutes.jsx'
import { AppShell } from './AppShell.jsx'
import { WelcomePage } from '../features/onboarding/WelcomePage.jsx'
import { IntegrationSetup } from '../features/onboarding/IntegrationSetup.jsx'
import { WalletCardPicker, WalletEntry } from '../features/onboarding/WalletCardFlow.jsx'
import { hasOpenedWallet, isWalletCardStyle, markWalletOpened, readWalletCardStyle, saveWalletCardStyle, walletCardThemeById, walletCardThemeVariables } from '../features/onboarding/walletCardModel.js'
import { FirstUseGuide } from '../features/onboarding/FirstUseGuide.jsx'
import { normalizeIntegrationSetup } from '../domain/registration.js'
import { MovementSheet } from '../features/transactions/components/MovementSheet.jsx'
import { LoadingScreen, Toast } from '../shared/components/Feedback.jsx'
import { PwaUpdatePrompt } from '../features/pwa/PwaUpdatePrompt.jsx'
import { BiometricGate } from '../features/security/BiometricLock.jsx'
import { hasBiometricCredential } from '../services/security/biometricUnlock.js'

// Comparte datos, preferencias y el tema seleccionado entre todas las rutas y paneles.
export function Workspace({ data, actions, syncState = null, isDemo, user, signOut }) {
  const location = useLocation()
  const { accounts, categories, transactions, budgets, goals, allocations, plannedPurchases = [], receipts = [], settingsRows } = data
  const rawSettingsMap = useMemo(() => Object.fromEntries(settingsRows.map((row) => [row.key, row.value])), [settingsRows])
  const settingsMap = useMemo(() => ({
    ...rawSettingsMap,
    currency: rawSettingsMap.currency || 'COP',
    // El modo claro se aplica a todas las rutas de la app.
    theme: rawSettingsMap.theme === 'light' ? 'light' : 'dark',
  }), [rawSettingsMap])
  const currency = settingsMap.currency
  const currencyActions = useMemo(() => {
    const currencyForTransaction = (record) => {
      const existing = transactions.find((item) => item.id === record.id)
      const external = record.source === 'import' || record.source === 'shortcut'
      return { ...record, currency: existing?.currency || (external ? record.currency || currency : currency) }
    }
    return {
      ...actions,
      setSetting: (key, value) => actions.setSetting(key, key === 'fixedExpenses' && Array.isArray(value)
        ? value.map((item) => ({ ...item, currency }))
        : value),
      saveTransaction: (record) => actions.saveTransaction(currencyForTransaction(record)),
      recordRecurringPayment: (occurrence, record) => actions.recordRecurringPayment(occurrence, currencyForTransaction(record)),
      createAccount: (account, opening) => actions.createAccount(
        { ...account, currency },
        opening ? currencyForTransaction(opening) : opening,
      ),
      saveBudget: (budget) => actions.saveBudget({ ...budget, currency }),
      createGoal: (goal) => actions.createGoal({ ...goal, currency }),
      savePlannedPurchase: (purchase) => actions.savePlannedPurchase({ ...purchase, currency }),
      importBackup: (additions) => {
        const importedCurrencies = [
          ...(additions.accounts || []), ...(additions.transactions || []), ...(additions.budgets || []),
          ...(additions.goals || []), ...(additions.plannedPurchases || []),
        ].map((row) => row.currency).filter(Boolean)
        if (importedCurrencies.some((code) => code !== currency)) throw new Error(`Este respaldo usa otra moneda. La moneda base de tu cuenta es ${currency}; no convertimos importes.`)
        return actions.importBackup(additions)
      },
    }
  }, [actions, currency, transactions])
  const ownerId = isDemo ? 'demo' : user?.id
  const integrationPreferences = normalizeIntegrationSetup(user?.user_metadata?.patawallet_integration_setup_v1)
  const integrationSetupStorageKey = `patawallet:integration-setup:v1:${ownerId}`
  const [integrationSetupOpen, setIntegrationSetupOpen] = useState(() => {
    if (isDemo || !ownerId || !integrationPreferences) return false
    try { return localStorage.getItem(integrationSetupStorageKey) !== 'done' } catch { return true }
  })
  const [walletCardStyle, setWalletCardStyle] = useState(() => {
    const saved = readWalletCardStyle(ownerId)
    const signupChoice = user?.user_metadata?.patawallet_onboarding_v1?.cardStyle
    return saved || (isWalletCardStyle(signupChoice) ? signupChoice : null)
  })
  const [cardPickerOpen, setCardPickerOpen] = useState(false)
  const [walletOpenedThisSession, setWalletOpenedThisSession] = useState(() => location.pathname !== '/' || hasOpenedWallet(ownerId))
  const [sheet, setSheet] = useState(null)
  // La demo ya tiene una bienvenida propia; las cuentas reales reciben la guía al entrar por primera vez.
  const [guideOpen, setGuideOpen] = useState(() => !isDemo && !settingsMap.financialOnboardingComplete ? 'general' : null)
  const [toast, setToast] = useState(null)
  const [biometricEnabled, setBiometricEnabled] = useState(() => hasBiometricCredential(ownerId))
  const toastTimer = useRef(null)
  const systemReduce = useReducedMotion()
  const reduceMotion = settingsMap.motion === 'off' || Boolean(systemReduce)
  const prefilledSheet = sheet?.kind === 'prefilled' ? sheet : null

  useLayoutEffect(() => {
    const root = document.documentElement
    const variables = walletCardThemeVariables(walletCardStyle, { lightSurface: settingsMap.theme === 'light' })
    const previous = Object.fromEntries(Object.keys(variables).map((name) => [name, root.style.getPropertyValue(name)]))
    const previousTheme = root.dataset.walletTheme
    Object.entries(variables).forEach(([name, value]) => root.style.setProperty(name, value))
    if (walletCardStyle) root.dataset.walletTheme = walletCardStyle
    else delete root.dataset.walletTheme

    return () => {
      Object.entries(previous).forEach(([name, value]) => value ? root.style.setProperty(name, value) : root.style.removeProperty(name))
      if (previousTheme) root.dataset.walletTheme = previousTheme
      else delete root.dataset.walletTheme
    }
  }, [walletCardStyle, settingsMap.theme])

  useEffect(() => {
    const root = document.documentElement
    const previousTheme = root.dataset.theme
    const previousMotion = root.dataset.motion
    const themeColor = document.querySelector('meta[name="theme-color"]')
    const previousThemeColor = themeColor?.getAttribute('content')
    root.dataset.theme = settingsMap.theme
    themeColor?.setAttribute('content', settingsMap.theme === 'light' ? '#ededee' : walletCardThemeById(walletCardStyle).bg)
    root.dataset.motion = settingsMap.motion || 'system'

    return () => {
      if (previousTheme) root.dataset.theme = previousTheme
      else delete root.dataset.theme
      if (previousMotion) root.dataset.motion = previousMotion
      else delete root.dataset.motion
      if (previousThemeColor === null) themeColor?.removeAttribute('content')
      else themeColor?.setAttribute('content', previousThemeColor)
    }
  }, [settingsMap.motion, settingsMap.theme, walletCardStyle])

  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  useEffect(() => {
    const refreshBiometric = () => setBiometricEnabled(hasBiometricCredential(ownerId))
    window.addEventListener('patawallet:biometric-changed', refreshBiometric)
    return () => window.removeEventListener('patawallet:biometric-changed', refreshBiometric)
  }, [ownerId])

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
    // Salir nunca depende de la red; solo se persiste la preferencia, no datos financieros.
    setGuideOpen(null)
    try {
      await actions.setSetting('financialOnboardingComplete', true)
      return true
    } catch {
      notify('Cerramos la guía, pero no pudimos guardar que ya la viste.')
      return false
    }
  }
  const finishIntegrationSetup = () => {
    try { localStorage.setItem(integrationSetupStorageKey, 'done') } catch { /* La guía puede cerrarse aunque el navegador no permita guardar la preferencia. */ }
    setIntegrationSetupOpen(false)
  }
  const selectWalletCard = async (cardId) => {
    saveWalletCardStyle(ownerId, cardId)
    setWalletCardStyle(cardId)
    setCardPickerOpen(false)
  }
  const openWallet = () => {
    markWalletOpened(ownerId)
    setWalletOpenedThisSession(true)
  }
  const openCardPicker = () => setCardPickerOpen(true)
  const value = { accounts, categories, transactions, budgets, goals, allocations, plannedPurchases, receipts, settings: settingsMap, walletCardStyle, openWalletCardPicker: openCardPicker, syncState, reduceMotion, setSheet, guideOpen, startGuide: (tour = 'general') => setGuideOpen(typeof tour === 'string' ? tour : 'general'), notify, actions: currencyActions, isDemo, user, signOut }

  if (!settingsRows.length) return <LoadingScreen />
  if (isDemo && !settingsMap.entered) return <AppContext.Provider value={value}><WelcomePage /></AppContext.Provider>
  if (!isDemo && integrationSetupOpen && integrationPreferences && location.pathname === '/') {
    return <AppContext.Provider value={value}>
      <MotionConfig reducedMotion={reduceMotion ? 'always' : 'user'}>
        <IntegrationSetup preferences={integrationPreferences} onFinish={finishIntegrationSetup} user={user} isDemo={isDemo} onImported={() => window.dispatchEvent(new Event('patawallet:notifications-changed'))} />
      </MotionConfig>
    </AppContext.Provider>
  }
  if (!walletCardStyle || cardPickerOpen) {
    return <AppContext.Provider value={value}><WalletCardPicker currentStyle={walletCardStyle} required={!walletCardStyle} onSelect={selectWalletCard} onCancel={() => setCardPickerOpen(false)} /></AppContext.Provider>
  }

  const showWalletEntry = location.pathname === '/' && !walletOpenedThisSession

  return (
    <AppContext.Provider value={value}>
      <BiometricGate ownerId={ownerId} enabled={biometricEnabled}>
        <MotionConfig reducedMotion={reduceMotion ? 'always' : 'user'}>
          {showWalletEntry ? <WalletEntry cardStyle={walletCardStyle} onOpen={openWallet} onChange={openCardPicker} reduceMotion={reduceMotion} /> : <>
          <AppShell><AppRoutes /></AppShell>
          <AnimatePresence>{sheet && <MovementSheet transaction={typeof sheet === 'object' && !prefilledSheet ? sheet : null} initialFlow={prefilledSheet?.initialFlow || (sheet === 'income' ? 'income' : typeof sheet === 'string' && sheet.startsWith('debt') ? 'debt' : 'expense')} initialDebtId={typeof sheet === 'string' && sheet.startsWith('debt:') ? sheet.slice(5) : undefined} initialValues={prefilledSheet?.initialValues} onSaved={prefilledSheet?.onSaved} onClose={() => setSheet(null)} />}</AnimatePresence>
          <AnimatePresence>{toast && <Toast toast={toast} close={dismissToast} />}</AnimatePresence>
          <PwaUpdatePrompt />
          {guideOpen && <FirstUseGuide tour={guideOpen} onFinish={finishGuide} />}
        </>}
        </MotionConfig>
      </BiometricGate>
    </AppContext.Provider>
  )
}
