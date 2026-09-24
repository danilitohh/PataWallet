import { AlertTriangle, Bell, Bot, CircleDollarSign, Eye, EyeOff, Handshake, LogOut, Menu, Moon, RefreshCw, Smartphone, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../app/AppContext.jsx'
import { PageHeader } from '../../shared/components/PageHeader.jsx'
import { SettingLink, SettingRow, Switch } from './components/SettingsControls.jsx'
import { DataTransfer } from './components/DataTransfer.jsx'
import { PwaInstallControl } from '../pwa/PwaInstallControl.jsx'

// Presenta Ajustes como grupos abiertos, conservando las rutas y acciones de cada tipo de cuenta.
export function SettingsPage() {
  const { settings, syncState, notify, actions, isDemo, user, signOut, accounts, categories, transactions, budgets, goals, allocations, plannedPurchases } = useApp()
  const navigate = useNavigate()
  const setSetting = (key, value) => actions.setSetting(key, value)

  // Restaura solamente la demo local y vuelve a Inicio después de confirmar el resultado.
  const resetDemo = async () => {
    await actions.resetWorkspace()
    notify('Datos de ejemplo restaurados')
    navigate('/')
  }

  return (
    <div className="route-stack settings-page--serene">
      <PageHeader title="Ajustes" subtitle={isDemo ? 'Preferencias de esta demo local.' : 'Preferencias de tu cuenta.'} />

      <SettingsSection id="settings-account-heading" title="Cuenta" intro={isDemo ? 'Esta información de ejemplo se guarda en este dispositivo.' : 'Tu perfil y acceso a PataWallet.'} className="settings-group--account">
        <SettingRow icon={UserRound} tone="violet" title={isDemo ? 'Espacio de demostración' : user?.user_metadata?.display_name || user?.user_metadata?.full_name || 'Tu cuenta'} detail={isDemo ? 'Tus datos reales permanecen separados.' : user?.email || 'Sesión autenticada'}>
          <span className="setting-static-value">{isDemo ? 'Local' : 'Activa'}</span>
        </SettingRow>
        {!isDemo && <button className="button button--secondary settings-page__logout" type="button" onClick={signOut}><LogOut aria-hidden="true" /> Cerrar sesión</button>}
      </SettingsSection>

      <SettingsSection id="settings-appearance-heading" title="Apariencia y privacidad" intro="Un espacio cómodo y privado para tus finanzas." className="settings-group--appearance">
        <SettingRow icon={Moon} tone="violet" title="Modo nocturno" detail="El tema oscuro está siempre activo en PataWallet"><span className="setting-static-value">Siempre activo</span></SettingRow>
        <SettingRow icon={settings.hiddenAmounts ? EyeOff : Eye} tone="sky" title="Ocultar montos" detail="Privacidad visual; no reemplaza la autenticación"><Switch checked={Boolean(settings.hiddenAmounts)} label="Ocultar montos" onChange={(value) => setSetting('hiddenAmounts', value)} /></SettingRow>
        <SettingRow icon={Menu} tone="mint" title="Movimiento" detail="Respeta la preferencia de movimiento de tu dispositivo"><select aria-label="Movimiento" value={settings.motion || 'system'} onChange={(event) => setSetting('motion', event.target.value)}><option value="system">Sistema</option><option value="soft">Suave</option><option value="off">Desactivado</option></select></SettingRow>
      </SettingsSection>

      <PwaInstallControl />

      {!isDemo && <SettingsSection id="settings-sharing-heading" title="Compartir" intro="Decide qué cuentas o deudas compartir." className="settings-group--sharing">
        <SettingLink icon={Handshake} tone="peach" title="Cuentas en pareja" detail="Administra el acceso compartido" to="/parejas" />
      </SettingsSection>}

      <SettingsSection id="settings-help-heading" title="Asistencia" intro="Ayuda para entender tus movimientos y cuentas." className="settings-group--help">
        <SettingLink icon={Bot} tone="violet" title="Asistente PataWallet" detail="Preguntas y resúmenes de solo lectura" to="/asistente" />
      </SettingsSection>

      <SettingsSection id="settings-integrations-heading" title="Servicios" intro="Recordatorios y herramientas para tu día a día." className="settings-group--integrations">
        <SettingLink icon={Bell} tone="rose" title="Notificaciones" detail="Instalación, permisos y privacidad" to="/ajustes/notificaciones" />
        <SettingLink icon={Smartphone} tone="sky" title="Automatización" detail="Atajos, tarjetas, reglas y revisión" to="/ajustes/automatizacion" />
      </SettingsSection>

      <SettingsSection id="settings-data-heading" title={isDemo ? 'Datos de demostración' : 'Datos'} intro={isDemo ? 'Una moneda activa y datos locales separados.' : 'Moneda, sincronización y copias de seguridad.'} className="settings-group--data">
        <SettingRow icon={CircleDollarSign} tone="gold" title="Moneda" detail="Una moneda activa en esta fase"><strong className="setting-static-value">COP</strong></SettingRow>
        {!isDemo && <RemoteDataControls data={{ accounts, categories, transactions, budgets, goals, allocations, plannedPurchases, settingsRows: Object.entries(settings).map(([key, value]) => ({ key, value })) }} user={user} syncState={syncState} actions={actions} notify={notify} />}
        {isDemo && <button className="button button--danger settings-page__reset" type="button" onClick={resetDemo}>Restaurar datos de ejemplo</button>}
      </SettingsSection>
    </div>
  )
}

// Mantiene títulos, resúmenes y controles alineados con el patrón de lista Serena.
function SettingsSection({ id, title, intro, children, className = '' }) {
  return (
    <section className={`settings-group ${className}`.trim()} aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      {intro && <p className="settings-group__intro">{intro}</p>}
      {children}
    </section>
  )
}

// Conserva sincronización, conflictos y exportación/restauración para cuentas autenticadas.
function RemoteDataControls({ data, user, syncState, actions, notify }) {
  return <>
    <SettingRow icon={syncState?.kind === 'conflict' ? AlertTriangle : RefreshCw} tone={syncState?.kind === 'conflict' ? 'rose' : 'sky'} title="Sincronización" detail={syncState?.label || 'Comprobando estado'}><button className="compact-action" type="button" onClick={async () => { await actions.retrySync(); notify('Sincronización revisada') }} disabled={syncState?.kind === 'syncing'}>Reintentar</button></SettingRow>
    {syncState?.kind === 'conflict' && <div className="data-warning"><p>Hay cambios concurrentes. PataWallet no sobrescribirá el servidor sin avisarte.</p><button className="button button--secondary" onClick={async () => { if (!confirm('¿Descartar los cambios locales en conflicto y conservar la versión del servidor?')) return; await actions.discardConflicts(); notify('Se conservó la versión del servidor') }}>Usar versión del servidor</button></div>}
    <DataTransfer data={data} user={user} actions={actions} notify={notify} />
  </>
}
