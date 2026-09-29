import { Bell, Check, ExternalLink, LockKeyhole, Send, Share2, Smartphone } from 'lucide-react'
import { IntegrationsHeader } from './components/IntegrationsHeader.jsx'
import { useApp } from '../../app/AppContext.jsx'
import { Switch } from '../settings/components/SettingsControls.jsx'
import { usePushNotifications } from './hooks/usePushNotifications.js'
import { NightIcon } from '../../shared/components/NightIcon.jsx'
import { GlassHero } from '../../shared/components/GlassHero.jsx'

export function NotificationsPage() {
  const { user, isDemo } = useApp()
  const push = usePushNotifications(user, isDemo)
  const canActivate = ['prompt', 'granted'].includes(push.state.kind)
  return (
    <div className="route-stack notifications-page">
      <IntegrationsHeader title="Notificaciones" subtitle="Avisos de PataWallet, no lectura de Wallet ni de bancos." />
      <section className="integration-card">
        <GlassHero className="integration-glass-hero">
        <NightIcon icon={Bell} className="integration-icon" tone="sky" />
        <p className={`status-label status-label--${push.state.kind}`}>{push.state.label}</p>
        <h2>Avisos privados de PataWallet</h2>
        </GlassHero>
        <p>{push.state.detail}</p>
        <div className="honest-list"><p><LockKeyhole /> Sin monto, comercio ni cuenta por defecto</p><p><Check /> El permiso solo se solicita desde el botón</p><p><Bell /> Cada push recibido muestra un aviso visible</p></div>
        {canActivate && <button className="button button--primary" onClick={push.activate} disabled={push.busy}>{push.busy ? 'Preparando…' : 'Activar notificaciones'}</button>}
        {push.state.kind === 'active' && <div className="notification-actions"><button className="button button--primary" onClick={push.sendTest} disabled={push.busy}><Send /> Enviar notificación de prueba</button></div>}
        {push.subscription && <button className="button button--danger" onClick={push.deactivate} disabled={push.busy}>Desactivar en este dispositivo</button>}
        {push.testResult && <p className={`push-result push-result--${push.testResult.kind}`} role="status">{push.testResult.text}</p>}
      </section>
      {push.state.kind === 'active' && <section className="settings-group notification-preferences"><h2>Qué quieres recibir</h2><Preference title="Movimientos por revisar" detail="Te avisa cuando PataWallet detecta un correo bancario pendiente de confirmar." checked={push.preferences.review} onChange={(value) => push.updatePreference('review', value)} disabled={push.busy} /><Preference title="Movimientos confirmados" detail="Se encola después de guardar el movimiento." checked={push.preferences.movements} onChange={(value) => push.updatePreference('movements', value)} disabled={push.busy} /><Preference title="Alertas de presupuesto" detail="Una vez al alcanzar 80 % y otra al llegar a 100 % del mes." checked={push.preferences.budgets} onChange={(value) => push.updatePreference('budgets', value)} disabled={push.busy} /><Preference title="Mostrar detalles" detail="Incluye monto y comercio. En la pantalla bloqueada podrían verlos otras personas." checked={push.preferences.showDetails} onChange={(value) => push.updatePreference('showDetails', value)} disabled={push.busy} /></section>}
      {push.capabilities.appleHomeScreenRequired && <InstallGuide />}
    </div>
  )
}

function Preference({ title, detail, checked, onChange, disabled }) {
  return <div className="setting-row"><span className="setting-row__icon"><Bell /></span><div><strong>{title}</strong><p>{detail}</p></div><div className="setting-row__control"><Switch checked={checked} label={title} onChange={onChange} disabled={disabled} /></div></div>
}

// Muestra esta explicación únicamente cuando iOS exige abrir la web como app instalada.
function InstallGuide() {
  return <section className="integration-card install-guide"><NightIcon icon={Smartphone} className="integration-icon" tone="mint" /><p className="status-label">Solo en iPhone</p><h2>¿Por qué tengo que instalarla?</h2><p>Una pestaña de Safari no puede recibir avisos web. Primero agrega PataWallet a tu pantalla de inicio y ábrela desde su icono.</p><ol className="steps"><li><span>1</span><div><strong>Abre PataWallet en Safari</strong><p>Visita pata-wallet.vercel.app desde Safari en tu iPhone.</p></div></li><li><span>2</span><div><strong><Share2 aria-hidden="true" /> Añádela a Inicio</strong><p>Toca Compartir, elige “Añadir a pantalla de inicio” y confirma “Añadir”. Si aparece “Abrir como app web”, actívalo.</p></div></li><li><span>3</span><div><strong>Abre el icono de PataWallet</strong><p>Ve a Ajustes, abre Notificaciones y toca “Activar notificaciones”. Luego acepta el permiso de iPhone.</p></div></li></ol><p className="info-note">Ahora estás en una pestaña del navegador. Instalarla no activa los avisos automáticamente: también debes autorizarlos desde el botón.</p><a className="back-link" href="https://support.apple.com/es-lamr/guide/iphone/iphea86e5236/27/ios/27" target="_blank" rel="noreferrer">Ver los pasos oficiales de Apple <ExternalLink /></a></section>
}
