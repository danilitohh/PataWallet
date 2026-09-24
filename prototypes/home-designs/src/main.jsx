import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PrototypeApp } from './PrototypeApp.jsx'
import { AccountsPrototypeApp } from './accounts/AccountsPrototypeApp.jsx'
import './prototype.css'
import './variants/saldo.css'
import './variants/quincena.css'
import './variants/actividad.css'
import './accounts/accounts.css'

// Mantiene las exploraciones de Inicio y Cuentas aisladas del producto real.
const isAccountsPreview = window.location.pathname.replace(/\/$/, '') === '/cuentas'
document.title = isAccountsPreview ? 'Cuentas · PataWallet' : 'Inicio · PataWallet'
const Preview = isAccountsPreview ? AccountsPrototypeApp : PrototypeApp
createRoot(document.getElementById('root')).render(<StrictMode><Preview /></StrictMode>)
