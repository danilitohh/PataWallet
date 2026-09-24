import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PrototypeApp } from './PrototypeApp.jsx'
import './prototype.css'
import './variants/saldo.css'
import './variants/quincena.css'
import './variants/actividad.css'

// Conserva aislada la exploración de Inicio después de promover Plan a producción.
document.title = 'Inicio · PataWallet'
createRoot(document.getElementById('root')).render(<StrictMode><PrototypeApp /></StrictMode>)
