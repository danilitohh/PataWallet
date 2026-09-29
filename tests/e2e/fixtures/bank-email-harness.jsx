import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AppContext } from '../../../src/app/AppContext.jsx'
import { BankEmailPage } from '../../../src/features/bank-email/BankEmailPage.jsx'
import '../../../src/styles/night-icons.css'
import '../../../src/styles/calm.css'
import '../../../src/styles/glass.css'

// Vite transforma las mismas dependencias que la app; transporte y cuentas son sintéticos.
const app = {
  isDemo: false, user: { id: 'test' },
  accounts: [{ id: 'nequi', name: 'Nequi ejemplo', kind: 'asset' }, { id: 'lulo', name: 'Lulo ejemplo', kind: 'asset' }],
  categories: [], transactions: [], actions: { retrySync: async () => {} }, notify: () => {},
}
const root = createRoot(document.getElementById('root'))
window.renderInbox = (hidden = false) => root.render(<BrowserRouter><AppContext.Provider value={{ ...app, settings: { hiddenAmounts: hidden } }}><div className="calm-app"><BankEmailPage /></div></AppContext.Provider></BrowserRouter>)
window.renderInbox()
