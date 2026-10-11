import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { IntegrationSetup } from '../../../src/features/onboarding/IntegrationSetup.jsx'
import '../../../src/styles/app.css'
import '../../../src/styles/night.css'
import '../../../src/styles/night-icons.css'
import '../../../src/styles/calm.css'
import '../../../src/styles/glass.css'
import '../../../src/features/onboarding/integration-setup.css'
import '../../../src/features/bank-email/bank-email.css'

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <IntegrationSetup
      preferences={{ shortcut: false, bankEmail: true, notifications: true }}
      user={{ id: 'visual-test-user' }}
      isDemo={false}
      onImported={() => {}}
      onFinish={() => { window.integrationSetupFinished = true }}
    />
  </BrowserRouter>,
)
