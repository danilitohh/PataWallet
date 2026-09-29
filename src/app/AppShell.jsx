import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Bell, ChartNoAxesColumn, Check, CloudUpload, HardDrive, Home, LoaderCircle, PawPrint, Target, Plus, Settings, UsersRound, Wallet } from 'lucide-react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useApp } from './AppContext.jsx'
import { NightIcon } from '../shared/components/NightIcon.jsx'
import { bankEmailSummary } from '../services/bank-email/bankEmailClient.js'

const navigation = [
  ['/', Home, 'Inicio'],
  ['/actividad', ChartNoAxesColumn, 'Actividad'],
  ['/plan', Target, 'Plan'],
  ['/cuentas', Wallet, 'Cuentas'],
  ['/parejas', UsersRound, 'Parejas'],
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
  const [pendingReviewCount, setPendingReviewCount] = useState(0)

  // Parejas debe ser accesible antes de aceptar una invitación para poder crearla.
  const items = navigation

  // Mantiene visible el total de correos bancarios pendientes, incluso si el push no llegó al dispositivo.
  useEffect(() => {
    if (isDemo || !user?.id) return undefined
    let active = true
    const refresh = () => bankEmailSummary().then((result) => {
      if (active) setPendingReviewCount(Math.max(0, Number(result.pending_count) || 0))
    }).catch(() => {})
    const onVisible = () => { if (document.visibilityState === 'visible') refresh() }
    const onChanged = () => refresh()
    refresh()
    const interval = window.setInterval(refresh, 30_000)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('patawallet:notifications-changed', onChanged)
    return () => {
      active = false
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('patawallet:notifications-changed', onChanged)
    }
  }, [isDemo, user?.id])
  const badgeCount = isDemo || !user?.id ? 0 : pendingReviewCount

  useEffect(() => {
    // Cada ruta empieza arriba para que la barra móvil no cubra su encabezado.
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    // La ruta de regreso ya montó el botón original; evita competir con el foco del recorrido.
    const guideOpener = location.state?.guideFocus && [...document.querySelectorAll('[data-guide-start]')].find((element) => element.dataset.guideStart === location.state.guideFocus)
    if (guideOpener) guideOpener.focus()
    else mainRef.current?.focus({ preventScroll: true })
  }, [location.pathname, location.state?.guideFocus])

  return (
    <div className="app-shell calm-app">
      <aside className="side-nav" aria-label="Navegación principal">
        <div className="wordmark wordmark--small"><PawPrint /> <span>PataWallet</span></div>
        <nav>{items.map(([to, Icon, label]) => <NavLink key={to} to={to} end={to === '/'}><NavigationIcon icon={Icon} to={to} /><span>{label}</span></NavLink>)}</nav>
        <button className="side-nav__add" onClick={(event) => { event.currentTarget.focus(); setSheet('new') }}><Plus /> Nuevo movimiento</button>
        <p className="side-nav__note">Tu dinero,<br />tu paz, tu manada.</p>
        <NavLink to="/ajustes"><Settings /> <span>Ajustes</span></NavLink>
        <p className="side-nav__demo">{isDemo ? 'Demo local' : user?.email}</p>
        {!isDemo && <SyncStatus state={syncState} retry={actions.retrySync} />}
      </aside>
      <div className="mobile-top"><Link to="/" className="wordmark wordmark--small" aria-label="PataWallet"><PawPrint /> PataWallet</Link><div className="mobile-top__actions"><Link className="notification-link" to="/notificaciones" aria-label={badgeCount ? `Abrir avisos: ${badgeCount} pendientes` : 'Abrir avisos'}><NightIcon icon={Bell} variant="nav" tone="sky" />{badgeCount > 0 && <span className="notification-badge" aria-hidden="true">{badgeCount > 99 ? '99+' : badgeCount}</span>}</Link><Link to="/ajustes" aria-label="Abrir ajustes"><NightIcon icon={Settings} variant="nav" tone="violet" /></Link></div></div>
      <main ref={mainRef} tabIndex="-1" className="page" aria-label="Contenido principal">
        {!isDemo && syncState && syncState.kind !== 'synced' && <div className="mobile-sync"><SyncStatus state={syncState} retry={actions.retrySync} /></div>}
        {children}
      </main>
      <nav className="calm-navigation" aria-label="Navegación principal móvil">{items.map(([to, Icon, label]) => <NavLink key={to} to={to} end={to === '/'}><Icon aria-hidden="true" /><span>{label}</span></NavLink>)}</nav>
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
