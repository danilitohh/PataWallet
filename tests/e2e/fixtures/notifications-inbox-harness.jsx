import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AnimatePresence } from 'motion/react'
import { AppContext } from '../../../src/app/AppContext.jsx'
import { NotificationsInboxPage } from '../../../src/features/integrations/NotificationsInboxPage.jsx'
import { MovementSheet } from '../../../src/features/transactions/components/MovementSheet.jsx'
import '../../../src/styles/night-icons.css'
import '../../../src/styles/calm.css'
import '../../../src/styles/glass.css'

// Renders the production inbox against a synthetic user and intercepted email API.
const categories = [
  { id: 'market-category', name: 'Mercado', type: 'expense' },
  { id: 'income-category', name: 'Ingreso adicional', type: 'income' },
]

function NotificationsHarness() {
  const [sheet, setSheet] = useState(null)
  const prefilledSheet = sheet?.kind === 'prefilled' ? sheet : null
  const app = {
    isDemo: false,
    user: { id: 'test' },
    accounts: [{ id: 'lulo', name: 'Cuenta Lulo', kind: 'asset' }],
    categories,
    transactions: [],
    settings: { hiddenAmounts: false },
    setSheet,
    actions: {
      retrySync: async () => {},
      saveTransaction: async (record) => { window.savedTransaction = record },
    },
    notify: (message) => { window.lastNotification = message },
  }

  return <AppContext.Provider value={app}>
    <div className="calm-app">
      <NotificationsInboxPage />
      <AnimatePresence>{sheet && <MovementSheet transaction={null} initialFlow={prefilledSheet?.initialFlow || 'expense'} initialValues={prefilledSheet?.initialValues} onSaved={prefilledSheet?.onSaved} onClose={() => setSheet(null)} />}</AnimatePresence>
    </div>
  </AppContext.Provider>
}

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <NotificationsHarness />
  </BrowserRouter>,
)
