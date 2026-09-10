import { useEffect, useRef, useState } from 'react'
import { Home, Menu, PawPrint, PiggyBank, Plus, Settings, WalletCards } from 'lucide-react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useApp } from './AppContext.jsx'

const navigation = [
  ['/', Home, 'Inicio'],
  ['/actividad', Menu, 'Actividad'],
  ['/plan', PiggyBank, 'Plan'],
  ['/cuentas', WalletCards, 'Cuentas'],
]

export function AppShell({ children }) {
  const { setSheet, isDemo, user } = useApp()
  const location = useLocation()
  const mainRef = useRef(null)

  useEffect(() => {
    mainRef.current?.focus({ preventScroll: true })
  }, [location.pathname])

  return (
    <div className="app-shell">
      <aside className="side-nav" aria-label="Navegación principal">
        <div className="wordmark wordmark--small"><PawPrint /> <span>PataWallet</span></div>
        <nav>{navigation.map(([to, Icon, label]) => <NavLink key={to} to={to} end={to === '/'}><Icon /><span>{label}</span></NavLink>)}</nav>
        <button className="side-nav__add" onClick={() => setSheet('new')}><Plus /> Nuevo movimiento</button>
        <NavLink to="/ajustes"><Settings /> <span>Ajustes</span></NavLink>
        <p className="side-nav__demo">{isDemo ? 'Demo local' : user?.email}</p>
      </aside>
      <div className="mobile-top"><span className="wordmark wordmark--small"><PawPrint /> PataWallet</span><Link to="/ajustes" aria-label="Abrir ajustes"><Settings /></Link></div>
      <main ref={mainRef} tabIndex="-1" className="page" aria-label="Contenido principal">{children}</main>
      <nav className="bottom-nav" aria-label="Navegación principal">
        {navigation.slice(0, 2).map(([to, Icon, label]) => <NavLink key={to} to={to} end={to === '/'}><Icon /><span>{label}</span></NavLink>)}
        <button aria-label="Nuevo movimiento" onClick={() => setSheet('new')}><Plus /></button>
        {navigation.slice(2).map(([to, Icon, label]) => <NavLink key={to} to={to}><Icon /><span>{label}</span></NavLink>)}
      </nav>
      <OnlineStatus />
    </div>
  )
}

function OnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  return online ? null : <div className="local-status" role="status">Sin conexión. Tus cambios se guardan en este navegador.</div>
}
