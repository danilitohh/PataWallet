import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AppContext } from '../../../src/app/AppContext.jsx'
import { NotificationsInboxPage } from '../../../src/features/integrations/NotificationsInboxPage.jsx'
import '../../../src/styles/night-icons.css'
import '../../../src/styles/calm.css'
import '../../../src/styles/glass.css'

// Renders the production inbox against a synthetic user and intercepted email API.
const categories = [{ id: 'market-category', name: 'Mercado', type: 'expense' }]
const app = {
  isDemo: false,
  user: { id: 'test' },
  accounts: [{ id: 'lulo', name: 'Cuenta Lulo', kind: 'asset' }],
  categories,
  transactions: [],
  settings: {
    hiddenAmounts: false,
    fixedExpenses: [{ id: 'market', name: 'Mercado', amount_minor: 40000000, category_id: 'market-category', frequency: 'biweekly', next_due_date: '2026-09-30', payment_history: [] }],
  },
  actions: { retrySync: async () => {}, createCategory: async (category) => categories.push(category) },
  notify: () => {},
}

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AppContext.Provider value={app}>
      <div className="calm-app"><NotificationsInboxPage /></div>
    </AppContext.Provider>
  </BrowserRouter>,
)
