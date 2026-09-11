import { Bell, Check, ExternalLink, LockKeyhole, Send, Share2, Smartphone } from 'lucide-react'
import { IntegrationsHeader } from './components/IntegrationsHeader.jsx'
import { useApp } from '../../app/AppContext.jsx'
import { Switch } from '../settings/components/SettingsControls.jsx'
import { usePushNotifications } from './hooks/usePushNotifications.js'

export function NotificationsPage() {
  const { user, isDemo } = useApp()
  const push = usePushNotifications(user, isDemo)
  const canActivate = ['prompt', 'granted'].includes(push.state.kind)
  return (
    <div className="route-stack">
      <IntegrationsHeader title="Notificaciones" subtitle="Avisos de PataWallet, no lectura de Wallet ni de bancos." />
      <section className="integration-card">
        <span className="integration-icon"><Bell /></span>
        <p className={`status-label status-label--${push.state.kind}`}>{push.state.label}</p>
        <h2>Avisos privados de PataWallet</h2>
        <p>{push.state.detail}</p>
        <div className="honest-list"><p><LockKeyhole /> Sin monto, comercio ni cuenta por defecto</p><p><Check /> El permiso solo se solicita desde el botón</p><p><Bell /> Cada push recibido muestra un aviso visible</p></div>
        {canActivate && <button className="button button--primary" onClick={push.activate} disabled={push.busy}>{push.busy ? 'Preparando…' : 'Activar notificaciones'}</button>}
        {push.state.kind === 'active' && <div className="notification-actions"><button className="button button--primary" onClick={push.sendTest} disabled={push.busy}><Send /> Enviar notificación de prueba</button></div>}
        {push.subscription && <button className="button button--danger" onClick={push.deactivate} disabled={push.busy}>Desactivar en este dispositivo</button>}
        {push.testResult && <p className={`push-result push-result--${push.testResult.kind}`} role="status">{push.testResult.text}</p>}
      </section>
      {push.state.kind === 'active' && <section className="settings-group notification-preferences"><h2>Qué quieres recibir</h2><Preference title="Movimientos confirmados" detail="Se encola después de guardar el movimiento." checked={push.preferences.movements} onChange={(value) => push.updatePreference('movements', value)} disabled={push.busy} /><Preference title="Alertas de presupuesto" detail="Una vez al alcanzar 80 % y otra al llegar a 100 % del mes." checked={push.preferences.budgets} onChange={(value) => push.updatePreference('budgets', value)} disabled={push.busy} /><Preference title="Mostrar detalles" detail="Incluye monto y comercio. En la pantalla bloqueada podrían verlos otras personas." checked={push.preferences.showDetails} onChange={(value) => push.updatePreference('showDetails', value)} disabled={push.busy} /></section>}
      <InstallGuide capabilities={push.capabilities} />
    </div>
  )
}

function Preference({ title, detail, checked, onChange, disabled }) {
  return <div className="setting-row"><span className="setting-row__icon"><Bell /></span><div><strong>{title}</strong><p>{detail}</p></div><div className="setting-row__control"><Switch checked={checked} label={title} onChange={onChange} disabled={disabled} /></div></div>
}

function InstallGuide({ capabilities }) {
  return <section className="integration-card install-guide"><span className="integration-icon"><Smartphone /></span><p className="status-label">Instalación en iPhone</p><h2>Ábrela como app desde Inicio</h2><ol className="steps"><li><span>1</span><div><strong>Abre PataWallet en Safari</strong><p>Usa el origen HTTPS definitivo; no una pestaña privada para conservar la instalación.</p></div></li><li><span>2</span><div><strong>Toca Compartir <Share2 aria-hidden="true" /></strong><p>Elige “Añadir a pantalla de inicio” y confirma.</p></div></li><li><span>3</span><div><strong>Abre el icono de PataWallet</strong><p>Después vuelve aquí y activa los avisos. El sistema mostrará su solicitud.</p></div></li></ol><p className="info-note">Estado de apertura: {capabilities.standalone ? 'app independiente' : 'pestaña del navegador'}. La entrega final debe comprobarse en un iPhone real.</p><a className="back-link" href="https://support.apple.com/guide/iphone/bookmark-a-website-iph42ab2f3a7/ios" target="_blank" rel="noreferrer">Guía de Apple <ExternalLink /></a></section>
}
