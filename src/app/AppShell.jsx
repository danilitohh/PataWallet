import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Check, CloudUpload, HardDrive, Home, LoaderCircle, Menu, PawPrint, PiggyBank, Plus, Settings, WalletCards } from 'lucide-react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useApp } from './AppContext.jsx'

const navigation = [
  ['/', Home, 'Inicio'],
  ['/actividad', Menu, 'Actividad'],
  ['/plan', PiggyBank, 'Plan'],
  ['/cuentas', WalletCards, 'Cuentas'],
]

export function AppShell({ children }) {
  const { setSheet, isDemo, user, syncState, actions } = useApp()
  const location = useLocation()
  const mainRef = useRef(null)

  useEffect(() => {
    // Cada ruta empieza arriba para que la barra móvil no cubra su encabezado.
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    mainRef.current?.focus({ preventScroll: true })
  }, [location.pathname])

  return (
    <div className="app-shell">
      <aside className="side-nav" aria-label="Navegación principal">
        <div className="wordmark wordmark--small"><PawPrint /> <span>PataWallet</span></div>
        <nav>{navigation.map(([to, Icon, label]) => <NavLink key={to} to={to} end={to === '/'}><Icon /><span>{label}</span></NavLink>)}</nav>
        <button className="side-nav__add" onClick={(event) => { event.currentTarget.focus(); setSheet('new') }}><Plus /> Nuevo movimiento</button>
        <NavLink to="/ajustes"><Settings /> <span>Ajustes</span></NavLink>
        <p className="side-nav__demo">{isDemo ? 'Demo local' : user?.email}</p>
        {!isDemo && <SyncStatus state={syncState} retry={actions.retrySync} />}
      </aside>
      <div className="mobile-top"><span className="wordmark wordmark--small"><PawPrint /> PataWallet</span><Link to="/ajustes" aria-label="Abrir ajustes"><Settings /></Link></div>
      <main ref={mainRef} tabIndex="-1" className="page" aria-label="Contenido principal">
        {!isDemo && syncState && syncState.kind !== 'synced' && <div className="mobile-sync"><SyncStatus state={syncState} retry={actions.retrySync} /></div>}
        {children}
      </main>
      <nav className="bottom-nav" aria-label="Navegación principal">
        {navigation.slice(0, 2).map(([to, Icon, label]) => <NavLink key={to} to={to} end={to === '/'}><Icon /><span>{label}</span></NavLink>)}
        <button aria-label="Nuevo movimiento" onClick={(event) => { event.currentTarget.focus(); setSheet('new') }}><Plus /></button>
        {navigation.slice(2).map(([to, Icon, label]) => <NavLink key={to} to={to}><Icon /><span>{label}</span></NavLink>)}
      </nav>
      <OnlineStatus />
    </div>
  )
}

function SyncStatus({ state, retry }) {
  // Oculta el estado estable para no añadir ruido visual; conserva avisos accionables.
  if (!state || state.kind === 'synced') return null
  const Icon = state.kind === 'synced' ? Check : state.kind === 'syncing' ? LoaderCircle : state.kind === 'conflict' ? AlertTriangle : state.kind === 'local' ? HardDrive : CloudUpload
  return <button type="button" className={`sync-status sync-status--${state.kind}`} onClick={() => state.kind !== 'synced' && state.kind !== 'syncing' && retry?.()} title={state.lastSyncedAt ? `Última confirmación: ${new Date(state.lastSyncedAt).toLocaleString('es-CO')}` : undefined}><Icon aria-hidden="true" /><span>{state.label}</span></button>
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
