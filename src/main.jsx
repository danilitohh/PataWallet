import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './app/App.jsx'
import { configureStandaloneViewport } from './shared/lib/mobileViewport.js'
import './styles/app.css'
import './styles/night.css'
import './app/shell.css'
import './features/dashboard/dashboard.css'
import './features/onboarding/welcome.css'
import './features/transactions/transactions.css'
import './features/planning/planning.css'
import './features/accounts/accounts.css'
import './features/settings/settings.css'
import './styles/three-dee.css'
import './styles/night-icons.css'

// Ajusta el viewport antes de montar la interfaz para evitar zoom accidental en la PWA.
configureStandaloneViewport()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
