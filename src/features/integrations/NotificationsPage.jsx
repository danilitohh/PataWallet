import { Bell, CalendarDays, Check } from 'lucide-react'
import { IntegrationsHeader } from './components/IntegrationsHeader.jsx'

export function NotificationsPage() {
  return (
    <div className="route-stack">
      <IntegrationsHeader title="Notificaciones" subtitle="Avisos de PataWallet, no lectura de Wallet ni de bancos." />
      <section className="integration-card">
        <span className="integration-icon"><Bell /></span>
        <p className="status-label">Pendiente de configurar</p>
        <h2>Web Push aún no está activo</h2>
        <p>Esta fase no tiene servidor, suscripción ni claves VAPID. Por eso no pediremos permiso ni fingiremos una prueba.</p>
        <div className="honest-list"><p><Check /> Interfaz de preferencias preparada</p><p><CalendarDays /> Requiere PWA instalada y prueba en iPhone</p><p><Bell /> Mensajes privados por defecto, sin monto ni comercio</p></div>
        <button className="button button--disabled" disabled>Activar notificaciones</button>
      </section>
    </div>
  )
}
