import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PrototypeApp } from './PrototypeApp.jsx'
import './prototype.css'
import './variants/saldo.css'
import './variants/quincena.css'
import './variants/actividad.css'

// Mantiene disponibles las propuestas de Inicio mientras las pantallas elegidas viven en producto.
document.title = 'Inicio · PataWallet'
createRoot(document.getElementById('root')).render(<StrictMode><PrototypeApp /></StrictMode>)
