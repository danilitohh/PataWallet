import React from 'react'
import { createRoot } from 'react-dom/client'
import PrototypeApp from './PrototypeApp.jsx'
import './prototype.css'
import '../../../src/styles/night-icons.css'

// Inicia la exploración con los estilos locales y el lenguaje visual de iconos de PataWallet.
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PrototypeApp />
  </React.StrictMode>,
)
