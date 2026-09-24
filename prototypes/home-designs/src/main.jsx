import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PrototypeApp } from './PrototypeApp.jsx'
import { PlanPrototypeApp } from './plan/PlanPrototypeApp.jsx'
import './prototype.css'
import './variants/saldo.css'
import './variants/quincena.css'
import './variants/actividad.css'
import './plan/plan.css'
import './plan/components/plan-shared.css'

// Mantiene Plan como una ruta de prototipo aislada y conserva intacta la exploración de Inicio.
const isPlanPreview = window.location.pathname.replace(/\/$/, '') === '/plan'
const Preview = isPlanPreview ? PlanPrototypeApp : PrototypeApp
document.title = `${isPlanPreview ? 'Plan' : 'Inicio'} · PataWallet`
createRoot(document.getElementById('root')).render(<StrictMode><Preview /></StrictMode>)
