import { AlertTriangle, Bell, Bot, CircleDollarSign, Compass, CreditCard, Eye, EyeOff, Handshake, LogOut, SlidersHorizontal, Moon, RefreshCw, UserRound } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../../app/AppContext.jsx'
import { PageHeader } from '../../shared/components/PageHeader.jsx'
import { SettingLink, SettingRow, Switch } from './components/SettingsControls.jsx'
import { DataTransfer } from './components/DataTransfer.jsx'
import { PwaInstallControl } from '../pwa/PwaInstallControl.jsx'
import { GUIDE_TOURS } from '../onboarding/guideSteps.js'

// Presenta Ajustes como grupos abiertos, conservando las rutas y acciones de cada tipo de cuenta.
export function SettingsPage() {
  const { settings, syncState, notify, actions, isDemo, user, signOut, accounts, categories, transactions, budgets, goals, allocations, plannedPurchases, startGuide } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const setSetting = (key, value) => actions.setSetting(key, value)

  // Restaura solamente la demo local y vuelve a Inicio después de confirmar el resultado.
  const resetDemo = async () => {
    await actions.resetWorkspace()
    notify('Datos de ejemplo restaurados')
    navigate('/')
  }

  return (
    <div className="route-stack settings-page--serene">
      <PageHeader title="Ajustes" subtitle="Tu app, a tu manera." action={isDemo && <span className="calm-demo">Datos de ejemplo</span>} />

      <SettingsSection id="settings-account-heading" title="Cuenta" intro={isDemo ? 'Esta información de ejemplo se guarda en este dispositivo.' : 'Tu perfil y acceso a PataWallet.'} className="settings-group--account">
        <SettingRow icon={UserRound} tone="violet" title={isDemo ? 'Espacio de demostración' : user?.user_metadata?.display_name || user?.user_metadata?.full_name || 'Tu cuenta'} detail={isDemo ? 'Tus datos reales permanecen separados.' : user?.email || 'Sesión autenticada'}>
          <span className="setting-static-value">{isDemo ? 'Local' : 'Activa'}</span>
        </SettingRow>
      </SettingsSection>

      <SettingsSection id="settings-application-heading" title="Aplicación" className="settings-group--application">
        <PwaInstallControl compact />
        <SettingLink icon={CreditCard} tone="sky" title="Pagos con tarjeta" detail="Configura el atajo de iPhone" to="/ajustes/automatizacion" />
        <SettingLink icon={Bell} tone="rose" title="Notificaciones" detail="Administrar avisos" to="/ajustes/notificaciones" />
      </SettingsSection>

      <SettingsSection id="settings-appearance-heading" title="Preferencias" className="settings-group--appearance">
        <SettingRow icon={settings.hiddenAmounts ? EyeOff : Eye} tone="sky" title="Ocultar montos" detail="Privacidad visual; no reemplaza la autenticación"><Switch checked={Boolean(settings.hiddenAmounts)} label="Ocultar montos" onChange={(value) => setSetting('hiddenAmounts', value)} /></SettingRow>
        <SettingRow icon={Moon} tone="violet" title="Apariencia"><span className="setting-static-value">Oscuro</span></SettingRow>
        <SettingRow icon={SlidersHorizontal} tone="mint" title="Animaciones"><select aria-label="Movimiento" value={settings.motion || 'system'} onChange={(event) => setSetting('motion', event.target.value)}><option value="system">Sistema</option><option value="soft">Suave</option><option value="off">Desactivado</option></select></SettingRow>
      </SettingsSection>

      <SettingsSection id="settings-help-heading" title="Ayuda y datos" className="settings-group--help">
        <SettingRow icon={Compass} tone="sky" title="Guía paso a paso"><button className="compact-action" type="button" data-guide-start="general" onClick={() => startGuide()}>Ver guía</button></SettingRow>
        <details className="calm-details" open={Boolean(location.state?.guideFocus && location.state.guideFocus !== 'general')}><summary>Recorridos por tema</summary><div className="guide-topics" aria-label="Recorridos por tema">{Object.entries(GUIDE_TOURS).filter(([key]) => key !== 'general').map(([key, tour]) => <button className="button button--quiet" type="button" key={key} data-guide-start={key} onClick={() => startGuide(key)}>{tour.label}</button>)}</div></details>
        <SettingLink icon={Bot} tone="violet" title="Asistente PataWallet" detail="Preguntas y resúmenes de solo lectura" to="/asistente" />
        {!isDemo && <SettingLink icon={Handshake} tone="peach" title="Cuentas en pareja" detail="Administra el acceso compartido" to="/parejas" />}
      </SettingsSection>
      <details className="calm-details"><summary>{isDemo ? 'Datos de demostración' : 'Exportar datos y sincronización'}</summary>
      <SettingsSection id="settings-data-heading" title={isDemo ? 'Datos de demostración' : 'Datos'} intro={isDemo ? 'Una moneda activa y datos locales separados.' : 'Moneda, sincronización y copias de seguridad.'} className="settings-group--data">
        <SettingRow icon={CircleDollarSign} tone="gold" title="Moneda" detail="Una moneda activa en esta fase"><strong className="setting-static-value">COP</strong></SettingRow>
        {!isDemo && <RemoteDataControls data={{ accounts, categories, transactions, budgets, goals, allocations, plannedPurchases, settingsRows: Object.entries(settings).map(([key, value]) => ({ key, value })) }} user={user} syncState={syncState} actions={actions} notify={notify} />}
        {isDemo && <button className="button button--danger settings-page__reset" type="button" onClick={resetDemo}>Restaurar datos de ejemplo</button>}
      </SettingsSection>
      </details>
      {!isDemo && <button className="button button--secondary settings-page__logout" type="button" onClick={signOut}><LogOut aria-hidden="true" /> Cerrar sesión</button>}
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
