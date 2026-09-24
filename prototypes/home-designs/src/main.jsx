import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PrototypeApp } from './PrototypeApp.jsx'
import { ActivityPrototypeApp } from './activity/ActivityPrototypeApp.jsx'
import './prototype.css'
import './variants/saldo.css'
import './variants/quincena.css'
import './variants/actividad.css'
import './activity/activity.css'

// Selecciona una exploración local por ruta y mantiene la aplicación de producción intacta.
const Preview = window.location.pathname === '/actividad' ? ActivityPrototypeApp : PrototypeApp
document.title = Preview === ActivityPrototypeApp ? 'Actividad · PataWallet' : 'Inicio · PataWallet'
createRoot(document.getElementById('root')).render(<StrictMode><Preview /></StrictMode>)
