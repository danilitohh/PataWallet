import { AlertTriangle, Bell, CircleDollarSign, Eye, EyeOff, LogOut, Menu, Moon, RefreshCw, Smartphone, Sun, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../app/AppContext.jsx'
import { PageHeader } from '../../shared/components/PageHeader.jsx'
import { SettingLink, SettingRow, Switch } from './components/SettingsControls.jsx'
import { DataTransfer } from './components/DataTransfer.jsx'

export function SettingsPage() {
  const { settings, syncState, notify, actions, isDemo, user, signOut, accounts, categories, transactions, budgets, goals, allocations, plannedPurchases } = useApp()
  const navigate = useNavigate()
  const setSetting = (key, value) => actions.setSetting(key, value)

  return (
    <div className="route-stack">
      <PageHeader title="Ajustes" subtitle={isDemo ? 'Preferencias de esta demo local.' : 'Preferencias de tu cuenta.'} />
      {!isDemo && <section className="settings-group"><h2>Cuenta</h2><SettingRow icon={UserRound} title={user?.user_metadata?.display_name || user?.user_metadata?.full_name || 'Tu cuenta'} detail={user?.email || 'Sesión autenticada'}><span /></SettingRow><button className="button button--secondary" onClick={signOut}><LogOut /> Cerrar sesión</button></section>}
      <section className="settings-group">
        <h2>Apariencia</h2>
        <SettingRow icon={settings.theme === 'dark' ? Moon : Sun} title="Tema" detail="Claro, noche o sistema"><select value={settings.theme || 'system'} onChange={(event) => setSetting('theme', event.target.value)}><option value="system">Sistema</option><option value="light">Claro</option><option value="dark">Noche</option></select></SettingRow>
        <SettingRow icon={settings.hiddenAmounts ? EyeOff : Eye} title="Ocultar montos" detail="Privacidad visual, no autenticación"><Switch checked={Boolean(settings.hiddenAmounts)} label="Ocultar montos" onChange={(value) => setSetting('hiddenAmounts', value)} /></SettingRow>
        <SettingRow icon={Menu} title="Movimiento" detail="Respeta Reducir movimiento"><select value={settings.motion || 'system'} onChange={(event) => setSetting('motion', event.target.value)}><option value="system">Sistema</option><option value="soft">Suave</option><option value="off">Desactivado</option></select></SettingRow>
      </section>
      <section className="settings-group"><h2>Integraciones</h2><SettingLink icon={Bell} title="Notificaciones" detail="Instalación, permiso y privacidad" to="/ajustes/notificaciones" /><SettingLink icon={Smartphone} title="Automatización" detail="Atajo, tarjetas, reglas y revisión" to="/ajustes/automatizacion" /></section>
      <section className="settings-group"><h2>{isDemo ? 'Datos de demostración' : 'Datos'}</h2><SettingRow icon={CircleDollarSign} title="Moneda" detail="Una moneda activa en esta fase"><strong>COP</strong></SettingRow>{!isDemo && <RemoteDataControls data={{ accounts, categories, transactions, budgets, goals, allocations, plannedPurchases, settingsRows: Object.entries(settings).map(([key, value]) => ({ key, value })) }} user={user} syncState={syncState} actions={actions} notify={notify} />}{isDemo && <button className="button button--danger" onClick={async () => { await actions.resetWorkspace(); notify('Datos de ejemplo restaurados'); navigate('/') }}>Restaurar datos de ejemplo</button>}</section>
    </div>
  )
}

function RemoteDataControls({ data, user, syncState, actions, notify }) {
  return <>
    <SettingRow icon={syncState?.kind === 'conflict' ? AlertTriangle : RefreshCw} title="Sincronización" detail={syncState?.label || 'Comprobando estado'}><button className="compact-action" onClick={async () => { await actions.retrySync(); notify('Sincronización revisada') }} disabled={syncState?.kind === 'syncing'}>Reintentar</button></SettingRow>
    {syncState?.kind === 'conflict' && <div className="data-warning"><p>Hay cambios concurrentes. PataWallet no sobrescribirá el servidor sin avisarte.</p><button className="button button--secondary" onClick={async () => { if (!confirm('¿Descartar los cambios locales en conflicto y conservar la versión del servidor?')) return; await actions.discardConflicts(); notify('Se conservó la versión del servidor') }}>Usar versión del servidor</button></div>}
    <DataTransfer data={data} user={user} actions={actions} notify={notify} />
  </>
}
