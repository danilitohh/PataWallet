import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './app/App.jsx'
import { configureStandaloneViewport } from './shared/lib/mobileViewport.js'
import './styles/app.css'

// Ajusta el viewport antes de montar la interfaz para evitar zoom accidental en la PWA.
configureStandaloneViewport()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
