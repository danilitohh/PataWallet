import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PrototypeApp } from './PrototypeApp.jsx'
import './prototype.css'
import './variants/saldo.css'
import './variants/quincena.css'
import './variants/actividad.css'

// Monta la exploración aislada sin importar ni alterar pantallas de producción.
createRoot(document.getElementById('root')).render(<StrictMode><PrototypeApp /></StrictMode>)
