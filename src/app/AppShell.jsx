import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Bell, Bot, Check, CloudUpload, HardDrive, Home, LoaderCircle, ListOrdered, PawPrint, PiggyBank, Plus, Settings, UsersRound, WalletCards } from 'lucide-react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useApp } from './AppContext.jsx'
import { NightIcon } from '../shared/components/NightIcon.jsx'

const navigation = [
  ['/', Home, 'Inicio'],
  ['/actividad', ListOrdered, 'Actividad'],
  ['/plan', PiggyBank, 'Plan'],
  ['/cuentas', WalletCards, 'Cuentas'],
]

// Asigna colores consistentes a los accesos para que la navegación tenga una firma visual propia.
function NavigationIcon({ icon: Icon, to }) {
  const tone = to === '/' ? 'mint' : to === '/actividad' ? 'sky' : to === '/plan' ? 'peach' : to === '/cuentas' ? 'violet' : 'rose'
  return <NightIcon icon={Icon} variant="nav" tone={tone} />
}

// Adapta las rutas compartidas a dock móvil y barra lateral sin modificar acciones financieras.
export function AppShell({ children }) {
  const { setSheet, isDemo, user, syncState, actions } = useApp()
  const location = useLocation()
  const mainRef = useRef(null)

  // Parejas debe ser accesible antes de aceptar una invitación para poder crearla.
  const items = !isDemo ? [...navigation, ['/parejas', UsersRound, 'Parejas']] : navigation

  useEffect(() => {
    // Cada ruta empieza arriba para que la barra móvil no cubra su encabezado.
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    mainRef.current?.focus({ preventScroll: true })
  }, [location.pathname])

  return (
    <div className="app-shell">
      <aside className="side-nav" aria-label="Navegación principal">
        <div className="wordmark wordmark--small"><PawPrint /> <span>PataWallet</span></div>
        <nav>{items.map(([to, Icon, label]) => <NavLink key={to} to={to} end={to === '/'}><NavigationIcon icon={Icon} to={to} /><span>{label}</span></NavLink>)}</nav>
        <button className="side-nav__add" onClick={(event) => { event.currentTarget.focus(); setSheet('new') }}><Plus /> Nuevo movimiento</button>
        <p className="side-nav__note">Tu dinero,<br />tu paz, tu manada.</p>
        <NavLink to="/ajustes"><Settings /> <span>Ajustes</span></NavLink>
        <p className="side-nav__demo">{isDemo ? 'Demo local' : user?.email}</p>
        {!isDemo && <SyncStatus state={syncState} retry={actions.retrySync} />}
      </aside>
      <div className="mobile-top"><Link to="/" className="wordmark wordmark--small" aria-label="PataWallet"><PawPrint /> PataWallet</Link><div className="mobile-top__actions"><Link to="/ajustes/notificaciones" aria-label="Abrir notificaciones"><NightIcon icon={Bell} variant="nav" tone="sky" /></Link><Link to="/ajustes" aria-label="Abrir ajustes"><NightIcon icon={Settings} variant="nav" tone="violet" /></Link></div></div>
      <main ref={mainRef} tabIndex="-1" className="page" aria-label="Contenido principal">
        {!isDemo && syncState && syncState.kind !== 'synced' && <div className="mobile-sync"><SyncStatus state={syncState} retry={actions.retrySync} /></div>}
        {children}
      </main>
      {location.pathname !== '/asistente' && <AssistantBubble isDemo={isDemo} />}
      <nav className={`bottom-nav ${!isDemo ? 'bottom-nav--couple' : ''}`} aria-label="Navegación principal">
        {items.slice(0, 2).map(([to, Icon, label]) => <NavLink key={to} to={to} end={to === '/'}><NavigationIcon icon={Icon} to={to} /><span>{label}</span></NavLink>)}
        <button aria-label="Nuevo movimiento" onClick={(event) => { event.currentTarget.focus(); setSheet('new') }}><Plus /></button>
        {items.slice(2).map(([to, Icon, label]) => <NavLink key={to} to={to}><NavigationIcon icon={Icon} to={to} /><span>{label}</span></NavLink>)}
      </nav>
      <OnlineStatus />
    </div>
  )
}

// Mantiene el asistente a un toque desde Inicio sin convertirlo en una acción financiera automática.
function AssistantBubble({ isDemo }) {
  return <Link className="assistant-fab" to="/asistente" aria-label="Abrir asistente" title={isDemo ? 'Asistente disponible en cuentas reales' : 'Abrir asistente PataWallet'}><NightIcon icon={Bot} variant="nav" tone="violet" /><span className="assistant-fab__label">Asistente</span></Link>
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
